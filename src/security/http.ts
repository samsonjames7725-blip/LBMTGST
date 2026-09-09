import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/** Consistent success envelope (spec §45). */
export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * Maps any thrown error to a safe response. Internal details are logged
 * server-side only; clients get a code + human-readable message.
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'Invalid input',
        },
      },
      { status: 400 },
    );
  }
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('[api] unhandled error:', message);
  return NextResponse.json(
    { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Check server logs.' } },
    { status: 500 },
  );
}
