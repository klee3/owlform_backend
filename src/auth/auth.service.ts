import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, TokenType } from 'generated/prisma/enums';
import { randomUUID } from 'node:crypto';
import { compare, hash } from 'src/commom/utils/hash.util';
import { ConfigService } from 'src/config/config.service';
import { OrganizationService } from 'src/organization/organization.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientType, UserWithAccounts } from 'src/prisma/type';
import { WorkspaceService } from 'src/workspace/workspace.service';
import { throwAuthError } from './auth-error';
import { AuthError } from './auth-error-codes';
import { LocalLoginDto } from './dto/local-login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtPayload } from './type';

@Injectable()
export class AuthService {
  constructor(
    private prismaClient: PrismaService,
    private jwt: JwtService,
    private configService: ConfigService,
    private organizationService: OrganizationService,
    private workspaceService: WorkspaceService,
  ) {}

  async register(registerDto: RegisterDto) {
    const name = registerDto.name?.trim();
    const email = registerDto.email.trim();
    const password = registerDto.password.trim();

    const existingUser = await this.prismaClient.user.findUnique({
      where: {
        email,
      },
      include: { accounts: true },
    });

    // If user exist
    if (existingUser) {
      // Check if LOCAL account already exists
      const hasLocal = existingUser.accounts.some(
        (acc) => acc.provider === AuthProvider.LOCAL,
      );

      // Case 1: Fully registered user
      if (hasLocal && existingUser.isEmailVerified) {
        throwAuthError(AuthError.USER_ALREADY_EXISTS, 'bad_request');
      }

      // Case 2: Google-only account
      if (!hasLocal) {
        throwAuthError(AuthError.OAUTH_REQUIRED, 'bad_request');
      }

      // Case 3: LOCAL exists but NOT verified
      // Update password + resend verification instead of creating new user
      const hashedPassword = await hash(password);
      await this.prismaClient.account.updateMany({
        where: {
          userId: existingUser.id,
          provider: AuthProvider.LOCAL,
        },
        data: { hashedPassword },
      });

      return { email: existingUser.email, userId: existingUser.id };
    }

    // User does not exist -> Create user
    const hashedPassword = await hash(password);

    // Create Local user
    const newUser = await this.prismaClient.user.create({
      data: {
        email,
        name,
        isEmailVerified: false,
        accounts: {
          create: {
            provider: AuthProvider.LOCAL,
            providerAccountId: email,
            hashedPassword: hashedPassword,
          },
        },
      },
    });

    return { email: newUser.email, userId: newUser.id };
  }

  // Create verification token + send email
  async sendVerificationMail(userId: number) {
    const { rawToken, tokenId } = await this.createVerificationToken(userId);

    // TODO: Send Verificaiton Mail
    console.log({
      token: rawToken,
      tokenId: tokenId,
    });
    console.log(
      `${this.configService.frontendUrl}/verify-email?token=${rawToken}&tokenId=${tokenId}`,
    );

    return { message: 'Verification Email sent!' };
  }

  async verificationStatus(token: string) {
    if (!token) {
      return { status: 'NO_SESSION' };
    }

    try {
      const payload = this.jwt.verify(token, {
        secret: this.configService.jwt.accessTokenSecret,
      });

      const user = await this.prismaClient.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        return { status: 'NO_SESSION' };
      }

      if (user.isEmailVerified) {
        return { status: 'VERIFIED' };
      }

      return { status: 'PENDING' };
    } catch {
      return { status: 'NO_SESSION' };
    }
  }

  // sign jwt token to know which user to send verification email
  async createVerificationSessionToken(userId: number) {
    return await this.jwt.sign(
      { sub: userId, type: 'email_verification' },
      {
        secret: this.configService.jwt.accessTokenSecret,
        expiresIn: '1h',
      },
    );
  }

  // Create Verification Token
  async createVerificationToken(
    userId: number,
    prismaClient: PrismaClientType = this.prismaClient,
  ) {
    const COOLDOWN = 2 * 60 * 1000; // 2 min cooldown
    const VERIFY_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 Hour

    const rawToken = randomUUID();
    const tokenId = randomUUID();
    const hashedToken = await hash(rawToken);

    const recentToken = await prismaClient.verificationToken.findFirst({
      where: {
        userId,
        type: TokenType.EMAIL_VERIFY,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentToken) {
      const diff = Date.now() - recentToken.createdAt.getTime();
      if (diff < COOLDOWN) {
        const seconds = Math.ceil((COOLDOWN - diff) / 1000);

        throwAuthError(
          {
            code: AuthError.TOKEN_COOLDOWN.code,
            message: `Please wait ${seconds}s before requesting verification email again`,
          },
          'bad_request',
        );
      } else {
        await prismaClient.verificationToken.deleteMany({
          where: {
            userId: recentToken.userId,
            type: TokenType.EMAIL_VERIFY,
          },
        });
      }
    }

    await prismaClient.verificationToken.create({
      data: {
        userId,
        hashedToken: hashedToken,
        tokenId: tokenId,
        type: TokenType.EMAIL_VERIFY,
        expiresAt: new Date(Date.now() + VERIFY_TOKEN_EXPIRY),
      },
    });

    return {
      rawToken,
      tokenId,
    };
  }

  // verify if it's valid user trying to resend verification email
  async verifyResend(token: string) {
    if (!token) {
      throwAuthError(AuthError.UNAUTHORIZED);
    }

    let payload;
    try {
      payload = this.jwt.verify(token, {
        secret: this.configService.jwt.accessTokenSecret,
      });
    } catch {
      throwAuthError(AuthError.INVALID_TOKEN);
    }

    if (payload.type !== 'email_verification') {
      throwAuthError(AuthError.INVALID_TOKEN);
    }

    const user = await this.prismaClient.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throwAuthError(AuthError.INVALID_TOKEN);
    }

    if (user.isEmailVerified) {
      throwAuthError(AuthError.USER_ALREADY_VERIFIED);
    }

    return user;
  }

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const { token, tokenId } = verifyEmailDto;

    const record = await this.prismaClient.verificationToken.findUnique({
      where: { tokenId },
      include: { user: { include: { accounts: true } } },
    });

    if (!record) {
      throwAuthError(AuthError.INVALID_TOKEN, 'bad_request');
    }

    if (record.user.isEmailVerified) {
      throwAuthError(AuthError.USER_ALREADY_VERIFIED, 'bad_request');
    }

    if (record.expiresAt < new Date()) {
      throwAuthError(AuthError.TOKEN_EXPIRED, 'bad_request');
    }

    const isValidToken = await compare(record.hashedToken, token);

    if (!isValidToken) {
      throwAuthError(AuthError.INVALID_TOKEN, 'bad_request');
    }

    const user = record.user;

    return await this.prismaClient.$transaction(async (tx) => {
      // mark verified
      await tx.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true },
      });

      // delete token after use
      await tx.verificationToken.deleteMany({
        where: { userId: record.userId, type: TokenType.EMAIL_VERIFY },
      });

      // Create default workspace + organization
      const org = await this.organizationService.createDefaultOrganization(
        user.name,
        user.id,
        tx,
      );
      await this.workspaceService.createDefaultWorkspace(org.id, user.id, tx);

      // Generate tokens AFTER verification
      const tokens = await this.generateSessionTokens(
        user,
        AuthProvider.LOCAL,
        tx,
        meta,
      );
      return tokens;
    });
  }

  async generateSessionTokens(
    user: UserWithAccounts,
    provider: AuthProvider,
    prismaClient: PrismaClientType = this.prismaClient,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const account = user.accounts.find((acc) => acc.provider === provider);

    if (!account) {
      throwAuthError(AuthError.ACCOUNT_TYPE_MISMATCH);
    }

    const session = await prismaClient.session.create({
      data: {
        userId: user.id,
        accountId: account.id,
        hashedRefreshToken: '', // temp
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const payload: JwtPayload = { sub: user.id, sessionId: session.id };

    const accessToken = this.jwt.sign(payload, {
      secret: this.configService.jwt.accessTokenSecret,
      expiresIn: this.configService.jwt.accessTokenExpiresIn as any,
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.configService.jwt.refreshTokenSecret,
      expiresIn: this.configService.jwt.refreshTokenExpiresIn as any,
    });

    const hashedRefreshToken = await hash(refreshToken);

    await prismaClient.session.update({
      where: { id: session.id },
      data: { hashedRefreshToken },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async validateLocalLogin(localLoginDto: LocalLoginDto) {
    const email = localLoginDto.email.trim();
    const password = localLoginDto.password.trim();

    const user = await this.prismaClient.user.findUnique({
      where: { email },
      include: { accounts: true },
    });

    if (!user) throwAuthError(AuthError.INVALID_CREDENTIALS);

    const localAccount = user.accounts.find(
      (acc) => acc.provider === AuthProvider.LOCAL,
    );

    if (user.accounts.length && !localAccount) {
      throwAuthError(AuthError.OAUTH_REQUIRED);
    }

    if (!localAccount || !localAccount.hashedPassword) {
      throwAuthError(AuthError.INVALID_CREDENTIALS);
    }

    const isValid = await compare(localAccount.hashedPassword, password);

    if (!isValid) {
      throwAuthError(AuthError.INVALID_CREDENTIALS);
    }

    const isVerified = user.isEmailVerified;
    if (!user.isEmailVerified) {
      throwAuthError(AuthError.EMAIL_NOT_VERIFIED);
    }

    return user;
  }

  async login(
    user: UserWithAccounts,
    provider: AuthProvider,
    meta?: { ip?: string; userAgent?: string },
  ) {
    return await this.prismaClient.$transaction(async (tx) => {
      const tokens = await this.generateSessionTokens(user, provider, tx, meta);

      return tokens;
    });
  }

  async validateRefreshToken({
    refreshToken,
    sessionId,
    userId,
  }: {
    userId: number;
    sessionId: number;
    refreshToken: string;
  }) {
    const session = await this.prismaClient.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      throwAuthError(AuthError.SESSION_NOT_FOUND);
    }

    // 1. Expired session check
    if (session.expiresAt < new Date()) {
      await this.prismaClient.session.delete({ where: { id: sessionId } });
      throwAuthError(AuthError.SESSION_EXPIRED);
    }

    // 2. User mismatch check
    if (session.userId !== userId) {
      throwAuthError(AuthError.INVALID_SESSION);
    }

    // 3. Token match check
    const isValid = await compare(session.hashedRefreshToken, refreshToken);
    if (!isValid) {
      // possible token theft → invalidate session
      await this.prismaClient.session.delete({ where: { id: sessionId } });
      throwAuthError(AuthError.INVALID_REFRESH_TOKEN);
    }

    return {
      id: session.user.id,
      sessionId: session.id,
    };
  }

  async rotateRefreshToken(userId: number, sessionId: number) {
    return this.prismaClient.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throwAuthError(AuthError.SESSION_NOT_FOUND);
      }

      // extra safety check inside transaction
      if (session.userId !== userId) {
        throwAuthError(AuthError.INVALID_SESSION);
      }

      // Generate NEW tokens
      const newPayload: JwtPayload = {
        sub: userId,
        sessionId: sessionId,
      };

      const newAccessToken = this.jwt.sign(newPayload, {
        secret: this.configService.jwt.accessTokenSecret,
        expiresIn: this.configService.jwt.accessTokenExpiresIn as any,
      });

      const newRefreshToken = this.jwt.sign(newPayload, {
        secret: this.configService.jwt.refreshTokenSecret,
        expiresIn: this.configService.jwt.refreshTokenExpiresIn as any,
      });

      const hashed = await hash(newRefreshToken);

      // Rotate stored token
      await tx.session.update({
        where: { id: sessionId },
        data: {
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // sliding sessions mechanism
          hashedRefreshToken: hashed,
        },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    });
  }

  async validateGoogleUser(email: string, name: string, googleId: string) {
    const user = await this.prismaClient.user.findUnique({
      where: { email },
      include: { accounts: true },
    });

    // 1. User does NOT exist → create
    if (!user) {
      return await this.prismaClient.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            name,
            isEmailVerified: true, // Google already verified
            accounts: {
              create: {
                provider: AuthProvider.GOOGLE,
                providerAccountId: googleId,
              },
            },
          },
          include: { accounts: true },
        });

        // Create default workspace + organization
        const org = await this.organizationService.createDefaultOrganization(
          user.name,
          user.id,
          tx,
        );
        await this.workspaceService.createDefaultWorkspace(org.id, user.id, tx);

        return user;
      });
    }

    // 2. User exists → check accounts
    const googleAccount = user.accounts.find(
      (acc) => acc.provider === AuthProvider.GOOGLE,
    );

    if (googleAccount) {
      // already linked → login
      return user;
    }

    const hasLocal = user.accounts.some(
      (acc) => acc.provider === AuthProvider.LOCAL,
    );

    // 3. LOCAL exists → link Google account
    if (hasLocal) {
      return this.prismaClient.user.update({
        where: { id: user.id },
        data: {
          accounts: {
            create: {
              provider: AuthProvider.GOOGLE,
              providerAccountId: googleId,
            },
          },
        },
        include: { accounts: true },
      });
    }

    // 4. fallback (shouldn't happen)
    throwAuthError(AuthError.ACCOUNT_TYPE_MISMATCH);
  }

  async logout(userId: number, sessionId: number) {
    const session = await this.prismaClient.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) return;

    // extra safety check
    if (session.userId !== userId) return;

    // delete session
    await this.prismaClient.session.delete({
      where: { id: sessionId },
    });
  }
}
