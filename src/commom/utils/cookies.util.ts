import { Response } from 'express';

export const authCookies = {
  access: (token: string) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 1000,
    path: '/',
    value: token,
  }),

  refresh: (token: string) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
    value: token,
  }),
};

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  res.cookie(
    'accessToken',
    tokens.accessToken,
    authCookies.access(tokens.accessToken),
  );
  res.cookie(
    'refreshToken',
    tokens.refreshToken,
    authCookies.refresh(tokens.refreshToken),
  );
}
