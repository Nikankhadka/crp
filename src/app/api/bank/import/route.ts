import { NextResponse } from 'next/server';
import { ImportValidationError } from '../../../../core/import';
import { MAX_PDF_BYTES } from '../../../../core/limits';
import { withUser } from '../../../../server/currentUser';
import { importResume, ImportInputError, type ResumeInput } from '../../../../server/importResume';

export const runtime = 'nodejs';
// ponytail: one model call, plus one retry when validation fails, each up to the provider timeout
// and its fallback, so a slow model can still overrun this. The request then fails and the user
// retries or pastes less text. Upgrade path: run it as a job like generation, or stream progress.
export const maxDuration = 120;

/** Read the pasted text or uploaded PDF from a JSON or multipart body. */
async function readInput(request: Request): Promise<ResumeInput> {
  if (request.headers.get('content-type')?.includes('multipart/form-data')) {
    // Reject by declared size first; the form is not parsed (and buffered) when it is clearly too big.
    if (Number(request.headers.get('content-length') ?? 0) > MAX_PDF_BYTES + 64 * 1024) {
      throw new ImportInputError('That PDF is larger than 5 MB.', 413);
    }
    const form = await request.formData().catch(() => null);
    if (!form) throw new ImportInputError('invalid form data', 400);
    const file = form.get('file');
    if (file instanceof File) return { pdf: new Uint8Array(await file.arrayBuffer()) };
    const text = form.get('text');
    return { text: typeof text === 'string' ? text : '' };
  }
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  if (body === null) throw new ImportInputError('invalid JSON', 400);
  return { text: typeof body.text === 'string' ? body.text : '' };
}

/** Turn a pasted resume or PDF into a draft bank. Returns the draft; it does not save anything. */
export const POST = withUser(async (_userId, request) => {
  try {
    return NextResponse.json(await importResume(await readInput(request)));
  } catch (err) {
    if (err instanceof ImportInputError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof ImportValidationError) return NextResponse.json({ error: err.message }, { status: 422 });
    console.error('resume import failed', err);
    // completeJson parses the model's reply with JSON.parse, so a SyntaxError means it was not JSON.
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'The model returned unreadable output. Try again.' }, { status: 502 });
    }
    return NextResponse.json(
      { error: 'The model could not be reached. Try again in a moment.' },
      { status: 502 },
    );
  }
});
