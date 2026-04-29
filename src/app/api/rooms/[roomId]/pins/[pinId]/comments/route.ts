import { jsonError, readJson } from "@/lib/api";
import { addComment } from "@/lib/repository";

export async function POST(request: Request, context: { params: Promise<{ roomId: string; pinId: string }> }) {
  try {
    const { roomId, pinId } = await context.params;
    const body = await readJson(request);
    const payload = body && typeof body === "object" ? body : {};
    const clientId = "clientId" in payload ? payload.clientId : undefined;
    const authorName = "authorName" in payload ? payload.authorName : undefined;
    const content = "content" in payload ? payload.content : undefined;
    const comment = await addComment(roomId, pinId, clientId, authorName, content);

    return Response.json({ comment }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
