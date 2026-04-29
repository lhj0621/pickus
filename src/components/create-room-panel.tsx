"use client";

import { ArrowRight, Loader2, MapPinned } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function CreateRoomPanel() {
  const router = useRouter();
  const [name, setName] = useState("주말 맛집 후보");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "지도 방을 만들 수 없습니다.");
      }

      router.push(`/rooms/${data.room.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "지도 방을 만들 수 없습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-[#d8e0dc] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-[#dff1e8] text-[#23634c]">
          <MapPinned size={20} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-[#171b18]">공유 지도 만들기</h2>
          <p className="mt-1 text-sm text-[#687066]">방을 만든 뒤 초대 링크를 보내면 바로 같이 볼 수 있어요.</p>
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-[#343a35]" htmlFor="room-name">
          지도 이름
        </label>
        <input
          id="room-name"
          value={name}
          maxLength={40}
          onChange={(event) => setName(event.target.value)}
          className="h-12 w-full rounded-lg border border-[#cbd7d1] bg-[#f9fbfa] px-3 text-base outline-none transition focus:border-[#2f6b57] focus:ring-2 focus:ring-[#cce8dc]"
          placeholder="예: 성수 데이트 맛집"
        />
        {error ? (
          <p className="rounded-lg border border-[#f0c8c4] bg-[#fff3f1] px-3 py-2 text-sm text-[#9d2b22]">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1f5d49] px-4 text-sm font-semibold text-white transition hover:bg-[#184a3a] disabled:cursor-not-allowed disabled:bg-[#8ba99c]"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
          지도 방 시작하기
        </button>
      </form>
    </section>
  );
}
