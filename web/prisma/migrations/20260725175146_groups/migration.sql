-- CreateEnum
CREATE TYPE "GroupVisibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('owner', 'member');

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "GroupVisibility" NOT NULL DEFAULT 'private',
    "passwordHash" TEXT,
    "inviteCode" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Group_slug_key" ON "Group"("slug");
CREATE UNIQUE INDEX "Group_inviteCode_key" ON "Group"("inviteCode");
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

ALTER TABLE "Group" ADD CONSTRAINT "Group_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill path for existing rows
ALTER TABLE "PlaySession" ADD COLUMN "groupId" TEXT;

DO $$
DECLARE
  owner_id TEXT;
  group_id CONSTANT TEXT := 'cmlegacygroupmiraflores01';
  invite_code CONSTANT TEXT := 'VBGw17XjO7DR';
  -- bcrypt of "miraflores2026"
  pwd_hash CONSTANT TEXT := '$2b$10$KqCs4yWuanJlyGDfj4mDROwJE3ATXTrFk9vn7v1BzaLx7IhPGAQJG';
  u RECORD;
  member_id TEXT;
BEGIN
  SELECT "id" INTO owner_id FROM "User" ORDER BY "createdAt" ASC LIMIT 1;

  IF owner_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM "PlaySession") THEN
      RAISE EXCEPTION 'Cannot migrate PlaySession without User rows';
    END IF;
    RETURN;
  END IF;

  INSERT INTO "Group" ("id", "name", "slug", "description", "visibility", "passwordHash", "inviteCode", "createdById", "createdAt", "updatedAt")
  VALUES (
    group_id,
    'Miraflores',
    'miraflores',
    'Grupo migrado automáticamente',
    'private',
    pwd_hash,
    invite_code,
    owner_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

  INSERT INTO "GroupMember" ("id", "groupId", "userId", "role", "joinedAt")
  VALUES (group_id || '_owner', group_id, owner_id, 'owner', CURRENT_TIMESTAMP);

  -- Every user who touched a session becomes a member
  FOR u IN
    SELECT DISTINCT uid FROM (
      SELECT "createdById" AS uid FROM "PlaySession"
      UNION
      SELECT "financierId" FROM "PlaySession"
      UNION
      SELECT "userId" FROM "Attendance"
      UNION
      SELECT "fromUserId" FROM "Debt"
      UNION
      SELECT "toUserId" FROM "Debt"
    ) s
    WHERE uid IS NOT NULL AND uid <> owner_id
  LOOP
    INSERT INTO "GroupMember" ("id", "groupId", "userId", "role", "joinedAt")
    VALUES (replace(gen_random_uuid()::text, '-', ''), group_id, u.uid, 'member', CURRENT_TIMESTAMP)
    ON CONFLICT ("groupId", "userId") DO NOTHING;
  END LOOP;

  UPDATE "PlaySession" SET "groupId" = group_id WHERE "groupId" IS NULL;
END $$;

-- If there were no users/sessions, PlaySession may still be empty — allow NOT NULL only when all set
-- For empty PlaySession table, set a default is fine; for rows without groupId after DO (no users), fail.
ALTER TABLE "PlaySession" ALTER COLUMN "groupId" SET NOT NULL;

CREATE INDEX "PlaySession_groupId_startsAt_idx" ON "PlaySession"("groupId", "startsAt");

ALTER TABLE "PlaySession" ADD CONSTRAINT "PlaySession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
