import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, apiSuccess, ApiError } from "@/lib/api-error";
import { sendOtp } from "@/lib/auth";

const otpSendSchema = z.object({
  identifier: z.string().min(1, "Identifier required"),
  channel: z.enum(["phone", "email"]),
});

/** POST /api/auth/otp/send — send OTP via SMS or email */
export const POST = apiHandler(async (req: NextRequest) => {
  const parsed = otpSendSchema.safeParse(await req.json());
  if (!parsed.success) {
    throw ApiError.validation("Invalid request", parsed.error.issues);
  }

  const { identifier, channel } = parsed.data;
  const { otpId } = await sendOtp(identifier, channel);

  return apiSuccess({ otpId, expiresInSeconds: 300 });
});
