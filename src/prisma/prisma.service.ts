import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from 'generated/prisma/client';
import { ConfigService } from 'src/config/config.service';
import * as url from 'url';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(@Inject() private config: ConfigService) {
    const dbUrl = url.parse(config.databaseUri);
    const [user, password] = (dbUrl.auth || ':').split(':');

    super({
      adapter: new PrismaMariaDb({
        host: dbUrl.hostname || 'localhost',
        port: parseInt(dbUrl.port || '3306'),
        user: user || 'root',
        password: password || '',
        database: dbUrl.pathname?.slice(1) || 'useowlform',
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
