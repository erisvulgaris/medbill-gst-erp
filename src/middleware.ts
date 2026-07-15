import { NextRequest, NextResponse } from "next/server";
const EXCLUDED = ["/_next/static", "/_next/image", "/favicon.ico", "/icon.svg", "/manifest.webmanifest"];
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (EXCLUDED.some((p) => pathname.startsWith(p))) return NextResponse.next();
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
    const host = req.headers.get("x-forwarded-host") || req.nextUrl.host;
    const forwardedOrigin = `${proto}://${host}`;
    const allowed = [process.env.NEXT_PUBLIC_APP_URL, req.nextUrl.origin, forwardedOrigin].filter(Boolean);
    if (origin && !allowed.includes(origin)) return new NextResponse(JSON.stringify({ success: false, error: { code: "FORBIDDEN", message: "CSRF: Origin not allowed" }, meta: { requestId } }), { status: 403, headers: { "Content-Type": "application/json", "x-request-id": requestId } });
  }
  const res = NextResponse.next();
  res.headers.set("x-request-id", requestId);
  res.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if (process.env.NODE_ENV === "production") res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
