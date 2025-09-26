import SchemaBuilder from "@pothos/core";
import ScopeAuthPlugin from "@pothos/plugin-scope-auth";
import PrismaPlugin from "@pothos/plugin-prisma";
import { getDatamodel } from "./generated/pothos.ts";
import { DateTimeResolver, URLResolver } from "graphql-scalars";
import { verifyToken, invalidatedTokens } from "./auth.js";
import db from "./db.js";

const schemaBuilder = new SchemaBuilder({
  plugins: [ScopeAuthPlugin, PrismaPlugin],
  prisma: {
    client: db,
    dmmf: getDatamodel(),
    onUnusedQuery: process.env.NODE_ENV === "production" ? null : "warn"
  },
  scopeAuth: {
    authorizeOnSubscribe: true,
    authScopes: async ctx => {
      let authHeader = ctx.request?.headers.get("authorization"); // HTTP
      authHeader ??= ctx.connectionParams?.authorization; // WS
      const token = authHeader?.substring(7);

      if (invalidatedTokens.has(token)) return { authenticated: false };

      const decoded = await verifyToken(token).catch(() => null);
      if (!decoded) return { authenticated: false };

      const { enabled } = await db.user.findUniqueOrThrow({
        where: { identifier: decoded.identifier }
      })
        .catch(() => ({ enabled: false }));

      if (!enabled) return { authenticated: false };

      ctx.user = { ...decoded, token };
      return { authenticated: true };
    }
  }
});

schemaBuilder.addScalarType("DateTime", DateTimeResolver);
schemaBuilder.addScalarType("URL", URLResolver);

["query", "mutation", "subscription"]
  .forEach(t =>
    schemaBuilder[`${t}Type`]({ authScopes: { authenticated: true } }));

export default schemaBuilder;
