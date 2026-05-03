import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import type { LoggerService } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
('@nestjs/common');

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();

    const request = http.getRequest();
    const response = http.getResponse();

    const operation = `${request.method} ${request.url}`;

    const { ip } = request;
    const userAgent = request.get?.('user-agent') || 'unknown';
    const now = Date.now();

    const requestId = request.headers['x-request-id'] || randomUUID();

    request.requestId = requestId;
    response?.setHeader?.('X-Request-Id', requestId);

    const userId = request.user?.id ?? null;

    return next.handle().pipe(
      tap(() => {
        const statusCode = response?.statusCode ?? 200;
        const contentLength = response?.get?.('content-length') || 0;
        const responseTime = Date.now() - now;

        const message = `[${requestId}] ${operation} ${statusCode} ${responseTime}ms - ${contentLength}b`;

        const meta = { requestId, userId, ip, userAgent };

        if (statusCode >= 500) {
          this.logger.error(message, undefined, 'HTTP', meta);
        } else if (statusCode >= 400) {
          this.logger.warn(message, 'HTTP', meta);
        } else {
          this.logger.log(message, 'HTTP', meta);
        }
      }),
    );
  }
}
