import { Injectable } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  adminRoles,
  adminUserSelect,
  adminUserListSelect,
  adminUserCreatedSelect,
} from './user.constants';
import { DuplicateUserFieldError } from './user.errors';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput) {
    try {
      return await this.prisma.user.create({
        data,
        select: adminUserCreatedSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  findAllActive() {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: adminUserListSelect,
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: adminUserSelect,
    });
  }
  findAll() {
    return this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: adminUserListSelect,
    });
  }
  findAllDeleted() {
    return this.prisma.user.findMany({
      where: {
        deletedAt: { not: null },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: adminUserListSelect,
    });
  }
  findActiveById(id: string) {
    return this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: adminUserSelect,
    });
  }
  findByEmail(normalizedEmail: string) {
    return this.prisma.user.findUnique({
      where: {
        normalizedEmail,
      },
      select: adminUserListSelect,
    });
  }
  async findByPhone(phone: string) {
    return this.prisma.user.findFirst({
      where: {
        phone,
      },
      select: adminUserListSelect,
    });
  }
  async updateActive(id: string, data: Prisma.UserUpdateInput) {
    try {
      const result = await this.prisma.user.updateMany({
        where: {
          id,
          deletedAt: null,
        },
        data,
      });

      if (result.count === 0) {
        return null;
      }

      return this.findActiveById(id);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async softDeleteActive(id: string) {
    const result = await this.prisma.user.updateMany({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        name: null,
        phone: null,
        image: null,
        bio: null,
        headline: null,
        imagePublicId: null,
        phoneVerifiedAt: null,
        websiteUrl: null,
        socialLinks: Prisma.JsonNull,
      },
    });

    return result.count > 0;
  }

  countActiveAdmins() {
    return this.prisma.user.count({
      where: {
        deletedAt: null,
        status: UserStatus.ACTIVE,
        role: {
          in: [...adminRoles],
        },
      },
    });
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const targets = Array.isArray(error.meta?.target)
        ? error.meta.target
        : this.extractUniqueTargetsFromMessage(error.message);

      if (targets.includes('normalizedEmail')) {
        throw new DuplicateUserFieldError('normalizedEmail');
      }

      if (targets.includes('phone')) {
        throw new DuplicateUserFieldError('phone');
      }

      throw new DuplicateUserFieldError('unknown');
    }

    throw error;
  }

  private extractUniqueTargetsFromMessage(message: string) {
    const normalizedMessage = message.toLowerCase();
    const targets: string[] = [];

    if (normalizedMessage.includes('normalizedemail')) {
      targets.push('normalizedEmail');
    }

    if (normalizedMessage.includes('phone')) {
      targets.push('phone');
    }

    return targets;
  }
}
