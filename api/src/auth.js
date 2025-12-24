import jwt from "jsonwebtoken";

const {
  JWT_SECRET = "find_me_if_you_can_;)",
  JWT_EXPIRES_IN = "7d"
} = process.env;

export const invalidatedTokens = new Set();

setInterval(() => {
  invalidatedTokens.forEach(token => {
    jwt.verify(token, JWT_SECRET, err =>
      err && invalidatedTokens.delete(token));
  });
}, 60 * 60 * 1000); // 1h in ms

/**
 * Generates a JWT token for a user
 * @param {string} identifier - The user's identifier
 * @returns {string} The generated JWT token
 */
export const generateToken = identifier =>
  jwt.sign({ identifier }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

/**
 * Verifies if a token is valid
 * @param {string} token - The token to verify
 * @returns {Promise<object>} A promise that resolves with the decoded payload if the token is valid, or rejects with an error
 */
export const verifyToken = token =>
  new Promise((resolve, reject) => {
    if (invalidatedTokens.has(token)) return reject("invalidated");

    jwt.verify(
      token,
      JWT_SECRET,
      (err, decoded) => err ? reject(err) : resolve(decoded)
    );
  });
