import { CreateRoomPanel } from "@/components/create-room-panel";
import { Heart, Link2, MapPin, MessageCircle, Search, UsersRound } from "lucide-react";

export default function Home() {
  const steps = [
    { icon: Link2, title: "방 만들고 링크 공유", description: "로그인 없이 초대 링크로 입장" },
    { icon: Search, title: "상점 검색해서 추가", description: "지도에서 후보 장소를 바로 저장" },
    { icon: Heart, title: "좋아요와 댓글로 결정", description: "각자 의견을 남기고 후보를 좁히기" },
  ];

  const candidates = [
    { name: "연남 칼국수", note: "비 오는 날 가기 좋음", likes: 7, comments: 3, accent: "bg-[#fff5ef] text-[#9a3d2f]" },
    { name: "성수 와인바", note: "2차까지 한 번에 해결", likes: 5, comments: 4, accent: "bg-[#eef7f2] text-[#23634c]" },
    { name: "합정 닭갈비", note: "예약 안 해도 자리 넓음", likes: 4, comments: 2, accent: "bg-[#fff9e8] text-[#80601f]" },
  ];

  return (
    <div className="min-h-screen bg-[var(--pickus-bg)] text-[var(--pickus-ink)]">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
        <header className="flex items-center justify-between gap-4 border-b border-[#dce4de] pb-4">
          <p className="text-xl font-semibold text-[var(--pickus-green-dark)]">Pickus</p>
          <div className="hidden items-center gap-2 text-sm text-[#647067] sm:flex">
            <UsersRound size={16} aria-hidden="true" />
            로그인 없는 공유 지도방
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_410px] lg:items-start">
          <div className="min-w-0 pt-2">
            <p className="inline-flex items-center gap-2 rounded-lg border border-[#d7e3dc] bg-white px-3 py-1 text-sm font-medium text-[var(--pickus-green)]">
              <MapPin size={15} aria-hidden="true" />
              모임 장소 후보를 한 방에서
            </p>
            <h1 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight tracking-normal text-[#111714] md:text-4xl">
              친구들이 같이 맛집 후보 고르는 지도방
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--pickus-muted)]">
              방을 만들고 링크를 보내면, 각자 가고 싶은 곳을 지도에 추가하고 좋아요와 댓글로 바로 비교할 수 있어요.
            </p>
          </div>

          <div className="lg:sticky lg:top-8 lg:col-start-2 lg:row-span-3">
            <CreateRoomPanel />
          </div>

          <div className="min-w-0 lg:col-start-1">
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {steps.map((step) => (
                <div key={step.title} className="rounded-lg border border-[#d8e0dc] bg-white px-4 py-3">
                  <step.icon size={17} className="text-[var(--pickus-green)]" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-[#17201c]">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--pickus-muted)]">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          <section className="min-w-0 lg:col-start-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[#17201c]">후보 투표판</h2>
                <p className="mt-1 text-sm text-[#69746e]">친구들이 추가한 장소가 이렇게 쌓입니다.</p>
              </div>
              <span className="shrink-0 rounded-lg border border-[#d7e3dc] bg-white px-3 py-1 text-xs font-semibold text-[#23634c]">
                예시 3곳
              </span>
            </div>
            <div className="mt-3 grid gap-3">
              {candidates.map((candidate, index) => (
                <div key={candidate.name} className="rounded-lg border border-[#d8e0dc] bg-white p-4 shadow-sm">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#7b857d]">후보 {index + 1}</p>
                      <p className="mt-1 break-words text-base font-semibold text-[#111714]">{candidate.name}</p>
                      <p className="mt-1 break-words text-sm text-[#667166]">{candidate.note}</p>
                    </div>
                    <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${candidate.accent}`}>
                      투표중
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-sm text-[#4d594f]">
                    <span className="inline-flex items-center gap-1">
                      <Heart size={15} className="fill-[#df6f56] text-[#df6f56]" aria-hidden="true" />
                      {candidate.likes}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle size={15} aria-hidden="true" />
                      {candidate.comments}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
