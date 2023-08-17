import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
  from
} from "@apollo/client/core";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";

import { onError } from "@apollo/client/link/error";
import { logErrorMessages } from "@vue/apollo-util";
import { createApolloProvider } from "@vue/apollo-option";

const {
  MODE,
  VITE_API_HTTP = "http://localhost:3000/graphql",
  VITE_API_WS = "ws://localhost:3000/graphql"
} = import.meta.env;

const errorLink = onError(err => {
  MODE !== "production" && logErrorMessages(err);
  if (err.networkError?.statusCode === 400)
    err.networkError.message = err.networkError.result.errors[0].message;
});

const httpLink = new HttpLink({ uri: VITE_API_HTTP });
const wsLink = new GraphQLWsLink(createClient({ url: VITE_API_WS }));

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
  cache: new InMemoryCache(),
  link: from([errorLink, link])
});

export default createApolloProvider({
  defaultClient: apolloClient,
  defaultOptions: { $query: { deep: true } }
});
