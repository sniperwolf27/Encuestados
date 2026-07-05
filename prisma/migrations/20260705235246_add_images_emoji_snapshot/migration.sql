-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "imageId" TEXT;

-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "emoji" TEXT,
ADD COLUMN     "factorySnapshot" JSONB;

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);
