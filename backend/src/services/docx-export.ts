import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  ImageRun,
  AlignmentType,
  HeadingLevel,
  Table,
  VerticalAlignSection,
} from 'docx';
import { type ExportSection } from './export-utils.js';
import { renderSection, styledHeading } from './docx-section-renderers.js';
import {
  BRAND_BLUE,
  BRAND_DK2,
  BODY_COLOR,
  PAGE_SIZE,
  PAGE_MARGINS,
  DOCUMENT_STYLES,
  loadAsset,
  buildHeader,
  buildFooter,
  buildCoverLogo,
  postProcessDocx,
} from './docx-shared.js';

export async function generateResearchDocx(params: {
  job: {
    companyName: string;
    geography?: string | null;
    industry?: string | null;
    status: string;
    createdAt: Date;
  };
  exportSections: ExportSection[];
}): Promise<Buffer> {
  const { job, exportSections } = params;
  const dateStr = new Date(job.createdAt).toISOString().slice(0, 10);

  // ── Cover page (vertically + horizontally centered) ──
  const coverChildren: Paragraph[] = [];
  const coverLogo = buildCoverLogo(450);
  if (coverLogo) coverChildren.push(coverLogo);

  coverChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: job.companyName })],
      spacing: { before: 0, after: 120 },
    }),
  );

  const metaLines = [
    `Geography: ${job.geography || 'N/A'}`,
    `Industry: ${job.industry || 'N/A'}`,
    `Date: ${dateStr}`,
  ];
  for (const line of metaLines) {
    coverChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: line,
            font: 'Avenir Next LT Pro',
            size: 20,
            color: '6B7280',
          }),
        ],
        spacing: { after: 40 },
      }),
    );
  }

  // ── Body content ──
  const bodyChildren: (Paragraph | Table)[] = [];

  for (const section of exportSections) {
    const rendered = renderSection(section.id, section.data);
    if (!rendered.length) continue;

    bodyChildren.push(styledHeading(section.title, 2));
    bodyChildren.push(...rendered);
  }

  const header = buildHeader();
  const footer = buildFooter();

  const doc = new Document({
    creator: 'SSA & Company',
    title: `${job.companyName} Research Report`,
    description: `Research report for ${job.companyName}`,
    styles: DOCUMENT_STYLES,
    sections: [
      // Section 1: Cover page — vertically centered, no header on first page
      {
        properties: {
          titlePage: true,
          page: {
            size: PAGE_SIZE,
            margin: PAGE_MARGINS,
            pageNumbers: { start: 1 },
          },
          column: { separate: true, space: 720 },
          verticalAlign: VerticalAlignSection.CENTER,
        },
        headers: {
          default: header,
          first: new Header({ children: [new Paragraph({ children: [] })] }),
        },
        footers: { default: footer, first: footer },
        children: coverChildren,
      },
      // Section 2: Body content — starts on new page (default nextPage)
      {
        properties: {
          page: {
            size: PAGE_SIZE,
            margin: PAGE_MARGINS,
          },
          column: { separate: true, space: 720 },
        },
        headers: { default: header },
        footers: { default: footer },
        children: bodyChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return postProcessDocx(Buffer.from(buffer));
}
