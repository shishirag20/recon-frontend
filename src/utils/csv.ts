/**
 * Lightweight client-side CSV header reading - just enough to preview a
 * file's column names before upload (e.g. for field-mapping resolution
 * against the backend). Not a full CSV parser: unlike the backend's real
 * `csv.DictReader`, this does not handle quoted headers containing commas.
 * Acceptable for a header preview; upgrade if that turns out to matter.
 */

const HEADER_SLICE_BYTES = 64 * 1024;

export async function readCsvHeaders(file: File): Promise<string[]> {
  let text = await file.slice(0, HEADER_SLICE_BYTES).text();

  // Growing once covers a pathologically long header row without reading
  // an entire large file (uploads can be up to 50MB) just to find one line.
  if (!text.includes('\n') && !text.includes('\r') && file.size > HEADER_SLICE_BYTES) {
    text = await file.slice(0, Math.min(file.size, HEADER_SLICE_BYTES * 4)).text();
  }

  const firstLine = text.split(/\r\n|\n|\r/)[0] ?? '';
  return firstLine
    .split(',')
    .map((h) => h.trim())
    .filter((h) => h.length > 0);
}
