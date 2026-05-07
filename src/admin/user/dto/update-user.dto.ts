import { z } from 'zod';
import {
  createUserSchema,
  optionalNullableStringSchema,
} from './create-user.dto';

const socialLinksValueSchema = z
  .object({
    instagram: optionalNullableStringSchema,
    linkedin: optionalNullableStringSchema,
    github: optionalNullableStringSchema,
  })
  .nullable()
  .transform((value) => {
    if (value === null) return null;

    const hasValue = Object.values(value).some(Boolean);
    return hasValue ? value : null;
  });
export const updateUserSchema = createUserSchema.partial().extend({
  bio: optionalNullableStringSchema,
  headline: optionalNullableStringSchema,
  websiteUrl: optionalNullableStringSchema,
  socialLinks: socialLinksValueSchema.optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
