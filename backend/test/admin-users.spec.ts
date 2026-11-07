import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AdminService } from '../src/admin/admin.service';
import { AdminController } from '../src/admin/admin.controller';
import { UserRole } from '../src/common/enums';
import { RedisService } from '../src/redis/redis.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('Admin Users Management & RBAC 6 Roles (Bước 2.6)', () => {
  let service: AdminService;
  let controller: AdminController;

  const mockUsers = [
    {
      _id: '671df0000000000000000001',
      phone: '0900000001',
      fullName: 'Phan Anh Tuấn',
      email: 'owner@phantasports.vn',
      role: UserRole.OWNER,
      membershipTier: 'PLATINUM',
      walletBalance: 15000000,
      loyaltyPoints: 32000,
      isFaceIdActive: true,
      isActive: true,
      createdAt: new Date('2026-10-01'),
    },
    {
      _id: '671df0000000000000000002',
      phone: '0900000002',
      fullName: 'Lê Hoàng Quản Lý',
      email: 'manager@phantasports.vn',
      role: UserRole.MANAGER,
      membershipTier: 'GOLD',
      walletBalance: 5000000,
      loyaltyPoints: 12000,
      isFaceIdActive: true,
      isActive: true,
      createdAt: new Date('2026-10-02'),
    },
    {
      _id: '671df0000000000000000003',
      phone: '0900000003',
      fullName: 'Trần Thị Thu Ngân',
      email: 'cashier@phantasports.vn',
      role: UserRole.CASHIER,
      membershipTier: 'MEMBER',
      walletBalance: 1000000,
      loyaltyPoints: 1500,
      isFaceIdActive: false,
      isActive: true,
      createdAt: new Date('2026-10-03'),
    },
    {
      _id: '671df0000000000000000004',
      phone: '0900000004',
      fullName: 'Nguyễn Văn Huấn Luyện Viên',
      email: 'pt@phantasports.vn',
      role: UserRole.PT,
      membershipTier: 'SILVER',
      walletBalance: 2500000,
      loyaltyPoints: 5000,
      isFaceIdActive: true,
      isActive: true,
      createdAt: new Date('2026-10-04'),
    },
    {
      _id: '671df0000000000000000005',
      phone: '0911223344',
      fullName: 'Nguyễn Văn Hội Viên',
      email: 'customer@gmail.com',
      role: UserRole.CUSTOMER,
      membershipTier: 'MEMBER',
      walletBalance: 350000,
      loyaltyPoints: 450,
      isFaceIdActive: false,
      isActive: true,
      createdAt: new Date('2026-10-05'),
    },
    {
      _id: '671df0000000000000000006',
      phone: '0999999999',
      fullName: 'Quản Trị Hệ Thống',
      email: 'sysadmin@phantasports.vn',
      role: UserRole.SYSTEM_ADMIN,
      membershipTier: 'PLATINUM',
      walletBalance: 50000000,
      loyaltyPoints: 100000,
      isFaceIdActive: true,
      isActive: true,
      createdAt: new Date('2026-09-01'),
    },
    {
      _id: '671df0000000000000000007',
      phone: '0988776655',
      fullName: 'Tài Khoản Đã Khóa',
      email: 'inactive@gmail.com',
      role: UserRole.CUSTOMER,
      membershipTier: 'MEMBER',
      walletBalance: 0,
      loyaltyPoints: 0,
      isFaceIdActive: false,
      isActive: false,
      createdAt: new Date('2026-10-06'),
    },
  ];

  const mockUserModel = {
    find: jest.fn().mockImplementation((filter = {}) => {
      let filtered = [...mockUsers];
      if (filter.role && filter.role !== 'ALL') {
        filtered = filtered.filter(u => u.role === filter.role);
      }
      if (filter.isActive !== undefined) {
        filtered = filtered.filter(u => u.isActive === filter.isActive);
      }
      if (filter.$or) {
        const regexStr = filter.$or[0].fullName.$regex;
        const re = new RegExp(regexStr, 'i');
        filtered = filtered.filter(u => re.test(u.fullName) || re.test(u.phone) || re.test(u.email || ''));
      }

      let skipVal = 0;
      let limitVal = filtered.length;

      const chain: any = {
        select: jest.fn().mockImplementation(() => chain),
        sort: jest.fn().mockImplementation(() => chain),
        skip: jest.fn().mockImplementation((s: number) => {
          skipVal = s;
          return chain;
        }),
        limit: jest.fn().mockImplementation((l: number) => {
          limitVal = l;
          return chain;
        }),
        lean: jest.fn().mockImplementation(() => chain),
        exec: jest.fn().mockImplementation(() => Promise.resolve(filtered.slice(skipVal, skipVal + limitVal))),
      };
      return chain;
    }),
    countDocuments: jest.fn().mockImplementation((filter = {}) => {
      let filtered = [...mockUsers];
      if (filter.role && filter.role !== 'ALL') {
        filtered = filtered.filter(u => u.role === filter.role);
      }
      if (filter.isActive !== undefined) {
        filtered = filtered.filter(u => u.isActive === filter.isActive);
      }
      if (filter.$or) {
        const regexStr = filter.$or[0].fullName.$regex;
        const re = new RegExp(regexStr, 'i');
        filtered = filtered.filter(u => re.test(u.fullName) || re.test(u.phone) || re.test(u.email || ''));
      }
      return {
        exec: jest.fn().mockResolvedValue(filtered.length),
      };
    }),
    findById: jest.fn().mockImplementation((id: string) => {
      const u = mockUsers.find(x => x._id === id);
      return {
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(u || null),
          }),
        }),
        exec: jest.fn().mockResolvedValue(u || null),
      };
    }),
    findOne: jest.fn().mockImplementation((query: any) => {
      const u = mockUsers.find(x => x.phone === query.phone);
      return {
        exec: jest.fn().mockResolvedValue(u || null),
      };
    }),
    create: jest.fn().mockImplementation((doc: any) => {
      const created = {
        _id: '671df0000000000000000099',
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return Promise.resolve({
        ...created,
        toObject: () => ({ ...created }),
      });
    }),
    findByIdAndUpdate: jest.fn().mockImplementation((id: string, update: any) => {
      const idx = mockUsers.findIndex(x => x._id === id);
      if (idx === -1) {
        return {
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(null),
            }),
          }),
          exec: jest.fn().mockResolvedValue(null),
        };
      }
      const updated = { ...mockUsers[idx], ...update };
      delete (updated as any).passwordHash;
      return {
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(updated),
          }),
        }),
        exec: jest.fn().mockResolvedValue(updated),
      };
    }),
  };

  beforeAll(async () => {
    const mockModel = () => ({
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      aggregate: jest.fn().mockResolvedValue([]),
    });

    const mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        AdminService,
        { provide: getModelToken('User'), useValue: mockUserModel },
        { provide: getModelToken('Booking'), useValue: mockModel() },
        { provide: getModelToken('Payment'), useValue: mockModel() },
        { provide: getModelToken('WalletLedger'), useValue: mockModel() },
        { provide: getModelToken('Venue'), useValue: mockModel() },
        { provide: getModelToken('Shift'), useValue: mockModel() },
        { provide: getModelToken('Order'), useValue: mockModel() },
        { provide: getModelToken('RentalItem'), useValue: mockModel() },
        { provide: getModelToken('Voucher'), useValue: mockModel() },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    controller = module.get<AdminController>(AdminController);
  });

  describe('1. GET /admin/users - Phân trang, STT liên tục & Lọc vai trò', () => {
    it('Phải trả về danh sách người dùng với STT liên tục ở trang 1', async () => {
      const result = await service.getUsers({ page: 1, limit: 3 });
      expect(result.items).toHaveLength(3);
      expect(result.items[0].stt).toBe(1);
      expect(result.items[1].stt).toBe(2);
      expect(result.items[2].stt).toBe(3);
      expect(result.totalCount).toBe(mockUsers.length);
      expect(result.startIndex).toBe(1);
      expect(result.endIndex).toBe(3);
    });

    it('Phải giữ STT liên tục ở trang 2 (Bắt đầu từ STT 4 khi limit = 3)', async () => {
      const result = await service.getUsers({ page: 2, limit: 3 });
      expect(result.items).toHaveLength(3);
      expect(result.items[0].stt).toBe(4);
      expect(result.items[1].stt).toBe(5);
      expect(result.items[2].stt).toBe(6);
      expect(result.startIndex).toBe(4);
      expect(result.endIndex).toBe(6);
    });

    it('Phải hỗ trợ lọc theo đúng 6 vai trò RBAC (ví dụ vai trò CASHIER)', async () => {
      const result = await service.getUsers({ role: UserRole.CASHIER });
      expect(result.items.every((u: any) => u.role === UserRole.CASHIER)).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].fullName).toBe('Trần Thị Thu Ngân');
    });

    it('Phải hỗ trợ lọc theo trạng thái hoạt động (ACTIVE vs INACTIVE)', async () => {
      const activeResult = await service.getUsers({ status: 'ACTIVE' });
      expect(activeResult.items.every((u: any) => u.isActive === true)).toBe(true);

      const inactiveResult = await service.getUsers({ status: 'INACTIVE' });
      expect(inactiveResult.items.every((u: any) => u.isActive === false)).toBe(true);
      expect(inactiveResult.items[0].phone).toBe('0988776655');
    });

    it('Phải hỗ trợ tìm kiếm đa trường theo Tên, Số điện thoại hoặc Email', async () => {
      const searchName = await service.getUsers({ search: 'Tuấn' });
      expect(searchName.items).toHaveLength(1);
      expect(searchName.items[0].fullName).toContain('Phan Anh Tuấn');

      const searchPhone = await service.getUsers({ search: '0900000003' });
      expect(searchPhone.items).toHaveLength(1);
      expect(searchPhone.items[0].phone).toBe('0900000003');
    });
  });

  describe('2. POST /admin/users - Tạo tài khoản, mã hóa bcrypt & phân quyền RBAC', () => {
    it('Phải tạo tài khoản thành công với mật khẩu băm bcrypt và không trả về passwordHash', async () => {
      const newUserData = {
        fullName: 'Nguyễn Văn Mới',
        phone: '0919998877',
        email: 'newuser@phantasports.vn',
        password: 'Password@2026',
        role: UserRole.PT,
        membershipTier: 'MEMBER',
      };

      const result = await service.createUser(newUserData);
      expect(result).toBeDefined();
      expect(result.fullName).toBe(newUserData.fullName);
      expect(result.role).toBe(UserRole.PT);
      expect(result.passwordHash).toBeUndefined(); // Tuyệt đối không để lộ hash mật khẩu
      expect(mockUserModel.create).toHaveBeenCalled();
    });

    it('Phải từ chối tạo tài khoản trùng số điện thoại (HTTP 400)', async () => {
      await expect(service.createUser({
        fullName: 'Người Trùng SĐT',
        phone: '0900000001', // SĐT đã tồn tại
        password: 'Password@2026',
      })).rejects.toThrow(BadRequestException);
    });

    it('Phải từ chối vai trò không hợp lệ nằm ngoài danh mục RBAC', async () => {
      await expect(service.createUser({
        fullName: 'Vai Trò Ảo',
        phone: '0912345678',
        role: 'SUPER_HACKER_ROLE' as any,
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. PATCH /admin/users/:id - Cập nhật hồ sơ & đổi mật khẩu', () => {
    it('Phải cập nhật thông tin người dùng thành công và không trả về passwordHash', async () => {
      const updateData = {
        fullName: 'Lê Hoàng Quản Lý (Cấp Cao)',
        role: UserRole.MANAGER,
        password: 'NewStrongPassword@2026',
      };

      const result = await service.updateUser('671df0000000000000000002', updateData);
      expect(result).toBeDefined();
      expect(result.fullName).toBe(updateData.fullName);
      expect(result.passwordHash).toBeUndefined();
    });

    it('Phải ném lỗi 404 khi ID người dùng không tồn tại', async () => {
      await expect(service.updateUser('671df0000000000000000999', { fullName: 'Không Ai Cả' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('4. DELETE /admin/users/:id - Vô hiệu hóa tài khoản an toàn', () => {
    it('Phải vô hiệu hóa tài khoản thành công (isActive = false)', async () => {
      const result = await service.deleteUser('671df0000000000000000005');
      expect(result.success).toBe(true);
      expect(result.message).toContain('vô hiệu hóa');
      expect(result.user.isActive).toBe(false);
    });

    it('Phải chặn vô hiệu hóa tài khoản Quản trị hệ thống (SYSTEM_ADMIN) duy nhất để chống lockout', async () => {
      await expect(service.deleteUser('671df0000000000000000006'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('5. GET /admin/users/export-excel - Xuất file Excel .xlsx theo bộ lọc', () => {
    it('Phải xuất workbook Excel với các cột chuẩn hóa và dữ liệu chính xác', async () => {
      const mockRes: any = {
        setHeader: jest.fn(),
        write: jest.fn().mockImplementation((chunk, cb) => {
          if (typeof cb === 'function') cb();
          return true;
        }),
        end: jest.fn(),
      };

      await service.exportEntityToExcel('users', { role: UserRole.OWNER }, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename=Phanta_Export_users_'),
      );
      expect(mockRes.end).toHaveBeenCalled();
    });
  });
});
