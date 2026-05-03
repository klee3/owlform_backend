import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard/jwt-token-auth.guard';
import { SessionAuthGuard } from 'src/auth/guard/session-auth.guard';
import { WorkspaceService } from './workspace.service';

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @UseGuards(JwtAuthGuard, SessionAuthGuard)
  @Get('/my-workspace')
  getUserWorkspaces(@Req() req) {
    const userId = req.session.userId as number;
    return this.workspaceService.getUserWorkspaces(userId);
  }
}
