import { db } from "@/lib/db";

export interface BusinessRow {
  id: string;
  name: string;
  legalName: string | null;
  gstin: string | null;
  pan: string | null;
  industry: string;
  businessType: string;
  state: string | null;
  stateCode: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  pincode: string | null;
  logoUrl: string | null;
  currency: string;
  invoicePrefix: string;
  quotationPrefix: string;
  modules: string;
  inventoryMode: string;
  storeMode: string;
}

/**
 * In a single-tenant demo install we treat the first business as the active one.
 * A real multi-business install would resolve this from the authenticated session.
 */
export async function getActiveBusiness(): Promise<BusinessRow | null> {
  const biz = await db.business.findFirst({
    orderBy: { createdAt: "asc" },
  });
  return biz as unknown as BusinessRow | null;
}

export function parseModules(json: string | null | undefined) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
