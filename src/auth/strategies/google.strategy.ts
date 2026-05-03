import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { ConfigService } from 'src/config/config.service';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.googleSecrets.clientId,
      clientSecret: configService.googleSecrets.clientSecret,
      callbackURL: configService.googleSecrets.callbackUrl,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    const { emails, name, displayName } = profile;
    const email = emails?.[0]?.value;
    if (!email) {
      throw new Error('Google profile did not return an email');
    }

    const userName =
      displayName ||
      `${name?.givenName ?? ''} ${name?.familyName ?? ''}`.trim() ||
      email.split('@')[0];

    return this.authService.validateGoogleUser(email, userName, profile.id);
  }
}
