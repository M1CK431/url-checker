import { createPubSub } from "graphql-yoga";

const pubSub = createPubSub();

const DEBOUNCE_DELAY = 500; // ms
const pendingEvents = new Map();

export default new Proxy(pubSub, {
  get(target, prop, receiver) {
    if (prop !== "publish") return Reflect.get(target, prop, receiver);

    return (topic, payload) => {
      const key = `${topic}:${payload.operation}:${payload.primaryKey}`;

      if (!pendingEvents.has(key)) {
        setTimeout(() => {
          const event = pendingEvents.get(key);
          pendingEvents.delete(key);
          Reflect.apply(target.publish, target, [event.topic, event.payload]);
        }, DEBOUNCE_DELAY);
      }

      pendingEvents.set(key, { topic, payload });
    };
  }
});
