import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InventoryService } from './inventory.service.js';
import { Product } from '../schemas/product.schema.js';
import { StockTransaction } from '../schemas/stock-transaction.schema.js';
import { ProductCategory, StockTxnType } from '@sports/shared';

describe('InventoryService', () => {
  let service: InventoryService;
  let mockProductModel: any;
  let mockStockTxnModel: any;

  const inMemoryProducts: any[] = [];
  const inMemoryStockTxns: any[] = [];

  beforeEach(async () => {
    inMemoryProducts.length = 0;
    inMemoryStockTxns.length = 0;

    mockProductModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: data._id || new Types.ObjectId(),
      trackInventory: data.trackInventory ?? true,
      isActive: data.isActive ?? true,
      stock: data.stock ?? 0,
      costPrice: data.costPrice ?? 0,
      save: jest.fn().mockImplementation(async function (this: any) {
        const idx = inMemoryProducts.findIndex((p) => p._id.toString() === this._id.toString());
        if (idx >= 0) {
          inMemoryProducts[idx] = { ...this };
        } else {
          inMemoryProducts.push({ ...this });
        }
        return this;
      }),
    }));

    mockProductModel.findOne = jest.fn().mockImplementation((query) => {
      const found = inMemoryProducts.find((p) => {
        if (query.sku && p.sku === query.sku) return true;
        if (query.barcode && p.barcode === query.barcode) return true;
        return false;
      });
      return Promise.resolve(found ? { ...found, save: jest.fn().mockResolvedValue(found) } : null);
    });

    mockProductModel.findById = jest.fn().mockImplementation((id) => {
      const found = inMemoryProducts.find(
        (p) => p._id.toString() === id.toString() || p.id === id.toString(),
      );
      if (!found) {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        ...found,
        save: jest.fn().mockImplementation(async function (this: any) {
          const idx = inMemoryProducts.findIndex((p) => p._id.toString() === this._id.toString());
          if (idx >= 0) inMemoryProducts[idx] = { ...this };
          return this;
        }),
      });
    });

    mockProductModel.findOneAndUpdate = jest.fn().mockImplementation((query, update, options) => {
      const idx = inMemoryProducts.findIndex((p) => {
        if (p._id.toString() !== query._id.toString()) return false;
        if (query.trackInventory !== undefined && p.trackInventory !== query.trackInventory) return false;
        if (query.stock?.$gte !== undefined && p.stock < query.stock.$gte) return false;
        return true;
      });

      if (idx < 0) return Promise.resolve(null);

      const target = inMemoryProducts[idx];
      const beforeStock = target.stock;

      if (update.$inc?.stock) {
        target.stock += update.$inc.stock;
      }
      if (update.$set?.costPrice !== undefined) {
        target.costPrice = update.$set.costPrice;
      }

      inMemoryProducts[idx] = target;

      return Promise.resolve(
        options?.new
          ? { ...target, beforeStock }
          : { ...target, stock: beforeStock },
      );
    });

    mockProductModel.updateOne = jest.fn().mockImplementation((query, update) => {
      const target = inMemoryProducts.find((p) => p._id.toString() === query._id.toString());
      if (target && update.$inc?.stock) {
        target.stock += update.$inc.stock;
      }
      return Promise.resolve({ modifiedCount: target ? 1 : 0 });
    });

    mockProductModel.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(async () => inMemoryProducts),
    }));

    mockProductModel.countDocuments = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(inMemoryProducts.length),
    }));

    mockStockTxnModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: new Types.ObjectId(),
      save: jest.fn().mockImplementation(async function (this: any) {
        inMemoryStockTxns.push(this);
        return this;
      }),
    }));

    mockStockTxnModel.create = jest.fn().mockImplementation(async (data) => {
      const record = { ...data, _id: new Types.ObjectId() };
      inMemoryStockTxns.push(record);
      return record;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: getModelToken(StockTransaction.name), useValue: mockStockTxnModel },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('createProduct', () => {
    it('tạo sản phẩm thành công với SKU viết hoa và tồn ban đầu', async () => {
      const product = await service.createProduct({
        sku: 'sp01',
        name: 'Nước khoáng Lavie 500ml',
        category: ProductCategory.CANTEEN,
        unit: 'chai',
        price: 10000,
        costPrice: 5000,
        vatRate: 8,
        trackInventory: true,
        stock: 50,
      });

      expect(product.sku).toBe('SP01');
      expect(product.name).toBe('Nước khoáng Lavie 500ml');
      expect(product.stock).toBe(50);
      expect(inMemoryProducts).toHaveLength(1);
    });

    it('từ chối tạo sản phẩm nếu mã SKU đã tồn tại', async () => {
      await service.createProduct({
        sku: 'SP01',
        name: 'Nước khoáng Lavie 500ml',
        category: ProductCategory.CANTEEN,
        unit: 'chai',
        price: 10000,
      });

      await expect(
        service.createProduct({
          sku: 'sp01',
          name: 'Nước suối khác',
          category: ProductCategory.CANTEEN,
          unit: 'chai',
          price: 12000,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createStockIn (F12.6)', () => {
    it('nhập kho và tính lại giá vốn bình quân gia quyền chính xác', async () => {
      // Ban đầu: tồn 10, giá vốn 10.000 đ
      const created = await service.createProduct({
        sku: 'BONG01',
        name: 'Bóng tennis Wilson US Open',
        category: ProductCategory.RETAIL,
        unit: 'hộp',
        price: 150000,
        costPrice: 100000,
        stock: 10,
      });

      // Nhập thêm 10 hộp với giá nhập 120.000 đ
      // Giá vốn mới = (10 * 100.000 + 10 * 120.000) / 20 = 110.000 đ
      const txn = await service.createStockIn(
        {
          productId: created._id.toString(),
          quantity: 10,
          unitCostPrice: 120000,
          notes: 'Nhập lô hàng mới',
        },
        new Types.ObjectId().toString(),
      );

      expect(txn.type).toBe(StockTxnType.PURCHASE_IN);
      expect(txn.beforeStock).toBe(10);
      expect(txn.afterStock).toBe(20);

      const updated = await service.findById(created._id.toString());
      expect(updated.stock).toBe(20);
      expect(updated.costPrice).toBe(110000);
    });
  });

  describe('createStockOut (F12.7)', () => {
    it('xuất hủy hàng thành công khi đủ tồn kho', async () => {
      const created = await service.createProduct({
        sku: 'BREAD01',
        name: 'Bánh mì sandwich',
        category: ProductCategory.CANTEEN,
        unit: 'cái',
        price: 25000,
        stock: 10,
      });

      const txn = await service.createStockOut(
        {
          productId: created._id.toString(),
          quantity: 2,
          reason: 'Hết hạn sử dụng',
        },
        new Types.ObjectId().toString(),
      );

      expect(txn.type).toBe(StockTxnType.DISCARD_OUT);
      expect(txn.quantity).toBe(-2);
      expect(txn.afterStock).toBe(8);
    });

    it('từ chối xuất hủy nếu số lượng xuất vượt quá tồn kho (Chống âm kho)', async () => {
      const created = await service.createProduct({
        sku: 'BREAD02',
        name: 'Bánh mì tươi',
        category: ProductCategory.CANTEEN,
        unit: 'cái',
        price: 20000,
        stock: 3,
      });

      await expect(
        service.createStockOut(
          {
            productId: created._id.toString(),
            quantity: 5,
            reason: 'Hỏng hóc',
          },
          new Types.ObjectId().toString(),
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deductStockForOrder & restoreStockForCancelledOrder', () => {
    it('trừ kho bán hàng thành công và rollback nếu một sản phẩm không đủ hàng', async () => {
      const p1 = await service.createProduct({
        sku: 'P1',
        name: 'Món 1',
        category: ProductCategory.CANTEEN,
        unit: 'ly',
        price: 30000,
        stock: 10,
      });

      const p2 = await service.createProduct({
        sku: 'P2',
        name: 'Món 2',
        category: ProductCategory.CANTEEN,
        unit: 'ly',
        price: 40000,
        stock: 2,
      });

      // Mua P1 (5) và P2 (10 -> vượt quá 2)
      await expect(
        service.deductStockForOrder(
          [
            { productId: p1._id.toString(), quantity: 5 },
            { productId: p2._id.toString(), quantity: 10 },
          ],
          new Types.ObjectId().toString(),
          new Types.ObjectId().toString(),
        ),
      ).rejects.toThrow(BadRequestException);

      // P1 phải được rollback về 10
      const p1Reload = await service.findById(p1._id.toString());
      expect(p1Reload.stock).toBe(10);
    });

    it('hoàn trả tồn kho khi hủy đơn hàng', async () => {
      const p = await service.createProduct({
        sku: 'P3',
        name: 'Món 3',
        category: ProductCategory.CANTEEN,
        unit: 'ly',
        price: 30000,
        stock: 5,
      });

      await service.restoreStockForCancelledOrder(
        [{ productId: p._id.toString(), quantity: 3 }],
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      );

      const pReload = await service.findById(p._id.toString());
      expect(pReload.stock).toBe(8);
    });
  });

  describe('auditStock (F12.8)', () => {
    it('kiểm kê kho và điều chỉnh cân bằng số lượng thực tế', async () => {
      const p = await service.createProduct({
        sku: 'AUD01',
        name: 'Sản phẩm kiểm kê',
        category: ProductCategory.RETAIL,
        unit: 'cái',
        price: 50000,
        stock: 10,
      });

      const txns = await service.auditStock(
        {
          items: [{ productId: p._id.toString(), actualStock: 12, notes: 'Thừa 2 cái' }],
          notes: 'Kiểm kê cuối tháng',
        },
        new Types.ObjectId().toString(),
      );

      expect(txns).toHaveLength(1);
      expect(txns[0]!.type).toBe(StockTxnType.AUDIT_ADJUST);
      expect(txns[0]!.quantity).toBe(2);
      expect(txns[0]!.afterStock).toBe(12);

      const pReload = await service.findById(p._id.toString());
      expect(pReload.stock).toBe(12);
    });
  });
});
