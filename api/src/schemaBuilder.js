import SchemaBuilder from "@pothos/core";
import PrismaPlugin from "@pothos/plugin-prisma";
import { getDatamodel } from "./generated/pothos.ts";
import { DateTimeResolver, URLResolver } from "graphql-scalars";
import db from "./db.js";

const schemaBuilder = new SchemaBuilder({
  plugins: [PrismaPlugin],
  prisma: {
    client: db,
    dmmf: getDatamodel(),
    onUnusedQuery: process.env.NODE_ENV === "production" ? null : "warn"
  }
});

schemaBuilder.addScalarType("DateTime", DateTimeResolver);
schemaBuilder.addScalarType("URL", URLResolver);

["query", "mutation", "subscription"]
  .forEach(t => schemaBuilder[`${t}Type`]({}));

export default schemaBuilder;
