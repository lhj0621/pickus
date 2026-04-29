import QRCode from "qrcode";

import { jsonError } from "@/lib/api";
import { getRoomState } from "@/lib/repository";

export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const url = new URL(request.url);
    const readKey = url.searchParams.get("readKey");
    if (!readKey) {
      return Response.json({ error: "읽기 링크가 필요합니다." }, { status: 403 });
    }
    await getRoomState(roomId, null, null, readKey);

    const readUrl = `${url.origin}/rooms/${roomId}?readKey=${encodeURIComponent(readKey)}`;
    const svg = await QRCode.toString(readUrl, {
      type: "svg",
      margin: 1,
      width: 240,
      color: { dark: "#133b2e", light: "#fffefa" },
    });

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
