import type { ErrorCode } from "@/constants/errors";

/** Error intended to cross a feature boundary without leaking English text. */
export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode) {
    super(code);
    this.name = "AppError";
    this.code = code;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
