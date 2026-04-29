"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Loader2, MapPinned } from "lucide-react";
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
    <section className="rounded-lg border border-[var(--pickus-border)] bg-[var(--pickus-surface)] p-5 shadow-[0_18px_60px_rgba(31,57,45,0.08)]">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg border border-[#cfe0d7] bg-[#e8f3ed] text-[var(--pickus-green)]">
          <MapPinned size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-[#171b18]">지도방 만들기</h2>
          <p className="mt-1 text-sm text-[#687066]">이름만 정하면 바로 초대 링크를 공유할 수 있어요.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 text-sm text-[#4f594f]">
        <p className="flex items-center gap-2 rounded-lg border border-[#dce6df] bg-[#f7faf8] px-3 py-2">
          <CheckCircle2 size={16} className="text-[var(--pickus-green)]" aria-hidden="true" />
          친구에게 보일 지도방 이름만 정하면 됩니다.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="flex items-end justify-between gap-3">
          <label className="block text-sm font-medium text-[#343a35]" htmlFor="room-name">
            지도방 이름
          </label>
          <span className="text-xs text-[#7a837a]">{name.length}/40</span>
        </div>
        <input
          id="room-name"
          value={name}
          maxLength={40}
          onChange={(event) => setName(event.target.value)}
          className="h-12 w-full rounded-lg border border-[#cbd7d1] bg-[#f9fbfa] px-3 text-base outline-none transition placeholder:text-[#9aa49d] focus:border-[#2f6b57] focus:ring-2 focus:ring-[#cce8dc]"
          placeholder="예: 성수 데이트 맛집"
        />
        {error ? (
          <p className="flex items-start gap-2 rounded-lg border border-[#f0c8c4] bg-[#fff3f1] px-3 py-2 text-sm text-[#9d2b22]" role="alert">
            <AlertCircle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--pickus-green-dark)] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(19,59,46,0.18)] transition hover:bg-[#0f3025] focus:outline-none focus:ring-2 focus:ring-[#cce8dc] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#8ba99c] disabled:shadow-none"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
          지도방 시작하기
        </button>
      </form>
    </section>
  );
}
