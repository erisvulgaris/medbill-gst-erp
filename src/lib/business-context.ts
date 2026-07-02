/**
 * Business context resolver with demo fallback.
 *
 * In production: requires authenticated session (requireAuth).
 * In development: falls back to first business (demo mode) if no session.
 *
 * This allows the app to remain usable during development while having
 * the full auth framework wired in for production.
 *
 * See: src/lib/auth.ts, docs/15_SECURITY_GUIDE.md
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, requireAuth, type AuthContext, type Role } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";

export interface BusinessContext {
  businessId: string;
  businessName: string;
  industry: string;
  stateCode: string | null;
  userId: string | null;
  role: Role;
  isDemoMode: boolean;
  subscriptionStatus?: string; // trial | active | expired | grace | suspended
  planName?: string; // starter | professional | enterprise
}

/**
 * Get the business context for an API request.
 *
 * Production: throws 401 if not authenticated.
 * Development: tries auth first, falls back to first business.
 */
export async function getBusinessContext(req: NextRequest): Promise<BusinessContext> {
  // Try real auth first
  try {
    const ctx = await getAuthContext(req);
    const sub = await db.subscription.findFirst({
      where: { businessId: ctx.business.id },
      include: { plan: true },
    });
    return {
      businessId: ctx.business.id,
      businessName: ctx.business.name,
      industry: ctx.business.industry,
      stateCode: ctx.business.stateCode,
      userId: ctx.user.id,
      role: ctx.role,
      isDemoMode: false,
      subscriptionStatus: sub?.status,
      planName: sub?.plan?.name,
    };
  } catch {
    // Auth failed — in development, fall back to demo mode
    if (process.env.NODE_ENV === "production") {
      throw ApiError.unauthorized();
    }

    // Development demo fallback
    const biz = await db.business.findFirst({ orderBy: { createdAt: "asc" } });
    if (!biz) {
      throw ApiError.notFound("No business found. Run POST /api/seed first.");
    }

    const sub = await db.subscription.findFirst({
      where: { businessId: biz.id },
      include: { plan: true },
    });

    return {
      businessId: biz.id,
      businessName: biz.name,
      industry: biz.industry,
      stateCode: biz.stateCode,
      userId: null,
      role: "owner" as Role,
      isDemoMode: true,
      subscriptionStatus: sub?.status,
      planName: sub?.plan?.name,
    };
  }
}

/**
 * Require a specific role, with demo fallback in development.
 */
export async function requireRoleOrDemo(
  req: NextRequest,
  allowedRoles: Role[]
): Promise<BusinessContext> {
  const ctx = await getBusinessContext(req);

  // In demo mode, skip role check
  if (ctx.isDemoMode) {
    return ctx;
  }

  // In production, enforce role
  if (!allowedRoles.includes(ctx.role)) {
    throw ApiError.forbidden(`Role '${ctx.role}' not permitted. Required: ${allowedRoles.join(", ")}`);
  }

  return ctx;
}
