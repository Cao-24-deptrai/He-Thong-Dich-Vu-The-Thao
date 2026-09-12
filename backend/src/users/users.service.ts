import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { UserRole } from '../common/enums';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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

  async findById(id: string): Promise<UserDocument | null> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    return user;
  }
}
