import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GamingMachine, GamingMachineDocument } from './schemas/gaming-machine.schema';
import { CreateGamingMachineDto } from './dto/gaming.dto';
import { GamingMachineZone, GamingMachineStatus } from '../common/enums';

@Injectable()
export class GamingMachineService {
  private readonly logger = new Logger(GamingMachineService.name);

  constructor(
    @InjectModel(GamingMachine.name)
    private readonly machineModel: Model<GamingMachineDocument>,
  ) {}

  async createMachine(dto: CreateGamingMachineDto): Promise<GamingMachine> {
    const existing = await this.machineModel.findOne({ machineCode: dto.machineCode.toUpperCase() });
    if (existing) {
      throw new ConflictException(`Máy ${dto.machineCode} đã tồn tại`);
    }

    const machine = new this.machineModel({
      machineCode: dto.machineCode.toUpperCase(),
      zone: dto.zone || GamingMachineZone.STANDARD,
      hourlyPrice: dto.hourlyPrice || 10000,
      position: { floor: 1, roomName: dto.roomName || 'Sảnh' },
      status: GamingMachineStatus.IDLE,
    });
    return machine.save();
  }

  async getMachines(zone?: string, status?: string): Promise<GamingMachine[]> {
    const filter: any = { isActive: true };
    if (zone) filter.zone = zone;
    if (status) filter.status = status;
    return this.machineModel.find(filter).sort({ machineCode: 1 }).lean();
  }

  async getMachineByCode(machineCode: string): Promise<GamingMachineDocument> {
    const machine = await this.machineModel.findOne({ machineCode: machineCode.toUpperCase() });
    if (!machine) {
      throw new NotFoundException(`Không tìm thấy máy ${machineCode}`);
    }
    return machine;
  }

  async updateMachineStatus(
    machineCode: string,
    status: GamingMachineStatus,
    currentSessionCode?: string,
    currentUserPhone?: string,
  ): Promise<GamingMachine> {
    const machine = await this.getMachineByCode(machineCode);
    machine.status = status;
    machine.currentSessionCode = currentSessionCode;
    machine.currentUserPhone = currentUserPhone;
    machine.lastPingAt = new Date();
    return machine.save();
  }

  /**
   * Khởi tạo đủ 100 máy gaming chuẩn theo đặc tả SRS (BR-35)
   * 50 máy sảnh + 30 máy phòng riêng (R01..R03) + 20 máy phòng esport (E01)
   */
  async seed100Machines(): Promise<number> {
    const count = await this.machineModel.countDocuments();
    if (count >= 100) return count;

    const machinesToCreate: any[] = [];

    // 1. 50 máy sảnh (PC-01 đến PC-50)
    for (let i = 1; i <= 50; i++) {
      const code = `PC-${i.toString().padStart(2, '0')}`;
      machinesToCreate.push({
        machineCode: code,
        zone: GamingMachineZone.STANDARD,
        hourlyPrice: 10000,
        position: { x: (i % 10) * 40, y: Math.floor(i / 10) * 40, floor: 1, roomName: 'Sảnh chính' },
        specs: { cpu: 'Core i5-13400F', ram: '16GB', gpu: 'RTX 4060', screen: '24 inch 165Hz' },
        status: GamingMachineStatus.IDLE,
      });
    }

    // 2. 30 máy phòng riêng: R01, R02, R03 (mỗi phòng 10 máy)
    ['R01', 'R02', 'R03'].forEach((room, rIdx) => {
      for (let i = 1; i <= 10; i++) {
        const code = `PC-${room}-${i.toString().padStart(2, '0')}`;
        machinesToCreate.push({
          machineCode: code,
          zone: GamingMachineZone.VIP,
          hourlyPrice: 15000,
          position: { x: i * 30, y: (rIdx + 1) * 60, floor: 2, roomName: `Phòng Riêng ${room}` },
          specs: { cpu: 'Core i7-14700K', ram: '32GB', gpu: 'RTX 4070 Ti Super', screen: '27 inch 240Hz' },
          status: GamingMachineStatus.IDLE,
        });
      }
    });

    // 3. 20 máy phòng esport E01
    for (let i = 1; i <= 20; i++) {
      const code = `PC-E01-${i.toString().padStart(2, '0')}`;
      machinesToCreate.push({
        machineCode: code,
        zone: GamingMachineZone.STREAMING,
        hourlyPrice: 15000,
        position: { x: (i % 10) * 35, y: Math.floor(i / 10) * 50, floor: 2, roomName: 'Phòng Thi Đấu Esport E01' },
        specs: { cpu: 'Core i9-14900K', ram: '64GB', gpu: 'RTX 4080 Super', screen: '27 inch 360Hz BenQ ZOWIE' },
        status: GamingMachineStatus.IDLE,
      });
    }

    // Bulk insert ignore duplicates
    for (const m of machinesToCreate) {
      await this.machineModel.updateOne({ machineCode: m.machineCode }, { $setOnInsert: m }, { upsert: true });
    }

    return this.machineModel.countDocuments();
  }
}
