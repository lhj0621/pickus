import { jsonError, readJson } from "@/lib/api";
import { trackPresence } from "@/lib/repository";

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const body = await readJson(request);
    const payload = body && typeof body === "object" ? body : {};
    const clientId = "clientId" in payload ? payload.clientId : undefined;
    const authorName = "authorName" in payload ? payload.authorName : undefined;
    const editKey = "editKey" in payload ? payload.editKey : undefined;
    const readKey = "readKey" in payload ? payload.readKey : undefined;
    const participant = await trackPresence(roomId, clientId, authorName, editKey, readKey);

    return Response.json({ participant });
  } catch (error) {
    return jsonError(error);
  }
}
