-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "stock_clips" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "url" VARCHAR(255) NOT NULL,
    "genre" VARCHAR(255) NOT NULL,
    "duration" VARCHAR(255) NOT NULL,
    "embedding" vector,
    "tags" VARCHAR(255)[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "stock_clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_images" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "channel_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "url" VARCHAR(255) NOT NULL,
    "embedding" vector,
    "tags" VARCHAR(255)[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "stock_images_pkey" PRIMARY KEY ("id")
);
