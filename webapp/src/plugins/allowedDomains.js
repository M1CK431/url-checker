import { apolloClient } from "./apollo.js";
import gql from "graphql-tag";
import { requestErrorHandler } from "@/helpers.js";

export const allowedDomains = reactive([]);

export const init = () =>
  apolloClient
    .query({
      query: gql`
        query {
          allowedDomains
        }
      `
    })
    .then(({ data }) => allowedDomains.push(...data.allowedDomains))
    .catch(requestErrorHandler);

export default ({ config: { globalProperties } }) =>
  (globalProperties.$allowedDomains = allowedDomains);
