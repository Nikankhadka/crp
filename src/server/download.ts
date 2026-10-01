import { getArtifact, type ArtifactName } from './jobStore';

/** Serve a stored job artifact with its stored content type; 404 JSON when it is missing. */
export async function artifactResponse(
  userId: string,
  id: string,
  name: ArtifactName,
  download = false,
): Promise<Response> {
  const artifact = await getArtifact(userId, id, name);
  if (!artifact) return Response.json({ error: 'artifact not found' }, { status: 404 });
  return new Response(new Uint8Array(artifact.data), {
    headers: {
      'content-type': artifact.contentType,
      'content-disposition': `${download ? 'attachment' : 'inline'}; filename="${artifact.filename}"`,
      'content-length': String(artifact.data.byteLength),
    },
  });
}
