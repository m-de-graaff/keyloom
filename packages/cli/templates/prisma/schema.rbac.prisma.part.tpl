model Organization {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  members   Membership[]
}

model Membership {
  id        String   @id @default(cuid())
  userId    String
  orgId     String
  role      String
  createdAt DateTime @default(now())
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
}

model Invite {
  id        String   @id @default(cuid())
  orgId     String
  email     String
  role      String
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
}

model Entitlement {
  id        String   @id @default(cuid())
  orgId     String
  plan      String
  seats     Int
  limits    Json
  createdAt DateTime @default(now())
  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
}

