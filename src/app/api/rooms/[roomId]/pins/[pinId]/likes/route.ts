import { jsonError, readJson } from "@/lib/api";
import { togglePinLike } from "@/lib/repository";

export async function POST(request: Request, context: { params: Promise<{ roomId: string; pinId: string }> }) {
  try {
    const { roomId, pinId } = await context.params;
    const body = await readJson(request);
    const clientId = body && typeof body === "object" && "clientId" in body ? body.clientId : undefined;
    const result = await togglePinLike(roomId, pinId, clientId);

    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
