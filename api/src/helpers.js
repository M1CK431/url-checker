import { availableParallelism } from "os";
import db from "./db.js";

const { ALLOWED_DOMAINS = "[]" } = process.env;
const allowedDomains = JSON.parse(ALLOWED_DOMAINS);

export const getValidatedPage = page => {
  const { current, size } = page || {};
  if (page) {
    if (!current) throw new Error("page.current starts at 1");
    if (!size) throw new Error("page.size starts at 1");
  }

  return { current, size };
};

export const checkAllowedDomains = url => {
  if (!allowedDomains[0]) return;
  const { hostname } = url;

  if (!allowedDomains.some(domain => hostname.includes(domain)))
    throw new Error(`${hostname} not in allowed domains list`);
};

export const checkProcessingDomain = async ({ host }) => {
  const count = await db.report.count({
    where: { websiteHost: { contains: host }, status: "PROCESSING" }
  });

  if (count) throw new Error(`Already checking ${host}`);
};

const consumer = async (queue, results) => {
  const current = queue.shift();
  if (!current) return;

  results.push(await current());
  return consumer(queue, results);
};

export const parallelize = async (promises, limit = availableParallelism()) => {
  const queue = [...promises];
  const results = [];

  await Promise.allSettled(
    new Array(limit).fill().map(() => consumer(queue, results))
  );

  return results;
};
