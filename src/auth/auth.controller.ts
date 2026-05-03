import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthProvider } from 'generated/prisma/enums';
import { setAuthCookies } from 'src/commom/utils/cookies.util';
import { ClientInfo } from 'src/commom/utils/request.util';
import { ConfigService } from 'src/config/config.service';
import { UserWithAccounts } from 'src/prisma/type';
import { AuthService } from './auth.service';
import { LocalLoginDto } from './dto/local-login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GoogleAuthGuard } from './guard/google-auth.guard';
import { RefreshAuthGuard } from './guard/refresh-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('/register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res,
  ) {
    const result = await this.authService.register(registerDto);
    await this.authService.sendVerificationMail(result.userId);

    const token = await this.authService.createVerificationSessionToken(
      result.userId,
    );

    res.cookie('verificationToken', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
    });

    return { message: 'Verification Email sent!' };
  }

  @Post('/resend-verification')
  async resendVerification(@Req() req: Request) {
    const token = req.cookies['verificationToken'];

    const user = await this.authService.verifyResend(token);

    await this.authService.sendVerificationMail(user.id);

    return { message: 'Verification email resent' };
  }

  @Get('/verification-status')
  async getVerificationStatus(@Req() req) {
    const token = req.cookies['verificationToken'];
    return this.authService.verificationStatus(token);
  }

  @Post('/verify-email')
  async verifyEmail(
    @Req() req: Request,
    @Res({ passthrough: true }) res,
    @Body() verifyEmailDto: VerifyEmailDto,
    @ClientInfo() clientInfo,
  ) {
    const tokens = await this.authService.verifyEmail(
      verifyEmailDto,
      clientInfo,
    );

    setAuthCookies(res, tokens);

    return { message: 'Email verification successfull' };
  }

  @Post('/login')
  async localLogin(
    @Req() req: Request,
    @Res({ passthrough: true }) res,
    @Body() localLoginDto: LocalLoginDto,
    @ClientInfo() clientInfo,
  ) {
    const user = await this.authService.validateLocalLogin(localLoginDto);
    const tokens = await this.authService.login(
      user,
      AuthProvider.LOCAL,
      clientInfo,
    );

    setAuthCookies(res, tokens);

    return { message: 'login successful' };
  }

  @UseGuards(RefreshAuthGuard)
  @Post('/refresh-token')
  async refreshToken(@Req() req, @Res({ passthrough: true }) res) {
    const userId = req.user.id as number;
    const sessionId = req.user.sessionId as number;

    const tokens = await this.authService.rotateRefreshToken(userId, sessionId);

    setAuthCookies(res, tokens);

    return { message: 'refresh token rotated successfully' };
  }

  @UseGuards(GoogleAuthGuard)
  @Get('/google/login')
  googleLogin() {
    // Passport redirect to google automatically
  }

  // TOOD: handle it
  // http://localhost:8080/auth/google/callback?error=access_denied
  @UseGuards(GoogleAuthGuard)
  @Get('/google/callback')
  async googleCallback(
    @Req() req,
    @Res({ passthrough: true }) res,
    @ClientInfo() clientInfo,
  ) {
    if (req.query?.error) {
      return res.redirect(
        `${this.configService.frontendUrl}/auth/callback?error=access_denied`,
      );
    }

    try {
      const user = req.user as UserWithAccounts;

      const tokens = await this.authService.login(
        user,
        AuthProvider.GOOGLE,
        clientInfo,
      );

      // set cookies BEFORE redirect
      setAuthCookies(res, tokens);

      // redirect browser to frontend
      return res.redirect(`${this.configService.frontendUrl}/auth/callback`);
    } catch (err: any) {
      // handle error case
      return res.redirect(
        `${this.configService.frontendUrl}/auth/callback?error=${encodeURIComponent(
          err?.message || 'Google login failed',
        )}`,
      );
    }
  }

  @Post('/logout')
  async logout(@Req() req, @Res({ passthrough: true }) res) {
    try {
      const userId = req.user?.id;
      const sessionId = req.user?.sessionId;

      if (userId && sessionId) {
        await this.authService.logout(userId, sessionId);
      }
    } catch (err) {
      // swallow errors (important)
    }

    // always clear cookies
    res.clearCookie('accessToken', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });
    res.clearCookie('refreshToken', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });
    res.clearCookie('verificationToken', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });

    return { message: 'Logged out successfully' };
  }
}
