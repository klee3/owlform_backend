import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from 'src/config/config.service';
import { throwAuthError } from '../auth-error';
import { AuthError } from '../auth-error-codes';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../type';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'refresh-jwt',
) {
  constructor(
    private config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.refreshToken,
      ]),
      secretOrKey: config.jwt.refreshTokenSecret,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload) {
    const refreshToken = req?.cookies?.refreshToken;
    if (!refreshToken) {
      throwAuthError(AuthError.INVALID_REFRESH_TOKEN);
    }

    const userId = payload.sub;
    const sessionId = payload.sessionId;
    return this.authService.validateRefreshToken({
      userId,
      sessionId,
      refreshToken,
    });
  }
}
