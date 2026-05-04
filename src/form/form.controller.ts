import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/guard/jwt-token-auth.guard';
import { SessionAuthGuard } from 'src/auth/guard/session-auth.guard';
import { ConfigService } from 'src/config/config.service';
import { CreateFormDto } from './dto/create-form.dto';
import { FormService } from './form.service';

@Controller('form')
export class FormController {
  constructor(
    private readonly formService: FormService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard, SessionAuthGuard)
  @Get(':workspaceSlug')
  getForms(@Req() req, @Param('workspaceSlug') workspaceSlug: string) {
    const userId = req.session.userId;

    return this.formService.getFormsForWorkspace(userId, workspaceSlug);
  }

  @UseGuards(JwtAuthGuard, SessionAuthGuard)
  @Post()
  createForm(@Req() req, @Body() createFormDto: CreateFormDto) {
    const userId = req.session.userId;

    return this.formService.createForm(userId, createFormDto);
  }

  @Post(':slug')
  async submit(
    @Param('slug') slug: string,
    @Body() body?: Record<string, any>,
    @Query('redirectUrl') redirectUrl?: string,
    @Headers('referer') referer?: string,
    @Headers('accept') accept?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.formService.submit(slug, body ?? {}, {
      redirectUrl,
      referrer: referer,
    });

    const wantsHtml = accept?.includes('text/html');
    const wantsJson = accept?.includes('application/json');

    // HTML FORM SUBMISSION FLOW
    if (wantsHtml && !wantsJson && res) {
      const targetRedirect = result.redirectUrl || referer || null;

      if (targetRedirect) {
        return res.redirect(targetRedirect);
      }

      // fallback only if nothing exists
      return res.redirect(
        new URL('/form-submitted', this.configService.frontendUrl).toString(),
      );
    }

    // API / fetch / JSON clients
    return result;
  }

  @UseGuards(JwtAuthGuard, SessionAuthGuard)
  @Get('stats/:workspaceSlug/:formId')
  getStats(
    @Req() req,
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('formSlug') formSlug: string,
  ) {
    return this.formService.getFormStats(
      req.session.userId,
      workspaceSlug,
      formSlug,
    );
  }

  @UseGuards(JwtAuthGuard, SessionAuthGuard)
  @Get('stats/:workspaceSlug/:formId/last-30-days')
  getLast30Days(
    @Req() req,
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('formSlug') formSlug: string,
  ) {
    return this.formService.getLast30DaysStats(
      req.session.userId,
      workspaceSlug,
      formSlug,
    );
  }

  @UseGuards(JwtAuthGuard, SessionAuthGuard)
  @Delete(':workspaceSlug/:formSlug')
  deleteForm(
    @Req() req,
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('formSlug') formSlug: string,
  ) {
    const userId = req.session.userId;

    return this.formService.deleteForm(userId, workspaceSlug, formSlug);
  }
}
