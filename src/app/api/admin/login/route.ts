import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const parsed = loginSchema.safeParse(await req.json());
  if (!parsed.success) throw ApiError.validation("Invalid login data", parsed.error.issues);

  const { email, password } = parsed.data;

  const user = await db.user.findFirst({
    where: { email: email.toLowerCase(), authProvider: "super_admin", status: "active", deletedAt: null },
  });
  if (!user || !user.passwordHash) {
    throw ApiError.unauthorized("Invalid admin credentials");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Invalid admin credentials");
  }

  // Admin token: 7-day expiry, no business
  const token = createSessionToken(
    { id: user.id, email: user.email, name: user.name },
    "", // no business
    "owner", // role field (admin uses authProvider=super_admin for checks)
  );

  const res = apiSuccess({
    user: { id: user.id, name: user.name, email: user.email },
    role: "super_admin",
  });
  await setSessionCookie(res, token, false); // 1-day session for admin
  return res;
});
