import { NextResponse } from 'next/server';
import { withUser } from '../../../server/currentUser';
import { BankValidationError, getBankTexts, saveBank } from '../../../server/seedBank';

export const runtime = 'nodejs';

// Three documents of a few KB each in practice; this only stops a runaway paste.
const MAX_BANK_BYTES = 256 * 1024;

export const GET = withUser(async (userId) => NextResponse.json({ bank: await getBankTexts(userId) }));

/** Create or replace the signed-in user's bank. Nothing is saved unless all three documents validate. */
export const PUT = withUser(async (userId, request) => {
  let body: { profileYaml?: unknown; resumeYaml?: unknown; personalMd?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const { profileYaml, resumeYaml, personalMd } = body;
  if (typeof profileYaml !== 'string' || typeof resumeYaml !== 'string' || typeof personalMd !== 'string') {
    return NextResponse.json({ error: 'profileYaml, resumeYaml and personalMd are required' }, { status: 400 });
  }
  if (Buffer.byteLength(profileYaml + resumeYaml + personalMd, 'utf8') > MAX_BANK_BYTES) {
    return NextResponse.json({ error: 'the bank is too large' }, { status: 413 });
  }

  try {
    await saveBank(userId, { profileYaml, resumeYaml, personalMd });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BankValidationError) {
      return NextResponse.json({ error: err.message, field: err.field }, { status: 400 });
    }
    throw err;
  }
});
