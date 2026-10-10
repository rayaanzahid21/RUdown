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
