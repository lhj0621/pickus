import { describe, expect, it } from "vitest";

import {
  canDeletePin,
  canMutateRoom,
  calculateOnlineParticipants,
  normalizeClientId,
  normalizeAuthorName,
  normalizeComment,
  normalizePinNote,
  normalizePinStatus,
  normalizePlace,
  normalizePriceLevel,
  normalizeRoomName,
  toggleLike,
} from "./domain";

describe("normalizeRoomName", () => {
  it("빈 방 이름은 기본 이름으로 바꾼다", () => {
    expect(normalizeRoomName("   ")).toBe("새 맛집 지도");
  });

  it("긴 방 이름은 40자로 자른다", () => {
    expect(normalizeRoomName("가".repeat(45))).toHaveLength(40);
  });
});

describe("normalizeClientId", () => {
  it("정상 clientId를 정리한다", () => {
    expect(normalizeClientId("  abc-123  ")).toBe("abc-123");
  });

  it("빈 clientId는 거부한다", () => {
    expect(() => normalizeClientId("")).toThrow("clientId가 필요합니다.");
  });
});

describe("normalizeAuthorName", () => {
  it("빈 이름은 익명으로 바꾼다", () => {
    expect(normalizeAuthorName("   ")).toBe("익명");
  });

  it("이름은 30자로 제한한다", () => {
    expect(normalizeAuthorName("나".repeat(35))).toHaveLength(30);
  });
});

describe("normalizePlace", () => {
  it("상점 핀 입력을 저장 가능한 값으로 정리한다", () => {
    expect(
      normalizePlace({
        kakaoPlaceId: "42",
        name: "  을지면옥  ",
        address: "서울 중구",
        lat: 37.56,
        lng: 126.99,
        category: "음식점",
      }),
    ).toEqual({
      kakaoPlaceId: "42",
      name: "을지면옥",
      address: "서울 중구",
      lat: 37.56,
      lng: 126.99,
      category: "음식점",
    });
  });

  it("상점 이름이 없으면 거부한다", () => {
    expect(() =>
      normalizePlace({
        name: "",
        address: "서울",
        lat: 37.5,
        lng: 127,
      }),
    ).toThrow("상점 이름이 필요합니다.");
  });

  it("위도/경도가 범위를 벗어나면 거부한다", () => {
    expect(() =>
      normalizePlace({
        name: "카페",
        address: "서울",
        lat: 91,
        lng: 127,
      }),
    ).toThrow("올바른 좌표가 필요합니다.");
  });
});

describe("normalizeComment", () => {
  it("댓글을 300자로 제한한다", () => {
    expect(normalizeComment("가".repeat(320))).toHaveLength(300);
  });

  it("빈 댓글은 거부한다", () => {
    expect(() => normalizeComment("   ")).toThrow("댓글을 입력해 주세요.");
  });
});

describe("normalizePinStatus", () => {
  it("지원하는 후보 상태만 허용한다", () => {
    expect(normalizePinStatus("confirmed")).toBe("confirmed");
    expect(normalizePinStatus("hold")).toBe("hold");
  });

  it("알 수 없는 상태는 기본값으로 바꾼다", () => {
    expect(normalizePinStatus("done")).toBe("want");
  });
});

describe("normalizePinNote", () => {
  it("한줄 메모를 80자로 제한한다", () => {
    expect(normalizePinNote("가".repeat(100))).toHaveLength(80);
  });
});

describe("normalizePriceLevel", () => {
  it("가격대를 정리한다", () => {
    expect(normalizePriceLevel("expensive")).toBe("expensive");
    expect(normalizePriceLevel("unknown")).toBeNull();
  });
});

describe("room access", () => {
  it("읽기 전용 접근은 mutation을 막는다", () => {
    expect(canMutateRoom("read")).toBe(false);
    expect(canMutateRoom("edit")).toBe(true);
  });
});

describe("calculateOnlineParticipants", () => {
  it("최근 45초 안에 본 참여자만 온라인으로 본다", () => {
    const now = new Date("2026-04-29T09:00:00.000Z");

    expect(
      calculateOnlineParticipants(
        [
          { clientId: "a", authorName: "민수", color: "#123456", lastSeenAt: "2026-04-29T08:59:20.000Z" },
          { clientId: "b", authorName: "지우", color: "#654321", lastSeenAt: "2026-04-29T08:59:00.000Z" },
        ],
        now,
      ),
    ).toEqual([{ clientId: "a", authorName: "민수", color: "#123456", lastSeenAt: "2026-04-29T08:59:20.000Z" }]);
  });
});

describe("pin permissions", () => {
  it("핀 작성자만 삭제할 수 있다", () => {
    expect(canDeletePin("owner", "owner")).toBe(true);
    expect(canDeletePin("owner", "other")).toBe(false);
  });
});

describe("toggleLike", () => {
  it("좋아요가 없으면 추가한다", () => {
    expect(toggleLike(["a"], "b")).toEqual({ liked: true, likes: ["a", "b"] });
  });

  it("이미 좋아요한 사용자는 취소한다", () => {
    expect(toggleLike(["a", "b"], "a")).toEqual({ liked: false, likes: ["b"] });
  });
});
