// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const sessions = sqliteTable('sessions', {
  code: text('code').primaryKey(),
  data: text('data').notNull(),
  revision: integer('revision').notNull().default(0),
  created: integer('created').notNull(),
});
export const searches = sqliteTable('searches', {
  query: text('query').primaryKey(),
  data: text('data').notNull(),
  expires: integer('expires').notNull(),
});
export const calendarConnections = sqliteTable('calendar_connections', {
 id:text('id').primaryKey(),
 code:text('code').notNull(),
 member:text('member').notNull(),
 refresh:text('refresh').notNull(),
 eventId:text('event_id').notNull(),
 synced:text('synced'),
 status:text('status').notNull().default('pending'),
 lease:integer('lease').notNull().default(0),
 updated:integer('updated').notNull().default(0),
});
export const calendarOauth = sqliteTable('calendar_oauth', {
 state:text('state').primaryKey(),
 code:text('code').notNull(),
 member:text('member').notNull(),
 browser:text('browser').notNull(),
 expires:integer('expires').notNull(),
});
export const cardCheckouts = sqliteTable('card_checkouts', {
 id:text('id').primaryKey(),
 code:text('code').notNull(),
 member:text('member').notNull(),
 version:integer('version').notNull(),
 cents:integer('cents').notNull(),
 stripeId:text('stripe_id'),
 status:text('status').notNull().default('pending'),
 created:integer('created').notNull(),
});
