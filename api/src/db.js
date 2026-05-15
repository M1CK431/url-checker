import { PrismaClient } from "./generated/prisma/client.ts";

const { DB_PROVIDER = "sqlite", DB_URL = "file:./db.sqlite" } = process.env;
let adapter;

if (DB_PROVIDER === "sqlite") {
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  adapter = new PrismaBetterSqlite3({ url: DB_URL });
}

if (DB_PROVIDER === "mysql") {
  const { PrismaMariaDb } = await import("@prisma/adapter-mariadb");
  adapter = new PrismaMariaDb(DB_URL);
}

if (DB_PROVIDER === "postgresql") {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const schema = new URLSearchParams(DB_URL.split("?")[1]).get("schema") ?? "public";
  adapter = new PrismaPg({ connectionString: DB_URL }, { schema });
}

if (!adapter) throw new Error(`No adapter found for DB provider ${DB_PROVIDER}`);
const db = new PrismaClient({ adapter });

try {
  await db.$connect();
  // eslint-disable-next-line no-console
  console.log(`Connection to ${DB_PROVIDER} has been established successfully.`);

  const sqliteConfig = [
    "journal_mode = WAL",
    "foreign_keys = ON",
    "journal_size_limit = 6144000"
  ];

  DB_PROVIDER === "sqlite" && await Promise.all(
    sqliteConfig.map(cnf => db.$executeRawUnsafe(`PRAGMA ${cnf}`))
  );
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(`Unable to connect to ${DB_PROVIDER}.`);
  throw error;
}

export default db;
