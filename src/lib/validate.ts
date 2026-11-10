/** 엑셀·CSV 한 줄을 검사합니다. DB에 접근하지 않는 순수 함수라 테스트하기 쉽습니다. */

export const COLUMNS = {
  order_no: ["주문번호", "order_no"],
  customer_name: ["고객명", "이름", "customer_name"],
  phone: ["연락처", "전화번호", "phone"],
  item_name: ["품목", "상품명", "item_name"],
  quantity: ["수량", "quantity"],
  tracking_cn: ["중국송장번호", "송장번호", "tracking_cn"],
} as const;

export type Field = keyof typeof COLUMNS;
export const REQUIRED: Field[] = ["order_no", "customer_name", "phone", "item_name", "quantity"];

export interface ShipmentInput {
  order_no: string;
  customer_name: string;
  phone: string;
  item_name: string;
  quantity: number;
  tracking_cn: string | null;
}

export interface RowResult {
  row: number; // 엑셀에서 보이는 행 번호 (머리글이 1행)
  raw: Record<string, string>;
  value?: ShipmentInput;
  errors: string[];
}

/** 하이픈·공백·+82 표기를 지우고 숫자만 남깁니다. */
export function normalizePhone(v: string): string {
  let d = v.replace(/[^0-9+]/g, "");
  if (d.startsWith("+82")) d = "0" + d.slice(3);
  return d.replace(/\D/g, "");
}

export function isMobile(d: string): boolean {
  return /^01[016789]\d{7,8}$/.test(d);
}

/** 머리글 이름을 표준 필드로 연결합니다. 찾지 못한 필수 열을 함께 돌려줍니다. */
export function mapHeaders(headers: string[]): { map: Partial<Record<Field, number>>; missing: Field[] } {
  const map: Partial<Record<Field, number>> = {};
  const norm = headers.map((h) => h.replace(/\s/g, "").toLowerCase());
  for (const f of Object.keys(COLUMNS) as Field[]) {
    const idx = norm.findIndex((h) => (COLUMNS[f] as readonly string[]).some((n) => n.toLowerCase() === h));
    if (idx >= 0) map[f] = idx;
  }
  return { map, missing: REQUIRED.filter((f) => map[f] === undefined) };
}

const LABEL: Record<Field, string> = {
  order_no: "주문번호",
  customer_name: "고객명",
  phone: "연락처",
  item_name: "품목",
  quantity: "수량",
  tracking_cn: "중국송장번호",
};

export function validateRows(headers: string[], rows: string[][], existingOrderNos: Set<string>): {
  missing: string[];
  results: RowResult[];
} {
  const { map, missing } = mapHeaders(headers);
  if (missing.length) return { missing: missing.map((m) => LABEL[m]), results: [] };

  const seen = new Map<string, number>();
  const results: RowResult[] = [];
  rows.forEach((cells, i) => {
    const rowNo = i + 2;
    const get = (f: Field) => (map[f] === undefined ? "" : String(cells[map[f]!] ?? "").trim());
    const raw = Object.fromEntries((Object.keys(COLUMNS) as Field[]).map((f) => [f, get(f)]));
    if (Object.values(raw).every((v) => v === "")) return; // 빈 줄은 건너뜀

    const errors: string[] = [];
    for (const f of REQUIRED) if (!raw[f]) errors.push(`${LABEL[f]} 비어 있음`);

    const phone = normalizePhone(raw.phone);
    if (raw.phone && !isMobile(phone)) errors.push("연락처 형식 오류");

    const qty = Number(raw.quantity.replace(/,/g, ""));
    if (raw.quantity && !(Number.isInteger(qty) && qty > 0)) errors.push("수량은 1 이상의 정수");

    const orderNo = raw.order_no.toUpperCase();
    if (orderNo) {
      if (existingOrderNos.has(orderNo)) errors.push("이미 등록된 주문번호");
      else if (seen.has(orderNo)) errors.push(`${seen.get(orderNo)}행과 주문번호 중복`);
      else seen.set(orderNo, rowNo);
    }

    results.push({
      row: rowNo,
      raw,
      errors,
      value: errors.length
        ? undefined
        : {
            order_no: orderNo,
            customer_name: raw.customer_name,
            phone,
            item_name: raw.item_name,
            quantity: qty,
            tracking_cn: raw.tracking_cn || null,
          },
    });
  });
  return { missing: [], results };
}

/** 고객 이름 가운데를 가립니다. 문선웅 → 문*웅, 김철 → 김* */
export function maskName(name: string): string {
  const c = [...name];
  if (c.length <= 1) return name;
  if (c.length === 2) return c[0] + "*";
  return c[0] + "*".repeat(c.length - 2) + c[c.length - 1];
}
