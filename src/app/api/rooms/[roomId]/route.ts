import { jsonError } from "@/lib/api";
import { getRoomState } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const clientId = new URL(request.url).searchParams.get("clientId");
    const roomState = await getRoomState(roomId, clientId);

    return Response.json(roomState);
  } catch (error) {
    return jsonError(error);
  }
}
