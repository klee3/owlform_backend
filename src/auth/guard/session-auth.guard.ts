import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const user = req.user; // from JwtStrategy

    if (!user?.sessionId) {
      throw new UnauthorizedException('Missing session');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: user.sessionId },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    // optional hardening
    if (session.userId !== user.id)
      throw new UnauthorizedException('Session Compromised');

    req.session = session;

    return true;
  }
}
