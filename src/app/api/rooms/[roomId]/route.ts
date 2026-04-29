import { jsonError } from "@/lib/api";
import { getRoomState } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const clientId = searchParams.get("clientId");
    const editKey = searchParams.get("editKey");
    const readKey = searchParams.get("readKey");
    const roomState = await getRoomState(roomId, clientId, editKey, readKey);

    return Response.json(roomState);
  } catch (error) {
    return jsonError(error);
  }
}
