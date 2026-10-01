import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { artifactPath, type ArtifactName } from './jobStore';

/** Stream a job artifact with the right content type; 404 JSON when it is missing. */
export function artifactResponse(
  id: string,
  name: ArtifactName,
  contentType: string,
  download = false,
): Response {
  const path = artifactPath(id, name);
  if (!path) return Response.json({ error: 'artifact not found' }, { status: 404 });
  const data = readFileSync(path);
  return new Response(data, {
    headers: {
      'content-type': contentType,
      'content-disposition': `${download ? 'attachment' : 'inline'}; filename="${basename(path)}"`,
      'content-length': String(data.byteLength),
    },
  });
}
