import { Prisma } from '@prisma/client';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

export function mapCreateUserData(
  dto: CreateUserDto,
  actorId: string,
): Prisma.UserCreateInput {
  const data = {
    createdBy: {
      connect: {
        id: actorId,
      },
    },
  } as Prisma.UserCreateInput;

  assignCreateUserFields(data, dto);

  return data;
}

export function mapUpdateUserData(
  dto: UpdateUserDto,
): Prisma.UserUpdateInput {
  const data: Prisma.UserUpdateInput = {};

  assignUpdateUserFields(data, dto);

  return data;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function assignCreateUserFields(
  data: Prisma.UserCreateInput,
  dto: CreateUserDto,
) {
  data.email = dto.email.trim();
  data.normalizedEmail = normalizeEmail(dto.email);

  data.name = dto.name ?? null;
  data.phone = dto.phone ?? null;
  data.role = dto.role ?? 'USER_BIASA';
  data.status = dto.status ?? 'ACTIVE';
}
function assignUpdateUserFields(
  data: Prisma.UserUpdateInput,
  dto: UpdateUserDto,
) {
  if (dto.email !== undefined) {
    data.email = dto.email.trim();
    data.normalizedEmail = normalizeEmail(dto.email);
  }

  if (dto.name !== undefined) data.name = dto.name;
  if (dto.phone !== undefined) data.phone = dto.phone;
  if (dto.role !== undefined) data.role = dto.role;
  if (dto.status !== undefined) data.status = dto.status;

  if (dto.bio !== undefined) data.bio = dto.bio;
  if (dto.headline !== undefined) data.headline = dto.headline;
  if (dto.websiteUrl !== undefined) data.websiteUrl = dto.websiteUrl;

  if (dto.socialLinks !== undefined) {
    data.socialLinks =
      dto.socialLinks === null
        ? Prisma.JsonNull
        : (dto.socialLinks as Prisma.InputJsonValue);
  }
}
