import { Injectable } from '@nestjs/common';
import { Role } from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientType } from 'src/prisma/type';

@Injectable()
export class OrganizationService {
  constructor(private prismaClient: PrismaService) {}

  async createDefaultOrganization(
    name: string,
    userId: number,
    prismaClient: PrismaClientType = this.prismaClient,
  ) {
    const existing = await prismaClient.organization.findFirst({
      where: {
        ownerId: userId,
        isDefault: true,
      },
    });

    if (existing) return existing;

    try {
      return await prismaClient.organization.create({
        data: {
          name: `${name}'s Organization`,
          ownerId: userId,
          isDefault: true,
          members: {
            create: {
              userId,
              role: Role.ADMIN,
            },
          },
        },
      });
    } catch (err: any) {
      // Only handle unique constraint race condition
      if (err.code === 'P2002') {
        const org = await prismaClient.organization.findFirst({
          where: {
            ownerId: userId,
            isDefault: true,
          },
        });

        if (!org) {
          throw new Error(
            'Default organization creation failed: race condition but no record found',
          );
        }

        return org;
      }

      // rethrow anything else
      throw err;
    }
  }
}
