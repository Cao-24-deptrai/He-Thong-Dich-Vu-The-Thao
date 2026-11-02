import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { UserRole } from './common/enums';
import { ConfigService } from '@nestjs/config';

// Models
import { User, UserDocument } from './users/schemas/user.schema';
import { StaffProfile, StaffProfileDocument } from './pt-classes/schemas/staff-profile.schema';
import { ClassTemplate, ClassTemplateDocument } from './pt-classes/schemas/class-template.schema';
import { ClassSession, ClassSessionDocument } from './pt-classes/schemas/class-session.schema';
import { Tournament, TournamentDocument } from './tournaments/schemas/tournament.schema';
import { TournamentTeam, TournamentTeamDocument } from './tournaments/schemas/tournament-team.schema';
import { TournamentMatch, TournamentMatchDocument } from './tournaments/schemas/tournament-match.schema';
import { GamingMachine, GamingMachineDocument } from './gaming/schemas/gaming-machine.schema';
import { GamingPriceRule, GamingPriceRuleDocument } from './gaming/schemas/gaming-price-rule.schema';
import { BridgeAgent, BridgeAgentDocument } from './bridge/schemas/bridge-agent.schema';

async function seed() {
  const logger = new Logger('Seed');
  logger.log('🚀 Bắt đầu khởi tạo bộ dữ liệu mẫu toàn diện (Seed Data 100 PC, PT, Giải đấu, Bridge)...');

  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const configService = app.get(ConfigService);

  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
  const staffProfileModel = app.get<Model<StaffProfileDocument>>(getModelToken(StaffProfile.name));
  const classTemplateModel = app.get<Model<ClassTemplateDocument>>(getModelToken(ClassTemplate.name));
  const classSessionModel = app.get<Model<ClassSessionDocument>>(getModelToken(ClassSession.name));
  const tournamentModel = app.get<Model<TournamentDocument>>(getModelToken(Tournament.name));
  const tournamentTeamModel = app.get<Model<TournamentTeamDocument>>(getModelToken(TournamentTeam.name));
  const tournamentMatchModel = app.get<Model<TournamentMatchDocument>>(getModelToken(TournamentMatch.name));
  const gamingMachineModel = app.get<Model<GamingMachineDocument>>(getModelToken(GamingMachine.name));
  const gamingPriceRuleModel = app.get<Model<GamingPriceRuleDocument>>(getModelToken(GamingPriceRule.name));
  const bridgeAgentModel = app.get<Model<BridgeAgentDocument>>(getModelToken(BridgeAgent.name));

  try {
    // ------------------------------------------------------------------------
    // 1. ADMIN & STAFF ACCOUNTS
    // ------------------------------------------------------------------------
    const adminPhone = configService.get<string>('admin.phone') || '0999999999';
    let admin = await usersService.findByPhone(adminPhone);
    if (!admin) {
      admin = await usersService.create({
        phone: adminPhone,
        password: 'Admin@123456',
        fullName: 'Phanta System Administrator',
        email: 'admin@sportsbooking.vn',
        role: UserRole.ADMIN,
      });
      logger.log(`✅ [1/5] Tạo tài khoản ADMIN: ${adminPhone}`);
    }

    const staffPhone = '0988888888';
    let staff = await usersService.findByPhone(staffPhone);
    if (!staff) {
      staff = await usersService.create({
        phone: staffPhone,
        password: 'Staff@123456',
        fullName: 'Nhân Viên Lễ Tân & Quầy',
        email: 'staff@sportsbooking.vn',
        role: UserRole.STAFF,
      });
      logger.log(`✅ [1/5] Tạo tài khoản STAFF: ${staffPhone}`);
    }

    // Customer accounts with balance for gaming & class bookings
    const customers = [
      { phone: '0901111111', fullName: 'Nguyễn Văn An (VIP Member)', balance: 500000 },
      { phone: '0902222222', fullName: 'Trần Thị Bình (Yoga Lover)', balance: 300000 },
      { phone: '0903333333', fullName: 'Lê Hoàng Cường (Gamer Pro)', balance: 250000 },
    ];
    for (const c of customers) {
      let cust = await usersService.findByPhone(c.phone);
      if (!cust) {
        cust = await usersService.create({
          phone: c.phone,
          password: 'Customer@123456',
          fullName: c.fullName,
          email: `${c.phone}@client.phanta.id.vn`,
          role: UserRole.CUSTOMER,
        });
        await userModel.updateOne({ _id: cust._id }, { walletBalance: c.balance });
      }
    }

    // ------------------------------------------------------------------------
    // 2. M11: HUẤN LUYỆN VIÊN (PT) & LỚP HỌC NHÓM
    // ------------------------------------------------------------------------
    const trainersData = [
      {
        phone: '0911000001',
        name: 'HLV Vũ Đình Nam',
        spec: ['Gym', 'Bodybuilding', 'Giảm Mỡ', 'Dinh Dưỡng Thể Hình'],
        hourlyRate: 350000,
        bio: 'Chứng chỉ ISSA Certified Master Trainer, 8 năm kinh nghiệm huấn luyện thi đấu thể hình quốc gia.',
        rating: 4.95,
      },
      {
        phone: '0911000002',
        name: 'Master Trainer Phạm Mỹ Dung',
        spec: ['Yoga Vinyasa', 'Pilates Core Rehab', 'Dẻo Dai Cột Sống'],
        hourlyRate: 400000,
        bio: 'Chứng chỉ Yoga Alliance RYT-500 tại Rishikesh Ấn Độ, phục hồi thoái hóa cột sống văn phòng.',
        rating: 4.98,
      },
      {
        phone: '0911000003',
        name: 'HLV Đặng Tuấn Kiệt',
        spec: ['Boxing', 'Kickboxing', 'MMA Striking', 'Tự Vệ Thực Chiến'],
        hourlyRate: 380000,
        bio: 'Huy chương Bạc Vô địch Boxing Trẻ Toàn Quốc 2021, chuyên boxing cardio đốt calo cường độ cao.',
        rating: 4.88,
      },
      {
        phone: '0911000004',
        name: 'HLV Nguyễn Hải Yến',
        spec: ['Bơi Lội Sải / Ếch', 'Bơi Cứu Hộ', 'Kỹ Thuật Thở Dưới Nước'],
        hourlyRate: 320000,
        bio: 'Cựu VĐV Đội tuyển Bơi Lội Thành Phố, chứng chỉ Cứu sinh Quốc tế ILS, kèm 1-1 không sợ nước.',
        rating: 4.92,
      },
      {
        phone: '0911000005',
        name: 'HLV Trần Minh Trí',
        spec: ['Cầu Lông Chuyên Sâu', 'Footwork', 'Kỹ Thuật Đập Cầu Smash'],
        hourlyRate: 300000,
        bio: 'Cử nhân Đại học TDTT TP.HCM khoa Cầu Lông, chuyên gia căn chỉnh tư thế và di chuyển bước chân.',
        rating: 4.90,
      },
    ];

    const trainerUserIds: string[] = [];
    for (const t of trainersData) {
      let tUser = await usersService.findByPhone(t.phone);
      if (!tUser) {
        tUser = await usersService.create({
          phone: t.phone,
          password: 'Trainer@123456',
          fullName: t.name,
          email: `${t.phone}@trainer.phanta.id.vn`,
          role: UserRole.STAFF,
        });
      }
      trainerUserIds.push(tUser._id.toString());

      const existingProfile = await staffProfileModel.findOne({ userId: tUser._id.toString() });
      if (!existingProfile) {
        await staffProfileModel.create({
          userId: tUser._id.toString(),
          fullName: t.name,
          specializations: t.spec,
          hourlyRate: t.hourlyRate,
          bio: t.bio,
          averageRating: t.rating,
          ratingCount: 38,
          isActive: true,
        });
      }
    }
    logger.log(`✅ [2/5] Đã seed 5 Huấn Luyện Viên (PT) tiêu biểu kèm chứng chỉ & Profile.`);

    // Seed Class Templates
    const classTemplatesData = [
      {
        name: 'Yoga Vinyasa Đón Bình Minh',
        classType: 'YOGA',
        capacity: 15,
        defaultDurationMinutes: 60,
        pricePerSession: 120000,
        level: 'BEGINNER',
        description: 'Bài tập chuỗi liên hoàn kết hợp hít thở sâu, giúp tăng độ dẻo dai cơ bắp và thư giãn tâm trí.',
      },
      {
        name: 'HIIT & Core Tabata Đốt Mỡ Cực Đại',
        classType: 'HIIT',
        capacity: 20,
        defaultDurationMinutes: 45,
        pricePerSession: 150000,
        level: 'INTERMEDIATE',
        description: 'Đốt cháy 600+ calo chỉ trong 45 phút cùng âm nhạc điện tử tràn đầy năng lượng và tạ kettlebell.',
      },
      {
        name: 'Bơi Sải Nâng Cao & Thể Lực Đường Dài',
        classType: 'SWIMMING',
        capacity: 8,
        defaultDurationMinutes: 60,
        pricePerSession: 220000,
        level: 'ADVANCED',
        description: 'Hoàn thiện kỹ thuật lướt nước, xoay thân và tăng sức bền tim mạch tại hồ bơi tiêu chuẩn 50m.',
      },
      {
        name: 'Boxing Cardio Knockout Stress',
        classType: 'BOXING',
        capacity: 12,
        defaultDurationMinutes: 60,
        pricePerSession: 180000,
        level: 'ALL_LEVELS',
        description: 'Rèn luyện phản xạ, cú đấm jab/hook dứt khoát kết hợp di chuyển lách người tự vệ hiệu quả.',
      },
    ];

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    for (let i = 0; i < classTemplatesData.length; i++) {
      const ctData = classTemplatesData[i];
      let ct = await classTemplateModel.findOne({ name: ctData.name });
      if (!ct) {
        ct = await classTemplateModel.create(ctData);

        // Create 2 upcoming sessions for each template
        await classSessionModel.create([
          {
            templateId: ct._id.toString(),
            name: `${ct.name} - Ca Sáng`,
            date: todayStr,
            startTime: '07:00',
            endTime: '08:00',
            capacity: ct.capacity,
            registeredCount: 3,
            trainerId: trainerUserIds[i % trainerUserIds.length],
            trainerName: trainersData[i % trainersData.length].name,
            roomName: 'Studio 01 (Lầu 2)',
            status: 'SCHEDULED',
            pricePerSession: ct.pricePerSession,
          },
          {
            templateId: ct._id.toString(),
            name: `${ct.name} - Ca Tối`,
            date: tomorrowStr,
            startTime: '18:30',
            endTime: '19:30',
            capacity: ct.capacity,
            registeredCount: 6,
            trainerId: trainerUserIds[(i + 1) % trainerUserIds.length],
            trainerName: trainersData[(i + 1) % trainersData.length].name,
            roomName: 'Studio 02 (Lầu 2)',
            status: 'SCHEDULED',
            pricePerSession: ct.pricePerSession,
          },
        ]);
      }
    }
    logger.log(`✅ [2/5] Đã seed 4 Lớp học nhóm (Class Templates) & 8 Buổi học (Sessions) thực tế.`);

    // ------------------------------------------------------------------------
    // 3. M16: GIẢI ĐẤU THỂ THAO & ESPORTS
    // ------------------------------------------------------------------------
    let tournament1 = await tournamentModel.findOne({ name: 'Giải Bóng Đá Sân 7 Phanta Cup Mùa Hè 2026' });
    if (!tournament1) {
      tournament1 = await tournamentModel.create({
        name: 'Giải Bóng Đá Sân 7 Phanta Cup Mùa Hè 2026',
        sportType: 'FOOTBALL_7',
        format: 'KNOCKOUT_SINGLE',
        startDate: '2026-06-15',
        endDate: '2026-06-25',
        venueId: 'VEN-SAN-BONG-01',
        maxTeams: 8,
        registeredTeamsCount: 8,
        status: 'ONGOING',
        entryFee: 1500000,
        prizePool: 25000000,
        rulesSummary: 'Đá 2 hiệp mỗi hiệp 25 phút. Hòa đá luân lưu 5 quả penalty. Giày đinh dăm TF tiêu chuẩn.',
        currentRound: 1,
      });

      const teamNames = [
        'FC Phanta Warriors', 'FC Bách Khoa Anh Em', 'FC Sài Gòn Night', 'FC Dragon Ballers',
        'FC Cơn Lốc Đỏ', 'FC Tiger Beer Club', 'FC Tân Phú United', 'FC Bất Bại 2026',
      ];

      const teamDocs = [];
      for (let i = 0; i < teamNames.length; i++) {
        const team = await tournamentTeamModel.create({
          tournamentId: tournament1._id.toString(),
          teamName: teamNames[i],
          captainName: `Đội trưởng ${i + 1}`,
          captainPhone: `094400000${i + 1}`,
          seedNumber: i + 1,
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
        });
        teamDocs.push(team);
      }

      // Create 4 Quarter-final matches
      for (let m = 0; m < 4; m++) {
        await tournamentMatchModel.create({
          tournamentId: tournament1._id.toString(),
          matchCode: `FB-QF-0${m + 1}`,
          round: 1,
          roundName: 'Tứ Kết (Quarter-Finals)',
          teamAId: teamDocs[m * 2]._id.toString(),
          teamAName: teamDocs[m * 2].teamName,
          teamBId: teamDocs[m * 2 + 1]._id.toString(),
          teamBName: teamDocs[m * 2 + 1].teamName,
          scoreA: m === 0 ? 3 : 0,
          scoreB: m === 0 ? 1 : 0,
          winnerTeamId: m === 0 ? teamDocs[0]._id.toString() : undefined,
          scheduledDate: '2026-06-16',
          scheduledTime: `${18 + m}:00`,
          pitchName: `Sân 7 Số ${m + 1}`,
          status: m === 0 ? 'COMPLETED' : 'SCHEDULED',
        });
      }
    }

    let tournament2 = await tournamentModel.findOne({ name: 'Phanta Valorant & LoL Esports Championship 2026' });
    if (!tournament2) {
      await tournamentModel.create({
        name: 'Phanta Valorant & LoL Esports Championship 2026',
        sportType: 'ESPORTS_VALORANT',
        format: 'KNOCKOUT_DOUBLE',
        startDate: '2026-07-01',
        endDate: '2026-07-10',
        venueId: 'VEN-ESPORT-ARENA-01',
        maxTeams: 16,
        registeredTeamsCount: 12,
        status: 'OPEN_FOR_REGISTRATION',
        entryFee: 500000,
        prizePool: 50000000,
        rulesSummary: 'Thi đấu tại Khu Gaming 100 Máy (Phòng Thi Đấu E01-E10). Màn hình 360Hz BenQ Zowie, chuột Razer/Logitech.',
        currentRound: 0,
      });
    }
    logger.log(`✅ [3/5] Đã seed 2 Giải đấu Thể thao & Esports kèm Sơ đồ nhánh đấu Tứ kết.`);

    // ------------------------------------------------------------------------
    // 4. M14: KHU GAMING 100 MÁY & BẢNG GIÁ
    // ------------------------------------------------------------------------
    const existingRules = await gamingPriceRuleModel.countDocuments();
    if (existingRules === 0) {
      await gamingPriceRuleModel.create([
        {
          zone: 'STANDARD',
          hourlyRate: 12000,
          minBlockMinutes: 15,
          roundingBlockMinutes: 15,
          active: true,
          description: 'Khu máy tiêu chuẩn: i5-13400F, RTX 4060, Màn hình 180Hz IPS.',
        },
        {
          zone: 'VIP',
          hourlyRate: 18000,
          minBlockMinutes: 15,
          roundingBlockMinutes: 15,
          active: true,
          description: 'Khu VIP Sofa bọc da: i7-14700K, RTX 4070 Super, Ghế công thái học Noblechairs, Màn 240Hz 2K.',
        },
        {
          zone: 'ESPORT',
          hourlyRate: 25000,
          minBlockMinutes: 15,
          roundingBlockMinutes: 15,
          active: true,
          description: 'Sàn đấu Esports cách âm: i9-14900KF, RTX 4080 Ti, Màn hình BenQ Zowie 360Hz DyAc+ 2.',
        },
      ]);
      logger.log(`✅ [4/5] Đã seed 3 Bảng giá Gaming (STANDARD: 12k/h, VIP: 18k/h, ESPORT: 25k/h).`);
    }

    const currentMachinesCount = await gamingMachineModel.countDocuments();
    if (currentMachinesCount < 100) {
      // Clear and re-generate full 100 machines accurately
      await gamingMachineModel.deleteMany({});
      const machinesToInsert = [];

      // 50 STANDARD MACHINES (PC-STD-01 to PC-STD-50)
      for (let i = 1; i <= 50; i++) {
        const rowNum = Math.ceil(i / 10);
        const colNum = ((i - 1) % 10) + 1;
        machinesToInsert.push({
          machineCode: `PC-STD-${i.toString().padStart(2, '0')}`,
          zone: 'STANDARD',
          row: `R0${rowNum}`,
          column: colNum,
          specs: {
            cpu: 'Core i5-13400F (10 Cores, 4.6GHz)',
            gpu: 'GeForce RTX 4060 8GB GDDR6',
            ramGb: 16,
            monitorHz: 180,
          },
          status: i === 5 ? 'OCCUPIED' : i === 12 ? 'MAINTENANCE' : 'AVAILABLE',
          ipAddress: `192.168.10.${100 + i}`,
          macAddress: `00:E0:4C:${rowNum.toString(16).padStart(2, '0')}:${colNum.toString(16).padStart(2, '0')}:${i.toString(16).padStart(2, '0')}`,
        });
      }

      // 30 VIP MACHINES (PC-VIP-01 to PC-VIP-30)
      for (let i = 1; i <= 30; i++) {
        const rowNum = Math.ceil(i / 10);
        const colNum = ((i - 1) % 10) + 1;
        machinesToInsert.push({
          machineCode: `PC-VIP-${i.toString().padStart(2, '0')}`,
          zone: 'VIP',
          row: `V0${rowNum}`,
          column: colNum,
          specs: {
            cpu: 'Core i7-14700K (20 Cores, 5.6GHz)',
            gpu: 'GeForce RTX 4070 Super 12GB',
            ramGb: 32,
            monitorHz: 240,
          },
          status: i === 2 || i === 3 ? 'OCCUPIED' : 'AVAILABLE',
          ipAddress: `192.168.20.${100 + i}`,
          macAddress: `00:E0:4D:${rowNum.toString(16).padStart(2, '0')}:${colNum.toString(16).padStart(2, '0')}:${i.toString(16).padStart(2, '0')}`,
        });
      }

      // 20 ESPORT STAGE MACHINES (PC-ESP-01 to PC-ESP-20)
      for (let i = 1; i <= 20; i++) {
        const rowNum = Math.ceil(i / 10);
        const colNum = ((i - 1) % 10) + 1;
        machinesToInsert.push({
          machineCode: `PC-ESP-${i.toString().padStart(2, '0')}`,
          zone: 'ESPORT',
          row: `E0${rowNum}`,
          column: colNum,
          specs: {
            cpu: 'Core i9-14900KF (24 Cores, 6.0GHz)',
            gpu: 'GeForce RTX 4080 Ti 16GB OC',
            ramGb: 64,
            monitorHz: 360,
          },
          status: 'AVAILABLE',
          ipAddress: `192.168.30.${100 + i}`,
          macAddress: `00:E0:4E:${rowNum.toString(16).padStart(2, '0')}:${colNum.toString(16).padStart(2, '0')}:${i.toString(16).padStart(2, '0')}`,
        });
      }

      await gamingMachineModel.insertMany(machinesToInsert);
      logger.log(`✅ [4/5] Đã seed CHÍNH XÁC 100 Máy Gaming (50 STD, 30 VIP, 20 ESPORT) với thông số cấu hình và IP.`);
    }

    // ------------------------------------------------------------------------
    // 5. M22: BRIDGE AGENT PHẦN CỨNG QUẦY & CỬA XOAY
    // ------------------------------------------------------------------------
    const existingAgents = await bridgeAgentModel.countDocuments();
    if (existingAgents === 0) {
      await bridgeAgentModel.create([
        {
          agentId: 'AGENT-POS-01',
          hostname: 'POS-COUNTER-DESK',
          localIp: '192.168.1.101',
          macAddress: 'AA:BB:CC:11:22:33',
          agentVersion: '1.4.2',
          status: 'ONLINE',
          lastHeartbeat: new Date(),
          offlineQueueSize: 0,
          devices: [
            {
              deviceId: 'PRN-80MM',
              type: 'THERMAL_PRINTER',
              name: 'Máy in hóa đơn nhiệt 80mm ESC/POS',
              port: 'COM3 (9600 baud)',
              status: 'ONLINE',
            },
            {
              deviceId: 'CD-RJ11',
              type: 'CASH_DRAWER',
              name: 'Két tiền tự động kết nối qua máy in',
              port: 'RJ11 via PRN-80MM',
              status: 'ONLINE',
            },
          ],
        },
        {
          agentId: 'AGENT-TURNSTILE-GYM',
          hostname: 'GATE-IO-CONTROLLER',
          localIp: '192.168.1.102',
          macAddress: 'AA:BB:CC:44:55:66',
          agentVersion: '1.4.2',
          status: 'ONLINE',
          lastHeartbeat: new Date(),
          offlineQueueSize: 0,
          devices: [
            {
              deviceId: 'RELAY-TURNSTILE-01',
              type: 'TURNSTILE_BARRIER',
              name: 'Cửa xoay tripod cổng Gym / Bể bơi',
              port: 'RS485 Modbus RTU',
              status: 'ONLINE',
            },
            {
              deviceId: 'QR-BARCODE-01',
              type: 'QR_SCANNER',
              name: 'Đầu đọc mã QR cố định lối vào',
              port: 'USB HID Scanner',
              status: 'ONLINE',
            },
          ],
        },
        {
          agentId: 'AGENT-KIOSK-01',
          hostname: 'KIOSK-ENTRY-HALL',
          localIp: '192.168.1.103',
          macAddress: 'AA:BB:CC:77:88:99',
          agentVersion: '1.4.2',
          status: 'ONLINE',
          lastHeartbeat: new Date(),
          offlineQueueSize: 0,
          devices: [
            {
              deviceId: 'PRN-KIOSK',
              type: 'THERMAL_PRINTER',
              name: 'Máy in vé Kiosk tự phục vụ',
              port: 'COM4',
              status: 'ONLINE',
            },
          ],
        },
      ]);
      logger.log(`✅ [5/5] Đã seed 3 Bridge Agent thiết bị phần cứng quầy và cửa xoay.`);
    }

    logger.log('🎉 [HOÀN THÀNH] Toàn bộ dữ liệu mẫu cho Phong (Epic E14, E12, E17) đã được khởi tạo thành công rực rỡ!');
  } catch (error) {
    logger.error('❌ Lỗi khi khởi tạo seed data:', error);
  } finally {
    await app.close();
  }
}

seed();
