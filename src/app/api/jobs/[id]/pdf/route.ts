import { artifactResponse } from '../../../../../server/download';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const download = new URL(request.url).searchParams.get('download') === '1';
  return artifactResponse(id, 'pdf', 'application/pdf', download);
}
