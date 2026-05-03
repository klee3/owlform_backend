import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { LoggingInterceptor } from './logging.interceptor';
import { winstonConfig } from './winston.config';

@Module({
  imports: [WinstonModule.forRoot(winstonConfig)],
  providers: [LoggingInterceptor],
  exports: [WinstonModule, LoggingInterceptor],
})
export class LoggerModule {}
