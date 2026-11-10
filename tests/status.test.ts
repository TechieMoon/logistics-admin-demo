import { describe, expect, it } from "vitest";
import { canTransition, nextStatus } from "@/lib/status";

describe("상태 순서", () => {
  it("한 단계 앞으로만 갈 수 있다", () => {
    expect(canTransition("pending", "received")).toBe(true);
    expect(canTransition("received", "shipped")).toBe(true);
  });
  it("건너뛰기와 되돌리기는 막는다", () => {
    expect(canTransition("pending", "shipped")).toBe(false);
    expect(canTransition("shipped", "received")).toBe(false);
    expect(canTransition("pending", "pending")).toBe(false);
  });
  it("배송 완료 다음 단계는 없다", () => {
    expect(nextStatus("delivered")).toBeNull();
  });
});
