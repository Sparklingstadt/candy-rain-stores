-- 複数のストアを持てる構成をやめ、サイトにお店を 1 つだけ置く。
-- ストアの設定は 1 行だけの "StoreSettings" に移し、商品と注文からストアへの参照をなくす。

-- 残すストアを決められない状態では止める（データを勝手に消さない）
DO $$
BEGIN
  IF (SELECT count(*) FROM "Store") > 1 THEN
    RAISE EXCEPTION 'ストアが 2 つ以上あります。残す 1 つ以外を削除してから、もう一度マイグレーションしてください';
  END IF;
  IF EXISTS (SELECT 1 FROM "Order" WHERE "storeId" IS NULL) THEN
    RAISE EXCEPTION '削除されたストアの注文が残っています。1 店舗にすると今のお店の注文に見えてしまうので、先に整理してください';
  END IF;
END $$;

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "ownerSub" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoPath" TEXT,
    "headerPath" TEXT,
    "themeColor" TEXT NOT NULL DEFAULT '#e85d8f',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "paymentInstructions" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id"),
    -- 2 行目を作れないようにする（Prisma のスキーマには書けないので SQL だけで持つ）
    CONSTRAINT "StoreSettings_single_row" CHECK ("id" = 1)
);

INSERT INTO "StoreSettings" (
    "id", "ownerSub", "name", "description", "logoPath", "headerPath", "themeColor",
    "isPublished", "paymentInstructions", "contactEmail", "createdAt", "updatedAt"
)
SELECT
    1, "ownerSub", "name", "description", "logoPath", "headerPath", "themeColor",
    "isPublished", "paymentInstructions", "contactEmail", "createdAt", "updatedAt"
FROM "Store";

-- Supabase exposes the public schema through its Data API. The app reads and
-- writes "StoreSettings" only from the server as the table owner, so no policy
-- is granted and the Data API sees nothing.
ALTER TABLE "StoreSettings" ENABLE ROW LEVEL SECURITY;

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_storeId_fkey";
ALTER TABLE "Order" DROP CONSTRAINT "Order_storeId_fkey";

-- DropIndex
DROP INDEX "Product_storeId_createdAt_idx";
DROP INDEX "Order_storeId_status_createdAt_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "storeId";
ALTER TABLE "Order" DROP COLUMN "storeId";

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- DropTable
DROP TABLE "Store";
