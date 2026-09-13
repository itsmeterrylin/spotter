export type ErrorStatus = 400 | 404 | 409;

export class ApiError extends Error {
  constructor(
    readonly status: ErrorStatus,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const invalid = (message: string): ApiError => new ApiError(400, 'invalid', message);
export const notFound = (what: string, id: string): ApiError => new ApiError(404, 'not_found', `${what} ${id} not found`);
export const conflict = (message: string): ApiError => new ApiError(409, 'conflict', message);
