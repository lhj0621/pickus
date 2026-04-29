import { CreateRoomPanel } from "@/components/create-room-panel";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f4f7f6] text-[#1f2320]">
      <main className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-5 py-8 md:grid-cols-[1fr_420px] md:items-center md:px-8">
        <section className="flex min-h-[420px] flex-col justify-between rounded-lg border border-[#d8e0dc] bg-white p-6 shadow-sm md:min-h-[620px]">
          <div>
            <p className="text-sm font-semibold text-[#2f6b57]">Pickus</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-normal text-[#151816] md:text-6xl">
              같이 고르는 우리 동네 맛집 지도
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#62685f] md:text-lg">
              초대 링크 하나로 친구, 커플, 모임원이 같은 지도에 들어와 상점 핀을 추가하고 댓글과 좋아요로 후보를 좁힙니다.
            </p>
          </div>
          <div className="mt-8 grid gap-3 text-sm text-[#4f564d] sm:grid-cols-3">
            <div className="rounded-lg border border-[#d8e0dc] bg-[#f7faf9] p-4">로그인 없이 방 만들기</div>
            <div className="rounded-lg border border-[#d8e0dc] bg-[#f7faf9] p-4">Kakao 지도에서 상점 검색</div>
            <div className="rounded-lg border border-[#d8e0dc] bg-[#f7faf9] p-4">댓글과 좋아요로 후보 정리</div>
          </div>
        </section>
        <CreateRoomPanel />
      </main>
    </div>
  );
}
