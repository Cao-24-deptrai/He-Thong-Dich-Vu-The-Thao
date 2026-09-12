import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';
import { BookingSchema } from '../src/bookings/schemas/booking.schema';
import { UserSchema } from '../src/users/schemas/user.schema';
import { FacilitySchema } from '../src/facilities/schemas/facility.schema';
import { VenueSchema } from '../src/venues/schemas/venue.schema';
import { PaymentSchema } from '../src/payments/schemas/payment.schema';
import { MembershipPassSchema } from '../src/membership-pass/schemas/membership-pass.schema';
import { MatchRequestSchema } from '../src/match-requests/schemas/match-request.schema';
import { BookingStatus } from '../src/common/enums';

describe('Mongoose Schemas & Index Verification (Mục 3 Spec)', () => {
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

  it('Tất cả 7 Schemas đều compile và đăng ký thành công', () => {
    const UserModel = connection.model('User', UserSchema);
    const FacilityModel = connection.model('Facility', FacilitySchema);
    const VenueModel = connection.model('Venue', VenueSchema);
    const BookingModel = connection.model('Booking', BookingSchema);
    const PaymentModel = connection.model('Payment', PaymentSchema);
    const MembershipPassModel = connection.model('MembershipPass', MembershipPassSchema);
    const MatchRequestModel = connection.model('MatchRequest', MatchRequestSchema);

    expect(UserModel).toBeDefined();
    expect(FacilityModel).toBeDefined();
    expect(VenueModel).toBeDefined();
    expect(BookingModel).toBeDefined();
    expect(PaymentModel).toBeDefined();
    expect(MembershipPassModel).toBeDefined();
    expect(MatchRequestModel).toBeDefined();
  });

  it('BẮT BUỘC: BookingSchema có Unique Partial Index trên (venueId, bookingDate, startTime) cho status [HELD, CONFIRMED]', async () => {
    const BookingModel = connection.model('BookingIndexed', BookingSchema);
    await BookingModel.init(); // Chờ build index

    const indexes = await BookingModel.collection.indexes();
    const uniqueIndex = indexes.find(
      (idx) =>
        idx.key?.venueId === 1 &&
        idx.key?.bookingDate === 1 &&
        idx.key?.startTime === 1,
    );

    expect(uniqueIndex).toBeDefined();
    expect(uniqueIndex.unique).toBe(true);
    expect(uniqueIndex.partialFilterExpression).toEqual({
      status: { $in: [BookingStatus.HELD, BookingStatus.CONFIRMED] },
    });
  });

  it('Kiểm tra chặn duplicate key khi cùng slot ở trạng thái HELD hoặc CONFIRMED', async () => {
    const BookingModel = connection.model('BookingTestConflict', BookingSchema);
    await BookingModel.init();

    const venueId = new mongoose.Types.ObjectId();
    const bookingDate = new Date('2026-09-15');
    const startTime = '18:00';

    // Tạo booking đầu tiên với trạng thái HELD
    await BookingModel.create({
      venueId,
      bookingDate,
      startTime,
      endTime: '19:00',
      totalPrice: 200000,
      status: BookingStatus.HELD,
    });

    // Thử tạo booking thứ hai cùng slot với trạng thái HELD hoặc CONFIRMED -> BẮT BUỘC BỊ TỪ CHỐI BỞI UNIQUE INDEX
    let conflictError: any;
    try {
      await BookingModel.create({
        venueId,
        bookingDate,
        startTime,
        endTime: '19:00',
        totalPrice: 200000,
        status: BookingStatus.CONFIRMED,
      });
    } catch (err) {
      conflictError = err;
    }

    expect(conflictError).toBeDefined();
    expect(conflictError.code).toBe(11000); // MongoDB duplicate key code
  });

  it('Cho phép tạo booking cùng slot nếu booking trước đó đã CANCELLED hoặc EXPIRED', async () => {
    const BookingModel = connection.model('BookingTestReuse', BookingSchema);
    await BookingModel.init();

    const venueId = new mongoose.Types.ObjectId();
    const bookingDate = new Date('2026-09-16');
    const startTime = '20:00';

    // Đơn cũ đã EXPIRED
    await BookingModel.create({
      venueId,
      bookingDate,
      startTime,
      endTime: '21:00',
      totalPrice: 200000,
      status: BookingStatus.EXPIRED,
    });

    // Đơn mới cùng slot được phép HELD
    const newBooking = await BookingModel.create({
      venueId,
      bookingDate,
      startTime,
      endTime: '21:00',
      totalPrice: 200000,
      status: BookingStatus.HELD,
    });

    expect(newBooking).toBeDefined();
    expect(newBooking.status).toBe(BookingStatus.HELD);
  });
});
