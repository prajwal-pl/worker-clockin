-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "googleAuth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" TEXT;
