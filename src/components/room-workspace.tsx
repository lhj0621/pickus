"use client";

import {
  Copy,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getOrCreateClientId, getSavedAuthorName, saveAuthorName } from "@/lib/client-identity";
import type { Pin, PlaceSearchResult, RoomState } from "@/lib/types";

type KakaoLatLng = {
  getLat(): number;
  getLng(): number;
};

type KakaoMap = {
  setCenter(position: KakaoLatLng): void;
  setLevel(level: number): void;
};

type KakaoMarker = {
  setMap(map: KakaoMap | null): void;
};

type KakaoInfoWindow = {
  open(map: KakaoMap, marker: KakaoMarker): void;
  close(): void;
};

type KakaoPlaceRaw = {
  id: string;
  place_name: string;
  road_address_name?: string;
  address_name?: string;
  category_name?: string;
  x: string;
  y: string;
};

type KakaoMaps = {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  Marker: new (options: { map: KakaoMap; position: KakaoLatLng; title?: string }) => KakaoMarker;
  InfoWindow: new (options: { content: string }) => KakaoInfoWindow;
  event: {
    addListener(target: KakaoMarker, type: string, handler: () => void): void;
  };
  services: {
    Places: new () => {
      keywordSearch(keyword: string, callback: (data: KakaoPlaceRaw[], status: string) => void): void;
    };
    Status: {
      OK: string;
    };
  };
};

declare global {
  interface Window {
    kakao?: {
      maps: KakaoMaps;
    };
  }
}

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };

export function RoomWorkspace({ roomId }: { roomId: string }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<Array<{ marker: KakaoMarker; infoWindow: KakaoInfoWindow }>>([]);
  const hasCenteredPinsRef = useRef(false);

  const [clientId, setClientId] = useState("");
  const [authorName, setAuthorName] = useState("익명");
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "missing-key" | "error">(
    KAKAO_APP_KEY ? "loading" : "missing-key",
  );

  const pins = useMemo(() => roomState?.pins ?? [], [roomState]);
  const selectedPin = useMemo(() => pins.find((pin) => pin.id === selectedPinId) ?? pins[0] ?? null, [pins, selectedPinId]);
  const selectedPinRank = useMemo(
    () => (selectedPin ? pins.findIndex((pin) => pin.id === selectedPin.id) + 1 : null),
    [pins, selectedPin],
  );

  const loadRoom = useCallback(async () => {
    try {
      const queryString = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
      const response = await fetch(`/api/rooms/${roomId}${queryString}`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "지도 방을 불러올 수 없습니다.");
      }

      setRoomState(data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "지도 방을 불러올 수 없습니다.");
    } finally {
      setIsLoadingRoom(false);
    }
  }, [clientId, roomId]);

  const initializeMap = useCallback((kakaoMaps: KakaoMaps) => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = new kakaoMaps.Map(mapContainerRef.current, {
      center: new kakaoMaps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng),
      level: 7,
    });
    setMapStatus("ready");
  }, []);

  useEffect(() => {
    const identityTimer = window.setTimeout(() => {
      setClientId(getOrCreateClientId());
      setAuthorName(getSavedAuthorName());
    }, 0);

    return () => window.clearTimeout(identityTimer);
  }, []);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    const initialLoad = window.setTimeout(() => {
      void loadRoom();
    }, 0);
    const timer = window.setInterval(() => {
      void loadRoom();
    }, 5000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [clientId, loadRoom]);

  useEffect(() => {
    if (!KAKAO_APP_KEY) {
      return;
    }

    if (window.kakao?.maps) {
      window.kakao.maps.load(() => initializeMap(window.kakao!.maps));
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-pickus-kakao]");
    const script = existingScript ?? document.createElement("script");

    script.dataset.pickusKakao = "true";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services&autoload=false`;
    script.async = true;
    script.addEventListener("load", () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => initializeMap(window.kakao!.maps));
      }
    });
    script.addEventListener("error", () => setMapStatus("error"));

    if (!existingScript) {
      document.head.appendChild(script);
    }
  }, [initializeMap]);

  useEffect(() => {
    const kakaoMaps = window.kakao?.maps;
    const map = mapRef.current;
    if (!kakaoMaps || !map || !roomState) {
      return;
    }

    markersRef.current.forEach(({ marker, infoWindow }) => {
      infoWindow.close();
      marker.setMap(null);
    });
    markersRef.current = [];

    roomState.pins.forEach((pin) => {
      const marker = new kakaoMaps.Marker({
        map,
        position: new kakaoMaps.LatLng(pin.lat, pin.lng),
        title: pin.name,
      });
      const infoWindow = new kakaoMaps.InfoWindow({
        content: `<div style="padding:8px 10px;font-size:13px;font-weight:600;">${escapeHtml(pin.name)}</div>`,
      });

      kakaoMaps.event.addListener(marker, "click", () => {
        markersRef.current.forEach((item) => item.infoWindow.close());
        infoWindow.open(map, marker);
        setSelectedPinId(pin.id);
      });

      markersRef.current.push({ marker, infoWindow });
    });

    if (!hasCenteredPinsRef.current && roomState.pins[0]) {
      const firstPin = roomState.pins[0];
      map.setCenter(new kakaoMaps.LatLng(firstPin.lat, firstPin.lng));
      map.setLevel(5);
      hasCenteredPinsRef.current = true;
    }
  }, [roomState]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = query.trim();
    const kakaoMaps = window.kakao?.maps;

    if (!keyword || !kakaoMaps) {
      return;
    }

    setIsSearching(true);
    setError(null);

    const places = new kakaoMaps.services.Places();
    places.keywordSearch(keyword, (data, status) => {
      setIsSearching(false);

      if (status !== kakaoMaps.services.Status.OK) {
        setSearchResults([]);
        return;
      }

      const results = data.slice(0, 8).map(mapKakaoPlace);
      setSearchResults(results);

      if (results[0] && mapRef.current) {
        mapRef.current.setCenter(new kakaoMaps.LatLng(results[0].lat, results[0].lng));
        mapRef.current.setLevel(5);
      }
    });
  }

  async function addPlace(place: PlaceSearchResult) {
    await runAction(`add-${place.kakaoPlaceId}`, async () => {
      const response = await fetch(`/api/rooms/${roomId}/pins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, place }),
      });
      await assertOk(response, "핀을 추가할 수 없습니다.");
      await loadRoom();

      const kakaoMaps = window.kakao?.maps;
      if (kakaoMaps && mapRef.current) {
        mapRef.current.setCenter(new kakaoMaps.LatLng(place.lat, place.lng));
      }
    });
  }

  async function deleteSelectedPin(pin: Pin) {
    await runAction(`delete-${pin.id}`, async () => {
      const response = await fetch(`/api/rooms/${roomId}/pins/${pin.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      await assertOk(response, "핀을 삭제할 수 없습니다.");
      setSelectedPinId(null);
      await loadRoom();
    });
  }

  async function toggleLike(pin: Pin) {
    await runAction(`like-${pin.id}`, async () => {
      const response = await fetch(`/api/rooms/${roomId}/pins/${pin.id}/likes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      await assertOk(response, "좋아요를 반영할 수 없습니다.");
      await loadRoom();
    });
  }

  async function submitComment(pin: Pin) {
    const content = commentDrafts[pin.id] ?? "";
    await runAction(`comment-${pin.id}`, async () => {
      const response = await fetch(`/api/rooms/${roomId}/pins/${pin.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, authorName, content }),
      });
      await assertOk(response, "댓글을 추가할 수 없습니다.");
      setCommentDrafts((drafts) => ({ ...drafts, [pin.id]: "" }));
      await loadRoom();
    });
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("초대 링크를 복사할 수 없습니다.");
    }
  }

  async function runAction(actionId: string, action: () => Promise<void>) {
    setPendingAction(actionId);
    setError(null);

    try {
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "요청을 처리할 수 없습니다.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8faf6_0%,#eef4ef_100%)] text-[#17201c]">
      <header className="border-b border-[#d8e0dc] bg-[#fffefa]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pickus-green)]">Pickus</p>
            <h1 className="mt-1 break-words text-2xl font-semibold tracking-normal text-[#111714]">
              {roomState?.room.name ?? "공유 지도"}
            </h1>
            <p className="mt-2 text-sm text-[#687266]">
              후보 {pins.length}개 · 5초마다 자동 갱신
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="author-name">
              이름
            </label>
            <input
              id="author-name"
              value={authorName}
              maxLength={30}
              onChange={(event) => {
                setAuthorName(event.target.value);
                saveAuthorName(event.target.value);
              }}
              className="h-10 min-w-0 rounded-lg border border-[#cbd7d1] bg-[#f9fbfa] px-3 text-sm outline-none transition focus:border-[#2f6b57] focus:ring-2 focus:ring-[#cfe7dd] sm:w-36"
              placeholder="내 이름"
            />
            <button
              type="button"
              onClick={copyInviteLink}
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#cbd7d1] bg-white px-3 text-sm font-medium text-[#24342c] transition hover:bg-[#edf4f1] focus:outline-none focus:ring-2 focus:ring-[#cfe7dd] focus:ring-offset-2"
            >
              <Copy size={16} aria-hidden="true" />
              {copied ? "복사됨" : "초대 링크"}
            </button>
            <span className="sr-only" role="status" aria-live="polite">
              {copied ? "초대 링크가 복사되었습니다." : ""}
            </span>
            <button
              type="button"
              onClick={() => void loadRoom()}
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--pickus-green-dark)] px-3 text-sm font-semibold text-white transition hover:bg-[#0f3025] focus:outline-none focus:ring-2 focus:ring-[#cfe7dd] focus:ring-offset-2"
            >
              <RefreshCw size={16} aria-hidden="true" />
              새로고침
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-h-[560px] overflow-hidden rounded-lg border border-[#d8e0dc] bg-[#fffefa] shadow-[0_16px_60px_rgba(31,57,45,0.08)]">
          <div className="border-b border-[#e1e7e4] bg-white/80 p-3">
            <form className="flex gap-2" onSubmit={handleSearch}>
              <label className="sr-only" htmlFor="place-search">
                상점 검색
              </label>
              <input
                id="place-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 min-w-0 flex-1 rounded-lg border border-[#cbd7d1] bg-[#fbfcfb] px-3 text-sm outline-none transition placeholder:text-[#9aa49d] focus:border-[#2f6b57] focus:ring-2 focus:ring-[#cfe7dd]"
                placeholder="상점명이나 동네를 검색"
              />
              <button
                type="submit"
                disabled={isSearching || mapStatus !== "ready"}
                className="flex h-11 min-w-24 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--pickus-green-dark)] px-4 text-sm font-semibold text-white transition hover:bg-[#0f3025] focus:outline-none focus:ring-2 focus:ring-[#cfe7dd] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#92aaa0]"
                aria-describedby={mapStatus !== "ready" ? "map-status-message" : undefined}
              >
                {isSearching ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
                검색
              </button>
            </form>
            {searchResults.length > 0 ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {searchResults.map((place) => (
                  <button
                    key={place.kakaoPlaceId}
                    type="button"
                    onClick={() => void addPlace(place)}
                    disabled={!clientId || pendingAction === `add-${place.kakaoPlaceId}`}
                    className="min-h-20 rounded-lg border border-[#d8e0dc] bg-[#f9fbfa] p-3 text-left text-sm transition hover:border-[#2f6b57] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#cfe7dd] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex min-w-0 items-start justify-between gap-2">
                      <span className="min-w-0 break-words font-semibold text-[#17201c]">{place.name}</span>
                      <Plus className="mt-0.5 shrink-0 text-[var(--pickus-green)]" size={16} aria-hidden="true" />
                    </span>
                    <span className="mt-1 block break-words text-xs leading-5 text-[#69746e]">{place.address}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative h-[440px] bg-[#dfe8e3] sm:h-[520px]">
            <div ref={mapContainerRef} className="h-full w-full" />
            {mapStatus !== "ready" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#edf3f0] bg-[linear-gradient(90deg,rgba(19,59,46,0.06)_1px,transparent_1px),linear-gradient(rgba(19,59,46,0.06)_1px,transparent_1px)] bg-[size:34px_34px] p-6 text-center">
                <div
                  id="map-status-message"
                  className="max-w-sm rounded-lg border border-[#d7e2dc] bg-white/90 p-5 shadow-sm"
                  role={mapStatus === "loading" ? "status" : "alert"}
                  aria-live={mapStatus === "loading" ? "polite" : "assertive"}
                >
                  <MapPin className="mx-auto text-[#2f6b57]" size={34} aria-hidden="true" />
                  <p className="mt-3 font-semibold text-[#111714]">{getMapStatusTitle(mapStatus)}</p>
                  <p className="mt-2 text-sm leading-6 text-[#66726b]">
                    {getMapStatusDescription(mapStatus)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          {error ? (
            <p className="rounded-lg border border-[#efc7c2] bg-[#fff3f0] px-3 py-2 text-sm text-[#9b2d23]" role="alert">{error}</p>
          ) : null}

          <section className="rounded-lg border border-[#d8e0dc] bg-[#fffefa] shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e1e7e4] px-4 py-3">
              <div>
                <h2 className="text-base font-semibold">후보 투표판</h2>
                <p className="mt-1 text-xs text-[#69746e]">좋아요와 댓글을 보며 고르기</p>
              </div>
              {isLoadingRoom ? <Loader2 className="animate-spin text-[#6d7772]" size={18} aria-hidden="true" /> : null}
            </div>
            <div className="max-h-[320px] overflow-y-auto p-3">
              {pins.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#cbd7d1] bg-[#f7faf8] p-5 text-center text-sm text-[#69746e]">
                  아직 추가된 핀이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {pins.map((pin) => (
                    <button
                      key={pin.id}
                      type="button"
                      onClick={() => {
                        setSelectedPinId(pin.id);
                        centerPin(pin);
                      }}
                      aria-pressed={selectedPin?.id === pin.id}
                      className={`group w-full rounded-lg border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#cfe7dd] ${
                        selectedPin?.id === pin.id
                          ? "border-[#2f6b57] bg-[#edf7f2] shadow-[inset_3px_0_0_#2f6b57]"
                          : "border-[#d8e0dc] bg-[#f9fbfa] hover:border-[#8bb7a6] hover:bg-white"
                      }`}
                    >
                      <span className="flex min-w-0 items-start justify-between gap-2">
                        <span className="min-w-0 break-words font-semibold">{pin.name}</span>
                        <span className="flex shrink-0 items-center gap-1 rounded-lg border border-[#d7e5dd] bg-white px-2 py-1 text-xs text-[#2f6b57]">
                          <Heart size={14} aria-hidden="true" />
                          {pin.likeCount}
                        </span>
                      </span>
                      <span className="mt-2 block break-words text-xs leading-5 text-[#69746e]">{pin.address}</span>
                      <span className="mt-2 flex items-center gap-1 text-xs text-[#7a837a]">
                        <MessageCircle size={13} aria-hidden="true" />
                        댓글 {pin.comments.length}개
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[#d8e0dc] bg-[#fffefa] shadow-sm">
            <div className="border-b border-[#e1e7e4] px-4 py-3">
              <h2 className="text-base font-semibold">선택한 핀</h2>
            </div>
            {selectedPin ? (
              <div className="space-y-4 p-4">
                <div className="border-l-2 border-[#d7e5dd] pl-3">
                  {selectedPinRank ? (
                    <p className="text-xs font-semibold text-[var(--pickus-coral)]">후보 {selectedPinRank}</p>
                  ) : null}
                  <p className="mt-1 break-words text-lg font-semibold">{selectedPin.name}</p>
                  <p className="mt-1 break-words text-sm leading-6 text-[#69746e]">{selectedPin.address}</p>
                  {selectedPin.category ? <p className="mt-2 break-words text-xs font-medium text-[#2f6b57]">{selectedPin.category}</p> : null}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleLike(selectedPin)}
                    disabled={pendingAction === `like-${selectedPin.id}`}
                    className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#cfe7dd] disabled:opacity-60 ${
                      selectedPin.liked
                        ? "border-[#f0c7bd] bg-[#fff3ef] text-[#9a3d2f] hover:bg-[#ffe9e1]"
                        : "border-[#cbd7d1] bg-white text-[#26372f] hover:bg-[#edf4f1]"
                    }`}
                    aria-pressed={selectedPin.liked}
                  >
                    <Heart
                      className={selectedPin.liked ? "fill-[#df5d52] text-[#df5d52]" : "text-[#52615a]"}
                      size={17}
                      aria-hidden="true"
                    />
                    좋아요 {selectedPin.likeCount}
                  </button>
                  {selectedPin.canDelete ? (
                    <button
                      type="button"
                      onClick={() => void deleteSelectedPin(selectedPin)}
                      disabled={pendingAction === `delete-${selectedPin.id}`}
                      className="flex h-10 w-11 shrink-0 items-center justify-center rounded-lg border border-[#efc7c2] bg-white text-[#9b2d23] transition hover:bg-[#fff3f0] focus:outline-none focus:ring-2 focus:ring-[#f0c8c4] disabled:opacity-60"
                      aria-label="핀 삭제"
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <MessageCircle size={16} aria-hidden="true" />
                    댓글 {selectedPin.comments.length}개
                  </div>
                  <div className="max-h-52 space-y-2 overflow-y-auto">
                    {selectedPin.comments.length === 0 ? (
                      <p className="rounded-lg bg-[#f5f8f6] p-3 text-sm text-[#69746e]">아직 댓글이 없습니다.</p>
                    ) : (
                      selectedPin.comments.map((comment) => (
                        <div key={comment.id} className="border-b border-[#edf1ef] pb-2 last:border-b-0">
                          <p className="break-words text-xs font-semibold text-[#2f6b57]">{comment.authorName}</p>
                          <p className="mt-1 break-words text-sm leading-6">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitComment(selectedPin);
                    }}
                  >
                    <label className="sr-only" htmlFor={`comment-${selectedPin.id}`}>
                      댓글
                    </label>
                    <input
                      id={`comment-${selectedPin.id}`}
                      value={commentDrafts[selectedPin.id] ?? ""}
                      maxLength={300}
                      onChange={(event) => setCommentDrafts((drafts) => ({ ...drafts, [selectedPin.id]: event.target.value }))}
                      className="h-10 min-w-0 flex-1 rounded-lg border border-[#cbd7d1] bg-[#fbfcfb] px-3 text-sm outline-none transition focus:border-[#2f6b57] focus:ring-2 focus:ring-[#cfe7dd]"
                      placeholder="의견 남기기"
                    />
                    <button
                      type="submit"
                      disabled={pendingAction === `comment-${selectedPin.id}`}
                      className="flex h-10 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--pickus-green-dark)] text-white transition hover:bg-[#0f3025] focus:outline-none focus:ring-2 focus:ring-[#cfe7dd] disabled:bg-[#92aaa0]"
                      aria-label="댓글 추가"
                    >
                      {pendingAction === `comment-${selectedPin.id}` ? (
                        <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                      ) : (
                        <Plus size={16} aria-hidden="true" />
                      )}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="p-4 text-sm text-[#69746e]">지도에서 상점을 검색해 핀을 추가해 주세요.</div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );

  function centerPin(pin: Pin) {
    const kakaoMaps = window.kakao?.maps;
    if (!kakaoMaps || !mapRef.current) {
      return;
    }

    mapRef.current.setCenter(new kakaoMaps.LatLng(pin.lat, pin.lng));
    mapRef.current.setLevel(4);
  }
}

function mapKakaoPlace(place: KakaoPlaceRaw): PlaceSearchResult {
  return {
    kakaoPlaceId: place.id,
    name: place.place_name,
    address: place.road_address_name || place.address_name || "",
    lat: Number(place.y),
    lng: Number(place.x),
    category: place.category_name || null,
  };
}

async function assertOk(response: Response, fallbackMessage: string): Promise<void> {
  if (response.ok) {
    return;
  }

  const data = await response.json().catch(() => null);
  throw new Error(data && typeof data === "object" && "error" in data ? String(data.error) : fallbackMessage);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMapStatusTitle(mapStatus: "loading" | "ready" | "missing-key" | "error"): string {
  if (mapStatus === "missing-key") {
    return "Kakao Maps API 키가 필요합니다.";
  }

  if (mapStatus === "error") {
    return "지도를 불러오지 못했습니다.";
  }

  return "지도를 준비하고 있습니다.";
}

function getMapStatusDescription(mapStatus: "loading" | "ready" | "missing-key" | "error"): string {
  if (mapStatus === "missing-key") {
    return "Vercel 환경 변수에 NEXT_PUBLIC_KAKAO_MAP_APP_KEY를 추가하면 지도가 표시됩니다.";
  }

  if (mapStatus === "error") {
    return "Kakao Developers의 Web 플랫폼 도메인에 https://pickus.vercel.app 등록 여부를 확인해 주세요.";
  }

  return "잠시만 기다려 주세요.";
}
