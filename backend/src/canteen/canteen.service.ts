import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { CanteenProduct, CanteenProductDocument } from './schemas/canteen-product.schema';
import { CanteenShift, CanteenShiftDocument } from './schemas/canteen-shift.schema';
import { CanteenOrder, CanteenOrderDocument } from './schemas/canteen-order.schema';
@Injectable()
export class CanteenService {
 constructor(
 @InjectModel(CanteenProduct.name) private readonly products: Model<CanteenProductDocument>,
 @InjectModel(CanteenShift.name) private readonly shifts: Model<CanteenShiftDocument>,
 @InjectModel(CanteenOrder.name) private readonly orders: Model<CanteenOrderDocument>,
 @InjectConnection() private readonly db: Connection) {}
 listProducts() { return this.products.find({active:true}).sort({name:1}).lean().exec(); }
 async createProduct(dto: {name:string;price:number;stock:number;category?:string}) {
  if(!dto.name?.trim() || !Number.isFinite(dto.price) || dto.price<0 || !Number.isInteger(dto.stock) || dto.stock<0) throw new BadRequestException('Sản phẩm, giá hoặc tồn kho không hợp lệ');
  return this.products.create({name:dto.name.trim(),price:dto.price,stock:dto.stock,category:dto.category||'OTHER'});
 }
 async stock(productId:string, delta:number) {
  if(!Types.ObjectId.isValid(productId) || !Number.isInteger(delta) || delta===0) throw new BadRequestException('Mã sản phẩm hoặc số lượng không hợp lệ');
  const product=await this.products.findOneAndUpdate({_id:productId,...(delta<0?{stock:{$gte:-delta}}:{})},{$inc:{stock:delta}},{new:true}).exec();
  if(!product) throw new ConflictException('Không tìm thấy sản phẩm hoặc tồn kho không đủ');
  return product;
 }
 currentShift(cashierId:string) {return this.shifts.findOne({cashierId,status:'OPEN'}).lean().exec();}
 async openShift(cashierId:string, openingCash:number) {
  if(!Number.isFinite(openingCash) || openingCash<0) throw new BadRequestException('Tiền đầu ca không hợp lệ');
  if(await this.shifts.exists({cashierId,status:'OPEN'})) throw new ConflictException('Thu ngân đã có ca đang mở');
  return this.shifts.create({cashierId,openingCash});
 }
 async closeShift(cashierId:string,shiftId:string,closingCash:number) {
  if(!Types.ObjectId.isValid(shiftId)||!Number.isFinite(closingCash)||closingCash<0) throw new BadRequestException('Dữ liệu chốt ca không hợp lệ');
  const result=await this.shifts.findOneAndUpdate({_id:shiftId,cashierId,status:'OPEN'},{$set:{status:'CLOSED',closingCash,closedAt:new Date()}},{new:true}).exec();
  if(!result) throw new NotFoundException('Không tìm thấy ca đang mở');
  return result;
 }
 async createOrder(cashierId:string,dto:{items:Array<{productId:string;quantity:number}>;paymentMethod:'CASH'|'TRANSFER'}) {
  if(!Array.isArray(dto.items)||!dto.items.length||dto.items.length>50 || !['CASH','TRANSFER'].includes(dto.paymentMethod))throw new BadRequestException('Đơn hàng không hợp lệ');
  const ids=dto.items.map(i=>i.productId);
  if(new Set(ids).size!==ids.length || dto.items.some(i=>!Types.ObjectId.isValid(i.productId)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>1000))throw new BadRequestException('Sản phẩm trùng hoặc số lượng không hợp lệ');
  const session=await this.db.startSession();
  try { let result:any;
   await session.withTransaction(async()=>{
    const shift=await this.shifts.findOne({cashierId,status:'OPEN'}).session(session).exec();
    if(!shift)throw new ConflictException('Cần mở ca trước khi bán');
    const items: Array<{productId:string;name:string;price:number;quantity:number}>=[];
    for(const item of dto.items){
     const p=await this.products.findOneAndUpdate({_id:item.productId,active:true,stock:{$gte:item.quantity}},{$inc:{stock:-item.quantity}},{session,new:true}).exec();
     if(!p)throw new ConflictException('Sản phẩm không tồn tại hoặc hết hàng');
     items.push({productId:item.productId,name:p.name,price:p.price,quantity:item.quantity});
    }
    const total=items.reduce((s,i)=>s+i.price*i.quantity,0);
    const saved=await this.orders.create([{cashierId,shiftId:String(shift._id),items,total,paymentMethod:dto.paymentMethod,status:'PAID'}],{session});
    result=saved[0];
   });return result;
  }finally{await session.endSession();}
 }
 listOrders() {return this.orders.find({status:'PAID'}).sort({createdAt:-1}).limit(100).lean().exec();}
}
