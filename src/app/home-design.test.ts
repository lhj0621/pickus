import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(join(process.cwd(), "src", "app", "page.tsx"), "utf8");

describe("home design direction", () => {
  it("presents Pickus as an app-first room creation flow", () => {
    expect(homeSource).toContain("친구들이 같이 맛집 후보 고르는 지도방");
    expect(homeSource).toContain("후보 투표판");
    expect(homeSource).toContain("방 만들고 링크 공유");
  });

  it("does not rely on decorative fake-map hero labels", () => {
    expect(homeSource).not.toContain("성수 파스타");
    expect(homeSource).not.toContain("닭갈비 후보");
    expect(homeSource).not.toContain("12명이 고르는 중");
  });
});
