import { PrismaClient } from "./generated/prisma/client.ts";
import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3";

const db = new PrismaClient({
  adapter: new PrismaBetterSQLite3({ url: process.env.SQLITE_URL })
});

try {
  await db.$connect();
  // eslint-disable-next-line no-console
  console.log("Connection has been established successfully.");

  const sqliteConfig = [
    "journal_mode = WAL",
    "foreign_keys = ON",
    "journal_size_limit = 6144000"
  ];

  await Promise.all(
    sqliteConfig.map(cnf => db.$executeRawUnsafe(`PRAGMA ${cnf}`))
  );
} catch (error) {
  // eslint-disable-next-line no-console
  console.error("Unable to connect to the database.");
  throw error;
}

export default db;
