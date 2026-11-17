import { Injectable, ConflictException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { UserRole } from '../common/enums';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async onModuleInit() {
    const adminPhone = process.env.ADMIN_PHONE || '0999999999';
    const admin = await this.userModel.findOne({ phone: adminPhone });
    if (!admin) {
      const passwordHash = await bcrypt.hash('Admin@123456', 10);
      await this.userModel.create({
        phone: adminPhone,
        passwordHash,
        fullName: 'Phanta System Administrator',
        email: 'admin@sportsbooking.vn',
        role: UserRole.ADMIN,
      });
    }

    const staffPhone = '0988888888';
    const staff = await this.userModel.findOne({ phone: staffPhone });
    if (!staff) {
      const passwordHash = await bcrypt.hash('Staff@123456', 10);
      await this.userModel.create({
        phone: staffPhone,
        passwordHash,
        fullName: 'Phanta Frontdesk Staff',
        email: 'staff@sportsbooking.vn',
        role: UserRole.STAFF,
      });
    }
  }

  async create(userData: {
    phone: string;
    password: string;
    fullName: string;
    email?: string;
    role?: UserRole;
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

  async updateProfile(userId: string, dto: { fullName?: string; email?: string }): Promise<UserDocument> {
    const user = await this.findById(userId);
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.email !== undefined) user.email = dto.email;
    return user.save();
  }
}
