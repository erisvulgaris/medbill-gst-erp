import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { switchBusiness, setSessionCookie } from "@/lib/auth";
const schema = z.object({ businessId: z.string().min(1, "Business ID required") });
export const POST = apiHandler(async (req: NextRequest) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) throw ApiError.validation("Invalid request", parsed.error.issues);
  const { token } = await switchBusiness(req, parsed.data.businessId);
  const res = apiSuccess({ switched: true });
  await setSessionCookie(res, token, true);
  return res;
});
