import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { UserRole } from '../common/enums';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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
    if (user.phone === '0999999999' && role !== UserRole.ADMIN) {
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

    if (user.role === UserRole.ADMIN) {
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
