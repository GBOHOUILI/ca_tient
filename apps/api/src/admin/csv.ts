// Spreadsheet-safe CSV: every cell quoted, quotes doubled, and cells that a spreadsheet would
// run as a formula (= + - @) prefixed with an apostrophe.
export function csvCell(value: string | null | undefined): string {
  let text = value ?? "";
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(header: string[], rows: (string | null | undefined)[][]): string {
  // BOM so Excel opens the UTF-8 file with the right accents; ";" is the separator French Excel expects.
  return "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\n") + "\n";
}
