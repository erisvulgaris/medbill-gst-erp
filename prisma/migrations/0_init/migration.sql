-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "avatarUrl" TEXT,
    "authProvider" TEXT NOT NULL DEFAULT 'email',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ip" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "industry" TEXT NOT NULL DEFAULT 'retail',
    "businessType" TEXT NOT NULL DEFAULT 'proprietorship',
    "logoUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "stateCode" TEXT,
    "pincode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "modules" TEXT NOT NULL DEFAULT '{}',
    "inventoryMode" TEXT NOT NULL DEFAULT 'inventory_heavy',
    "storeMode" TEXT NOT NULL DEFAULT 'single',
    "employeeCount" INTEGER NOT NULL DEFAULT 1,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "invoiceSeq" INTEGER NOT NULL DEFAULT 1,
    "quotationPrefix" TEXT NOT NULL DEFAULT 'QT',
    "quotationSeq" INTEGER NOT NULL DEFAULT 1,
    "fyStartMonth" INTEGER NOT NULL DEFAULT 4,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BusinessMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BusinessMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isHead" BOOLEAN NOT NULL DEFAULT false,
    "gstin" TEXT,
    "addressLine1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "stateCode" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Branch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Category_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Unit_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "cgst" REAL NOT NULL DEFAULT 9.0,
    "sgst" REAL NOT NULL DEFAULT 9.0,
    "igst" REAL NOT NULL DEFAULT 18.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxRate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "hsn" TEXT,
    "categoryId" TEXT,
    "unitId" TEXT,
    "taxId" TEXT,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "purchasePrice" REAL NOT NULL DEFAULT 0,
    "salePrice" REAL NOT NULL DEFAULT 0,
    "mrp" REAL NOT NULL DEFAULT 0,
    "wholesalePrice" REAL NOT NULL DEFAULT 0,
    "minStock" REAL NOT NULL DEFAULT 0,
    "reorderLevel" REAL NOT NULL DEFAULT 0,
    "openingStock" REAL NOT NULL DEFAULT 0,
    "stock" REAL NOT NULL DEFAULT 0,
    "batchTracked" BOOLEAN NOT NULL DEFAULT false,
    "expiryTracked" BOOLEAN NOT NULL DEFAULT false,
    "serialTracked" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "TaxRate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Warehouse_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Warehouse_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "balanceAfter" REAL,
    "refType" TEXT,
    "refId" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'customer',
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "stateCode" TEXT,
    "pincode" TEXT,
    "openingBalance" REAL NOT NULL DEFAULT 0,
    "creditLimit" REAL NOT NULL DEFAULT 0,
    "creditDays" INTEGER NOT NULL DEFAULT 0,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Party_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "number" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'tax_invoice',
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "partyId" TEXT,
    "partyName" TEXT NOT NULL,
    "partyGstin" TEXT,
    "partyStateCode" TEXT,
    "invoiceDate" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "supplyType" TEXT NOT NULL DEFAULT 'intra',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "discountTotal" REAL NOT NULL DEFAULT 0,
    "taxableValue" REAL NOT NULL DEFAULT 0,
    "cgstTotal" REAL NOT NULL DEFAULT 0,
    "sgstTotal" REAL NOT NULL DEFAULT 0,
    "igstTotal" REAL NOT NULL DEFAULT 0,
    "cessTotal" REAL NOT NULL DEFAULT 0,
    "roundOff" REAL NOT NULL DEFAULT 0,
    "grandTotal" REAL NOT NULL DEFAULT 0,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "balance" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "terms" TEXT,
    "placeOfSupply" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Invoice_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "hsn" TEXT,
    "quantity" REAL NOT NULL,
    "unit" TEXT,
    "price" REAL NOT NULL,
    "discountPct" REAL NOT NULL DEFAULT 0,
    "discountAmt" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "taxable" REAL NOT NULL DEFAULT 0,
    "cgst" REAL NOT NULL DEFAULT 0,
    "sgst" REAL NOT NULL DEFAULT 0,
    "igst" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "number" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'purchase',
    "status" TEXT NOT NULL DEFAULT 'received',
    "partyId" TEXT,
    "partyName" TEXT NOT NULL,
    "partyGstin" TEXT,
    "partyStateCode" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" DATETIME NOT NULL,
    "receivedDate" DATETIME,
    "supplyType" TEXT NOT NULL DEFAULT 'intra',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "discountTotal" REAL NOT NULL DEFAULT 0,
    "taxableValue" REAL NOT NULL DEFAULT 0,
    "cgstTotal" REAL NOT NULL DEFAULT 0,
    "sgstTotal" REAL NOT NULL DEFAULT 0,
    "igstTotal" REAL NOT NULL DEFAULT 0,
    "roundOff" REAL NOT NULL DEFAULT 0,
    "grandTotal" REAL NOT NULL DEFAULT 0,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "balance" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Purchase_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Purchase_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Purchase_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "hsn" TEXT,
    "quantity" REAL NOT NULL,
    "unit" TEXT,
    "price" REAL NOT NULL,
    "discountPct" REAL NOT NULL DEFAULT 0,
    "discountAmt" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "taxable" REAL NOT NULL DEFAULT 0,
    "cgst" REAL NOT NULL DEFAULT 0,
    "sgst" REAL NOT NULL DEFAULT 0,
    "igst" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'quotation',
    "status" TEXT NOT NULL DEFAULT 'sent',
    "partyId" TEXT,
    "partyName" TEXT NOT NULL,
    "partyGstin" TEXT,
    "partyStateCode" TEXT,
    "subject" TEXT,
    "quotationDate" DATETIME NOT NULL,
    "validUntil" DATETIME,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "discountTotal" REAL NOT NULL DEFAULT 0,
    "taxableValue" REAL NOT NULL DEFAULT 0,
    "cgstTotal" REAL NOT NULL DEFAULT 0,
    "sgstTotal" REAL NOT NULL DEFAULT 0,
    "igstTotal" REAL NOT NULL DEFAULT 0,
    "roundOff" REAL NOT NULL DEFAULT 0,
    "grandTotal" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "terms" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Quotation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quotation_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "hsn" TEXT,
    "quantity" REAL NOT NULL,
    "unit" TEXT,
    "price" REAL NOT NULL,
    "discountPct" REAL NOT NULL DEFAULT 0,
    "discountAmt" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "taxable" REAL NOT NULL DEFAULT 0,
    "cgst" REAL NOT NULL DEFAULT 0,
    "sgst" REAL NOT NULL DEFAULT 0,
    "igst" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuotationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "invoiceId" TEXT,
    "purchaseId" TEXT,
    "partyId" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'cash',
    "vendor" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Expense_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'info',
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT,
    "metadata" TEXT,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Business_ownerId_idx" ON "Business"("ownerId");

-- CreateIndex
CREATE INDEX "BusinessMember_userId_idx" ON "BusinessMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMember_businessId_userId_key" ON "BusinessMember"("businessId", "userId");

-- CreateIndex
CREATE INDEX "Branch_businessId_idx" ON "Branch"("businessId");

-- CreateIndex
CREATE INDEX "Category_businessId_parentId_idx" ON "Category"("businessId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_businessId_name_key" ON "Unit"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRate_businessId_name_key" ON "TaxRate"("businessId", "name");

-- CreateIndex
CREATE INDEX "Product_businessId_name_idx" ON "Product"("businessId", "name");

-- CreateIndex
CREATE INDEX "Product_businessId_barcode_idx" ON "Product"("businessId", "barcode");

-- CreateIndex
CREATE INDEX "Product_businessId_sku_idx" ON "Product"("businessId", "sku");

-- CreateIndex
CREATE INDEX "Warehouse_businessId_idx" ON "Warehouse"("businessId");

-- CreateIndex
CREATE INDEX "StockMovement_businessId_productId_idx" ON "StockMovement"("businessId", "productId");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE INDEX "Party_businessId_type_idx" ON "Party"("businessId", "type");

-- CreateIndex
CREATE INDEX "Party_businessId_name_idx" ON "Party"("businessId", "name");

-- CreateIndex
CREATE INDEX "Party_businessId_phone_idx" ON "Party"("businessId", "phone");

-- CreateIndex
CREATE INDEX "Invoice_businessId_invoiceDate_idx" ON "Invoice"("businessId", "invoiceDate");

-- CreateIndex
CREATE INDEX "Invoice_businessId_status_idx" ON "Invoice"("businessId", "status");

-- CreateIndex
CREATE INDEX "Invoice_businessId_partyId_idx" ON "Invoice"("businessId", "partyId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_businessId_number_key" ON "Invoice"("businessId", "number");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "Purchase_businessId_invoiceDate_idx" ON "Purchase"("businessId", "invoiceDate");

-- CreateIndex
CREATE INDEX "Purchase_businessId_partyId_idx" ON "Purchase"("businessId", "partyId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_businessId_number_key" ON "Purchase"("businessId", "number");

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "Quotation_businessId_quotationDate_idx" ON "Quotation"("businessId", "quotationDate");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_businessId_number_key" ON "Quotation"("businessId", "number");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");

-- CreateIndex
CREATE INDEX "Payment_businessId_date_idx" ON "Payment"("businessId", "date");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_purchaseId_idx" ON "Payment"("purchaseId");

-- CreateIndex
CREATE INDEX "Expense_businessId_date_idx" ON "Expense"("businessId", "date");

-- CreateIndex
CREATE INDEX "Expense_businessId_category_idx" ON "Expense"("businessId", "category");

-- CreateIndex
CREATE INDEX "Notification_businessId_read_createdAt_idx" ON "Notification"("businessId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_businessId_createdAt_idx" ON "AuditLog"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

