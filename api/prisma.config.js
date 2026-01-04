import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "src/",
  datasource: { url: process.env.DB_URL }
});
