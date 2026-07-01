/**
 * Admin authentication helper.
 * Checks for super_admin role in the user's authProvider field.
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { verify, getTokenFromRequest } from "@/lib/auth";

export async function requireAdmin(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) throw ApiError.unauthorized("Admin authentication required");

  const payload = verify(token);
  if (!payload) throw ApiError.unauthorized("Invalid or expired session");

  const user = await db.user.findFirst({
    where: { id: payload.uid, status: "active", deletedAt: null },
  });
  if (!user) throw ApiError.unauthorized("User not found");

  if (user.authProvider !== "super_admin") {
    throw ApiError.forbidden("Super admin access required");
  }

  return {
    user: { id: user.id, name: user.name, email: user.email },
    role: "super_admin" as const,
  };
}
