-- CreateTable
CREATE TABLE "Store" (
    "id" UUID NOT NULL,
    "ownerSub" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoPath" TEXT,
    "headerPath" TEXT,
    "themeColor" TEXT NOT NULL DEFAULT '#e85d8f',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_ownerSub_key" ON "Store"("ownerSub");

-- CreateIndex
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");
