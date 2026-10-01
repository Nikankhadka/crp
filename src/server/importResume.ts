import { extractText, getDocumentProxy } from 'unpdf';
import { importBank, type ImportDeps, type ImportDraft } from '../core/import';
import { MAX_PDF_BYTES } from '../core/limits';

export const MAX_RESUME_CHARS = 60_000;
export const MAX_PDF_PAGES = 20;
// Fewer characters than this from a PDF means it has no text layer (a scan or an image export).
const MIN_PDF_CHARS = 40;

/** Bad input from the user: `status` is the HTTP status to answer with. */
export class ImportInputError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 | 422,
  ) {
    super(message);
  }
}

export type ResumeInput = { text: string } | { pdf: Uint8Array };

async function pdfText(pdf: Uint8Array): Promise<string> {
  if (pdf.byteLength > MAX_PDF_BYTES) throw new ImportInputError('That PDF is larger than 5 MB.', 413);
  if (Buffer.from(pdf.subarray(0, 5)).toString('latin1') !== '%PDF-') {
    throw new ImportInputError('That file is not a PDF. Upload a PDF or paste the text instead.', 400);
  }
  let document: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  let text: string;
  try {
    // unpdf takes ownership of the buffer, so hand it a copy.
    document = await getDocumentProxy(new Uint8Array(pdf));
    if (document.numPages > MAX_PDF_PAGES) {
      throw new ImportInputError(
        `That PDF has more than ${MAX_PDF_PAGES} pages, which is too long for a resume. Paste the resume text instead.`,
        413,
      );
    }
    text = (await extractText(document, { mergePages: true })).text;
  } catch (err) {
    if (err instanceof ImportInputError) throw err;
    throw new ImportInputError('Could not read that PDF. Paste the resume text instead.', 400);
  } finally {
    // unpdf only cleans up a document it opened itself, so release the worker and buffers here.
    await document?.loadingTask.destroy().catch(() => {});
  }
  if (text.trim().length < MIN_PDF_CHARS) {
    throw new ImportInputError(
      'No text found in that PDF. It looks like a scan or an image, so paste the resume text instead.',
      422,
    );
  }
  return text;
}

/** The resume as plain text, from pasted text or a PDF. Throws ImportInputError. */
export async function extractResumeText(input: ResumeInput): Promise<string> {
  const text = ('pdf' in input ? await pdfText(input.pdf) : input.text).trim();
  if (text === '') throw new ImportInputError('Paste your resume text or upload a PDF.', 400);
  if (text.length > MAX_RESUME_CHARS) {
    throw new ImportInputError(
      `That resume is longer than ${MAX_RESUME_CHARS.toLocaleString('en-US')} characters. Trim it and try again.`,
      413,
    );
  }
  return text;
}

/** Resume text or PDF in, an unsaved draft bank out. */
export async function importResume(input: ResumeInput, deps?: Partial<ImportDeps>): Promise<ImportDraft> {
  return importBank(await extractResumeText(input), deps);
}
