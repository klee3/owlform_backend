import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { OrganizationModule } from './organization/organization.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { FormModule } from './form/form.module';

@Module({
  imports: [LoggerModule, ConfigModule, PrismaModule, AuthModule, UserModule, OrganizationModule, WorkspaceModule, FormModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
