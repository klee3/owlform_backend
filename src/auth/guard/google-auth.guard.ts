import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // handle cancel case from Google
    if (request.query?.error) {
      return true; // allow controller to handle it
    }

    return super.canActivate(context);
  }

  handleRequest(err, user, info, context) {
    const request = context.switchToHttp().getRequest();

    if (request.query?.error) {
      return null;
    }

    if (err || !user) {
      throw err || new Error('Google authentication failed');
    }

    return user;
  }
}
