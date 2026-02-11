/**
 * PDF Export Service
 * Generates professional SSAMI-branded PDF digests of news articles using PDFKit
 */

import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma.js';

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

// Embedded SSA logo PNG (extracted from the SVG in frontend/public)
const SSA_LOGO_BASE64 = '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';

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

  // Fetch articles — by IDs or by user
  let articles;
  if (articleIds && articleIds.length > 0) {
    articles = await prisma.newsArticle.findMany({
      where: { id: { in: articleIds } },
      include: { company: true, person: true, tag: true },
      orderBy: [{ publishedAt: 'desc' }],
    });
  } else if (userId) {
    const defaultDateFrom = new Date();
    defaultDateFrom.setDate(defaultDateFrom.getDate() - 7);
    articles = await prisma.newsArticle.findMany({
      where: {
        articleUsers: { some: { userId } },
        publishedAt: {
          gte: dateFrom || defaultDateFrom,
          lte: dateTo || new Date(),
        },
      },
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
  const maxContentY = 770; // stop article content here to leave room for footer

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: marginLeft, right: marginRight },
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: `SSAMI News Intelligence Digest - ${userName}`,
      Author: 'SSA & Company',
      CreationDate: new Date(),
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // === HEADER ===

  // Logo in top-left corner
  const logoBuffer = Buffer.from(SSA_LOGO_BASE64, 'base64');
  doc.image(logoBuffer, marginLeft, 50, { width: 36, height: 36 });

  // Centered title (full width, will appear centered above the logo area)
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .fillColor(BRAND.primary)
     .text('SSAMI News Intelligence Digest', marginLeft, 55, {
       width: contentWidth,
       align: 'center',
       lineBreak: false,
     });

  // Subtitle centered
  doc.fontSize(8)
     .font('Helvetica')
     .fillColor(BRAND.muted)
     .text('SSA & Company', marginLeft, 76, {
       width: contentWidth,
       align: 'center',
       lineBreak: false,
     });

  // Brand divider below header
  doc.rect(marginLeft, 92, contentWidth, 2).fill(BRAND.primary);

  // Metadata
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  doc.y = 102;
  doc.fontSize(9)
     .font('Helvetica')
     .fillColor(BRAND.text)
     .text('Prepared for: ', marginLeft, 102, { continued: true })
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

    // Ensure room for company header + at least one article start
    if (doc.y > maxContentY - 100) {
      doc.addPage();
      doc.y = 50;
    }

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

      if (doc.y > maxContentY - 80) {
        doc.addPage();
        doc.y = 50;
      }

      // Tag badge
      if (article.tag?.name) {
        doc.fontSize(7)
           .font('Helvetica-Bold')
           .fillColor(BRAND.medium)
           .text(article.tag.name.toUpperCase(), marginLeft, doc.y, { lineBreak: false });
        doc.y += 2;
      }

      // Headline
      doc.fontSize(10.5)
         .font('Helvetica-Bold')
         .fillColor(BRAND.text)
         .text(article.headline, marginLeft, doc.y, { width: contentWidth });

      doc.y += 4; // spacing after headline

      // Summary
      if (article.summary) {
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor(BRAND.text)
           .text(article.summary, marginLeft, doc.y, { width: contentWidth });
        doc.y += 4;
      }

      // Why It Matters
      if (article.whyItMatters) {
        doc.fontSize(9)
           .font('Helvetica-Oblique')
           .fillColor(BRAND.primary)
           .text(`Why It Matters: ${article.whyItMatters}`, marginLeft, doc.y, { width: contentWidth });
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
         `SSAMI News Intelligence  |  SSA & Company  |  Page ${i + 1} of ${pageCount}`,
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
