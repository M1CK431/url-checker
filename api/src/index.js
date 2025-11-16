"use strict";

import { createServer } from "http";
import { createYoga } from "graphql-yoga";
import { useServer } from "graphql-ws/use/ws";
import { WebSocketServer } from "ws";

import schemaBuilder from "./schemaBuilder.js";
import "./models/index.js";

// Check for curl version (must be at least 7.72.0 because we need -w '%{json}' support)
import { exec } from "node:child_process";
const { NODE_ENV, HOST, PORT, CURL = "curl" } = process.env;

exec(`${CURL} -V`, (_, stdout) => {
  const ver = /(?<=^curl )([0-9]+\.?){3}/.exec(stdout)?.[0];
  if (+(ver?.replace(/\./g, "").padEnd(8, "0") ?? 0) < 77200000)
    throw new Error("curl not found or it's version is lower than 7.72.0");
});

const yoga = createYoga({
  schema: schemaBuilder.toSchema(),
  graphiql: { subscriptionsProtocol: "WS" }
});
const server = createServer(yoga);
const wsServer = new WebSocketServer({ server, path: yoga.graphqlEndpoint });

// src: https://the-guild.dev/graphql/yoga-server/docs/features/subscriptions#graphql-over-websocket-protocol-via-graphql-ws
useServer(
  {
    execute: args => args.execute(args),
    subscribe: args => args.subscribe(args),
    onSubscribe: async (ctx, _id, params) => {
      const { request: req, socket } = ctx.extra;
      const { schema, execute, subscribe, contextFactory, parse, validate } =
        yoga.getEnveloped({ ...ctx, req, socket, params });

      const args = {
        schema,
        operationName: params.operationName,
        document: parse(params.query),
        variableValues: params.variables,
        contextValue: await contextFactory(),
        execute,
        subscribe
      };

      const errors = validate(args.schema, args.document);
      if (errors.length) return errors;
      return args;
    }
  },
  wsServer
);

await new Promise(res => server.listen({ host: HOST, port: PORT }, res));
// eslint-disable-next-line no-console
console.log(`🚀 Server ready at http://${HOST}:${PORT} in ${NODE_ENV} mode`);
