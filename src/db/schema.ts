import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const categoryEnum = pgEnum("category", [
  "Groceries",
  "Restaurants",
  "Transport",
  "Rent",
  "Utilities",
  "Entertainment",
  "Other",
  "Settlement",
]);

export const memberRoleEnum = pgEnum("member_role", ["admin", "member"]);

// ─── Auth.js tables ──────────────────────────────────────────────────────────

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  // Notification preferences (Phase 6)
  notifyOnPaymentAdded: boolean("notify_on_payment_added").notNull().default(true),
  notifyOnGroupInvite: boolean("notify_on_group_invite").notNull().default(true),
  notifyOnSettlement: boolean("notify_on_settlement").notNull().default(true),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ─── App tables ───────────────────────────────────────────────────────────────

export const groups = pgTable("group", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique().default(sql`gen_random_uuid()`),
  currency: text("currency").notNull().default("EUR"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
});

export const groupMemberships = pgTable(
  "group_membership",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })]
);

export const ghostParticipants = pgTable("ghost_participant", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const invites = pgTable("invite", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const payments = pgTable("payment", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  payerUserId: text("payer_user_id").references(() => users.id),
  payerGhostId: text("payer_ghost_id").references(() => ghostParticipants.id),
  amountInCents: integer("amount_in_cents").notNull(),
  description: text("description").notNull(),
  merchant: text("merchant"),
  category: categoryEnum("category").notNull().default("Other"),
  date: timestamp("date", { mode: "date" }).notNull(),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const paymentSplits = pgTable("payment_split", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  paymentId: text("payment_id")
    .notNull()
    .references(() => payments.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id),
  ghostId: text("ghost_id").references(() => ghostParticipants.id),
  amountInCents: integer("amount_in_cents").notNull(),
});
