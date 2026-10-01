import { artifactResponse } from '../../../../../server/download';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return artifactResponse(id, 'coverLetter', 'text/markdown; charset=utf-8');
}
