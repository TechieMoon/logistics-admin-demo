import { describe, expect, it } from "vitest";
import { maskName, normalizePhone, validateRows } from "@/lib/validate";
import { parseCsv } from "@/lib/sheet";

const H = ["주문번호", "고객명", "연락처", "품목", "수량", "중국송장번호"];

describe("엑셀 행 검증", () => {
  it("정상 행은 표준 형태로 바꾼다", () => {
    const { results } = validateRows(H, [["qs-1", "홍길동", "010-1234-5678", "의자", "2", ""]], new Set());
    expect(results[0].errors).toEqual([]);
    expect(results[0].value).toEqual({ order_no: "QS-1", customer_name: "홍길동", phone: "01012345678", item_name: "의자", quantity: 2, tracking_cn: null });
  });

  it("문제를 행 번호와 함께 모두 알려 준다", () => {
    const { results } = validateRows(
      H,
      [
        ["QS-1", "", "02-123-4567", "의자", "0", ""],
        ["QS-2", "김", "01099998888", "책상", "1.5", ""],
      ],
      new Set(),
    );
    expect(results[0].row).toBe(2);
    expect(results[0].errors).toEqual(["고객명 비어 있음", "연락처 형식 오류", "수량은 1 이상의 정수"]);
    expect(results[1].errors).toEqual(["수량은 1 이상의 정수"]);
  });

  it("파일 안 중복과 이미 등록된 주문번호를 구분한다", () => {
    const rows = [
      ["QS-1", "가", "01011112222", "a", "1"],
      ["qs-1", "나", "01011112223", "b", "1"],
      ["QS-9", "다", "01011112224", "c", "1"],
    ];
    const { results } = validateRows(H.slice(0, 5), rows, new Set(["QS-9"]));
    expect(results[0].errors).toEqual([]);
    expect(results[1].errors).toEqual(["2행과 주문번호 중복"]);
    expect(results[2].errors).toEqual(["이미 등록된 주문번호"]);
  });

  it("필수 열이 없으면 행 검사 전에 멈춘다", () => {
    const r = validateRows(["주문번호", "고객명"], [["a", "b"]], new Set());
    expect(r.missing).toEqual(["연락처", "품목", "수량"]);
    expect(r.results).toEqual([]);
  });

  it("머리글 공백과 다른 이름도 알아본다", () => {
    const r = validateRows(["주문 번호", "이름", "전화번호", "상품명", "수량"], [["A1", "가", "+82 10-1111-2222", "x", "1,000"]], new Set());
    expect(r.results[0].value?.phone).toBe("01011112222");
    expect(r.results[0].value?.quantity).toBe(1000);
  });

  it("빈 줄은 건너뛴다", () => {
    const r = validateRows(H, [["", "", "", "", "", ""], ["A", "가", "01011112222", "x", "1", ""]], new Set());
    expect(r.results.map((x) => x.row)).toEqual([3]);
  });
});

describe("기타", () => {
  it("전화번호 정규화", () => expect(normalizePhone("+82-10-1234-5678")).toBe("01012345678"));
  it("이름 가리기", () => {
    expect(maskName("문선웅")).toBe("문*웅");
    expect(maskName("김철")).toBe("김*");
    expect(maskName("남궁민수")).toBe("남**수");
  });
  it("CSV 따옴표 안의 쉼표와 BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
  });
});
