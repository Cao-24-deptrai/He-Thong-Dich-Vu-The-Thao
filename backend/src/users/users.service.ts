import { Injectable, ConflictException, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { UserRole } from '../common/enums';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async onModuleInit() {
    try {
      this.logger.log('Đang khởi tạo và đồng bộ tài khoản quản trị hệ thống...');

      // 1. Xoá tất cả các tài khoản mẫu cũ khỏi cơ sở dữ liệu
      const samplePhones = ['0999999999', '0988888888', '0911000003', '0911223344', '0912345678'];
      const deleteResult = await this.userModel.deleteMany({
        $or: [
          { phone: { $in: samplePhones } },
          {
            role: { $in: [UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER] },
            phone: { $nin: ['240106', '280906', '190705'] },
          },
        ],
      });
      if (deleteResult.deletedCount > 0) {
        this.logger.log(`🗑️ Đã xoá ${deleteResult.deletedCount} tài khoản mẫu cũ khỏi cơ sở dữ liệu.`);
      }

      // 2. Khởi tạo / đồng bộ 3 tài khoản chính thức:
      // - Admin: 240106 / 123456
      // - Nhân viên quầy: 280906 / 123456
      // - Quản lý: 190705 / 123456
      const systemAccounts = [
        {
          phone: '240106',
          password: '123456',
          fullName: 'Quản trị viên (Admin)',
          email: 'admin@sportsbooking.vn',
          role: UserRole.ADMIN,
        },
        {
          phone: '280906',
          password: '123456',
          fullName: 'Nhân viên Quầy (Staff)',
          email: 'staff@sportsbooking.vn',
          role: UserRole.STAFF,
        },
        {
          phone: '190705',
          password: '123456',
          fullName: 'Quản lý Cơ sở (Manager)',
          email: 'manager@sportsbooking.vn',
          role: UserRole.MANAGER,
        },
      ];

      for (const acc of systemAccounts) {
        const passwordHash = await bcrypt.hash(acc.password, 10);
        await this.userModel.findOneAndUpdate(
          { phone: acc.phone },
          {
            $set: {
              phone: acc.phone,
              passwordHash,
              fullName: acc.fullName,
              email: acc.email,
              role: acc.role,
              failedLoginAttempts: 0,
              lockedUntil: null,
              isPhoneVerified: true,
            },
          },
          { upsert: true, new: true },
        );
        this.logger.log(`✅ Đã đồng bộ tài khoản [${acc.role}]: Tài khoản: ${acc.phone} | Mật khẩu: ${acc.password}`);
      }
    } catch (err: any) {
      this.logger.error(`Lỗi khi đồng bộ tài khoản hệ thống: ${err.message}`);
    }
  }

  async create(userData: {
    phone: string;
    password: string;
    fullName: string;
    email?: string;
    role?: UserRole;
    permissions?: string[];
  }): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ phone: userData.phone }).exec();
    if (existing) {
      throw new ConflictException('Số điện thoại đã được đăng ký');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    const user = new this.userModel({
      phone: userData.phone,
      passwordHash,
      fullName: userData.fullName,
      email: userData.email,
      role: userData.role || UserRole.CUSTOMER,
      permissions: userData.permissions || [],
      failedLoginAttempts: 0,
      isPhoneVerified: false,
    });

    return user.save();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    return user;
  }

  async updateFcmToken(userId: string, fcmToken: string): Promise<UserDocument> {
    const user = await this.findById(userId);
    user.fcmToken = fcmToken;
    return user.save();
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserDocument> {
    const user = await this.findById(userId);
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.invoiceInfo !== undefined) {
      user.invoiceInfo = dto.invoiceInfo;
    }
    return user.save();
  }

  /**
   * Truy vấn danh sách người dùng có phân trang, lọc và tìm kiếm (Quản trị)
   */
  async findAll(query: QueryUserDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.role) {
      filter.role = query.role;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ phone: searchRegex }, { fullName: searchRegex }];
    }

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Cập nhật vai trò & quyền hạn (RBAC)
   */
  async updateRole(id: string, role: UserRole, permissions?: string[]): Promise<UserDocument> {
    const user = await this.findById(id);

    // Không cho phép hạ quyền tài khoản ADMIN mặc định hệ thống
    if ((user.phone === '240106' || user.phone === '0999999999') && role !== UserRole.ADMIN) {
      throw new BadRequestException('Không thể thay đổi vai trò của tài khoản Quản trị viên tối cao');
    }

    user.role = role;
    if (permissions !== undefined) {
      user.permissions = permissions;
    }
    return user.save();
  }

  /**
   * Khóa tài khoản người dùng thủ công
   */
  async lockUser(id: string, minutes = 15, reason?: string): Promise<UserDocument> {
    const user = await this.findById(id);

    if (user.role === UserRole.ADMIN || user.phone === '240106') {
      throw new BadRequestException('Không thể khóa tài khoản Quản trị viên');
    }

    user.lockedUntil = new Date(Date.now() + minutes * 60 * 1000);
    return user.save();
  }

  /**
   * Mở khóa tài khoản
   */
  async unlockUser(id: string): Promise<UserDocument> {
    const user = await this.findById(id);
    user.lockedUntil = null as any;
    user.failedLoginAttempts = 0;
    return user.save();
  }
}
