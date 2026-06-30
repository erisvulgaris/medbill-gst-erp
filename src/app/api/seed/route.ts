import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, apiSuccess } from "@/lib/api-error";

/**
 * Seeds the database with a realistic demo business so the app is fully
 * explorable on first load. Idempotent — safe to call repeatedly.
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const existing = await db.business.findFirst();
  if (existing) {
    return apiSuccess({ message: "already seeded", businessId: existing.id });
  }

  // ── User first (Business requires ownerId) ────────────────
  const user = await db.user.create({
    data: {
      name: "Rahul Sharma",
      email: "owner@balajitraders.in",
      phone: "+91 98200 11223",
    },
  });

  // ── Business ──────────────────────────────────────────────
  const business = await db.business.create({
    data: {
      name: "Shree Balaji Traders",
      legalName: "Shree Balaji Traders Pvt. Ltd.",
      gstin: "27ABCDE1234F1Z5",
      pan: "ABCDE1234F",
      industry: "retail",
      businessType: "partnership",
      email: "accounts@balajitraders.in",
      phone: "+91 98200 11223",
      addressLine1: "Shop 14, APMC Market, Vashi",
      city: "Navi Mumbai",
      state: "Maharashtra",
      stateCode: "27",
      pincode: "400703",
      country: "India",
      currency: "INR",
      invoicePrefix: "INV",
      invoiceSeq: 1,
      quotationPrefix: "QT",
      quotationSeq: 1,
      modules: JSON.stringify({
        pos: true,
        inventory: true,
        gst: true,
        payroll: false,
        crm: true,
        manufacturing: false,
        expiry: false,
        batch: true,
        serial: false,
        barcode: true,
        onlineStore: false,
      }),
      inventoryMode: "inventory_heavy",
      storeMode: "single",
      employeeCount: 6,
      ownerId: user.id,
    },
  });

  await db.businessMember.create({
    data: { businessId: business.id, userId: user.id, role: "owner" },
  });

  // ── Branch ────────────────────────────────────────────────
  const branch = await db.branch.create({
    data: {
      businessId: business.id,
      name: "Main Branch",
      code: "MB",
      isHead: true,
      gstin: business.gstin,
      city: business.city,
      state: business.state,
      stateCode: business.stateCode,
    },
  });

  const warehouse = await db.warehouse.create({
    data: { businessId: business.id, branchId: branch.id, name: "Main Godown", code: "WH-1" },
  });

  // ── Units ─────────────────────────────────────────────────
  const unitData = [
    { name: "Pcs", symbol: "pc" },
    { name: "Box", symbol: "bx" },
    { name: "Kg", symbol: "kg" },
    { name: "Ltr", symbol: "ltr" },
    { name: "Pack", symbol: "pk" },
    { name: "Dozen", symbol: "dz" },
  ];
  const units = await Promise.all(
    unitData.map((u) => db.unit.create({ data: { ...u, businessId: business.id } }))
  );
  const unitByName = Object.fromEntries(units.map((u) => [u.name, u]));

  // ── Tax rates ─────────────────────────────────────────────
  const taxData = [
    { name: "GST 0%", rate: 0, cgst: 0, sgst: 0, igst: 0 },
    { name: "GST 5%", rate: 5, cgst: 2.5, sgst: 2.5, igst: 5 },
    { name: "GST 12%", rate: 12, cgst: 6, sgst: 6, igst: 12 },
    { name: "GST 18%", rate: 18, cgst: 9, sgst: 9, igst: 18 },
    { name: "GST 28%", rate: 28, cgst: 14, sgst: 14, igst: 28 },
  ];
  const taxes = await Promise.all(
    taxData.map((t) => db.taxRate.create({ data: { ...t, businessId: business.id } }))
  );
  const taxByRate = Object.fromEntries(taxes.map((t) => [t.rate, t]));

  // ── Categories ────────────────────────────────────────────
  const catData = [
    "Groceries", "Electronics", "Stationery", "Household", "Beverages", "Personal Care",
  ];
  const cats = await Promise.all(
    catData.map((name) => db.category.create({ data: { name, businessId: business.id } }))
  );
  const catByName = Object.fromEntries(cats.map((c) => [c.name, c]));

  // ── Products ──────────────────────────────────────────────
  const productSeed = [
    { name: "Aashirvaad Atta 5kg", cat: "Groceries", hsn: "1101", unit: "Pack", tax: 5, pp: 240, sp: 290, mrp: 310, stock: 120, min: 20, barcode: "8901491501234" },
    { name: "Tata Salt 1kg", cat: "Groceries", hsn: "2501", unit: "Pack", tax: 5, pp: 22, sp: 28, mrp: 30, stock: 340, min: 50, barcode: "8901030868272" },
    { name: "Fortune Sunflower Oil 1L", cat: "Groceries", hsn: "1512", unit: "Ltr", tax: 5, pp: 130, sp: 155, mrp: 165, stock: 80, min: 15, barcode: "8901030728241" },
    { name: "Surf Excel 1kg", cat: "Household", hsn: "3402", unit: "Pack", tax: 18, pp: 150, sp: 180, mrp: 195, stock: 60, min: 10, barcode: "8901030787834" },
    { name: "Colgate Toothpaste 200g", cat: "Personal Care", hsn: "3306", unit: "Pack", tax: 18, pp: 90, sp: 110, mrp: 120, stock: 80, min: 15, barcode: "8901314020147" },
    { name: "Maggi Noodles 6 Pack", cat: "Groceries", hsn: "1902", unit: "Pack", tax: 18, pp: 84, sp: 96, mrp: 102, stock: 200, min: 30, barcode: "8901058000481" },
    { name: "Parle-G Biscuit Family Pack", cat: "Groceries", hsn: "1905", unit: "Pack", tax: 18, pp: 44, sp: 52, mrp: 55, stock: 120, min: 25, barcode: "8901719101090" },
    { name: "Eveready AA Battery 4", cat: "Electronics", hsn: "8506", unit: "Pack", tax: 18, pp: 80, sp: 100, mrp: 110, stock: 90, min: 20, barcode: "8901060601024" },
    { name: "Philips LED Bulb 9W", cat: "Electronics", hsn: "8539", unit: "Pcs", tax: 18, pp: 90, sp: 120, mrp: 140, stock: 120, min: 10, barcode: "8902010101011" },
    { name: "Reynolds Ball Pen Blue", cat: "Stationery", hsn: "9608", unit: "Pcs", tax: 18, pp: 6, sp: 10, mrp: 12, stock: 500, min: 100, barcode: "8901234567890" },
    { name: "Classmate Notebook 200pg", cat: "Stationery", hsn: "4820", unit: "Pcs", tax: 18, pp: 38, sp: 50, mrp: 55, stock: 150, min: 30, barcode: "8901234567891" },
    { name: "Coca-Cola 750ml", cat: "Beverages", hsn: "2202", unit: "Pcs", tax: 28, pp: 32, sp: 40, mrp: 44, stock: 240, min: 40, barcode: "8901234567892" },
    { name: "Lays Classic 52g", cat: "Groceries", hsn: "2005", unit: "Pack", tax: 12, pp: 12, sp: 20, mrp: 20, stock: 300, min: 60, barcode: "8901234567893" },
    { name: "Dettol Soap 75g", cat: "Personal Care", hsn: "3401", unit: "Pcs", tax: 18, pp: 24, sp: 32, mrp: 35, stock: 18, min: 25, barcode: "8901234567894" },
    { name: "Good Day Cookies 120g", cat: "Groceries", hsn: "1905", unit: "Pack", tax: 18, pp: 28, sp: 38, mrp: 40, stock: 110, min: 20, barcode: "8901234567895" },
  ];

  const products = await Promise.all(
    productSeed.map((p) =>
      db.product.create({
        data: {
          businessId: business.id,
          name: p.name,
          hsn: p.hsn,
          barcode: p.barcode,
          sku: "SKU-" + p.barcode.slice(-5),
          categoryId: catByName[p.cat].id,
          unitId: unitByName[p.unit].id,
          taxId: taxByRate[p.tax].id,
          taxRate: p.tax,
          purchasePrice: p.pp,
          salePrice: p.sp,
          mrp: p.mrp,
          minStock: p.min,
          reorderLevel: p.min,
          openingStock: p.stock,
          stock: p.stock,
          isActive: true,
        },
      })
    )
  );
  const productByName = Object.fromEntries(products.map((p) => [p.name, p]));

  // ── Parties ───────────────────────────────────────────────
  const partySeed = [
    { type: "customer", name: "Anil Kumar", state: "Maharashtra", stateCode: "27", city: "Pune", phone: "9876543210", gstin: null, opening: 0, credit: 50000, creditDays: 30 },
    { type: "customer", name: "Sai Enterprises", state: "Maharashtra", stateCode: "27", city: "Mumbai", phone: "9820011223", gstin: "27AAACS1234M1Z3", opening: 12500, credit: 100000, creditDays: 45 },
    { type: "customer", name: "Maharaja Hotel", state: "Goa", stateCode: "30", city: "Panaji", phone: "9876512345", gstin: "30AAACM4567N1Z1", opening: 0, credit: 75000, creditDays: 30 },
    { type: "customer", name: "Walk-in Customer", state: "Maharashtra", stateCode: "27", city: "Navi Mumbai", phone: null, gstin: null, opening: 0, credit: 0, creditDays: 0 },
    { type: "supplier", name: "Hindustan Unilever Ltd", state: "Maharashtra", stateCode: "27", city: "Mumbai", phone: "9820099887", gstin: "27AAACH1111Q1Z2", opening: -8500, credit: 200000, creditDays: 30 },
    { type: "supplier", name: "ITC Foods Distribution", state: "Karnataka", stateCode: "29", city: "Bengaluru", phone: "8012345678", gstin: "29AAACI5432P1Z9", opening: 0, credit: 150000, creditDays: 45 },
    { type: "supplier", name: "Nestle India Ltd", state: "Goa", stateCode: "30", city: "Panaji", phone: "8321234567", gstin: "30AAACN2222L1Z5", opening: 0, credit: 100000, creditDays: 30 },
  ];
  const parties = await Promise.all(
    partySeed.map((p) =>
      db.party.create({
        data: {
          businessId: business.id,
          type: p.type,
          name: p.name,
          companyName: p.name,
          phone: p.phone,
          gstin: p.gstin,
          state: p.state,
          stateCode: p.stateCode,
          city: p.city,
          openingBalance: p.opening,
          creditLimit: p.credit,
          creditDays: p.creditDays,
        },
      })
    )
  );
  const partyByName = Object.fromEntries(parties.map((p) => [p.name, p]));

  // ── Invoices (last ~75 days, mix of statuses) ─────────────
  const businessStateCode = business.stateCode!;
  const now = new Date();
  let seq = 1;
  const invoiceSpecs = [
    { daysAgo: 1, party: "Sai Enterprises", items: [["Aashirvaad Atta 5kg", 5], ["Fortune Sunflower Oil 1L", 8], ["Tata Salt 1kg", 12]], paid: true },
    { daysAgo: 2, party: "Anil Kumar", items: [["Maggi Noodles 6 Pack", 4], ["Good Day Cookies 120g", 6]], paid: true },
    { daysAgo: 3, party: "Maharaja Hotel", items: [["Fortune Sunflower Oil 1L", 20], ["Tata Salt 1kg", 30], ["Aashirvaad Atta 5kg", 15]], paid: false },
    { daysAgo: 5, party: "Sai Enterprises", items: [["Surf Excel 1kg", 10], ["Colgate Toothpaste 200g", 24]], paid: true },
    { daysAgo: 7, party: "Anil Kumar", items: [["Reynolds Ball Pen Blue", 50], ["Classmate Notebook 200pg", 20]], paid: true },
    { daysAgo: 9, party: "Walk-in Customer", items: [["Coca-Cola 750ml", 6], ["Lays Classic 52g", 10]], paid: true },
    { daysAgo: 12, party: "Maharaja Hotel", items: [["Fortune Sunflower Oil 1L", 12], ["Good Day Cookies 120g", 30]], paid: false },
    { daysAgo: 15, party: "Sai Enterprises", items: [["Philips LED Bulb 9W", 20], ["Eveready AA Battery 4", 15]], paid: true },
    { daysAgo: 18, party: "Anil Kumar", items: [["Dettol Soap 75g", 12], ["Colgate Toothpaste 200g", 8]], paid: true },
    { daysAgo: 22, party: "Maharaja Hotel", items: [["Aashirvaad Atta 5kg", 25], ["Tata Salt 1kg", 40]], paid: true },
    { daysAgo: 28, party: "Sai Enterprises", items: [["Surf Excel 1kg", 15], ["Maggi Noodles 6 Pack", 20]], paid: false },
    { daysAgo: 35, party: "Anil Kumar", items: [["Classmate Notebook 200pg", 40], ["Reynolds Ball Pen Blue", 100]], paid: true },
    { daysAgo: 42, party: "Maharaja Hotel", items: [["Coca-Cola 750ml", 48], ["Lays Classic 52g", 60]], paid: true },
    { daysAgo: 50, party: "Sai Enterprises", items: [["Philips LED Bulb 9W", 30], ["Eveready AA Battery 4", 25]], paid: true },
    { daysAgo: 60, party: "Anil Kumar", items: [["Good Day Cookies 120g", 24], ["Dettol Soap 75g", 18]], paid: true },
    { daysAgo: 68, party: "Walk-in Customer", items: [["Maggi Noodles 6 Pack", 8], ["Coca-Cola 750ml", 4]], paid: true },
  ];

  for (const spec of invoiceSpecs) {
    const party = partyByName[spec.party];
    const partyStateCode = party.stateCode;
    const supplyType = businessStateCode === partyStateCode ? "intra" : "inter";
    const date = new Date(now.getTime() - spec.daysAgo * 86400000);
    const number = `${business.invoicePrefix}-${String(seq).padStart(4, "0")}`;

    let subtotal = 0;
    let taxableValue = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const items = spec.items.map(([prodName, qty]: [string, number]) => {
      const p = productByName[prodName];
      const gross = qty * p.salePrice;
      const taxable = gross; // no discount in seed
      const rate = p.taxRate;
      let cgst = 0, sgst = 0, igst = 0;
      if (supplyType === "intra") { cgst = taxable * rate / 200; sgst = cgst; }
      else { igst = taxable * rate / 100; }
      const total = taxable + cgst + sgst + igst;
      subtotal += gross;
      taxableValue += taxable;
      cgstTotal += cgst;
      sgstTotal += sgst;
      igstTotal += igst;
      return {
        productId: p.id,
        name: p.name,
        hsn: p.hsn,
        quantity: qty,
        unit: p.unit?.symbol ?? null,
        price: p.salePrice,
        taxRate: rate,
        taxable,
        cgst, sgst, igst,
        total,
      };
    });

    const rawGrand = taxableValue + cgstTotal + sgstTotal + igstTotal;
    const grandTotal = Math.round(rawGrand);
    const roundOff = grandTotal - rawGrand;
    const paidAmount = spec.paid ? grandTotal : 0;
    const balance = grandTotal - paidAmount;
    const status = spec.paid ? "paid" : "unpaid";

    const inv = await db.invoice.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        number,
        seq,
        type: "tax_invoice",
        status,
        partyId: party.id,
        partyName: party.name,
        partyGstin: party.gstin,
        partyStateCode: party.stateCode,
        invoiceDate: date,
        dueDate: new Date(date.getTime() + (party.creditDays || 30) * 86400000),
        supplyType,
        subtotal: Math.round(subtotal * 100) / 100,
        taxableValue: Math.round(taxableValue * 100) / 100,
        cgstTotal: Math.round(cgstTotal * 100) / 100,
        sgstTotal: Math.round(sgstTotal * 100) / 100,
        igstTotal: Math.round(igstTotal * 100) / 100,
        roundOff: Math.round(roundOff * 100) / 100,
        grandTotal,
        paidAmount,
        balance,
        placeOfSupply: party.stateCode,
        notes: "Thank you for your business.",
        terms: "Goods once sold will not be taken back. Interest @18% p.a. on overdue bills.",
        createdBy: user.name,
      },
    });

    await db.invoiceItem.createMany({
      data: items.map((it) => ({ ...it, invoiceId: inv.id })),
    });

    if (spec.paid) {
      await db.payment.create({
        data: {
          businessId: business.id,
          type: "receipt",
          mode: party.type === "customer" && spec.party === "Walk-in Customer" ? "cash" : "upi",
          amount: grandTotal,
          date,
          invoiceId: inv.id,
          partyId: party.id,
          reference: "PAY-" + inv.number,
          note: "Payment against " + inv.number,
          createdBy: user.name,
        },
      });
    }

    for (const it of items) {
      await db.product.update({
        where: { id: it.productId! },
        data: { stock: { decrement: it.quantity } },
      });
      await db.stockMovement.create({
        data: {
          businessId: business.id,
          productId: it.productId!,
          warehouseId: warehouse.id,
          type: "sale",
          direction: "out",
          quantity: it.quantity,
          refType: "invoice",
          refId: inv.id,
        },
      });
    }

    seq++;
  }
  await db.business.update({ where: { id: business.id }, data: { invoiceSeq: seq } });

  // ── Purchases ─────────────────────────────────────────────
  let pseq = 1;
  const purchaseSpecs = [
    { daysAgo: 4, supplier: "Hindustan Unilever Ltd", items: [["Surf Excel 1kg", 50], ["Colgate Toothpaste 200g", 80], ["Dettol Soap 75g", 100]] },
    { daysAgo: 10, supplier: "ITC Foods Distribution", items: [["Aashirvaad Atta 5kg", 60], ["Good Day Cookies 120g", 120]] },
    { daysAgo: 20, supplier: "Nestle India Ltd", items: [["Maggi Noodles 6 Pack", 100], ["Coca-Cola 750ml", 200]] },
    { daysAgo: 30, supplier: "Hindustan Unilever Ltd", items: [["Fortune Sunflower Oil 1L", 40], ["Tata Salt 1kg", 200]] },
  ];
  for (const spec of purchaseSpecs) {
    const party = partyByName[spec.supplier];
    const supplyType = businessStateCode === party.stateCode ? "intra" : "inter";
    const date = new Date(now.getTime() - spec.daysAgo * 86400000);
    const number = `PUR-${String(pseq).padStart(4, "0")}`;

    let subtotal = 0, taxableValue = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0;
    const items = spec.items.map(([prodName, qty]: [string, number]) => {
      const p = productByName[prodName];
      const gross = qty * p.purchasePrice;
      const taxable = gross;
      const rate = p.taxRate;
      let cgst = 0, sgst = 0, igst = 0;
      if (supplyType === "intra") { cgst = taxable * rate / 200; sgst = cgst; }
      else { igst = taxable * rate / 100; }
      const total = taxable + cgst + sgst + igst;
      subtotal += gross; taxableValue += taxable;
      cgstTotal += cgst; sgstTotal += sgst; igstTotal += igst;
      return {
        productId: p.id, name: p.name, hsn: p.hsn,
        quantity: qty, unit: p.unit?.symbol ?? null,
        price: p.purchasePrice, taxRate: rate, taxable,
        cgst, sgst, igst, total,
      };
    });
    const rawGrand = taxableValue + cgstTotal + sgstTotal + igstTotal;
    const grandTotal = Math.round(rawGrand);
    const roundOff = grandTotal - rawGrand;

    const pur = await db.purchase.create({
      data: {
        businessId: business.id, branchId: branch.id, number, seq: pseq,
        type: "purchase", status: "received", partyId: party.id, partyName: party.name,
        partyGstin: party.gstin, partyStateCode: party.stateCode,
        invoiceNumber: "SUP-" + pseq, invoiceDate: date, receivedDate: date,
        supplyType,
        subtotal: Math.round(subtotal * 100) / 100,
        taxableValue: Math.round(taxableValue * 100) / 100,
        cgstTotal: Math.round(cgstTotal * 100) / 100,
        sgstTotal: Math.round(sgstTotal * 100) / 100,
        igstTotal: Math.round(igstTotal * 100) / 100,
        roundOff: Math.round(roundOff * 100) / 100,
        grandTotal, paidAmount: grandTotal, balance: 0,
        createdBy: user.name,
      },
    });
    await db.purchaseItem.createMany({ data: items.map((it) => ({ ...it, purchaseId: pur.id })) });
    for (const it of items) {
      await db.stockMovement.create({
        data: {
          businessId: business.id, productId: it.productId!, warehouseId: warehouse.id,
          type: "purchase", direction: "in", quantity: it.quantity,
          refType: "purchase", refId: pur.id,
        },
      });
    }
    pseq++;
  }

  // ── Expenses ──────────────────────────────────────────────
  const expenseSpecs = [
    { daysAgo: 1, cat: "utilities", amount: 1850, note: "Electricity bill", mode: "upi" },
    { daysAgo: 3, cat: "rent", amount: 25000, note: "Shop rent", mode: "bank" },
    { daysAgo: 5, cat: "salary", amount: 45000, note: "Staff salary", mode: "bank" },
    { daysAgo: 8, cat: "travel", amount: 1200, note: "Fuel", mode: "cash" },
    { daysAgo: 12, cat: "marketing", amount: 3500, note: "WhatsApp marketing", mode: "upi" },
    { daysAgo: 16, cat: "misc", amount: 600, note: "Stationery", mode: "cash" },
    { daysAgo: 22, cat: "utilities", amount: 1400, note: "Internet & phone", mode: "upi" },
    { daysAgo: 28, cat: "rent", amount: 25000, note: "Shop rent", mode: "bank" },
  ];
  for (const e of expenseSpecs) {
    await db.expense.create({
      data: {
        businessId: business.id, category: e.cat, amount: e.amount,
        date: new Date(now.getTime() - e.daysAgo * 86400000),
        mode: e.mode, note: e.note, createdBy: user.name,
      },
    });
  }

  // ── Notifications ─────────────────────────────────────────
  await db.notification.createMany({
    data: [
      { businessId: business.id, title: "Low stock alert", body: "Colgate Toothpaste 200g is below minimum stock (8 < 15).", kind: "stock", read: false },
      { businessId: business.id, title: "Out of stock", body: "Parle-G Biscuit Family Pack is out of stock.", kind: "stock", read: false },
      { businessId: business.id, title: "Payment received", body: "₹1,947.00 received from Anil Kumar.", kind: "payment", read: true },
      { businessId: business.id, title: "Overdue invoice", body: "INV-0011 to Sai Enterprises is overdue.", kind: "warning", read: false },
      { businessId: business.id, title: "GSTR-1 due", body: "GSTR-1 filing due in 3 days for current period.", kind: "gst", read: false },
    ],
  });

  // ── Audit log ─────────────────────────────────────────────
  await db.auditLog.create({
    data: {
      businessId: business.id, userId: user.id, action: "create",
      entity: "business", entityId: business.id,
      summary: "Business seeded with demo data",
    },
  });

  return apiSuccess({ businessId: business.id });
});
