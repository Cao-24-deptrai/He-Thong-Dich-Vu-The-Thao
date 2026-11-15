import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InventoryService } from './inventory.service.js';
import { Product } from '../schemas/product.schema.js';
import { StockTransaction } from '../schemas/stock-transaction.schema.js';
import { ProductCategory, StockTxnType } from '@sports/shared';

describe('InventoryService Concurrency Defense (20 Concurrent Orders for 5 Stock Items Race)', () => {
  let service: InventoryService;

  let currentStock = 5;
  const inMemoryStockTxns: any[] = [];
  const productId = new Types.ObjectId();

  beforeEach(async () => {
    currentStock = 5;
    inMemoryStockTxns.length = 0;

    // Giả lập khóa nguyên tử (Atomic Document Level Operation) của MongoDB engine
    let lock = Promise.resolve();

    const mockProductModel: any = jest.fn();

    mockProductModel.findById = jest.fn().mockImplementation((id: string) => {
      if (id.toString() !== productId.toString()) return Promise.resolve(null);
      return Promise.resolve({
        _id: productId,
        id: productId.toString(),
        sku: 'RACE01',
        name: 'Vợt cầu lông Yonex Flash',
        category: ProductCategory.RETAIL,
        unit: 'cái',
        price: 1500000,
        costPrice: 900000,
        vatRate: 8,
        trackInventory: true,
        stock: currentStock,
        isActive: true,
      });
    });

    mockProductModel.findOneAndUpdate = jest.fn().mockImplementation((query, update, options) => {
      // Đảm bảo tính nguyên tử hóa (Atomic Serializability)
      return new Promise((resolve) => {
        lock = lock.then(async () => {
          // Thêm jitter ngẫu nhiên mô phỏng trễ mạng đa luồng
          await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5)));

          if (query._id.toString() !== productId.toString()) {
            return resolve(null);
          }

          if (query.trackInventory && !true) {
            return resolve(null);
          }

          const reqQty = query.stock?.$gte ?? 0;
          if (currentStock < reqQty) {
            // Không đủ tồn kho -> Trả về null (từ chối nguyên tử)
            return resolve(null);
          }

          const beforeStock = currentStock;
          if (update.$inc?.stock) {
            currentStock += update.$inc.stock;
          }
          const afterStock = currentStock;

          resolve(
            options?.new
              ? { _id: productId, stock: afterStock }
              : { _id: productId, stock: beforeStock },
          );
        });
      });
    });

    mockProductModel.updateOne = jest.fn().mockImplementation((_query, update) => {
      return new Promise((resolve) => {
        lock = lock.then(async () => {
          if (update.$inc?.stock) {
            currentStock += update.$inc.stock;
          }
          resolve({ modifiedCount: 1 });
        });
      });
    });

    const mockStockTxnModel = {
      create: jest.fn().mockImplementation(async (data) => {
        const record = { ...data, _id: new Types.ObjectId() };
        inMemoryStockTxns.push(record);
        return record;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: getModelToken(StockTransaction.name), useValue: mockStockTxnModel },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('20 yêu cầu mua đồng thời khi sản phẩm chỉ còn 5 món -> Đúng 5 đơn thành công, 15 đơn bị từ chối INSUFFICIENT_STOCK, tồn kho bằng 0', async () => {
    const totalRequests = 20;
    const operatorId = new Types.ObjectId().toString();

    // Kích hoạt đồng thời 20 lượt mua hàng
    const results = await Promise.allSettled(
      Array.from({ length: totalRequests }).map(() => {
        const orderId = new Types.ObjectId().toString();
        return service.deductStockForOrder(
          [{ productId: productId.toString(), quantity: 1 }],
          operatorId,
          orderId,
        );
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    // Bất biến: Chính xác 5 đơn thành công và 15 đơn thất bại
    expect(succeeded).toHaveLength(5);
    expect(failed).toHaveLength(15);

    // Xác minh toàn bộ 15 đơn thất bại đều bị từ chối do thiếu tồn kho
    for (const fail of failed) {
      if (fail.status === 'rejected') {
        expect(fail.reason).toBeInstanceOf(BadRequestException);
        expect((fail.reason as any).response.code).toBe('INSUFFICIENT_STOCK');
      }
    }

    // Tồn kho cuối cùng đúng bằng 0, tuyệt đối không bị âm
    expect(currentStock).toBe(0);

    // Thẻ kho (Stock Transactions) ghi nhận chính xác 5 giao dịch xuất bán (SALE_OUT)
    expect(inMemoryStockTxns).toHaveLength(5);
    for (const txn of inMemoryStockTxns) {
      expect(txn.type).toBe(StockTxnType.SALE_OUT);
      expect(txn.quantity).toBe(-1);
    }
  });
});
