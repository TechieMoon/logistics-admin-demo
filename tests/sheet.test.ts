import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { readSheet } from "@/lib/sheet";

describe("엑셀 파일 읽기", () => {
  it("xlsx의 숫자·빈칸을 글자로 읽는다", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("주문");
    ws.addRow(["주문번호", "고객명", "연락처", "품목", "수량"]);
    ws.addRow(["A-1", "홍길동", "010-1111-2222", "의자", 3]);
    ws.addRow([]);
    ws.addRow(["A-2", "", "01022223333", "책상", 1]);
    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const { headers, rows } = await readSheet("orders.xlsx", buf);
    expect(headers).toEqual(["주문번호", "고객명", "연락처", "품목", "수량"]);
    expect(rows[0]).toEqual(["A-1", "홍길동", "010-1111-2222", "의자", "3"]);
    expect(rows[2][0]).toBe("A-2");
    expect(rows[2][1]).toBe("");
  });

  it("다른 형식과 너무 큰 파일은 거부한다", async () => {
    await expect(readSheet("a.xls", new ArrayBuffer(10))).rejects.toThrow("xlsx 또는 csv");
    await expect(readSheet("a.csv", new ArrayBuffer(3 * 1024 * 1024))).rejects.toThrow("2MB");
  });
});
