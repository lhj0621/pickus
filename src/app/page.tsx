import { CreateRoomPanel } from "@/components/create-room-panel";
import { Heart, MapPin, MessageCircle, Sparkles, UsersRound } from "lucide-react";

export default function Home() {
  const features = [
    { icon: UsersRound, title: "로그인 없이", description: "초대 링크만 열면 같은 방" },
    { icon: MapPin, title: "상점 검색", description: "Kakao 지도 기반 장소 후보" },
    { icon: MessageCircle, title: "의견 모으기", description: "댓글과 좋아요로 빠르게 정리" },
  ];

  return (
    <div className="min-h-screen bg-[var(--pickus-bg)] text-[var(--pickus-ink)]">
      <main className="mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-4 py-5 md:grid-cols-[minmax(0,1fr)_410px] md:items-center md:px-8 md:py-8">
        <section className="relative flex min-h-[520px] flex-col justify-between overflow-hidden p-1 md:min-h-[660px]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(35,99,76,0.08),transparent_42%),linear-gradient(25deg,transparent_58%,rgba(223,111,86,0.10)_58%,rgba(223,111,86,0.10)_63%,transparent_63%)]" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-lg border border-[#cfe0d7] bg-white/80 px-3 py-1 text-sm font-semibold text-[var(--pickus-green)]">
              <Sparkles size={15} aria-hidden="true" />
              Pickus
            </p>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight tracking-normal text-[#111714] md:text-6xl">
              같이 고르는 우리 동네 맛집 지도
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--pickus-muted)] md:text-lg">
              초대 링크 하나로 친구, 커플, 모임원이 같은 지도에 들어와 상점 핀을 추가하고 댓글과 좋아요로 후보를 좁힙니다.
            </p>
          </div>

          <div className="relative mt-8 rounded-lg border border-[#d4dfd8] bg-[#eef5f1] p-3">
            <div className="relative h-56 overflow-hidden rounded-lg border border-[#cbdad2] bg-[linear-gradient(90deg,rgba(19,59,46,0.07)_1px,transparent_1px),linear-gradient(rgba(19,59,46,0.07)_1px,transparent_1px)] bg-[size:34px_34px]">
              <div className="absolute left-[14%] top-[22%] rounded-lg border border-[#cbd7d1] bg-white px-3 py-2 text-sm font-semibold shadow-sm">
                성수 파스타
              </div>
              <div className="absolute right-[12%] top-[28%] rounded-lg border border-[#ffd6c9] bg-[#fff7f3] px-3 py-2 text-sm font-semibold text-[#9a3d2f] shadow-sm">
                닭갈비 후보
              </div>
              <div className="absolute bottom-[18%] left-[35%] rounded-lg border border-[#dce6df] bg-white px-3 py-2 text-sm font-semibold shadow-sm">
                와인바
              </div>
              <div className="absolute left-[27%] top-[36%] h-16 w-28 rotate-[-10deg] rounded-[50%] border-t-2 border-dashed border-[#8dad9e]" />
              <div className="absolute right-[28%] top-[48%] h-12 w-32 rotate-[12deg] rounded-[50%] border-t-2 border-dashed border-[#d99a80]" />
              <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border border-[#d8e0dc] bg-white/90 px-3 py-2 text-xs font-semibold text-[#264638] shadow-sm">
                <Heart size={14} className="fill-[#df6f56] text-[#df6f56]" aria-hidden="true" />
                12명이 고르는 중
              </div>
            </div>
          </div>

          <div className="relative mt-5 grid gap-3 text-sm text-[#465048] sm:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-lg border border-[#d8e0dc] bg-white/80 p-4">
                <feature.icon className="text-[var(--pickus-green)]" size={18} aria-hidden="true" />
                <p className="mt-3 font-semibold text-[#17201c]">{feature.title}</p>
                <p className="mt-1 leading-5 text-[var(--pickus-muted)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
        <CreateRoomPanel />
      </main>
    </div>
  );
}
