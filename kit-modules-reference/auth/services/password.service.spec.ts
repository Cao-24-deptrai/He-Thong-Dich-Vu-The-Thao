import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('hashes password with Argon2id and verifies correctly', async () => {
    const password = 'SuperSecretPassword123@';
    const hash = await service.hashPassword(password);

    expect(hash).toMatch(/^\$argon2id\$/);

    const isValid = await service.verifyPassword(hash, password);
    expect(isValid).toBe(true);

    const isInvalid = await service.verifyPassword(hash, 'WrongPassword');
    expect(isInvalid).toBe(false);
  });

  it('hashes token with SHA-256 deterministically', () => {
    const token = 'sample-refresh-token';
    const hash1 = service.hashToken(token);
    const hash2 = service.hashToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('generates random secure hex tokens', () => {
    const token = service.generateRandomToken(16);
    expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
  });
});
