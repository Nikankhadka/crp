import { withUser } from '../../../../../server/currentUser';
import { artifactResponse } from '../../../../../server/download';

export const runtime = 'nodejs';

export const GET = withUser<{ params: Promise<{ id: string }> }>(async (userId, request, { params }) => {
  const download = new URL(request.url).searchParams.get('download') === '1';
  return artifactResponse(userId, (await params).id, 'pdf', download);
});
