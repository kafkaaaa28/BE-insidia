export class DuplicateUserFieldError extends Error {
  constructor(readonly field: 'normalizedEmail' | 'phone' | 'unknown') {
    super(`Duplicate user field: ${field}`);
    this.name = 'DuplicateUserFieldError';
  }
}
