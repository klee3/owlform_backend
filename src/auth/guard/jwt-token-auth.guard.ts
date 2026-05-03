import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { throwAuthError } from '../auth-error';
import { AuthError } from '../auth-error-codes';

export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    if (info?.name === 'TokenExpiredError') {
      throwAuthError(AuthError.EXPIRED_ACCESS_TOKEN);
    }

    if (info?.name === 'JsonWebTokenError') {
      throwAuthError(AuthError.INVALID_ACCESS_TOKEN);
    }

    if (!user) {
      throwAuthError(AuthError.UNAUTHORIZED);
    }

    return user;
  }
}
