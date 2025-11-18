import gql from "graphql-tag";
import { apolloClient } from "./apollo.js";
import { init } from "./allowedDomains.js";
import { noTypename } from "../helpers.js";

export const auth = reactive({ token: "", user: null, loading: true });

export const reset = () => {
  localStorage.removeItem("auth");
  Object.assign(auth, { token: "", user: null });
  location.reload(true); // reset webapp, avoid Apollo subscriptions error
};

export const login = (identifier, password) => {
  const mutation = apolloClient
    .mutate({
      mutation: gql`
        mutation ($identifier: ID!, $password: String!) {
          login(identifier: $identifier, password: $password) {
            token
            user {
              id
              identifier
            }
          }
        }
      `,
      variables: { identifier, password }
    })
    .then(({ data: { login } }) => {
      login = noTypename(login);
      localStorage.setItem("auth", JSON.stringify(login));
      return Object.assign(auth, noTypename(login));
    });

  mutation
    .then(init)
    .catch(reset)
    .finally(() => (auth.loading = false));

  return mutation;
};

export const logout = () =>
  apolloClient
    .mutate({
      mutation: gql`
        mutation {
          logout {
            ok
          }
        }
      `
    })
    .then(reset);

// Load previous login state (if any)
try {
  Object.assign(auth, JSON.parse(localStorage.getItem("auth") ?? "{}"));
} catch {}

// Check token validity
auth.token &&
  (await apolloClient
    .query({
      query: gql`
        query {
          me {
            id
            identifier
          }
        }
      `
    })
    .then(({ data: { me } }) => Object.assign(auth, { user: me }))
    .then(init)
    .catch(reset));

auth.loading = false;

export default ({ config: { globalProperties } }) =>
  (globalProperties.$auth = auth);
