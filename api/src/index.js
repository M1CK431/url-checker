"use strict";

import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";

import { ApolloServer } from "@apollo/server";
// eslint-disable-next-line node/file-extension-in-import
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
// eslint-disable-next-line node/file-extension-in-import
import { ApolloServerPluginLandingPageDisabled } from "@apollo/server/plugin/disabled";
import { koaMiddleware } from "@as-integrations/koa";
import { createServer } from "http";
import { WebSocketServer } from "ws";
// eslint-disable-next-line node/file-extension-in-import
import { useServer } from "graphql-ws/lib/use/ws";

import schema from "./schema.js";

// Check for curl version (must be at least 7.72.0 because we need -w '%{json}' support)
import { exec } from "node:child_process";
const { NODE_ENV, HOST, PORT, CURL = "curl" } = process.env;

exec(`${CURL} -V`, (_, stdout) => {
  const ver = /(?<=^curl )([0-9]+\.?){3}/.exec(stdout)?.[0];
  if (+(ver?.replace(/\./g, "").padEnd(8, "0") ?? 0) < 77200000)
    throw new Error("curl not found or it's version is lower than 7.72.0");
});

const app = new Koa();
const httpServer = createServer(app.callback());
const router = new Router();
const wsServer = new WebSocketServer({ server: httpServer, path: "/graphql" });

const wsServerCleanup = useServer({ schema }, wsServer);
const apolloServer = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    // Proper shutdown for the WebSocket server.
    {
      serverWillStart: () => ({
        drainServer: async () => await wsServerCleanup.dispose()
      })
    },
    ...(NODE_ENV === "production"
      ? [ApolloServerPluginLandingPageDisabled]
      : [])
  ]
});

await apolloServer.start();

router.get("/", ctx => {
  ctx.body = "KOA Server running! Go back to sleep or code!";
});
router.all("/graphql", koaMiddleware(apolloServer));

app
  .use(cors())
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods());

app.on("error", err => console.log(err));

await new Promise(res => httpServer.listen({ host: HOST, port: PORT }, res));
console.log(`🚀 Server ready at http://${HOST}:${PORT} in ${NODE_ENV} mode`);
