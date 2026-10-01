const TRUNCATION_MARKER = '… [truncated]';

/** Clip text to at most maxBytes of UTF-8 (never mid-character), ending in a marker when clipped. */
export function truncateToBytes(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) return text;
  const markerBytes = Buffer.byteLength(TRUNCATION_MARKER, 'utf8');
  const clipped = Buffer.from(text, 'utf8')
    .subarray(0, Math.max(0, maxBytes - markerBytes))
    .toString('utf8')
    .replace(/�+$/, '');
  return `${clipped.trimEnd()}${TRUNCATION_MARKER}`;
}
