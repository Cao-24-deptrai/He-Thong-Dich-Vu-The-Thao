import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../schemas/product.schema.js';
import { StockTransaction, StockTransactionDocument } from '../schemas/stock-transaction.schema.js';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductListQueryDto,
  StockInDto,
  StockOutDto,
  StockAuditDto,
} from '@sports/contracts';
import { StockTxnType } from '@sports/shared';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(StockTransaction.name) private readonly stockTxnModel: Model<StockTransactionDocument>,
  ) {}

  async createProduct(dto: CreateProductDto): Promise<ProductDocument> {
    const existingSku = await this.productModel.findOne({ sku: dto.sku.toUpperCase() });
    if (existingSku) {
      throw new ConflictException({
        code: 'SKU_EXISTS',
        message: `Mã SKU ${dto.sku} đã tồn tại trong hệ thống`,
      });
    }

    if (dto.barcode) {
      const existingBarcode = await this.productModel.findOne({ barcode: dto.barcode.trim() });
      if (existingBarcode) {
        throw new ConflictException({
          code: 'BARCODE_EXISTS',
          message: `Mã vạch ${dto.barcode} đã được gắn cho sản phẩm khác`,
        });
      }
    }

    const product = new this.productModel({
      ...dto,
      sku: dto.sku.toUpperCase(),
      barcode: dto.barcode?.trim(),
      stock: dto.stock ?? 0,
      costPrice: dto.costPrice ?? 0,
    });

    return product.save();
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<ProductDocument> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Không tìm thấy sản phẩm',
      });
    }

    if (dto.sku && dto.sku.toUpperCase() !== product.sku) {
      const existingSku = await this.productModel.findOne({ sku: dto.sku.toUpperCase(), _id: { $ne: id } });
      if (existingSku) {
        throw new ConflictException({
          code: 'SKU_EXISTS',
          message: `Mã SKU ${dto.sku} đã tồn tại trong hệ thống`,
        });
      }
    }

    if (dto.barcode && dto.barcode.trim() !== product.barcode) {
      const existingBarcode = await this.productModel.findOne({ barcode: dto.barcode.trim(), _id: { $ne: id } });
      if (existingBarcode) {
        throw new ConflictException({
          code: 'BARCODE_EXISTS',
          message: `Mã vạch ${dto.barcode} đã được gắn cho sản phẩm khác`,
        });
      }
    }

    Object.assign(product, {
      ...dto,
      sku: dto.sku ? dto.sku.toUpperCase() : product.sku,
      barcode: dto.barcode !== undefined ? dto.barcode?.trim() : product.barcode,
    });

    return product.save();
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Không tìm thấy sản phẩm',
      });
    }
    return product;
  }

  async findByBarcode(barcode: string): Promise<ProductDocument | null> {
    return this.productModel.findOne({ barcode: barcode.trim(), isActive: true });
  }

  async findAll(query: ProductListQueryDto): Promise<{ items: ProductDocument[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (query.category) {
      filter.category = query.category;
    }

    if (query.barcode) {
      filter.barcode = query.barcode.trim();
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search.trim(), $options: 'i' } },
        { sku: { $regex: query.search.trim(), $options: 'i' } },
        { barcode: { $regex: query.search.trim(), $options: 'i' } },
      ];
    }

    if (query.lowStockOnly) {
      filter.trackInventory = true;
      filter.$expr = { $lte: ['$stock', '$minStockThreshold'] };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.productModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  /**
   * F12.6 Nhập kho & tính lại giá vốn bình quân gia quyền:
   * gia_von_moi = Math.round((ton_cu * gia_von_cu + sl_nhap * gia_nhap) / (ton_cu + sl_nhap))
   */
  async createStockIn(dto: StockInDto, operatorId: string): Promise<StockTransactionDocument> {
    const product = await this.findById(dto.productId);

    const oldStock = Math.max(0, product.stock);
    const oldCost = product.costPrice ?? 0;
    const inQty = dto.quantity;
    const inCost = dto.unitCostPrice;

    const totalStock = oldStock + inQty;
    const newCostPrice = totalStock > 0 ? Math.round((oldStock * oldCost + inQty * inCost) / totalStock) : inCost;

    const beforeStock = product.stock;
    const afterStock = beforeStock + inQty;

    product.stock = afterStock;
    product.costPrice = newCostPrice;
    await product.save();

    const txn = new this.stockTxnModel({
      productId: product._id,
      productName: product.name,
      type: StockTxnType.PURCHASE_IN,
      quantity: inQty,
      beforeStock,
      afterStock,
      unitPrice: inCost,
      notes: dto.notes,
      operatorId: new Types.ObjectId(operatorId),
    });

    return txn.save();
  }

  /**
   * F12.7 Xuất hủy / hao hụt / hết hạn:
   * Trừ tồn kho nguyên tử, kiểm tra không để âm kho
   */
  async createStockOut(dto: StockOutDto, operatorId: string): Promise<StockTransactionDocument> {
    const product = await this.findById(dto.productId);

    // Atomic decrement
    const updated = await this.productModel.findOneAndUpdate(
      {
        _id: product._id,
        trackInventory: true,
        stock: { $gte: dto.quantity },
      },
      { $inc: { stock: -dto.quantity } },
      { new: true },
    );

    if (!updated) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_STOCK',
        message: `Sản phẩm ${product.name} không đủ tồn kho (yêu cầu xuất: ${dto.quantity}, tồn hiện tại: ${product.stock})`,
      });
    }

    const beforeStock = updated.stock + dto.quantity;
    const afterStock = updated.stock;

    const txn = new this.stockTxnModel({
      productId: product._id,
      productName: product.name,
      type: StockTxnType.DISCARD_OUT,
      quantity: -dto.quantity,
      beforeStock,
      afterStock,
      notes: `${dto.reason}${dto.notes ? ' - ' + dto.notes : ''}`,
      operatorId: new Types.ObjectId(operatorId),
    });

    return txn.save();
  }

  /**
   * F12.2 / F12.3: Trừ tồn kho nguyên tử khi bán hàng POS
   * Nếu bất kỳ món nào không đủ tồn kho, rollback các món đã trừ trước đó
   */
  async deductStockForOrder(
    items: Array<{ productId: string; quantity: number }>,
    operatorId: string,
    orderId: string,
  ): Promise<void> {
    const deducted: Array<{ productId: string; quantity: number }> = [];

    for (const item of items) {
      const product = await this.productModel.findById(item.productId);
      if (!product || !product.isActive) {
        // Rollback already deducted items
        await this.rollbackDeductions(deducted);
        throw new NotFoundException({
          code: 'PRODUCT_NOT_FOUND',
          message: `Sản phẩm ID ${item.productId} không tồn tại hoặc đã ngừng kinh doanh`,
        });
      }

      if (product.trackInventory) {
        const updated = await this.productModel.findOneAndUpdate(
          {
            _id: product._id,
            trackInventory: true,
            stock: { $gte: item.quantity },
          },
          { $inc: { stock: -item.quantity } },
          { new: true },
        );

        if (!updated) {
          // Rollback already deducted items
          await this.rollbackDeductions(deducted);
          throw new BadRequestException({
            code: 'INSUFFICIENT_STOCK',
            message: `Sản phẩm "${product.name}" không đủ số lượng tồn kho (yêu cầu: ${item.quantity}, hiện có: ${product.stock})`,
          });
        }

        deducted.push({ productId: item.productId, quantity: item.quantity });

        await this.stockTxnModel.create({
          productId: product._id,
          productName: product.name,
          type: StockTxnType.SALE_OUT,
          quantity: -item.quantity,
          beforeStock: updated.stock + item.quantity,
          afterStock: updated.stock,
          referenceId: new Types.ObjectId(orderId),
          operatorId: new Types.ObjectId(operatorId),
        });
      }
    }
  }

  private async rollbackDeductions(items: Array<{ productId: string; quantity: number }>): Promise<void> {
    for (const item of items) {
      await this.productModel.updateOne(
        { _id: item.productId, trackInventory: true },
        { $inc: { stock: item.quantity } },
      );
    }
  }

  /**
   * F12.4: Hoàn trả tồn kho khi hủy đơn hàng
   */
  async restoreStockForCancelledOrder(
    items: Array<{ productId: string; quantity: number }>,
    operatorId: string,
    orderId: string,
  ): Promise<void> {
    for (const item of items) {
      const product = await this.productModel.findById(item.productId);
      if (product && product.trackInventory) {
        const updated = await this.productModel.findOneAndUpdate(
          { _id: product._id, trackInventory: true },
          { $inc: { stock: item.quantity } },
          { new: true },
        );

        if (updated) {
          await this.stockTxnModel.create({
            productId: product._id,
            productName: product.name,
            type: StockTxnType.RETURN_IN,
            quantity: item.quantity,
            beforeStock: updated.stock - item.quantity,
            afterStock: updated.stock,
            referenceId: new Types.ObjectId(orderId),
            notes: 'Hoàn tồn do hủy đơn POS',
            operatorId: new Types.ObjectId(operatorId),
          });
        }
      }
    }
  }

  /**
   * F12.8 Kiểm kê kho (Stock Audit)
   */
  async auditStock(dto: StockAuditDto, operatorId: string): Promise<StockTransactionDocument[]> {
    const transactions: StockTransactionDocument[] = [];

    for (const item of dto.items) {
      const product = await this.findById(item.productId);
      const diff = item.actualStock - product.stock;

      if (diff !== 0) {
        const beforeStock = product.stock;
        const afterStock = item.actualStock;

        product.stock = afterStock;
        await product.save();

        const txn = await this.stockTxnModel.create({
          productId: product._id,
          productName: product.name,
          type: StockTxnType.AUDIT_ADJUST,
          quantity: diff,
          beforeStock,
          afterStock,
          notes: item.notes || dto.notes || 'Điều chỉnh cân bằng kho sau kiểm kê',
          operatorId: new Types.ObjectId(operatorId),
        });

        transactions.push(txn);
      }
    }

    return transactions;
  }

  /**
   * F12.9 Cảnh báo tồn dưới ngưỡng tối thiểu
   */
  async getLowStockProducts(): Promise<ProductDocument[]> {
    return this.productModel
      .find({
        trackInventory: true,
        isActive: true,
        $expr: { $lte: ['$stock', '$minStockThreshold'] },
      })
      .sort({ stock: 1 })
      .exec();
  }
}
