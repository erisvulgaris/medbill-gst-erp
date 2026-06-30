/**
 * Authentication & Authorization Layer
 * See: docs/15_SECURITY_GUIDE.md, ADR-006, docs/09_PERMISSION_MATRIX.md
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-error";

// Backward compat: export getActiveBusiness for old routes
export async function getActiveBusiness() {
  return await db.business.findFirst({ orderBy: { createdAt: "asc" } });
}

export function parseModules(json: string | null | undefined) {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

// ── Config ──
const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "dev-secret-change-in-production";
const TOKEN_COOKIE = "medbill_session";
const TOKEN_EXPIRY_DAYS = 30;
const BCRYPT_ROUNDS = 12;

// ── Types ──
export type Role = "owner" | "partner" | "manager" | "cashier" | "sales" | "purchase" | "store_keeper" | "warehouse_manager" | "delivery" | "employee" | "auditor" | "ca" | "accountant";

export interface SessionToken {
  uid: string; email: string; name: string;
  activeBid: string; role: Role; iat: number; exp: number;
}

export interface AuthContext {
  user: { id: string; name: string; email: string; };
  business: { id: string; name: string; industry: string; stateCode: string | null; };
  role: Role; memberId: string;
}

// ── Password ──
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── Token ──
function sign(payload: SessionToken): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verify(token: string): SessionToken | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expected = createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
    const sBuf = Buffer.from(sig), eBuf = Buffer.from(expected);
    if (sBuf.length !== eBuf.length || !timingSafeEqual(sBuf, eBuf)) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionToken;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

export function createSessionToken(user: { id: string; email: string; name: string }, bid: string, role: Role): string {
  const now = Date.now();
  return sign({ uid: user.id, email: user.email, name: user.name, activeBid: bid, role, iat: now, exp: now + TOKEN_EXPIRY_DAYS * 86400000 });
}

// ── Cookie ──
export async function setSessionCookie(res: NextResponse, token: string, rememberMe = true): Promise<void> {
  res.cookies.set(TOKEN_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: rememberMe ? TOKEN_EXPIRY_DAYS * 86400 : 86400, path: "/" });
}
export async function clearSessionCookie(res: NextResponse): Promise<void> { res.cookies.delete(TOKEN_COOKIE); }
export function getTokenFromRequest(req: NextRequest): string | undefined { return req.cookies.get(TOKEN_COOKIE)?.value; }

// ── Auth Context ──
export async function getAuthContext(req: NextRequest): Promise<AuthContext> {
  const token = getTokenFromRequest(req);
  if (!token) throw ApiError.unauthorized("No session token");
  const payload = verify(token);
  if (!payload) throw ApiError.unauthorized("Invalid or expired session");
  const user = await db.user.findFirst({ where: { id: payload.uid, status: "active", deletedAt: null } });
  if (!user) throw ApiError.unauthorized("User not found or suspended");
  const membership = await db.businessMember.findFirst({ where: { userId: payload.uid, businessId: payload.activeBid, status: "active" }, include: { business: true } });
  if (!membership) throw ApiError.forbidden("No active membership");
  return { user: { id: user.id, name: user.name, email: user.email }, business: { id: membership.business.id, name: membership.business.name, industry: membership.business.industry, stateCode: membership.business.stateCode }, role: membership.role as Role, memberId: membership.id };
}

export async function requireRole(req: NextRequest, allowed: Role[]): Promise<AuthContext> {
  const ctx = await getAuthContext(req);
  if (!allowed.includes(ctx.role)) throw ApiError.forbidden(`Role '${ctx.role}' not permitted`);
  return ctx;
}

export async function requireAuth(req: NextRequest): Promise<AuthContext> { return getAuthContext(req); }

// ── Login/Register ──
export interface LoginResult { token: string; user: { id: string; name: string; email: string }; business: { id: string; name: string } | null; role: Role | null; }

export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  const user = await db.user.findFirst({ where: { email: email.toLowerCase(), status: "active", deletedAt: null } });
  if (!user || !user.passwordHash) throw ApiError.unauthorized("Invalid email or password");
  if (!await verifyPassword(password, user.passwordHash)) throw ApiError.unauthorized("Invalid email or password");
  const m = await db.businessMember.findFirst({ where: { userId: user.id, status: "active" }, include: { business: true }, orderBy: { createdAt: "asc" } });
  const token = createSessionToken({ id: user.id, email: user.email, name: user.name }, m?.businessId || "", (m?.role as Role) || "owner");
  return { token, user: { id: user.id, name: user.name, email: user.email }, business: m ? { id: m.business.id, name: m.business.name } : null, role: (m?.role as Role) || "owner" };
}

export async function registerWithPassword(name: string, email: string, password: string): Promise<LoginResult> {
  const existing = await db.user.findFirst({ where: { email: email.toLowerCase() } });
  if (existing) throw ApiError.conflict("Email already registered");
  const passwordHash = await hashPassword(password);
  const user = await db.user.create({ data: { name, email: email.toLowerCase(), passwordHash, authProvider: "email" } });
  const token = createSessionToken({ id: user.id, email: user.email, name: user.name }, "", "owner");
  return { token, user: { id: user.id, name: user.name, email: user.email }, business: null, role: "owner" };
}

// ── OTP (stub — requires external SMS/Email service) ──
export async function sendOtp(identifier: string, channel: "phone" | "email"): Promise<{ otpId: string }> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpId = randomBytes(16).toString("hex");
  if (process.env.NODE_ENV === "development") console.log(`[OTP] ${channel} to ${identifier}: ${otp}`);
  return { otpId };
}

export async function verifyOtp(identifier: string, otp: string): Promise<LoginResult> {
  // STUB: In production, verify against stored OTP
  throw ApiError.unauthorized("OTP verification not yet implemented — use password login");
}

// ── Business Switching ──
export async function switchBusiness(req: NextRequest, businessId: string): Promise<{ token: string }> {
  const ctx = await getAuthContext(req);
  const m = await db.businessMember.findFirst({ where: { userId: ctx.user.id, businessId, status: "active" } });
  if (!m) throw ApiError.forbidden("Not a member of this business");
  return { token: createSessionToken({ id: ctx.user.id, email: ctx.user.email, name: ctx.user.name }, businessId, m.role as Role) };
}
