import { ImageResponse } from "next/og";

import { getRoomState } from "@/lib/repository";

export const runtime = "edge";

export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await context.params;
  const readKey = new URL(request.url).searchParams.get("readKey");
  const roomState = await getRoomState(roomId, null, null, readKey);
  const confirmedPin = roomState.pins.find((pin) => pin.status === "confirmed");

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f5f7f3",
          color: "#151916",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: "34px", fontWeight: 700, color: "#23634c" }}>Pickus</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "64px", fontWeight: 800, lineHeight: 1.1 }}>{roomState.room.name}</div>
          <div style={{ display: "flex", marginTop: "28px", fontSize: "30px", color: "#667166" }}>
            후보 {roomState.pins.length}개 · 좋아요와 댓글로 같이 고르는 지도방
          </div>
        </div>
        <div style={{ display: "flex", gap: "16px", fontSize: "26px" }}>
          <div style={{ display: "flex", padding: "16px 22px", border: "2px solid #d9e1da", borderRadius: "12px", background: "#fffefa" }}>
            {confirmedPin ? `확정: ${confirmedPin.name}` : "아직 확정 전"}
          </div>
          <div style={{ display: "flex", padding: "16px 22px", border: "2px solid #d9e1da", borderRadius: "12px", background: "#fffefa" }}>
            링크로 바로 참여
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
