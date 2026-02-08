import { pgTable, text, timestamp, uuid, boolean, integer, real } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  address: text('address').notNull().unique(),
  nonce: text('nonce'),
  nonceTimestamp: timestamp('nonce_timestamp'),
  lastLogin: timestamp('last_login'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  username: text('username'),
  positionX: real('position_x').default(0).notNull(),
  positionY: real('position_y').default(0).notNull(),
  direction: text('direction').default('down').notNull(),
  isOnline: boolean('is_online').default(false).notNull(),
  lastSeen: timestamp('last_seen').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const bets = pgTable("bets", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    userAddress: text("user_address").notNull(),
    roomId: text("room_id").notNull(),
    choice: text("choice").notNull(), // 'playerA' or 'playerB'
    amount: text("amount").notNull(), // ETH amount (store as string/wei)
    txHash: text("tx_hash").unique().notNull(),
    status: text("status").default('pending'), // 'pending', 'won', 'lost', 'refunded'
    createdAt: timestamp("created_at").defaultNow(),
    payoutTxHash: text("payout_tx_hash"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Bet = typeof bets.$inferSelect;
export type NewBet = typeof bets.$inferInsert;
