import ExcelJS from "exceljs";

export const MAX_ROWS = 1000;
export const MAX_BYTES = 2 * 1024 * 1024;

/** 따옴표 안의 쉼표·줄바꿈을 처리하는 작은 CSV 파서 */
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); out.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); out.push(row); }
  return out;
}

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if ("text" in v && typeof v.text === "string") return v.text;
    if ("result" in v) return String(v.result ?? "");
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
  }
  return String(v);
}

/** 업로드한 파일을 [머리글, 행들]로 바꿉니다. xlsx와 csv만 받습니다. */
export async function readSheet(fileName: string, buf: ArrayBuffer): Promise<{ headers: string[]; rows: string[][] }> {
  if (buf.byteLength > MAX_BYTES) throw new Error("파일이 2MB보다 큽니다.");
  const lower = fileName.toLowerCase();
  let table: string[][];
  if (lower.endsWith(".csv")) {
    table = parseCsv(new TextDecoder("utf-8").decode(buf));
  } else if (lower.endsWith(".xlsx")) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error("시트가 없습니다.");
    table = [];
    ws.eachRow({ includeEmpty: true }, (r, n) => {
      const vals = (r.values as ExcelJS.CellValue[]).slice(1).map(cellText);
      table[n - 1] = vals;
    });
    table = Array.from(table, (r) => r ?? []);
  } else {
    throw new Error("xlsx 또는 csv 파일만 올릴 수 있습니다.");
  }
  const [headers = [], ...rows] = table;
  if (rows.length > MAX_ROWS) throw new Error(`한 번에 ${MAX_ROWS}행까지만 올릴 수 있습니다.`);
  return { headers: headers.map((h) => String(h).trim()), rows };
}
