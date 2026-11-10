import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection, Types } from 'mongoose';
import { User, UserSchema } from '../src/users/schemas/user.schema';
import { UserSession, UserSessionSchema } from '../src/auth/schemas/user-session.schema';
import { OtpChallenge, OtpChallengeSchema, OtpPurpose } from '../src/auth/schemas/otp-challenge.schema';
import { UserRole } from '../src/common/enums';

describe('Bước 1.1: Hoàn thiện dữ liệu User, Session & OTP Challenge', () => {
  let mongod: MongoMemoryServer;
  let connection: Connection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    connection = await mongoose.createConnection(uri).asPromise();
  });

  afterAll(async () => {
    await connection.close();
    await mongod.stop();
  });

  describe('1. User Schema Verification', () => {
    it('Khởi tạo User với các trường bảo mật mới thành công (failedLoginAttempts, lockedUntil, permissions, isPhoneVerified, invoiceInfo)', async () => {
      const UserModel = connection.model(User.name, UserSchema);
      await UserModel.init();

      const user = new UserModel({
        phone: '0912345678',
        passwordHash: 'hashed_password_123',
        fullName: 'Nguyễn Văn Vy',
        role: UserRole.CUSTOMER,
        permissions: ['BOOKING_READ', 'BOOKING_CREATE'],
        failedLoginAttempts: 2,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
        isPhoneVerified: true,
        invoiceInfo: {
          buyerTaxCode: '0312345678',
          companyName: 'Công ty Thể Thao Phanta',
          companyAddress: '123 Đường Số 1, TP.HCM',
        },
      });

      const saved = await user.save();
      expect(saved._id).toBeDefined();
      expect(saved.phone).toBe('0912345678');
      expect(saved.permissions).toContain('BOOKING_CREATE');
      expect(saved.failedLoginAttempts).toBe(2);
      expect(saved.lockedUntil).toBeDefined();
      expect(saved.isPhoneVerified).toBe(true);
      expect(saved.invoiceInfo?.buyerTaxCode).toBe('0312345678');
      expect(saved.createdAt).toBeDefined();
      expect(saved.updatedAt).toBeDefined();
    });

    it('Giá trị mặc định của User: failedLoginAttempts=0, permissions=[], isPhoneVerified=false', async () => {
      const UserModel = connection.model('UserDefaultTest', UserSchema);
      const user = new UserModel({
        phone: '0988776655',
        passwordHash: 'hashed_pw',
        fullName: 'Khách Hàng Mới',
      });

      const saved = await user.save();
      expect(saved.failedLoginAttempts).toBe(0);
      expect(saved.permissions).toEqual([]);
      expect(saved.isPhoneVerified).toBe(false);
      expect(saved.lockedUntil).toBeNull();
      expect(saved.invoiceInfo).toBeNull();
    });
  });

  describe('2. UserSession Schema Verification', () => {
    it('Lưu phiên thiết bị (UserSession) và bắt buộc Unique Compound Index trên (userId, deviceId)', async () => {
      const UserSessionModel = connection.model(UserSession.name, UserSessionSchema);
      await UserSessionModel.init();

      const indexes = await UserSessionModel.collection.indexes();
      const uniqueDeviceIndex = indexes.find(
        (idx) => idx.key.userId === 1 && idx.key.deviceId === 1,
      );
      expect(uniqueDeviceIndex).toBeDefined();
      expect(uniqueDeviceIndex?.unique).toBe(true);

      const userId = new Types.ObjectId();
      const session1 = new UserSessionModel({
        userId,
        deviceId: 'device-iphone-15',
        deviceName: 'iPhone 15 Pro',
        refreshTokenHash: 'hash_refresh_token_123',
        isTrusted: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await session1.save();

      // Thử tạo session thứ 2 cùng userId và cùng deviceId -> Bắt buộc ném Duplicate Key
      const sessionDuplicate = new UserSessionModel({
        userId,
        deviceId: 'device-iphone-15',
        refreshTokenHash: 'hash_refresh_token_456',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await expect(sessionDuplicate.save()).rejects.toThrow();
    });
  });

  describe('3. OtpChallenge Schema Verification', () => {
    it('Lưu OTP Challenge với mục đích LOGIN và có compound index trên phone + purpose', async () => {
      const OtpModel = connection.model(OtpChallenge.name, OtpChallengeSchema);
      await OtpModel.init();

      const indexes = await OtpModel.collection.indexes();
      const phonePurposeIdx = indexes.find(
        (idx) => idx.key.phone === 1 && idx.key.purpose === 1,
      );
      expect(phonePurposeIdx).toBeDefined();

      const otp = new OtpModel({
        phone: '0912345678',
        codeHash: 'sha256_hashed_123456',
        purpose: OtpPurpose.LOGIN,
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 phút
      });

      const saved = await otp.save();
      expect(saved._id).toBeDefined();
      expect(saved.phone).toBe('0912345678');
      expect(saved.purpose).toBe(OtpPurpose.LOGIN);
      expect(saved.maxAttempts).toBe(5);
      expect(saved.usedAt).toBeNull();
    });
  });
});
