import jwt from "jsonwebtoken";

// Duration constants (in seconds)
export const ACCESS_TOKEN_EXPIRES_IN = 3 * 60 * 60; // 3 hours

// Access Token (short-lived 3H)
export const createAccessToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
};

// Refresh Token (long-lived 30D)
export const createRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "30d",
  });
};

/**
 * Returns the ISO timestamp at which the current access token will expire.
 */
export const getAccessTokenExpiresAt = () => {
  return new Date(Date.now() + ACCESS_TOKEN_EXPIRES_IN * 1000).toISOString();
};
