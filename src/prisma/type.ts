import { Prisma } from 'generated/prisma/client';

export type PrismaClientType = Prisma.TransactionClient;

export type UserWithAccounts = Prisma.UserGetPayload<{
  include: { accounts: true };
}>;
