-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "nameRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneRequired" BOOLEAN NOT NULL DEFAULT false;
