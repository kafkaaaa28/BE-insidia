import { Prisma, UserRole } from '@prisma/client';

export const adminRoles = [
  UserRole.ADMIN,
  UserRole.ADMIN_MENTOR,
  UserRole.ADMIN_AKADEMIK,
] as const;
export type UserFilter = 'all' | 'active' | 'deleted';

export const adminRoleSet = new Set<UserRole>(adminRoles);
export const adminUserListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  image: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;
export const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  normalizedEmail: true,
  emailVerified: true,
  phone: true,
  phoneVerifiedAt: true,
  image: true,
  role: true,
  status: true,
  bio: true,
  headline: true,
  websiteUrl: true,
  socialLinks: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;
export const adminUserCreatedSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} satisfies Prisma.UserSelect;
export type AdminUser = Prisma.UserGetPayload<{
  select: typeof adminUserSelect;
}>;
