import { availableParallelism } from "os";
import { GraphQLNonNull, GraphQLError } from "graphql";
import { Op } from "sequelize";
import { ReportDbModel } from "./reports.js";

const { ALLOWED_DOMAINS = "[]" } = process.env;
const allowedDomains = JSON.parse(ALLOWED_DOMAINS);

export const getNonNullFields = fields =>
  Object.entries(fields).reduce(
    (acc, [key, { type, ...rest }]) => ({
      ...acc,
      [key]: { type: new GraphQLNonNull(type), ...rest }
    }),
    {}
  );

export const getValidatedPage = page => {
  const { current, size } = page || {};
  if (page) {
    if (!current) throw new GraphQLError("page.current starts at 1");
    if (!size) throw new GraphQLError("page.size starts at 1");
  }

  return { current, size };
};

export const checkAllowedDomains = url => {
  if (!allowedDomains[0]) return;
  const { hostname } = new URL(url);

  if (!allowedDomains.some(domain => hostname.includes(domain)))
    throw new GraphQLError(`${hostname} not in allowed domains list`);
};

export const checkProcessingDomain = async url => {
  const { host } = new URL(url);

  const count = await ReportDbModel.count({
    where: { websiteHost: { [Op.substring]: host }, status: "PROCESSING" }
  });

  if (count) throw new GraphQLError(`Already checking ${host}`);
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
