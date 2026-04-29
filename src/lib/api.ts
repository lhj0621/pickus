import { AppError } from "./errors";

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("요청 본문이 올바른 JSON이 아닙니다.", 400);
  }
}

export function jsonError(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json({ error: error.message }, { status: error.statusCode });
  }

  return Response.json({ error: "알 수 없는 오류가 발생했습니다." }, { status: 500 });
}
