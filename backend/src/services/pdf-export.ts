/**
 * PDF Export Service
 * Generates professional SSAMI-branded PDF digests of news articles using PDFKit
 */

import PDFDocument from 'pdfkit';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { prisma } from '../lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SSA Brand Colors
const BRAND = {
  primary: '#003399',    // brand-600
  dark: '#002366',       // brand-800
  medium: '#2a56c2',     // brand-500
  light: '#e8eef9',      // brand-50
  accent: '#4f72cf',     // brand-400
  text: '#1e293b',       // slate-800
  muted: '#64748b',      // slate-500
  divider: '#cbd5e1',    // slate-300
};

// Load logo from disk
let logoBuffer: Buffer | null = null;
try {
  logoBuffer = readFileSync(join(__dirname, '../../assets/ssa-logo.png'));
} catch {
  // Logo file not found — will skip logo in PDF
}

interface ExportOptions {
  userId?: string;
  articleIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export async function generateNewsDigestPDF(options: ExportOptions): Promise<Buffer> {
  const { userId, articleIds, dateFrom, dateTo } = options;

  let userName = 'User';

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error('User not found');
    }
    userName = user.name || user.email;
  }

  // Fetch articles — by IDs or by user (all non-archived)
  let articles;
  if (articleIds && articleIds.length > 0) {
    articles = await prisma.newsArticle.findMany({
      where: { id: { in: articleIds } },
      include: { company: true, person: true, tag: true },
      orderBy: [{ publishedAt: 'desc' }],
    });
  } else if (userId) {
    const where: any = {
      articleUsers: { some: { userId } },
      isArchived: false,
    };
    // Only apply date filters if explicitly provided
    if (dateFrom || dateTo) {
      where.publishedAt = {};
      if (dateFrom) where.publishedAt.gte = dateFrom;
      if (dateTo) where.publishedAt.lte = dateTo;
    }
    articles = await prisma.newsArticle.findMany({
      where,
      include: { company: true, person: true, tag: true },
      orderBy: [{ publishedAt: 'desc' }],
    });
  } else {
    throw new Error('Either userId or articleIds must be provided');
  }

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const marginLeft = 50;
  const marginRight = 50;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const maxContentY = 760; // stop content here to leave room for footer

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: marginLeft, right: marginRight },
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: `SSAMI News Digest - ${userName}`,
      Author: 'SSA & Company',
      CreationDate: new Date(),
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // Helper: ensure enough room on page, add new page if needed
  const ensureSpace = (needed: number) => {
    if (doc.y + needed > maxContentY) {
      doc.addPage();
      doc.y = 50;
    }
  };

  // Helper: estimate height of a text block
  const textHeight = (text: string, fontSize: number, font: string, width: number): number => {
    doc.fontSize(fontSize).font(font);
    return doc.heightOfString(text, { width });
  };

  // === HEADER ===

  // Logo in top-left corner
  if (logoBuffer) {
    doc.image(logoBuffer, marginLeft, 50, { width: 36, height: 36 });
  }

  // Centered title
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .fillColor(BRAND.primary)
     .text('SSAMI News Digest', marginLeft, 58, {
       width: contentWidth,
       align: 'center',
       lineBreak: false,
     });

  // Brand divider below header
  doc.rect(marginLeft, 82, contentWidth, 2).fill(BRAND.primary);

  // Metadata
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  doc.y = 92;
  doc.fontSize(9)
     .font('Helvetica')
     .fillColor(BRAND.text)
     .text('Prepared for: ', marginLeft, 92, { continued: true })
     .font('Helvetica-Bold')
     .text(userName, { continued: false });

  doc.fontSize(9)
     .font('Helvetica')
     .fillColor(BRAND.muted)
     .text(`${dateStr}  |  ${articles.length} article${articles.length !== 1 ? 's' : ''}`, marginLeft);

  // Thin divider
  const metaDivY = doc.y + 6;
  doc.moveTo(marginLeft, metaDivY)
     .lineTo(marginLeft + contentWidth, metaDivY)
     .lineWidth(0.5)
     .stroke(BRAND.divider);

  doc.y = metaDivY + 10;

  // === ARTICLES GROUPED BY COMPANY ===

  const grouped: Record<string, typeof articles> = {};
  for (const article of articles) {
    const companyName = article.company?.name || 'Other';
    if (!grouped[companyName]) grouped[companyName] = [];
    grouped[companyName].push(article);
  }

  const companyNames = Object.keys(grouped).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  for (const companyName of companyNames) {
    const companyArticles = grouped[companyName];

    // Ensure room for company header + at least some article content
    ensureSpace(100);

    // Company header bar
    const hdrY = doc.y;
    doc.rect(marginLeft, hdrY, contentWidth, 22).fill(BRAND.primary);
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text(companyName.toUpperCase(), marginLeft + 10, hdrY + 6, {
         width: contentWidth - 20,
         lineBreak: false,
       });

    doc.fillColor(BRAND.text);
    doc.y = hdrY + 30;

    for (let i = 0; i < companyArticles.length; i++) {
      const article = companyArticles[i];

      // Estimate total height for this article
      let estimatedHeight = 0;
      if (article.tag?.name) estimatedHeight += 14;
      estimatedHeight += textHeight(article.headline, 10.5, 'Helvetica-Bold', contentWidth) + 6;
      if (article.summary) {
        estimatedHeight += textHeight(article.summary, 9, 'Helvetica', contentWidth) + 6;
      }
      if (article.whyItMatters) {
        estimatedHeight += textHeight(`Why It Matters: ${article.whyItMatters}`, 9, 'Helvetica-Oblique', contentWidth) + 6;
      }
      estimatedHeight += 20; // source line + separator

      ensureSpace(estimatedHeight);

      // Tag badge
      if (article.tag?.name) {
        doc.fontSize(7)
           .font('Helvetica-Bold')
           .fillColor(BRAND.medium)
           .text(article.tag.name.toUpperCase(), marginLeft, doc.y);
        doc.y += 2;
      }

      // Headline
      doc.fontSize(10.5)
         .font('Helvetica-Bold')
         .fillColor(BRAND.text)
         .text(article.headline, marginLeft, doc.y, { width: contentWidth });

      doc.y += 4;

      // Summary
      if (article.summary) {
        ensureSpace(textHeight(article.summary, 9, 'Helvetica', contentWidth) + 6);
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor(BRAND.text)
           .text(article.summary, marginLeft, doc.y, { width: contentWidth });
        doc.y += 4;
      }

      // Why It Matters
      if (article.whyItMatters) {
        const witm = `Why It Matters: ${article.whyItMatters}`;
        ensureSpace(textHeight(witm, 9, 'Helvetica-Oblique', contentWidth) + 6);
        doc.fontSize(9)
           .font('Helvetica-Oblique')
           .fillColor(BRAND.primary)
           .text(witm, marginLeft, doc.y, { width: contentWidth });
        doc.y += 4;
      }

      // Source + Link to Article
      const pubDate = article.publishedAt
        ? new Date(article.publishedAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })
        : 'Unknown date';
      const sourceLine = `${article.sourceName || 'Unknown source'}  |  ${pubDate}`;

      doc.fontSize(8)
         .font('Helvetica')
         .fillColor(BRAND.muted)
         .text(sourceLine, marginLeft, doc.y, {
           width: contentWidth,
           continued: !!article.sourceUrl,
         });

      if (article.sourceUrl) {
        doc.text('  |  ', { continued: true })
           .fillColor(BRAND.primary)
           .text('Link to Article', {
             link: article.sourceUrl,
             underline: true,
             continued: false,
           });
      }

      // Separator between articles
      if (i < companyArticles.length - 1) {
        doc.y += 6;
        const sepY = doc.y;
        doc.moveTo(marginLeft + 10, sepY)
           .lineTo(marginLeft + contentWidth - 10, sepY)
           .lineWidth(0.3)
           .stroke(BRAND.divider);
        doc.y = sepY + 8;
      }
    }

    // Space between company sections
    doc.y += 14;
  }

  // === FOOTER on every page (absolute positioning, no page break) ===
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);

    const footY = pageHeight - 35;

    // Footer divider
    doc.save();
    doc.moveTo(marginLeft, footY - 5)
       .lineTo(marginLeft + contentWidth, footY - 5)
       .lineWidth(0.5)
       .stroke(BRAND.divider);

    doc.fontSize(7)
       .font('Helvetica')
       .fillColor(BRAND.muted)
       .text(
         `SSAMI News Digest  |  SSA & Company  |  Page ${i + 1} of ${pageCount}`,
         marginLeft, footY,
         { align: 'center', width: contentWidth, lineBreak: false }
       );
    doc.restore();
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
