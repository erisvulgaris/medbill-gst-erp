import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { registerWithPassword, setSessionCookie } from "@/lib/auth";
const schema = z.object({ name: z.string().min(2, "Name must be at least 2 characters"), email: z.string().email("Valid email required"), password: z.string().min(8, "Password must be at least 8 characters") });
export const POST = apiHandler(async (req: NextRequest) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) throw ApiError.validation("Invalid registration data", parsed.error.issues);
  const { name, email, password } = parsed.data;
  const result = await registerWithPassword(name, email, password);
  const res = apiSuccess({ user: result.user, business: result.business, role: result.role });
  await setSessionCookie(res, result.token, true);
  return res;
});
