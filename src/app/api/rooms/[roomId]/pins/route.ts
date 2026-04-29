import { jsonError, readJson } from "@/lib/api";
import { addPin } from "@/lib/repository";

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const body = await readJson(request);
    const payload = body && typeof body === "object" ? body : {};
    const clientId = "clientId" in payload ? payload.clientId : undefined;
    const place = "place" in payload && payload.place && typeof payload.place === "object" ? payload.place : {};
    const pin = await addPin(roomId, clientId, place);

    return Response.json({ pin }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
