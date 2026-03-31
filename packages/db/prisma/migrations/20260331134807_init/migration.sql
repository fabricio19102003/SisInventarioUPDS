-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'INVENTORY_MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('MEDICAL_GARMENT', 'OFFICE_SUPPLY');

-- CreateEnum
CREATE TYPE "GarmentType" AS ENUM ('PIJAMA', 'BATA', 'MANDIL', 'POLERA', 'GORRO');

-- CreateEnum
CREATE TYPE "Size" AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MASCULINO', 'FEMENINO', 'UNISEX');

-- CreateEnum
CREATE TYPE "WarehouseArea" AS ENUM ('MEDICAL', 'OFFICE');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('ENTRY', 'SALE', 'DONATION', 'WRITE_OFF', 'ADJUSTMENT', 'DEPARTMENT_DELIVERY');

-- CreateEnum
CREATE TYPE "MovementStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ManufactureOrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('STUDENT', 'STAFF', 'SCHOLAR');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" "ProductCategory" NOT NULL,
    "garment_type" "GarmentType",
    "warehouse_area" "WarehouseArea" NOT NULL,
    "min_stock" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku_suffix" VARCHAR(50) NOT NULL,
    "size" "Size",
    "gender" "Gender",
    "color" VARCHAR(100),
    "current_stock" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturers" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "contact_name" VARCHAR(255),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacture_orders" (
    "id" UUID NOT NULL,
    "order_number" VARCHAR(50) NOT NULL,
    "manufacturer_id" UUID NOT NULL,
    "status" "ManufactureOrderStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "cancel_reason" TEXT,
    "ordered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "manufacture_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacture_order_items" (
    "id" UUID NOT NULL,
    "manufacture_order_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "quantity_ordered" INTEGER NOT NULL,
    "quantity_received" INTEGER NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "manufacture_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipients" (
    "id" UUID NOT NULL,
    "document_number" VARCHAR(50) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "type" "RecipientType" NOT NULL,
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "career" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "movement_number" VARCHAR(50) NOT NULL,
    "movement_type" "MovementType" NOT NULL,
    "status" "MovementStatus" NOT NULL DEFAULT 'DRAFT',
    "is_donated" BOOLEAN NOT NULL DEFAULT false,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "cancel_reason" TEXT,
    "recipient_id" UUID,
    "department_id" UUID,
    "manufacture_order_id" UUID,
    "processed_by" UUID NOT NULL,
    "processed_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movement_items" (
    "id" UUID NOT NULL,
    "inventory_movement_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "movement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_warehouse_area_idx" ON "products"("warehouse_area");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "products_garment_type_idx" ON "products"("garment_type");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE INDEX "product_variants_is_active_idx" ON "product_variants"("is_active");

-- CreateIndex
CREATE INDEX "product_variants_current_stock_idx" ON "product_variants"("current_stock");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_sku_suffix_key" ON "product_variants"("product_id", "sku_suffix");

-- CreateIndex
CREATE INDEX "manufacturers_name_idx" ON "manufacturers"("name");

-- CreateIndex
CREATE INDEX "manufacturers_is_active_idx" ON "manufacturers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "manufacture_orders_order_number_key" ON "manufacture_orders"("order_number");

-- CreateIndex
CREATE INDEX "manufacture_orders_manufacturer_id_idx" ON "manufacture_orders"("manufacturer_id");

-- CreateIndex
CREATE INDEX "manufacture_orders_status_idx" ON "manufacture_orders"("status");

-- CreateIndex
CREATE INDEX "manufacture_orders_ordered_at_idx" ON "manufacture_orders"("ordered_at");

-- CreateIndex
CREATE INDEX "manufacture_order_items_manufacture_order_id_idx" ON "manufacture_order_items"("manufacture_order_id");

-- CreateIndex
CREATE INDEX "manufacture_order_items_product_variant_id_idx" ON "manufacture_order_items"("product_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "manufacture_order_items_manufacture_order_id_product_varian_key" ON "manufacture_order_items"("manufacture_order_id", "product_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipients_document_number_key" ON "recipients"("document_number");

-- CreateIndex
CREATE INDEX "recipients_document_number_idx" ON "recipients"("document_number");

-- CreateIndex
CREATE INDEX "recipients_type_idx" ON "recipients"("type");

-- CreateIndex
CREATE INDEX "recipients_is_active_idx" ON "recipients"("is_active");

-- CreateIndex
CREATE INDEX "recipients_full_name_idx" ON "recipients"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE INDEX "departments_is_active_idx" ON "departments"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_movements_movement_number_key" ON "inventory_movements"("movement_number");

-- CreateIndex
CREATE INDEX "inventory_movements_movement_type_idx" ON "inventory_movements"("movement_type");

-- CreateIndex
CREATE INDEX "inventory_movements_status_idx" ON "inventory_movements"("status");

-- CreateIndex
CREATE INDEX "inventory_movements_processed_by_idx" ON "inventory_movements"("processed_by");

-- CreateIndex
CREATE INDEX "inventory_movements_recipient_id_idx" ON "inventory_movements"("recipient_id");

-- CreateIndex
CREATE INDEX "inventory_movements_department_id_idx" ON "inventory_movements"("department_id");

-- CreateIndex
CREATE INDEX "inventory_movements_manufacture_order_id_idx" ON "inventory_movements"("manufacture_order_id");

-- CreateIndex
CREATE INDEX "inventory_movements_processed_at_idx" ON "inventory_movements"("processed_at");

-- CreateIndex
CREATE INDEX "inventory_movements_is_donated_idx" ON "inventory_movements"("is_donated");

-- CreateIndex
CREATE INDEX "inventory_movements_movement_type_status_processed_at_idx" ON "inventory_movements"("movement_type", "status", "processed_at");

-- CreateIndex
CREATE INDEX "inventory_movements_movement_type_is_donated_processed_at_idx" ON "inventory_movements"("movement_type", "is_donated", "processed_at");

-- CreateIndex
CREATE INDEX "inventory_movements_movement_type_status_is_donated_idx" ON "inventory_movements"("movement_type", "status", "is_donated");

-- CreateIndex
CREATE INDEX "movement_items_inventory_movement_id_idx" ON "movement_items"("inventory_movement_id");

-- CreateIndex
CREATE INDEX "movement_items_product_variant_id_idx" ON "movement_items"("product_variant_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_action_created_at_idx" ON "audit_logs"("entity_type", "action", "created_at");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacture_orders" ADD CONSTRAINT "manufacture_orders_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacture_order_items" ADD CONSTRAINT "manufacture_order_items_manufacture_order_id_fkey" FOREIGN KEY ("manufacture_order_id") REFERENCES "manufacture_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacture_order_items" ADD CONSTRAINT "manufacture_order_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_manufacture_order_id_fkey" FOREIGN KEY ("manufacture_order_id") REFERENCES "manufacture_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movement_items" ADD CONSTRAINT "movement_items_inventory_movement_id_fkey" FOREIGN KEY ("inventory_movement_id") REFERENCES "inventory_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movement_items" ADD CONSTRAINT "movement_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
