import { Injectable } from '@nestjs/common';
import type { LoginEventProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const publicUserSelect = {
  id: true,
  email: true,
  normalizedEmail: true,
  emailVerified: true,
  name: true,
  role: true,
  status: true,
  image: true,
  createdAt: true,
  updatedAt: true,
};

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

export type OAuthAccountInput = {
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
};

export type CreateLoginEventInput = {
  userId: string | null;
  email: string;
  provider: LoginEventProvider;
  success: boolean;
  reason: string;
  ipAddress: string;
  userAgent?: string;
};

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByNormalizedEmail(normalizedEmail: string) {
    return this.prisma.user.findUnique({
      where: { normalizedEmail },
      select: publicUserSelect,
    });
  }
  restoreUserByEmail(normalizedEmail: string) {
    return this.prisma.user.updateMany({
      where: { normalizedEmail, deletedAt: { not: null } },
      data: { status: 'ACTIVE' },
    });
  }
  findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  }

  createEmailUser(normalizedEmail: string) {
    return this.prisma.user.create({
      data: {
        email: normalizedEmail,
        normalizedEmail,
      },
      select: publicUserSelect,
    });
  }

  createGoogleUser(input: {
    normalizedEmail: string;
    name?: string | null;
    image?: string | null;
    emailVerified?: Date | null;
  }) {
    return this.prisma.user.create({
      data: {
        email: input.normalizedEmail,
        normalizedEmail: input.normalizedEmail,
        name: input.name,
        image: input.image,
        emailVerified: input.emailVerified,
      },
      select: publicUserSelect,
    });
  }

  updateGoogleUser(
    id: string,
    data: Pick<Prisma.UserUpdateInput, 'name' | 'image' | 'emailVerified'>,
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: publicUserSelect,
    });
  }

  upsertOAuthAccount(userId: string, account: OAuthAccountInput) {
    return this.prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
      },
      create: {
        userId,
        ...account,
      },
      update: {
        userId,
        type: account.type,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state,
      },
    });
  }

  createSession(input: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    tokenVersion: number;
    ipAddress: string;
    userAgent?: string;
    expiresAt: Date;
  }) {
    return this.prisma.authSession.create({
      data: input,
    });
  }

  findSessionById(id: string) {
    return this.prisma.authSession.findUnique({
      where: { id },
    });
  }

  async deleteSession(id: string) {
    await this.prisma.authSession
      .delete({
        where: { id },
      })
      .catch(() => undefined);
  }

  createLoginEvent(input: CreateLoginEventInput) {
    return this.prisma.loginEvent.create({
      data: input,
    });
  }
}
