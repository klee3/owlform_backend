import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prismaClient: PrismaService) {}

  async findById(userId: number) {
    return await this.prismaClient.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  async findSessionById(sessionId: number) {
    return await this.prismaClient.session.findUnique({
      where: {
        id: sessionId,
      },
      include: { user: true },
    });
  }
}
