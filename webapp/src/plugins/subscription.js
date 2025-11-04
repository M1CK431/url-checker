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

const handleEvictCache = (evictCache, operation) => {
  if (Array.isArray(evictCache))
    return evictCache.forEach(evictCache =>
      handleEvictCache(evictCache, operation)
    );

  const { on = ["CREATE", "DELETE"], fieldName, evictOpts } = evictCache;

  if (!on?.[0] || on.includes(operation)) {
    if (fieldName)
      (Array.isArray(fieldName) ? fieldName : [fieldName]).forEach(fieldName =>
        apolloClient.cache.evict({ fieldName })
      );

    if (evictOpts)
      (Array.isArray(evictOpts) ? evictOpts : [evictOpts]).forEach(evictOpts =>
        apolloClient.cache.evict(evictOpts)
      );

    apolloClient.cache.gc();
  }
};

export const add = (
  { key, evictCache, clearOnDelete },
  subscriptionOpts,
  hooks
) => {
  const { next, ...ohterHooks } =
    typeof hooks === "function" ? { next: hooks } : (hooks ?? {});

  subscriptions.has(key) && remove(key);

  subscriptions.set(
    key,
    apolloClient.subscribe(subscriptionOpts).subscribe({
      async next(res) {
        // allow next() to:
        // - delay following instructions execution (async/await)
        // - override or event prevent (if passing "false") cache eviction using second arg
        let nextEvictCache;
        next && (await next(res, evictCache => (nextEvictCache = evictCache)));
        nextEvictCache ??= evictCache;

        const [{ operation, data }] = Object.values(res.data);

        if (operation === "DELETE" && clearOnDelete) remove(key);

        if (!nextEvictCache || lastLocalMutations.has(getKey(operation, data)))
          return;

        handleEvictCache(nextEvictCache, operation);
      },
      ...ohterHooks
    })
  );

  return () => remove(key);
};

export const remove = key => {
  subscriptions.get(key)?.unsubscribe();
  subscriptions.delete(key);
};

export const handleMutation = ({ operation, evictCache }, entities) => {
  handleEvictCache({ on: [], ...evictCache }, operation);

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
