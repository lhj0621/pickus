import { badRequest } from "./errors";

export type PlaceInput = {
  kakaoPlaceId?: unknown;
  name?: unknown;
  address?: unknown;
  lat?: unknown;
  lng?: unknown;
  category?: unknown;
};

export type NormalizedPlace = {
  kakaoPlaceId: string | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string | null;
};

export function normalizeRoomName(value: unknown): string {
  const name = typeof value === "string" ? value.trim() : "";
  return (name || "새 맛집 지도").slice(0, 40);
}

export function normalizeClientId(value: unknown): string {
  const clientId = typeof value === "string" ? value.trim() : "";
  if (!clientId) {
    throw badRequest("clientId가 필요합니다.");
  }

  return clientId.slice(0, 120);
}

export function normalizeAuthorName(value: unknown): string {
  const name = normalizeText(value, 30);
  return name || "익명";
}

export function normalizePlace(input: PlaceInput): NormalizedPlace {
  const name = normalizeText(input.name, 80);
  if (!name) {
    throw badRequest("상점 이름이 필요합니다.");
  }

  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw badRequest("올바른 좌표가 필요합니다.");
  }

  return {
    kakaoPlaceId: nullableText(input.kakaoPlaceId, 80),
    name,
    address: normalizeText(input.address, 180),
    lat,
    lng,
    category: nullableText(input.category, 80),
  };
}

export function normalizeComment(value: unknown): string {
  const comment = normalizeText(value, 300);
  if (!comment) {
    throw badRequest("댓글을 입력해 주세요.");
  }

  return comment;
}

export function canDeletePin(ownerClientId: string, requesterClientId: string): boolean {
  return ownerClientId === requesterClientId;
}

export function toggleLike(currentLikes: string[], clientId: string): { liked: boolean; likes: string[] } {
  if (currentLikes.includes(clientId)) {
    return {
      liked: false,
      likes: currentLikes.filter((id) => id !== clientId),
    };
  }

  return {
    liked: true,
    likes: [...currentLikes, clientId],
  };
}

function normalizeText(value: unknown, maxLength: number): string {
  return (typeof value === "string" ? value.trim() : "").slice(0, maxLength);
}

function nullableText(value: unknown, maxLength: number): string | null {
  const text = normalizeText(value, maxLength);
  return text || null;
}
