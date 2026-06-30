import { NextRequest } from "next/server";
import { apiHandler, apiSuccess } from "@/lib/api-error";
import { clearSessionCookie } from "@/lib/auth";
export const POST = apiHandler(async (req: NextRequest) => {
  const res = apiSuccess({ loggedOut: true });
  await clearSessionCookie(res);
  return res;
});
