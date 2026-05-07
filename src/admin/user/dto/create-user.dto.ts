import { z } from 'zod';

const userRoleValues = [
  'ADMIN',
  'ADMIN_MENTOR',
  'ADMIN_AKADEMIK',
  'MENTOR',
  'AKADEMIK',
  'GURU',
  'MURID',
  'WALI_MURID',
  'USER_BIASA',
] as const;

const userStatusValues = ['ACTIVE', 'SUSPENDED', 'BANNED'] as const;

export const optionalNullableStringSchema = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().trim().min(1).nullable().optional(),
);

export const createUserSchema = z.object({
  email: z.string().trim().email(),
  name: optionalNullableStringSchema,
  phone: optionalNullableStringSchema,

  role: z.enum(userRoleValues).optional(),
  status: z.enum(userStatusValues).optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
