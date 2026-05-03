import { BadRequestException, UnauthorizedException } from '@nestjs/common';

export function throwAuthError(
  error: { code: string; message: string },
  type: 'unauthorized' | 'bad_request' = 'unauthorized',
): never {
  if (type === 'bad_request') {
    throw new BadRequestException(error);
  }
  throw new UnauthorizedException(error);
}
