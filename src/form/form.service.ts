import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { getDateKey } from 'src/commom/utils/date.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFormDto } from './dto/create-form.dto';

@Injectable()
export class FormService {
  constructor(private prismaClient: PrismaService) {}

  async createForm(userId: number, createFormDto: CreateFormDto) {
    const workspace = await this.prismaClient.workspace.findFirst({
      where: {
        slug: createFormDto.workspaceSlug,
        members: {
          some: {
            userId,
          },
        },
      },
    });

    if (!workspace) {
      throw new ForbiddenException('No access to workspace');
    }

    return this.prismaClient.form.create({
      data: {
        name: createFormDto.name,
        description: createFormDto.description,
        slug: createId(),
        workspaceId: workspace.id,
      },
    });
  }

  async getFormsForWorkspace(userId: number, workspaceSlug: string) {
    const workspace = await this.prismaClient.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: { userId },
        },
      },
    });

    if (!workspace) {
      throw new UnauthorizedException('Workspace not found or unauthorized');
    }

    return this.prismaClient.form.findMany({
      where: {
        workspaceId: workspace.id,
      },
    });
  }

  async submit(
    slug: string,
    data: Record<string, any>,
    opts?: { redirectUrl?: string; referrer?: string },
  ) {
    const form = await this.prismaClient.form.findUnique({
      where: { slug },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    const submission = await this.prismaClient.formSubmission.create({
      data: {
        formId: form.id,
        data,
      },
    });

    // Determine redirect URL priority:
    // 1. Submission-level override (query param)
    // 2. Referrer (where the form was submitted from)
    const finalRedirectUrl = opts?.redirectUrl ?? opts?.referrer ?? null;

    return {
      success: true,
      submissionId: submission.id,
      message: 'Submission received',
      redirectUrl: finalRedirectUrl || null,
    };
  }

  async getFormStats(userId: number, workspaceSlug: string, formSlug: string) {
    const workspace = await this.validateWorkspaceAccess(userId, workspaceSlug);

    const form = await this.prismaClient.form.findFirst({
      where: {
        slug: formSlug,
        workspaceId: workspace.id,
      },
    });

    if (!form) {
      throw new NotFoundException('Form not found in workspace');
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalSubmissions, todaySubmissions] = await Promise.all([
      this.prismaClient.formSubmission.count({
        where: { formId: form.id },
      }),
      this.prismaClient.formSubmission.count({
        where: {
          formId: form.id,
          createdAt: { gte: startOfToday },
        },
      }),
    ]);

    return {
      totalSubmissions,
      todaySubmissions,
    };
  }

  async validateWorkspaceAccess(userId: number, workspaceSlug: string) {
    const workspace = await this.prismaClient.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Unauthorized or workspace not found');
    }

    return workspace;
  }

  async getLast30DaysStats(
    userId: number,
    workspaceSlug: string,
    formSlug: string,
  ) {
    // 1. validate workspace access
    const workspace = await this.validateWorkspaceAccess(userId, workspaceSlug);

    // 2. ensure form belongs to workspace
    const form = await this.prismaClient.form.findFirst({
      where: {
        slug: formSlug,
        workspaceId: workspace.id,
      },
      select: { id: true },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    // 3. date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);

    // 4. fetch submissions
    const submissions = await this.prismaClient.formSubmission.findMany({
      where: {
        formId: form.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // 5. group by day
    const map = new Map<string, number>();

    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = getDateKey(d); // YYYY-MM-DD
      map.set(key, 0);
    }

    submissions.forEach((s) => {
      const key = getDateKey(s.createdAt);
      map.set(key, (map.get(key) || 0) + 1);
    });

    // 6. format for chart.js
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);

      const key = getDateKey(d);

      labels.push(
        d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      );

      data.push(map.get(key) || 0);
    }

    return {
      labels,
      data,
    };
  }

  async deleteForm(userId: number, workspaceSlug: string, formSlug: string) {
    // 1. Validate workspace access
    const workspace = await this.validateWorkspaceAccess(userId, workspaceSlug);

    if (!workspace) {
      throw new ForbiddenException('No access to this workspace');
    }

    // 2. Find form inside workspace
    const form = await this.prismaClient.form.findFirst({
      where: {
        slug: formSlug,
        workspaceId: workspace.id,
      },
      select: {
        id: true,
      },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    // 3. Delete form (submissions auto-cascade)
    await this.prismaClient.form.delete({
      where: {
        id: form.id,
      },
    });

    return {
      success: true,
      message: 'Form deleted successfully',
    };
  }
}
