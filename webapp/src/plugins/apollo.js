import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
  from
} from "@apollo/client/core";
import { setContext } from "@apollo/client/link/context";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";

import { onError } from "@apollo/client/link/error";
import { logErrorMessages } from "@vue/apollo-util";
import { createApolloProvider } from "@vue/apollo-option";

import { auth, reset } from "./auth.js";

const {
  MODE,
  VITE_API_HTTP = "http://localhost:3000/graphql",
  VITE_API_WS = "ws://localhost:3000/graphql"
} = import.meta.env;

const errorLink = onError(err => {
  if (err.networkError?.statusCode === 401) reset();

  MODE !== "production" && logErrorMessages(err);
  if (err.networkError?.statusCode === 400)
    err.networkError.message = err.networkError.result.errors[0].message;
});

const authLink = setContext((_, { headers }) => ({
  headers: {
    ...headers,
    ...(auth.token && { authorization: `Bearer ${auth.token}` })
  }
}));

const httpLink = new HttpLink({ uri: VITE_API_HTTP });
const wsLink = new GraphQLWsLink(
  createClient({
    url: VITE_API_WS,
    connectionParams: async () => {
      const { auth } = await import("./auth.js");
      return { authorization: `Bearer ${auth.token}` };
    }
  })
);

const link = split(
  // split based on operation type
  ({ query }) => {
    const { kind, operation } = getMainDefinition(query);
    return kind === "OperationDefinition" && operation === "subscription";
  },
  wsLink,
  httpLink
);

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache({
    typePolicies: {
      WebsiteSubscription: { merge: true },
      Website: { keyFields: ["host"] }
    }
  }),
  link: from([errorLink, authLink, link])
});

export default createApolloProvider({
  defaultClient: apolloClient,
  defaultOptions: { $query: { deep: true } }
});
