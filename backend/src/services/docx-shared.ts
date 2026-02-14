/**
 * Shared DOCX utilities for research and news exports.
 * Extracted from docx-export.ts to avoid duplication.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import {
  Paragraph,
  TextRun,
  Header,
  Footer,
  ImageRun,
  ExternalHyperlink,
  AlignmentType,
  TabStopType,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom,
  HorizontalPositionAlign,
} from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve assets dir for both source (src/services/) and compiled (dist/src/services/) contexts
export const assetsDir = fs.existsSync(path.resolve(__dirname, '../../assets'))
  ? path.resolve(__dirname, '../../assets')
  : path.resolve(__dirname, '../../../assets');

// SSA brand colors
export const BRAND_BLUE = '003399';
export const BRAND_DK2 = '336179';
export const BODY_COLOR = '111827';

// Header logo natural dimensions (11262 x 1761 pixels, ~6.4:1 aspect ratio)
const HEADER_LOGO_WIDTH = 290;
const HEADER_LOGO_HEIGHT = 45;

// Footer font config matching SSA corporate template
export const FOOTER_FONT = { ascii: 'Avenir Next LT Pro', cs: 'Cambria', hAnsi: 'Avenir Next LT Pro' };
export const FOOTER_SIZE = 18; // 9pt in half-points
export const BULLET_SEP_SIZE = 11; // ~5.5pt for bullet separators

// Page size and margin constants (Letter size)
export const PAGE_SIZE = { width: 12240, height: 15840, code: 1 };
export const PAGE_MARGINS = {
  top: 1440,
  bottom: 1872,
  left: 1008,
  right: 1008,
  header: 432,
  footer: 432,
};

// Document styles object
export const DOCUMENT_STYLES = {
  default: {
    document: {
      run: {
        font: 'Avenir Next LT Pro',
        size: 22, // 11pt
        color: BODY_COLOR,
      },
    },
    heading1: {
      run: {
        font: 'Avenir Next LT Pro',
        size: 56, // 28pt — title
        bold: true,
        color: BRAND_BLUE,
      },
      paragraph: {
        spacing: { before: 360, after: 120 },
      },
    },
    heading2: {
      run: {
        font: 'Avenir Next LT Pro',
        size: 32, // 16pt — section titles
        bold: true,
        color: BRAND_DK2,
      },
      paragraph: {
        spacing: { before: 280, after: 100 },
      },
    },
    heading3: {
      run: {
        font: 'Avenir Next LT Pro',
        size: 28, // 14pt — subsection titles
        bold: true,
        color: BODY_COLOR,
      },
      paragraph: {
        spacing: { before: 200, after: 80 },
      },
    },
    hyperlink: {
      run: {
        color: BRAND_BLUE,
        underline: { color: BRAND_BLUE },
      },
    },
  },
};

export function loadAsset(filename: string): Buffer {
  return fs.readFileSync(path.join(assetsDir, filename));
}

/** Common paragraph properties for all footer paragraphs */
export function footerParaProps(children: (TextRun | ImageRun | ExternalHyperlink)[] = []) {
  return {
    alignment: AlignmentType.CENTER,
    keepLines: true,
    tabStops: [
      { type: TabStopType.CENTER, position: 4320 },
      { type: TabStopType.RIGHT, position: 8640 },
    ],
    indent: { right: -360 },
    children,
  } as const;
}

/** Bullet separator: " • " with each bullet in its own small run */
export function bulletSepRun(): TextRun {
  return new TextRun({
    text: '  \u2022  ',
    font: FOOTER_FONT,
    size: BULLET_SEP_SIZE,
    color: BRAND_BLUE,
  });
}

/** Standard footer text run */
export function footerTextRun(text: string): TextRun {
  return new TextRun({
    text,
    font: FOOTER_FONT,
    size: FOOTER_SIZE,
    sizeComplexScript: FOOTER_SIZE,
    color: BRAND_BLUE,
  });
}

export function buildHeader(): Header {
  let headerChildren: Paragraph[];
  try {
    const logoData = loadAsset('ssa-header-logo.jpg');
    headerChildren = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: 'jpg',
            data: logoData,
            transformation: { width: HEADER_LOGO_WIDTH, height: HEADER_LOGO_HEIGHT },
            altText: {
              title: 'SSA & Company',
              description: 'SSA & Company logo',
              name: 'SSA Logo',
            },
          }),
        ],
      }),
    ];
  } catch {
    headerChildren = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'SSA & Company',
            bold: true,
            font: 'Avenir Next LT Pro',
            size: 28,
            color: BRAND_BLUE,
          }),
        ],
      }),
    ];
  }

  return new Header({ children: headerChildren });
}

export function buildFooter(): Footer {
  // Try to load background image
  let bgImageParagraph: Paragraph | null = null;
  try {
    const bgData = loadAsset('ssa-footer-logo.png');
    bgImageParagraph = new Paragraph(footerParaProps([
        new ImageRun({
          type: 'png',
          data: bgData,
          transformation: { width: 595, height: 590 },
          floating: {
            horizontalPosition: {
              relative: HorizontalPositionRelativeFrom.COLUMN,
              align: HorizontalPositionAlign.CENTER,
            },
            verticalPosition: {
              relative: VerticalPositionRelativeFrom.PARAGRAPH,
              offset: -523875, // EMU offset from reference template
            },
            behindDocument: true,
            allowOverlap: true,
            lockAnchor: true,
          },
          altText: {
            title: 'SSA Background',
            description: 'SSA & Company background watermark',
            name: 'SSA Background',
          },
        }),
    ]));
  } catch {
    // No background image available — proceed without it
  }

  // Empty spacer paragraphs (2 before the main text, matching reference template)
  const emptyPara1 = new Paragraph(footerParaProps());
  const emptyPara2 = new Paragraph(footerParaProps());

  // Main footer text paragraph with individual runs per segment
  const mainParagraph = new Paragraph(footerParaProps([
      // "SSA & Company"
      footerTextRun('SSA & Company'),
      bulletSepRun(),
      // "685 Third Ave., 22" + superscript "nd" + " Floor"
      footerTextRun('685 Third Ave., 22'),
      new TextRun({
        text: 'nd',
        font: FOOTER_FONT,
        size: FOOTER_SIZE,
        sizeComplexScript: FOOTER_SIZE,
        color: BRAND_BLUE,
        superScript: true,
      }),
      footerTextRun(' Floor'),
      bulletSepRun(),
      // "New York, NY 10017"
      footerTextRun('New York, NY 10017'),
      bulletSepRun(),
      // "Tel. (212) 332-3790"
      footerTextRun('Tel. (212) 332-3790'),
      bulletSepRun(),
      // www.ssaandco.com as hyperlink
      new ExternalHyperlink({
        link: 'http://www.ssaandco.com',
        children: [
          new TextRun({
            text: 'www.ssaandco.com',
            style: 'Hyperlink',
            font: FOOTER_FONT,
            size: FOOTER_SIZE,
            sizeComplexScript: FOOTER_SIZE,
          }),
        ],
      }),
  ]));

  // Order: empty, empty, text, then image last (matches reference template)
  const footerChildren: Paragraph[] = [emptyPara1, emptyPara2, mainParagraph];
  if (bgImageParagraph) {
    footerChildren.push(bgImageParagraph);
  }

  return new Footer({ children: footerChildren });
}

/** Build cover page logo paragraph (large centered logo) */
export function buildCoverLogo(width = 450): Paragraph | null {
  const height = Math.round(width / 6.4); // maintain ~6.4:1 aspect ratio
  try {
    const logoData = loadAsset('ssa-header-logo.jpg');
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new ImageRun({
          type: 'jpg',
          data: logoData,
          transformation: { width, height },
          altText: {
            title: 'SSA & Company',
            description: 'SSA & Company logo',
            name: 'SSA Logo',
          },
        }),
      ],
    });
  } catch {
    return null;
  }
}

/**
 * Post-process the generated DOCX ZIP to fix XML attributes that the docx
 * library cannot set directly. Patches footer XML (background image anchor)
 * and document.xml (page setup attributes).
 */
export async function postProcessDocx(buf: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buf);

  // ── Patch ALL footer XML files ──
  const footerFiles = Object.keys(zip.files).filter(
    (f) => /^word\/footer\d+\.xml$/.test(f),
  );
  const canonicalFooterRels = zip.file('word/_rels/footer1.xml.rels');
  const canonicalRelsXml = canonicalFooterRels
    ? await canonicalFooterRels.async('string')
    : null;

  for (const footerPath of footerFiles) {
    const entry = zip.file(footerPath);
    if (entry) {
      let xml = await entry.async('string');
      xml = patchFooterAnchor(xml);
      zip.file(footerPath, xml);
    }

    if (canonicalRelsXml && footerPath !== 'word/footer1.xml') {
      const relsPath = footerPath.replace('word/', 'word/_rels/') + '.rels';
      zip.file(relsPath, canonicalRelsXml);
    }
  }

  // ── Sync duplicate header rels ──
  const canonicalHeaderRels = zip.file('word/_rels/header1.xml.rels');
  if (canonicalHeaderRels) {
    const headerRelsXml = await canonicalHeaderRels.async('string');
    const headerFiles = Object.keys(zip.files).filter(
      (f) => /^word\/header\d+\.xml$/.test(f) && f !== 'word/header1.xml',
    );
    for (const headerPath of headerFiles) {
      const relsPath = headerPath.replace('word/', 'word/_rels/') + '.rels';
      zip.file(relsPath, headerRelsXml);
    }
  }

  // ── Patch document.xml (section properties) ──
  const docEntry = zip.file('word/document.xml');
  if (docEntry) {
    let xml = await docEntry.async('string');
    xml = patchSectionProperties(xml);
    zip.file('word/document.xml', xml);
  }

  // ── Fix invalid rId0 in header/footer relationships ──
  await fixInvalidRelationshipIds(zip);

  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return Buffer.from(out);
}

/**
 * Normalize ALL relationship IDs in header/footer .rels files to sequential
 * rId1, rId2, … format.
 */
async function fixInvalidRelationshipIds(zip: JSZip): Promise<void> {
  const relsFiles = Object.keys(zip.files).filter(
    (f) => /^word\/_rels\/.+\.xml\.rels$/.test(f),
  );

  for (const relsPath of relsFiles) {
    const relsEntry = zip.file(relsPath);
    if (!relsEntry) continue;

    let relsXml = await relsEntry.async('string');

    const currentIds = [...relsXml.matchAll(/Id="([^"]*)"/g)].map((m) => m[1]);
    if (currentIds.length === 0) continue;

    const hasNonStandard = currentIds.some((id) => !/^rId[1-9]\d*$/.test(id));
    if (!hasNonStandard) continue;

    const idMap = new Map<string, string>();
    let counter = 1;
    for (const oldId of currentIds) {
      idMap.set(oldId, `rId${counter++}`);
    }

    for (const [oldId, newId] of idMap) {
      if (oldId === newId) continue;
      relsXml = relsXml.replaceAll(`Id="${oldId}"`, `Id="${newId}"`);
    }
    zip.file(relsPath, relsXml);

    const partPath = relsPath
      .replace('word/_rels/', 'word/')
      .replace('.rels', '');
    const partEntry = zip.file(partPath);
    if (!partEntry) continue;

    let partXml = await partEntry.async('string');
    for (const [oldId, newId] of idMap) {
      if (oldId === newId) continue;
      partXml = partXml.replaceAll(`r:embed="${oldId}"`, `r:embed="${newId}"`);
      partXml = partXml.replaceAll(`r:id="${oldId}"`, `r:id="${newId}"`);
      partXml = partXml.replaceAll(`r:link="${oldId}"`, `r:link="${newId}"`);
    }
    zip.file(partPath, partXml);
  }
}

/** Fix the background image wp:anchor in the footer */
function patchFooterAnchor(xml: string): string {
  xml = xml.replace(
    /(<wp:extent\s+)cx="5667375"\s+cy="5619750"/,
    '$1cx="7818120" cy="3163824"',
  );

  xml = xml.replace(
    /(<a:ext\s+)cx="5667375"\s+cy="5619750"/,
    '$1cx="7818120" cy="3163824"',
  );

  const footerRpr =
    '<w:rPr>' +
      '<w:rFonts w:ascii="Avenir Next LT Pro" w:hAnsi="Avenir Next LT Pro" w:cs="Cambria"/>' +
      '<w:color w:val="003399"/>' +
      '<w:sz w:val="18"/>' +
      '<w:szCs w:val="18"/>' +
      '<w:lang w:eastAsia="ja-JP"/>' +
    '</w:rPr>';
  xml = xml.replace(/<w:pPr>([\s\S]*?)<\/w:pPr>/g, (_match, inner: string) => {
    const cleaned = inner.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/g, '');
    return `<w:pPr>${cleaned}${footerRpr}</w:pPr>`;
  });

  xml = xml.replace(/<a:srcRect\/>/, '<a:srcRect t="59301"/>');

  xml = xml.replace(
    /relativeFrom="column"/,
    'relativeFrom="page"',
  );

  xml = xml.replace(
    /relativeHeight="5619750"/,
    'relativeHeight="251657216"',
  );

  xml = xml.replace(
    /distL="0"\s+distR="0"/,
    'distL="114300" distR="114300"',
  );

  xml = xml.replace(
    /<pic:blipFill>/,
    '<pic:blipFill rotWithShape="1">',
  );
  xml = xml.replace(
    /<a:stretch><a:fillRect\/><\/a:stretch>/,
    '<a:stretch/>',
  );

  return xml;
}

/** Fix section properties in document.xml */
function patchSectionProperties(xml: string): string {
  xml = xml.replace(/\s*w:orient="portrait"/g, '');

  xml = xml.replace(
    /<w:pgSz([^/]*?)\/>/g,
    (match, attrs) => {
      if (match.includes('w:code=')) return match;
      return `<w:pgSz${attrs} w:code="1"/>`;
    },
  );

  xml = xml.replace(/w:sep="true"/g, 'w:sep="1"');

  xml = xml.replace(
    /w:type="pct"\s+w:w="(\d+)%"/g,
    (_match, pct) => `w:type="pct" w:w="${Number(pct) * 50}"`,
  );

  return xml;
}
