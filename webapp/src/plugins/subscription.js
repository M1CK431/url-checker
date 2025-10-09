import { apolloClient } from "./apollo.js";
import { getFrom } from "../helpers.js";

const lastLocalMutations = new Set();
const subscriptions = new Map();

const getKey = (operation, { __typename, ...rest }) => {
  const { keyFields = ["id"] } =
    apolloClient.cache.config.typePolicies?.[__typename] ?? {};
  const identifier = JSON.stringify(getFrom(rest, keyFields));

  return `${__typename}:${operation}:${identifier}`;
};

export const add = (
  { key, fieldName, evictCache, clearOnDelete },
  subscriptionOpts,
  { next, ...hooks } = {}
) => {
  subscriptions.has(key) && remove(key);

  subscriptions.set(
    key,
    apolloClient.subscribe(subscriptionOpts).subscribe({
      next(...args) {
        next?.(...args);

        const [{ operation, data }] = Object.values(args[0].data);
        if (operation === "UPDATE") return;
        if (operation === "DELETE" && clearOnDelete) return remove(key);

        if (evictCache && !lastLocalMutations.has(getKey(operation, data))) {
          apolloClient.cache.evict({ fieldName });
          apolloClient.cache.gc();
        }
      },
      ...hooks
    })
  );
};

export const remove = key => {
  subscriptions.get(key)?.unsubscribe();
  subscriptions.delete(key);
};

export const handleMutation = ({ operation, fieldName }, entities) => {
  apolloClient.cache.evict({ fieldName });
  apolloClient.cache.gc();

  entities.forEach(entity => {
    const key = getKey(operation, entity);
    lastLocalMutations.add(key);
    setTimeout(() => lastLocalMutations.delete(key), 10_000);
  });
};

export default ({ config: { globalProperties } }) =>
  (globalProperties.$subscribe = {
    subscriptions,
    add,
    remove,
    handleMutation
  });
