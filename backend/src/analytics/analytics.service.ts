import { Injectable,BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking,BookingDocument } from '../bookings/schemas/booking.schema';
import { Payment,PaymentDocument } from '../payments/schemas/payment.schema';
import { CanteenOrder,CanteenOrderDocument } from '../canteen/schemas/canteen-order.schema';
@Injectable()
export class AnalyticsService {
 constructor(@InjectModel(Booking.name) private readonly bookings:Model<BookingDocument>,
 @InjectModel(Payment.name) private readonly payments:Model<PaymentDocument>,
 @InjectModel(CanteenOrder.name) private readonly orders:Model<CanteenOrderDocument>){}
 async summary(from?:string,to?:string){
  if((from&&!/^\d{4}-\d{2}-\d{2}$/.test(from))||(to&&!/^\d{4}-\d{2}-\d{2}$/.test(to)))throw new BadRequestException('Ngày phải có dạng YYYY-MM-DD');
  const start=from?new Date(from+'T00:00:00Z'):new Date('2000-01-01T00:00:00Z');
  const end=to?new Date(to+'T23:59:59.999Z'):new Date();
  if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||start>end)throw new BadRequestException('Khoảng ngày không hợp lệ');
  const match={createdAt:{$gte:start,$lte:end}};
  const [bookingCount,paymentAgg,posAgg,refundCount]=await Promise.all([
    this.bookings.countDocuments(match),
    this.payments.aggregate([{$match:{...match,status:'SUCCESS'}},{$group:{_id:null,total:{$sum:'$amount'},count:{$sum:1}}}]),
    this.orders.aggregate([{$match:{...match,status:'PAID'}},{$group:{_id:null,total:{$sum:'$total'},count:{$sum:1}}}]),
    this.payments.countDocuments({...match,status:{$in:['REFUND_PENDING','REFUNDED']}}),
  ]);
  return {from:start.toISOString(),to:end.toISOString(),bookings:bookingCount,paymentRevenue:paymentAgg[0]?.total||0,paymentCount:paymentAgg[0]?.count||0,
   canteenRevenue:posAgg[0]?.total||0,canteenOrders:posAgg[0]?.count||0,refundCases:refundCount,
   note:'Tổng tiền từ giao dịch SUCCESS và hóa đơn POS PAID; chưa trừ hoàn tiền thực tế.'};
 }
}
