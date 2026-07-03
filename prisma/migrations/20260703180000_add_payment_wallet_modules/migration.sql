-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CASH', 'WALLET', 'CREDIT_CARD', 'DEBIT_CARD', 'APPLE_PAY', 'GOOGLE_PAY', 'STRIPE', 'PAYPAL');
CREATE TYPE "PaymentRecordStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');
CREATE TYPE "PaymentType" AS ENUM ('BOOKING', 'ORDER', 'TOP_UP', 'OTHER');
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND', 'TOP_UP', 'CASHBACK', 'REWARD_CREDIT', 'REWARD_REDEMPTION', 'ADMIN_ADJUSTMENT', 'PLATFORM_REFUND');
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateTable payments
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "transaction_number" TEXT NOT NULL,
    "booking_id" TEXT,
    "order_id" TEXT,
    "customer_id" TEXT NOT NULL,
    "business_id" TEXT,
    "branch_id" TEXT,
    "payment_method" "PaymentMethodType" NOT NULL,
    "payment_type" "PaymentType" NOT NULL DEFAULT 'OTHER',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subscriber_discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "platform_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "delivery_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(12,2) NOT NULL,
    "refunded_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'SYP',
    "status" "PaymentRecordStatus" NOT NULL DEFAULT 'PENDING',
    "gateway_reference" TEXT,
    "invoice_number" TEXT,
    "invoice_data" JSONB,
    "receipt_data" JSONB,
    "failure_reason" TEXT,
    "cancellation_reason" TEXT,
    "refund_reason" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable wallets
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "current_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "available_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "blocked_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'SYP',
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable wallet_transactions
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "booking_id" TEXT,
    "order_id" TEXT,
    "payment_id" TEXT,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance_before" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- Indexes and uniques
CREATE UNIQUE INDEX "payments_payment_id_key" ON "payments"("payment_id");
CREATE UNIQUE INDEX "payments_transaction_number_key" ON "payments"("transaction_number");
CREATE UNIQUE INDEX "payments_invoice_number_key" ON "payments"("invoice_number");
CREATE INDEX "payments_customer_id_idx" ON "payments"("customer_id");
CREATE INDEX "payments_business_id_idx" ON "payments"("business_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_transaction_date_idx" ON "payments"("transaction_date");

CREATE UNIQUE INDEX "wallets_wallet_id_key" ON "wallets"("wallet_id");
CREATE UNIQUE INDEX "wallets_customer_id_key" ON "wallets"("customer_id");
CREATE INDEX "wallets_status_idx" ON "wallets"("status");

CREATE UNIQUE INDEX "wallet_transactions_transaction_id_key" ON "wallet_transactions"("transaction_id");
CREATE UNIQUE INDEX "wallet_transactions_reference_number_key" ON "wallet_transactions"("reference_number");
CREATE INDEX "wallet_transactions_wallet_id_idx" ON "wallet_transactions"("wallet_id");
CREATE INDEX "wallet_transactions_type_idx" ON "wallet_transactions"("type");

-- Foreign keys
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "wallets" ADD CONSTRAINT "wallets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
