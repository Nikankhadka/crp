import { artifactResponse } from '../../../../../server/download';

export const runtime = 'nodejs';

const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return artifactResponse(id, 'docx', DOCX_TYPE, true);
}
