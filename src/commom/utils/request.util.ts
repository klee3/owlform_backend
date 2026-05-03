import { createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

export function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }

  return req.socket.remoteAddress;
}

export const ClientInfo = createParamDecorator((_, ctx) => {
  const req = ctx.switchToHttp().getRequest();
  return {
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'],
  };
});
