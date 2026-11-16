import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Review } from './schemas/review.schema';
import { Booking } from '../bookings/schemas/booking.schema';
import { Venue } from '../venues/schemas/venue.schema';
import { User } from '../users/schemas/user.schema';
import { Types } from 'mongoose';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewModel: any;
  let bookingModel: any;
  let venueModel: any;
  let userModel: any;

  const mockUserId = new Types.ObjectId();
  const mockBookingId = new Types.ObjectId();
  const mockVenueId = new Types.ObjectId();
  const mockFacilityId = new Types.ObjectId();

  const mockBooking = {
    _id: mockBookingId,
    userId: mockUserId,
    venueId: mockVenueId,
    bookingDate: new Date(), // Just completed
    status: 'CONFIRMED',
  };

  const mockVenue = {
    _id: mockVenueId,
    facilityId: mockFacilityId,
    name: 'Sân bóng đá số 1',
  };

  const mockCustomer = {
    _id: mockUserId,
    fullName: 'Trần Văn Nam',
    phone: '0911223344',
  };

  beforeEach(async () => {
    reviewModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      aggregate: jest.fn(),
    };

    bookingModel = {
      findById: jest.fn(),
    };

    venueModel = {
      findById: jest.fn(),
    };

    userModel = {
      findById: jest.fn(),
    };

    function MockReviewModel(dto: any) {
      return {
        ...dto,
        save: jest.fn().mockResolvedValue({ ...dto, _id: new Types.ObjectId() }),
      };
    }
    Object.assign(MockReviewModel, reviewModel);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getModelToken(Review.name), useValue: MockReviewModel },
        { provide: getModelToken(Booking.name), useValue: bookingModel },
        { provide: getModelToken(Venue.name), useValue: venueModel },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  describe('createReview', () => {
    it('should create review with 4 criteria, calculate overallRating and set needsAttention=false when rating is high', async () => {
      bookingModel.findById.mockResolvedValue(mockBooking);
      reviewModel.findOne.mockResolvedValue(null);
      userModel.findById.mockResolvedValue(mockCustomer);
      venueModel.findById.mockResolvedValue(mockVenue);

      const review = await service.createReview(mockUserId.toHexString(), {
        bookingId: mockBookingId.toHexString(),
        facilityRating: 5,
        serviceRating: 4,
        staffRating: 5,
        cleanlinessRating: 4,
        comment: 'Dịch vụ rất chu đáo và sạch sẽ!',
      });

      expect(review.overallRating).toBe(4.5);
      expect(review.needsAttention).toBe(false);
      expect(review.customerName).toBe('Trần Văn Nam');
    });

    it('should trigger needsAttention=true when any criteria is <= 2 stars (BR-1761 alert)', async () => {
      bookingModel.findById.mockResolvedValue(mockBooking);
      reviewModel.findOne.mockResolvedValue(null);
      userModel.findById.mockResolvedValue(mockCustomer);
      venueModel.findById.mockResolvedValue(mockVenue);

      const review = await service.createReview(mockUserId.toHexString(), {
        bookingId: mockBookingId.toHexString(),
        facilityRating: 4,
        serviceRating: 4,
        staffRating: 2, // Low rating <= 2
        cleanlinessRating: 4,
        comment: 'Nhân viên quầy thái độ chưa tốt.',
      });

      expect(review.needsAttention).toBe(true);
    });

    it('should throw BadRequestException if review is submitted after 7 days (BR-1304)', async () => {
      const expiredBooking = {
        ...mockBooking,
        bookingDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      };
      bookingModel.findById.mockResolvedValue(expiredBooking);

      await expect(
        service.createReview(mockUserId.toHexString(), {
          bookingId: mockBookingId.toHexString(),
          facilityRating: 5,
          serviceRating: 5,
          staffRating: 5,
          cleanlinessRating: 5,
          comment: 'Rất tốt',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if review already exists for this booking (BR-1307)', async () => {
      bookingModel.findById.mockResolvedValue(mockBooking);
      reviewModel.findOne.mockResolvedValue({ _id: new Types.ObjectId() }); // Already reviewed

      await expect(
        service.createReview(mockUserId.toHexString(), {
          bookingId: mockBookingId.toHexString(),
          facilityRating: 5,
          serviceRating: 5,
          staffRating: 5,
          cleanlinessRating: 5,
          comment: 'Gửi lần 2',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('respondToReview', () => {
    it('should record staff response with responderName and content', async () => {
      const mockReview = {
        _id: new Types.ObjectId(),
        comment: 'Đèn sân bị chập chờn',
        needsAttention: true,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      reviewModel.findById.mockResolvedValue(mockReview);

      const result = await service.respondToReview(
        mockReview._id.toHexString(),
        { userId: new Types.ObjectId(), fullName: 'Lễ Tân Minh Thiện' },
        { content: 'Đã bảo trì dàn đèn bóng rổ ngay trong đêm!' },
      );

      expect(result.staffResponse).toBeDefined();
      expect(result.staffResponse.responderName).toBe('Lễ Tân Minh Thiện');
      expect(result.staffResponse.content).toBe('Đã bảo trì dàn đèn bóng rổ ngay trong đêm!');
    });
  });
});
