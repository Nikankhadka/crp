import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';
import { contactLine, itemHeadline } from './layout';
import { splitBold, type MergedResume } from './typst';

const NAME_SIZE = 30; // half-points: 15pt
const HEADING_SIZE = 22; // 11pt
const BODY_SIZE = 20; // 10pt
const SMALL_SIZE = 18; // 9pt

function richRuns(text: string, size = BODY_SIZE, italics = false): TextRun[] {
  return splitBold(text).map(
    (run) => new TextRun({ text: run.text, bold: run.bold, italics, size }),
  );
}

/**
 * Build an ATS-safe single-column DOCX with the same content rules as the PDF: bank-resolved
 * org/title/dates, bold runs from `**` markers, no tables, columns or graphics.
 */
export async function buildDocx(doc: MergedResume): Promise<Buffer> {
  const children: Paragraph[] = [];
  const { basics } = doc;

  if (basics.name !== undefined && basics.name !== '') {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: basics.name, bold: true, size: NAME_SIZE })],
      }),
    );
  }

  const contact = contactLine(basics);
  if (contact !== '') {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: contact, size: SMALL_SIZE })],
      }),
    );
  }

  if (doc.summary !== '') {
    children.push(new Paragraph({ children: richRuns(doc.summary), spacing: { before: 120 } }));
  }

  for (const section of doc.sections) {
    if (section.items.length === 0) continue;
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: section.type.toUpperCase(), bold: true, size: HEADING_SIZE }),
        ],
        spacing: { before: 180 },
      }),
    );

    for (const item of section.items) {
      const headline = itemHeadline(item);
      if (headline !== '') {
        children.push(new Paragraph({ children: [new TextRun({ text: headline, bold: true })] }));
      }
      if (item.tech !== undefined && item.tech.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: item.tech.join(', '), italics: true, size: SMALL_SIZE })],
          }),
        );
      }
      if (item.context !== undefined && item.context !== '') {
        children.push(
          new Paragraph({ children: [new TextRun({ text: item.context, italics: true })] }),
        );
      }
      if (item.text !== undefined && item.text !== '') {
        children.push(new Paragraph({ children: richRuns(item.text) }));
      }
      for (const bullet of item.bullets) {
        children.push(new Paragraph({ children: richRuns(bullet.text), bullet: { level: 0 } }));
      }
    }
  }

  if (doc.skills.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'SKILLS', bold: true, size: HEADING_SIZE })],
        spacing: { before: 180 },
      }),
    );
    children.push(new Paragraph({ children: [new TextRun({ text: doc.skills.join(', ') })] }));
  }

  const document = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: BODY_SIZE },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [{ children }],
  });

  return Packer.toBuffer(document);
}
