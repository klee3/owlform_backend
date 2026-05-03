import { Injectable } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { Role } from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientType } from 'src/prisma/type';

@Injectable()
export class WorkspaceService {
  constructor(private prismaClient: PrismaService) {}

  async createDefaultWorkspace(
    orgId: number,
    userId: number,
    prismaClient: PrismaClientType = this.prismaClient,
  ) {
    const existing = await prismaClient.workspace.findFirst({
      where: {
        organizationId: orgId,
        isDefault: true,
      },
    });

    if (existing) return existing;

    try {
      return await prismaClient.workspace.create({
        data: {
          name: 'Default Workspace',
          isDefault: true,
          organizationId: orgId,
          slug: createId(),
          members: {
            create: {
              role: Role.ADMIN,
              userId,
            },
          },
        },
      });
    } catch (err: any) {
      // handle race condition (unique constraint)
      if (err.code === 'P2002') {
        const workspace = await prismaClient.workspace.findFirst({
          where: {
            organizationId: orgId,
            isDefault: true,
          },
        });

        if (!workspace) {
          throw new Error(
            'Default workspace creation failed: race condition but no record found',
          );
        }

        return workspace;
      }

      // rethrow unexpected errors
      throw err;
    }
  }

  async getUserWorkspaces(userId: number) {
    return this.prismaClient.workspace.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: true,
        organization: true,
      },
    });
  }
}
