/**
 * Standardized API error handling and response envelope.
 *
 * Usage in route handlers:
 *   import { apiHandler, ApiError } from "@/lib/api-error";
 *   export const POST = apiHandler(async (req) => { ... });
 *
 * Response envelope:
 *   Success: { success: true, data: T, meta?: {...} }
 *   Error:   { success: false, error: { code, message, details? }, requestId }
 *
 * See: docs/04_API_SPECIFICATION.md, docs/API_AUDIT.md
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "BAD_REQUEST";

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError("BAD_REQUEST", message, 400, details);
  }
  static unauthorized(message = "Authentication required") {
    return new ApiError("UNAUTHORIZED", message, 401);
  }
  static forbidden(message = "Insufficient permissions") {
    return new ApiError("FORBIDDEN", message, 403);
  }
  static notFound(message = "Resource not found") {
    return new ApiError("NOT_FOUND", message, 404);
  }
  static conflict(message: string) {
    return new ApiError("CONFLICT", message, 409);
  }
  static rateLimited(message = "Too many requests") {
    return new ApiError("RATE_LIMITED", message, 429);
  }
  static validation(message: string, details?: unknown) {
    return new ApiError("VALIDATION_ERROR", message, 422, details);
  }
  static internal(message = "Internal server error") {
    return new ApiError("INTERNAL_ERROR", message, 500);
  }
}

/** Standard success response envelope */
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  return NextResponse.json({ success: true, data, error: null, meta }, { status });
}

/** Standard list response envelope */
export function apiList<T>(items: T[], meta?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data: items, error: null, meta: { count: items.length, ...meta } });
}

/** Generate or extract a request ID */
export function getRequestId(req: NextRequest): string {
  const existing = req.headers.get("x-request-id");
  if (existing) return existing;
  try {
    return randomUUID();
  } catch {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

/** Prisma error → ApiError mapping */
function mapPrismaError(e: any): ApiError {
  const code = e?.code;
  if (code === "P2002") {
    return ApiError.conflict("A record with this value already exists");
  }
  if (code === "P2025") {
    return ApiError.notFound("Record not found");
  }
  if (code === "P2003") {
    return ApiError.badRequest("Referenced record does not exist (foreign key violation)");
  }
  return ApiError.internal(`Database error: ${e?.message || "unknown"}`);
}

/**
 * Wrap a route handler with standardized error handling.
 */
export function apiHandler(
  handler: (req: NextRequest, ctx?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx?: any): Promise<NextResponse> => {
    const requestId = getRequestId(req);

    try {
      const response = await handler(req, ctx);
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (e: any) {
      if (e instanceof ApiError) {
        const body = {
          success: false,
          data: null,
          error: {
            code: e.code,
            message: e.message,
            ...(e.details ? { details: e.details } : {}),
          },
          meta: { requestId },
        };
        const response = NextResponse.json(body, { status: e.statusCode });
        response.headers.set("x-request-id", requestId);
        return response;
      }

      if (e?.code?.startsWith("P")) {
        const mapped = mapPrismaError(e);
        const body = {
          success: false,
          data: null,
          error: { code: mapped.code, message: mapped.message },
          meta: { requestId },
        };
        const response = NextResponse.json(body, { status: mapped.statusCode });
        response.headers.set("x-request-id", requestId);
        return response;
      }

      console.error(`[API Error] requestId=${requestId}`, e);
      const body = {
        success: false,
        data: null,
        error: {
          code: "INTERNAL_ERROR" as ErrorCode,
          message: process.env.NODE_ENV === "development" ? e?.message : "Internal server error",
        },
        meta: { requestId },
      };
      const response = NextResponse.json(body, { status: 500 });
      response.headers.set("x-request-id", requestId);
      return response;
    }
  };
}
