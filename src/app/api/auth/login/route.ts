import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { loginWithPassword, setSessionCookie } from "@/lib/auth";
const schema = z.object({ email: z.string().email("Valid email required"), password: z.string().min(6, "Password must be at least 6 characters"), rememberMe: z.boolean().optional().default(true) });
export const POST = apiHandler(async (req: NextRequest) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) throw ApiError.validation("Invalid login data", parsed.error.issues);
  const { email, password, rememberMe } = parsed.data;
  const result = await loginWithPassword(email, password);
  const res = apiSuccess({ user: result.user, business: result.business, role: result.role });
  await setSessionCookie(res, result.token, rememberMe);
  return res;
});
