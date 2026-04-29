import type { Metadata } from "next";
import { Suspense } from "react";

import { RoomWorkspace } from "@/components/room-workspace";
import { getRoomState } from "@/lib/repository";

type RoomPageProps = {
  params: Promise<{ roomId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: RoomPageProps): Promise<Metadata> {
  const { roomId } = await params;
  const query = searchParams ? await searchParams : {};
  const readKey = getFirstQueryValue(query.readKey);
  const title = "Pickus 지도방";
  const description = "친구들과 함께 맛집 후보를 고르는 공유 지도";

  if (!readKey) {
    return { title, description };
  }

  try {
    const roomState = await getRoomState(roomId, null, null, readKey);
    const roomTitle = `${roomState.room.name} | Pickus`;
    const imageUrl = `/api/og/rooms/${roomId}?readKey=${encodeURIComponent(readKey)}`;

    return {
      title: roomTitle,
      description,
      openGraph: {
        title: roomTitle,
        description,
        images: [{ url: imageUrl, width: 1200, height: 630, alt: `${roomState.room.name} 공유 이미지` }],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: roomTitle,
        description,
        images: [imageUrl],
      },
    };
  } catch {
    return { title, description };
  }
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f7f3]" />}>
      <RoomWorkspace roomId={roomId} />
    </Suspense>
  );
}

function getFirstQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
