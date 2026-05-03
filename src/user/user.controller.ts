import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard/jwt-token-auth.guard';
import { SessionAuthGuard } from 'src/auth/guard/session-auth.guard';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard, SessionAuthGuard)
  @Get('/session')
  getProfile(@Req() req) {
    return this.userService.findSessionById(req.session.id);
  }
}
