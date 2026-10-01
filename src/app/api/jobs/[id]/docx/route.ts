import { withUser } from '../../../../../server/currentUser';
import { artifactResponse } from '../../../../../server/download';

export const runtime = 'nodejs';

export const GET = withUser<{ params: Promise<{ id: string }> }>(async (userId, _request, { params }) => {
  return artifactResponse(userId, (await params).id, 'docx', true);
});
