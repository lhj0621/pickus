import { jsonError } from "@/lib/api";
import { getRoomShare } from "@/lib/repository";

export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const url = new URL(request.url);
    const editKey = url.searchParams.get("editKey");
    const share = await getRoomShare(roomId, editKey);
    const origin = url.origin;
    const editUrl = `${origin}/rooms/${roomId}?editKey=${encodeURIComponent(share.editKey)}`;
    const readUrl = `${origin}/rooms/${roomId}?readKey=${encodeURIComponent(share.readKey)}`;

    return Response.json({
      editUrl,
      readUrl,
      qrUrl: `${origin}/api/rooms/${roomId}/qr?readKey=${encodeURIComponent(share.readKey)}`,
      ogImageUrl: `${origin}/api/og/rooms/${roomId}?readKey=${encodeURIComponent(share.readKey)}`,
      expiresAt: share.expiresAt,
    });
  } catch (error) {
    return jsonError(error);
  }
}
