import { GraphQLString, GraphQLList, GraphQLNonNull } from "graphql";

export const queries = {
  allowedDomains: {
    type: new GraphQLNonNull(
      new GraphQLList(new GraphQLNonNull(GraphQLString))
    ),
    resolve: () => JSON.parse(process.env.ALLOWED_DOMAINS ?? "[]")
  }
};
