import { Sequelize } from "sequelize";
const { SQLITE: storage = "db.sqlite", NODE_ENV } = process.env;

export const db = new Sequelize({
  dialect: "sqlite",
  storage,
  logging: NODE_ENV === "development" && console.log
});

try {
  await db.authenticate();
  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database.");
  throw error;
}
