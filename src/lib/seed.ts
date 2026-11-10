import type { Db } from "./db";
import { STATUSES } from "./status";

const NAMES = ["김민준", "이서연", "박도윤", "최지우", "정하준", "강서윤", "조이준", "윤하은", "장시우", "임지아", "한유진", "오태윤"];
const ITEMS = ["무선 이어폰", "캠핑 의자", "아동 운동화", "주방 수납함", "LED 스탠드", "휴대폰 케이스", "요가 매트", "블루투스 스피커", "여행용 파우치", "차량용 거치대"];

/** 가상의 배송대행 주문 36건. 실제 고객 정보가 아닙니다. 매번 같은 결과가 나오도록 고정된 규칙으로 만듭니다. */
export function demoRows() {
  return Array.from({ length: 36 }, (_, i) => {
    const n = i + 1;
    return {
      order_no: `SH2611-${String(n).padStart(4, "0")}`,
      customer_name: NAMES[i % NAMES.length],
      phone: `010${String(20000000 + n * 7919).slice(0, 8)}`,
      item_name: ITEMS[(i * 3) % ITEMS.length],
      quantity: (i % 4) + 1,
      tracking_cn: n % 5 === 0 ? null : `YT${String(7700000000 + n * 1237)}`,
      stage: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5][i % 12],
    };
  });
}

export async function seedIfEmpty(db: Db) {
  const [{ n }] = await db.query<{ n: number }>("select count(*)::int as n from shipments");
  if (n > 0) return;
  await db.tx(async (t) => {
    for (const [i, r] of demoRows().entries()) {
      const base = `now() - interval '${36 - i} hours'`;
      const [{ id }] = await t.query<{ id: number }>(
        `insert into shipments (order_no, customer_name, phone, item_name, quantity, tracking_cn, status, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7, ${base}, ${base} + interval '${r.stage * 5} minutes') returning id::int as id`,
        [r.order_no, r.customer_name, r.phone, r.item_name, r.quantity, r.tracking_cn, STATUSES[r.stage]],
      );
      for (let s = 0; s <= r.stage; s++) {
        await t.query(
          `insert into status_history (shipment_id, from_status, to_status, changed_by, changed_at)
           values ($1, $2, $3, $4, ${base} + interval '${s * 5} minutes')`,
          [id, s === 0 ? null : STATUSES[s - 1], STATUSES[s], s === 0 ? "데모 데이터" : "데모 직원"],
        );
      }
    }
  });
}
