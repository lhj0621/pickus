import { jsonError, readJson } from "@/lib/api";
import { deletePin } from "@/lib/repository";

export async function DELETE(request: Request, context: { params: Promise<{ roomId: string; pinId: string }> }) {
  try {
    const { roomId, pinId } = await context.params;
    const body = await readJson(request);
    const clientId = body && typeof body === "object" && "clientId" in body ? body.clientId : undefined;

    await deletePin(roomId, pinId, clientId);

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
