import schemaBuilder from "../schemaBuilder.js";

schemaBuilder.queryField(
  "allowedDomains",
  t => t.stringList({
    nullable: false,
    resolve: () => JSON.parse(process.env.ALLOWED_DOMAINS ?? "[]")
  })
);
