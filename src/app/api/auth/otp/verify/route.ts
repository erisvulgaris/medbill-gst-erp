import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { verifyOtp, setSessionCookie } from "@/lib/auth";

const otpVerifySchema = z.object({
  identifier: z.string().min(1, "Identifier required"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  channel: z.enum(["phone", "email"]),
});

/** POST /api/auth/otp/verify — verify OTP and return session */
export const POST = apiHandler(async (req: NextRequest) => {
  const parsed = otpVerifySchema.safeParse(await req.json());
  if (!parsed.success) {
    throw ApiError.validation("Invalid request", parsed.error.issues);
  }

  const { identifier, otp, channel } = parsed.data;
  const result = await verifyOtp(identifier, otp, channel);

  const response = apiSuccess({
    user: result.user,
    business: result.business,
    role: result.role,
  });
  await setSessionCookie(response, result.token, true);
  return response;
});
