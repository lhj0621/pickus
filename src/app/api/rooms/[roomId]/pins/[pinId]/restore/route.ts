import { jsonError, readJson } from "@/lib/api";
import { restorePin } from "@/lib/repository";

export async function POST(request: Request, context: { params: Promise<{ roomId: string; pinId: string }> }) {
  try {
    const { roomId, pinId } = await context.params;
    const body = await readJson(request);
    const payload = body && typeof body === "object" ? body : {};
    const clientId = "clientId" in payload ? payload.clientId : undefined;
    const authorName = "authorName" in payload ? payload.authorName : undefined;
    const editKey = "editKey" in payload ? payload.editKey : undefined;

    await restorePin(roomId, pinId, clientId, editKey, authorName);

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
