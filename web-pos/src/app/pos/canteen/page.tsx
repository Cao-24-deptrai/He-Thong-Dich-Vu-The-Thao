'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Printer, RefreshCw, Search, Trash2 } from 'lucide-react';
import { api, CanteenProduct, CanteenShift } from '@/lib/api';
import { usePosToast } from '@/components/pos/PosShell';
import { useThermalReceipt } from '@/components/pos/ThermalReceiptModal';

interface CartItem extends CanteenProduct {
  qty: number;
}

export default function PosCanteenPage() {
  const { showToast } = usePosToast();
  const { openReceipt } = useThermalReceipt();

  const [products, setProducts] = useState<CanteenProduct[]>([]);
  const [shift, setShift] = useState<CanteenShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tendered, setTendered] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, currentShift] = await Promise.all([
        api.getCanteenProducts(),
        api.getCurrentShift().catch(() => null),
      ]);
      const normalized = Array.isArray(prods) ? prods : ((prods as any)?.items ?? []);
      setProducts(Array.isArray(normalized) ? normalized : []);
      setShift(currentShift);
    } catch (err: any) {
      showToast('Lỗi tải dữ liệu Canteen', err.message || 'Không thể tải danh sách sản phẩm', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const onSearch = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) setSearch(custom.detail);
    };
    window.addEventListener('phanta-pos-search', onSearch);
    return () => window.removeEventListener('phanta-pos-search', onSearch);
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, search]);

  const addToCart = (product: CanteenProduct) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        if (existing.qty >= product.stock) {
          showToast('Vượt tồn kho', `Sản phẩm ${product.name} chỉ còn ${product.stock} đơn vị`, 'error');
          return prev;
        }
        return prev.map((item) =>
          item._id === product._id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item._id !== id) return item;
          const next = item.qty + delta;
          if (next > item.stock) {
            showToast('Vượt tồn kho', `Tối đa ${item.stock} sản phẩm trong kho`, 'error');
            return item;
          }
          return { ...item, qty: next };
        })
        .filter((item) => item.qty > 0),
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const cashDiff = tendered > 0 ? tendered - subtotal : 0;

  const handleCheckout = async (method: 'CASH' | 'TRANSFER') => {
    if (!shift) {
      showToast('Chưa mở ca thu ngân', 'Vui lòng mở ca tại mục Quản lý và chốt ca (F7) trước khi bán.', 'error');
      return;
    }
    if (cart.length === 0) {
      showToast('Giỏ hàng trống', 'Chọn ít nhất một món trước khi thanh toán.', 'error');
      return;
    }
    if (method === 'CASH' && tendered > 0 && tendered < subtotal) {
      showToast('Tiền khách đưa chưa đủ', `Đơn hàng cần ${subtotal.toLocaleString('vi-VN')} đ`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const order = await api.createCanteenOrder({
        paymentMethod: method,
        items: cart.map((i) => ({ productId: i._id, quantity: i.qty })),
      });

      const paidTendered = method === 'CASH' ? (tendered > 0 ? tendered : subtotal) : subtotal;
      const change = method === 'CASH' ? Math.max(0, paidTendered - subtotal) : 0;

      openReceipt({
        key: 'canteen',
        title: 'HÓA ĐƠN CANTEEN BÁN LẺ',
        invoiceNo: `#CAN-${String(order?._id || Date.now()).slice(-6).toUpperCase()}`,
        customer: 'Khách quầy Canteen',
        method: method === 'CASH' ? 'Tiền mặt tại quầy' : 'Chuyển khoản ngân hàng',
        items: cart.map((c) => ({ name: c.name, qty: c.qty, price: c.price })),
        subtotal,
        total: subtotal,
        tendered: paidTendered,
        change,
        extraNote: 'Đã trừ tồn kho và ghi nhận vào ca thu ngân',
      });

      setCart([]);
      setTendered(0);
      showToast('Thanh toán thành công', `Đã tạo đơn ${subtotal.toLocaleString('vi-VN')} đ`);
      loadData();
    } catch (err: any) {
      showToast('Thanh toán thất bại', err.message || 'Không thể tạo đơn hàng', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!loading && !shift && (
        <div
          className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          style={{
            backgroundColor: 'var(--pos-warning-soft)',
            borderColor: 'var(--pos-warning-border)',
            color: 'var(--pos-warning)',
          }}
        >
          <span className="font-semibold">
            Ca thu ngân đang đóng. Cần mở ca trước khi lập hóa đơn bán hàng Canteen.
          </span>
          <Link
            href="/pos/shift"
            className="phanta-btn-primary px-3 py-1.5 text-xs shrink-0 text-center"
          >
            Mở ca ngay (F7)
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Grid (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)] ${
                      active
                        ? 'bg-[var(--pos-accent)] text-[var(--pos-accent-fg)] border-[var(--pos-accent)] font-bold'
                        : 'bg-[var(--pos-bg-card)] text-[var(--pos-text-sub)] border-[var(--pos-border-subtle)] hover:text-[var(--pos-text-heading)]'
                    }`}
                  >
                    {cat === 'ALL' ? `Tất cả (${products.length})` : cat}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-[var(--pos-text-sub)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm món ăn, đồ uống..."
                  aria-label="Tìm sản phẩm Canteen"
                  className="phanta-input w-full pl-8 pr-3 py-1.5 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={loadData}
                aria-label="Làm mới danh sách sản phẩm"
                className="phanta-btn-secondary p-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="phanta-card p-8 text-center text-xs text-[var(--pos-text-sub)]">
              Đang tải danh mục Canteen...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="phanta-card p-8 text-center text-xs text-[var(--pos-text-sub)]">
              Không có sản phẩm nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[640px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const out = p.stock <= 0;
                const low = p.stock > 0 && p.stock <= 10;
                return (
                  <button
                    key={p._id}
                    type="button"
                    disabled={out}
                    onClick={() => addToCart(p)}
                    className={`phanta-card p-3.5 text-left flex flex-col justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)] ${
                      out
                        ? 'opacity-45 cursor-not-allowed'
                        : 'hover:border-[var(--pos-accent)] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--pos-bg-card-inner)] text-[var(--pos-text-sub)] border border-[var(--pos-border-subtle)]">
                        {p.category || 'POS'}
                      </span>
                      <span
                        className="text-[11px] font-bold font-tabular px-2 py-0.5 rounded border"
                        style={
                          out
                            ? {
                                backgroundColor: 'var(--pos-danger-soft)',
                                color: 'var(--pos-danger)',
                                borderColor: 'var(--pos-danger-border)',
                              }
                            : low
                            ? {
                                backgroundColor: 'var(--pos-warning-soft)',
                                color: 'var(--pos-warning)',
                                borderColor: 'var(--pos-warning-border)',
                              }
                            : {
                                backgroundColor: 'var(--pos-accent-soft)',
                                color: 'var(--pos-accent)',
                                borderColor: 'var(--pos-border)',
                              }
                        }
                      >
                        {out ? 'Hết hàng' : `Kho: ${p.stock}`}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm text-[var(--pos-text-heading)] line-clamp-2 min-h-[40px]">
                        {p.name}
                      </h3>
                      <div className="pt-2 mt-2 border-t border-[var(--pos-border-subtle)] flex items-center justify-between">
                        <span className="font-barlow font-extrabold text-lg text-[var(--pos-accent)] font-tabular">
                          {p.price.toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-xs font-semibold text-[var(--pos-text-sub)]">
                          Chạm thêm
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Cart & Fast Cash Calculator (5 Cols) */}
        <div className="lg:col-span-5">
          <section className="phanta-card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--pos-border-subtle)]">
              <div className="flex items-center gap-2">
                <h2 className="font-barlow font-extrabold text-base text-[var(--pos-text-heading)] uppercase">
                  Giỏ hàng POS quầy
                </h2>
                <span
                  className="px-2 py-0.5 rounded text-[11px] font-bold font-tabular border"
                  style={{
                    backgroundColor: 'var(--pos-accent-soft)',
                    color: 'var(--pos-accent)',
                    borderColor: 'var(--pos-border)',
                  }}
                >
                  {totalItems} món
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCart([]);
                    setTendered(0);
                  }}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: 'var(--pos-danger)' }}
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-xs text-[var(--pos-text-sub)]">
                  Giỏ hàng đang trống. Chọn sản phẩm bên trái để thêm vào hóa đơn.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item._id}
                    className="phanta-subcard p-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[var(--pos-text-heading)] truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-[var(--pos-text-sub)] font-tabular">
                        {item.price.toLocaleString('vi-VN')} đ x {item.qty}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center rounded-lg bg-[var(--pos-bg-card)] border border-[var(--pos-border-subtle)]">
                        <button
                          type="button"
                          onClick={() => updateQty(item._id, -1)}
                          aria-label={`Giảm số lượng ${item.name}`}
                          className="p-1.5 text-[var(--pos-text-sub)] hover:text-[var(--pos-text-heading)]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-tabular font-bold text-[var(--pos-text-heading)]">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item._id, 1)}
                          aria-label={`Tăng số lượng ${item.name}`}
                          className="p-1.5 text-[var(--pos-text-sub)] hover:text-[var(--pos-text-heading)]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-barlow font-bold text-sm text-[var(--pos-accent)] w-20 text-right font-tabular">
                        {(item.price * item.qty).toLocaleString('vi-VN')} đ
                      </span>

                      <button
                        type="button"
                        onClick={() => updateQty(item._id, -item.qty)}
                        aria-label={`Xóa ${item.name}`}
                        className="p-1 text-[var(--pos-text-sub)] hover:text-[var(--pos-danger)]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cash Calculation */}
            <div className="phanta-subcard p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between font-bold text-sm text-[var(--pos-text-heading)]">
                <span>Tổng thanh toán</span>
                <span className="font-barlow font-extrabold text-xl text-[var(--pos-accent)] font-tabular">
                  {subtotal.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="pt-2 border-t border-[var(--pos-border-subtle)] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="pos-tendered" className="font-semibold text-[var(--pos-text-sub)]">
                    Tiền khách đưa
                  </label>
                  <input
                    id="pos-tendered"
                    type="number"
                    min={0}
                    step={1000}
                    value={tendered || ''}
                    onChange={(e) => setTendered(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    className="phanta-input w-32 px-2.5 py-1 text-right text-xs font-tabular font-bold"
                  />
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 font-tabular">
                  {[50000, 100000, 200000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTendered(amt)}
                      className="phanta-btn-secondary py-1.5 text-[11px]"
                    >
                      {amt / 1000}k
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTendered(subtotal)}
                    className="phanta-btn-secondary py-1.5 text-[11px] text-[var(--pos-accent)] col-span-2 sm:col-span-1"
                  >
                    Đủ tiền
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--pos-border-subtle)]">
                  <span className="font-semibold text-[var(--pos-text-sub)]">
                    {cashDiff < 0 ? 'Còn thiếu:' : 'Tiền thối lại:'}
                  </span>
                  <span
                    className="font-tabular font-bold text-sm"
                    style={{
                      color:
                        tendered === 0
                          ? 'var(--pos-text-sub)'
                          : cashDiff < 0
                          ? 'var(--pos-danger)'
                          : 'var(--pos-accent)',
                    }}
                  >
                    {Math.abs(cashDiff).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={submitting || !shift || cart.length === 0}
                onClick={() => handleCheckout('CASH')}
                className="phanta-btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>{submitting ? 'Đang xử lý...' : 'Thanh toán tiền mặt và in bill'}</span>
              </button>
              <button
                type="button"
                disabled={submitting || !shift || cart.length === 0}
                onClick={() => handleCheckout('TRANSFER')}
                className="phanta-btn-secondary w-full py-2.5 text-xs"
              >
                Thanh toán chuyển khoản
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
