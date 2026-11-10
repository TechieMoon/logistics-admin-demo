import { describe, expect, it } from "vitest";
import { createToken, verifyToken } from "@/lib/session";

describe("직원 세션 쿠키", () => {
  it("서명이 맞으면 이름을 돌려준다", async () => {
    expect(await verifyToken(await createToken("직원1"))).toBe("직원1");
  });
  it("내용을 바꾸면 거부한다", async () => {
    const t = await createToken("직원1");
    const forged = (await createToken("관리자")).split(".")[0] + "." + t.split(".")[1];
    expect(await verifyToken(forged)).toBeNull();
  });
  it("8시간이 지나면 만료된다", async () => {
    const t = await createToken("직원1", Date.now() - 9 * 3600 * 1000);
    expect(await verifyToken(t)).toBeNull();
  });
});
