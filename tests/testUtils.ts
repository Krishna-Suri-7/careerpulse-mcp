/**
 * Creates a valid minimal PDF buffer containing the provided text lines.
 */
export function createSyntheticPdfBuffer(lines: string[]): Buffer {
  let content = 'BT /F1 12 Tf 50 700 Td ';
  for (const line of lines) {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    content += '(' + escaped + ') Tj 0 -15 Td ';
  }
  content += 'ET';

  const parts: Buffer[] = [];
  function add(str: string) {
    parts.push(Buffer.from(str, 'latin1'));
  }

  add('%PDF-1.4\n');
  const offsets: number[] = [];

  // Object 1: Catalog
  offsets[1] = Buffer.concat(parts).length;
  add('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Object 2: Pages
  offsets[2] = Buffer.concat(parts).length;
  add('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // Object 3: Page
  offsets[3] = Buffer.concat(parts).length;
  add('3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n');

  // Object 4: Contents
  offsets[4] = Buffer.concat(parts).length;
  const contentBuf = Buffer.from(content, 'latin1');
  add(`4 0 obj\n<< /Length ${contentBuf.length} >>\nstream\n${content}\nendstream\nendobj\n`);

  // XRef Table
  const startXref = Buffer.concat(parts).length;
  add('xref\n0 5\n');
  add('0000000000 65535 f\r\n');
  for (let i = 1; i <= 4; i++) {
    const offStr = String(offsets[i]).padStart(10, '0') + ' 00000 n\r\n';
    add(offStr);
  }
  add(`trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`);

  return Buffer.concat(parts);
}
