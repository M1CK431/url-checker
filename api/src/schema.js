import { GraphQLSchema, GraphQLObjectType } from "graphql";
import {
  queries as websitesQueries,
  mutations as websitesMutations,
  subscriptions as websitesSubscriptions
} from "./websites.js";
import {
  queries as reportsQueries,
  mutations as reportsMutations,
  subscriptions as reportsSubscriptions
} from "./reports.js";
import {
  queries as checkResultsQueries,
  mutations as checkResultsMutations
} from "./checkResults.js";
import { queries as allowedDomainsQueries } from "./allowedDomains.js";

export default new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "RootQueryType",
    fields: () => ({
      ...websitesQueries,
      ...reportsQueries,
      ...checkResultsQueries,
      ...allowedDomainsQueries
    })
  }),

  mutation: new GraphQLObjectType({
    name: "RootMutationType",
    fields: () => ({
      ...websitesMutations,
      ...reportsMutations,
      ...checkResultsMutations
    })
  }),

  subscription: new GraphQLObjectType({
    name: "RootSubscriptionType",
    fields: () => ({ ...websitesSubscriptions, ...reportsSubscriptions })
  })
});
