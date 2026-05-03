export const AuthError = {
  // General
  UNAUTHORIZED: {
    code: 'AUTH_001',
    message: 'Unauthorized',
  },

  // Login
  INVALID_CREDENTIALS: {
    code: 'AUTH_101',
    message: 'Invalid email or password',
  },
  EMAIL_NOT_VERIFIED: {
    code: 'AUTH_102',
    message: 'Email not verified',
  },
  OAUTH_REQUIRED: {
    code: 'AUTH_103',
    message: 'Please continue with Google',
  },
  ACCOUNT_TYPE_MISMATCH: {
    code: 'AUTH_104',
    message: 'Please login with correct provider',
  },

  // Register
  USER_ALREADY_EXISTS: {
    code: 'AUTH_201',
    message: 'Email already registered',
  },
  USER_ALREADY_VERIFIED: {
    code: 'AUTH_202',
    message: 'User already verified',
  },

  // Verification
  INVALID_TOKEN: {
    code: 'AUTH_301',
    message: 'Invalid or expired token',
  },
  TOKEN_EXPIRED: {
    code: 'AUTH_302',
    message: 'Token expired',
  },
  TOKEN_COOLDOWN: {
    code: 'AUTH_303',
    message: 'Please wait before requesting again',
  },

  // Session / Refresh
  SESSION_NOT_FOUND: {
    code: 'AUTH_401',
    message: 'Session not found',
  },
  SESSION_EXPIRED: {
    code: 'AUTH_402',
    message: 'Session expired. Please log in again.',
  },
  INVALID_SESSION: {
    code: 'AUTH_403',
    message: 'Invalid session',
  },
  EXPIRED_ACCESS_TOKEN: {
    code: 'AUTH_404',
    message: 'Access token expired',
  },
  INVALID_ACCESS_TOKEN: {
    code: 'AUTH_405',
    message: 'Invalid access token',
  },
  INVALID_REFRESH_TOKEN: {
    code: 'AUTH_406',
    message: 'Invalid refresh token',
  },
};
