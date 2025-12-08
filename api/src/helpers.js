import { availableParallelism } from "os";
import db from "./db.js";
import { GraphQLError } from "graphql";

export const getValidatedPage = page => {
  const { current, size } = page || {};
  if (page) {
    if (!current) throw new GraphQLError("page.current starts at 1");
    if (!size) throw new GraphQLError("page.size starts at 1");
  }

  return { current, size };
};

const { ALLOWED_DOMAINS = "[]" } = process.env;
const allowedDomains = JSON.parse(ALLOWED_DOMAINS);

export const checkAllowedDomains = url => {
  if (!allowedDomains[0]) return;
  const { hostname } = url;

  if (!allowedDomains.some(domain => hostname.includes(domain)))
    throw new GraphQLError(`${hostname} not in allowed domains list`);
};

export const checkProcessingDomain = async ({ host }) => {
  const count = await db.report.count({
    where: { websiteHost: { contains: host }, status: "PROCESSING" }
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

const defaultPasswordPolicy = {
  length: 8,
  upper: true,
  lower: true,
  number: true,
  symbol: true
};
const { PASSWORD_POLICY } = process.env;
let customPolicy = {};
try {
  customPolicy = JSON.parse(PASSWORD_POLICY);
} catch {
  PASSWORD_POLICY
    // eslint-disable-next-line no-console
    ? console.warn("Invalid PASSWORD_POLICY JSON, using defaults")
    // eslint-disable-next-line no-console
    : console.info("No custom PASSWORD_POLICY set, using defaults");
}

// bcrypt with UTF-8 is safe up to 18 caracteres
const MAX_LENGTH = 18;
if (customPolicy.length && customPolicy.length > MAX_LENGTH) {
  // eslint-disable-next-line no-console
  console.warn(`Password length policy of ${customPolicy.length} is too high, using ${MAX_LENGTH} instead`);
  customPolicy.length = MAX_LENGTH;
}

export const passwordPolicy = { ...defaultPasswordPolicy, ...customPolicy };
const { length } = passwordPolicy;

const pwdValidators = {
  length: pwd => {
    if (pwd.length < length)
      return `Password must be at least ${length} characters long`;

    if (pwd.length > MAX_LENGTH)
      return `Password must not exceed ${MAX_LENGTH} characters`;

    return false;
  },
  upper: pwd => !/[A-Z]/.test(pwd) &&
    "Password must contain at least one uppercase letter",
  lower: pwd => !/[a-z]/.test(pwd) &&
    "Password must contain at least one lowercase letter",
  number: pwd => !/\d/.test(pwd) &&
    "Password must contain at least one number",
  symbol: pwd => !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd) &&
    "Password must contain at least one special character"
};

/**
 * Validate password complexity
 * @param {string} password - Password to validate
 * @returns {object} Validation result with isValid and message
 */
export const validatePasswordComplexity = pwd => {
  for (const constraint in passwordPolicy) {
    if (!passwordPolicy[constraint]) continue;

    const message = pwdValidators[constraint](pwd);
    if (message) return { isValid: false, message };
  }

  return { isValid: true, message: "Password is valid" };
};
