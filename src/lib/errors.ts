export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

export function badRequest(message: string): AppError {
  return new AppError(message, 400);
}

export function notFound(message: string): AppError {
  return new AppError(message, 404);
}

export function forbidden(message: string): AppError {
  return new AppError(message, 403);
}
