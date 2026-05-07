import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { adminRoleSet } from './user.constants';
import { DuplicateUserFieldError } from './user.errors';
import {
  mapCreateUserData,
  mapUpdateUserData,
  normalizeEmail,
} from './user.mapper';
import { UserRepository } from './user.repository';
import { UserFilter } from './user.constants';
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto, actorId: string) {
    try {
      if (createUserDto.email !== undefined) {
        const existingUser = await this.userRepository.findByEmail(
          normalizeEmail(createUserDto.email),
        );
        if (existingUser) {
          throw new ConflictException('User dengan email tersebut sudah ada');
        }
      }

      if (createUserDto.phone !== undefined && createUserDto.phone !== null) {
        const existingUser = await this.userRepository.findByPhone(
          createUserDto.phone,
        );

        if (existingUser) {
          throw new ConflictException(
            'User dengan nomor telepon tersebut sudah ada',
          );
        }
      }

      return await this.userRepository.create(
        mapCreateUserData(createUserDto, actorId),
      );
    } catch (error) {
      this.handleRepositoryError(error);
    }
  }

  findAll({ filter }: { filter?: UserFilter }) {
    switch (filter) {
      case 'deleted':
        return this.userRepository.findAllDeleted();
      case 'all':
        return this.userRepository.findAll();
      default:
        return this.userRepository.findAllActive();
    }
  }

  async findOne(id: string) {
    const user = await this.userRepository.findActiveById(id);

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.ensureActiveUserExists(id);

    await this.ensureLastAdminStillExistsAfterUpdate(user, updateUserDto);

    if (updateUserDto.email !== undefined) {
      const existingUser = await this.userRepository.findByEmail(
        normalizeEmail(updateUserDto.email),
      );

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('User dengan email tersebut sudah ada');
      }
    }
    if (updateUserDto.phone !== undefined && updateUserDto.phone !== null) {
      const existingUser = await this.userRepository.findByPhone(
        updateUserDto.phone,
      );

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(
          'User dengan nomor telepon tersebut sudah ada',
        );
      }
    }

    try {
      const updatedUser = await this.userRepository.updateActive(
        id,
        mapUpdateUserData(updateUserDto),
      );

      if (!updatedUser) {
        throw new NotFoundException('User tidak ditemukan');
      }

      return updatedUser;
    } catch (error) {
      this.handleRepositoryError(error);
    }
  }

  async remove(id: string, actorId: string) {
    const user = await this.ensureUserExists(id);

    if (user.deletedAt) {
      return {
        message: 'User sudah dihapus',
      };
    }

    this.ensureCanDeleteUser(user.id, actorId);
    await this.ensureNotDeletingLastAdmin(user.role, user.status);

    const deleted = await this.userRepository.softDeleteActive(id);

    if (!deleted) {
      return {
        message: 'User sudah dihapus',
      };
    }

    return {
      message: 'User berhasil dihapus',
    };
  }

  private async ensureUserExists(id: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return user;
  }

  private async ensureActiveUserExists(id: string) {
    const user = await this.userRepository.findActiveById(id);

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return user;
  }

  private ensureCanDeleteUser(targetUserId: string, actorId: string) {
    if (targetUserId === actorId) {
      throw new ConflictException('Admin tidak bisa menghapus akun sendiri');
    }
  }

  private async ensureNotDeletingLastAdmin(role: UserRole, status: UserStatus) {
    if (!adminRoleSet.has(role) || status !== UserStatus.ACTIVE) {
      return;
    }

    const activeAdminCount = await this.userRepository.countActiveAdmins();

    if (activeAdminCount <= 1) {
      throw new ConflictException('Admin terakhir tidak boleh dihapus');
    }
  }

  private async ensureLastAdminStillExistsAfterUpdate(
    user: Awaited<ReturnType<UserService['ensureActiveUserExists']>>,
    updateUserDto: UpdateUserDto,
  ) {
    if (!adminRoleSet.has(user.role) || user.status !== UserStatus.ACTIVE) {
      return;
    }

    const nextRole = updateUserDto.role ?? user.role;
    const nextStatus = updateUserDto.status ?? user.status;
    const losingAdminAccess =
      !adminRoleSet.has(nextRole) || nextStatus !== UserStatus.ACTIVE;

    if (!losingAdminAccess) {
      return;
    }

    const activeAdminCount = await this.userRepository.countActiveAdmins();

    if (activeAdminCount <= 1) {
      throw new ConflictException(
        'Admin terakhir tidak boleh kehilangan akses admin',
      );
    }
  }

  private handleRepositoryError(error: unknown): never {
    if (error instanceof DuplicateUserFieldError) {
      if (error.field === 'normalizedEmail') {
        throw new ConflictException('Email sudah digunakan');
      }

      if (error.field === 'phone') {
        throw new ConflictException('Nomor telepon sudah digunakan');
      }

      throw new ConflictException('Data user sudah digunakan');
    }

    throw error;
  }
}
