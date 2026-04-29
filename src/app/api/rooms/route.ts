import { jsonError, readJson } from "@/lib/api";
import { createRoom } from "@/lib/repository";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const name = typeof body === "object" && body !== null && "name" in body ? body.name : undefined;
    const room = await createRoom(name);

    return Response.json({ room }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
