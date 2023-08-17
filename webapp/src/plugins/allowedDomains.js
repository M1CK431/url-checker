import { apolloClient } from "./apollo.js";
import gql from "graphql-tag";
import { requestErrorHandler } from "@/helpers.js";

export const { allowedDomains } = await apolloClient
  .query({
    query: gql`
      query {
        allowedDomains
      }
    `
  })
  .then(({ data }) => data)
  .catch(requestErrorHandler);

export default ({ config: { globalProperties } }) =>
  (globalProperties.$allowedDomains = allowedDomains);
