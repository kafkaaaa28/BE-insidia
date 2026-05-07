import { updateUserSchema } from './update-user.dto';

describe('updateUserSchema', () => {
  it('keeps socialLinks as null when explicitly cleared', () => {
    expect(updateUserSchema.parse({ socialLinks: null }).socialLinks).toBeNull();
  });

  it('converts empty socialLinks objects into null so existing values can be cleared', () => {
    expect(
      updateUserSchema.parse({
        socialLinks: {
          instagram: '',
          linkedin: '',
          github: '',
        },
      }).socialLinks,
    ).toBeNull();
  });

  it('leaves socialLinks undefined when the field is omitted', () => {
    expect(updateUserSchema.parse({}).socialLinks).toBeUndefined();
  });
});
