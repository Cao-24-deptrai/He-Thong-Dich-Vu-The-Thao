'use client';

import { useEffect, useState } from 'react';
import { 
  Coffee, 
  ShoppingBag, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Clock, 
  User, 
  Trash2,
  Receipt,
  CreditCard,
  Banknote
} from 'lucide-react';

const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Product = {
  _id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
};

export default function CanteenPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [shift, setShift] = useState<any>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('Nước giải khát');
  const [cash, setCash] = useState('0');
  const [payment, setPayment] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const token = () => (typeof window === 'undefined' ? '' : localStorage.getItem('access_token') || '');

  async function req(path: string, method = 'GET', body?: any) {
    const res = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw Error(Array.isArray(json.message) ? json.message.join(', ') : json.message || 'HTTP ' + res.status);
    }
    return json;
  }

  async function refresh() {
    try {
      setLoading(true);
      const [p, s] = await Promise.all([
        req('/canteen/products'),
        req('/canteen/shifts/current'),
      ]);
      setProducts(p || []);
      setShift(s || null);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function action(f: () => Promise<any>) {
    try {
      await f();
      setMsg('Thao tác thành công');
      setTimeout(() => setMsg(''), 3500);
      await refresh();
    } catch (e: any) {
      setMsg('Lỗi: ' + e.message);
    }
  }

  const total = products.reduce((a, p) => a + p.price * (cart[p._id] || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <Coffee className="w-6 h-6 text-[var(--burnt-orange)]" />
            <span>Quản Lý Căn Tin & POS Bán Lẻ F&B</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Quản lý thực đơn đồ uống, thức ăn nhẹ, quản lý ca thu ngân và xử lý thanh toán đơn hàng trực tiếp tại quầy
          </p>
        </div>

        <button
          onClick={refresh}
          className="phanta-btn-secondary px-3.5 py-2 flex items-center gap-2 text-xs w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-[var(--pitch-green)] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{msg}</span>
        </div>
      )}

      {/* Grid: Ca thu ngân + Thêm sản phẩm */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ca thu ngân */}
        <div className="phanta-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-base text-[var(--text-heading)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--pitch-green)]" />
              <span>Ca thu ngân hiện tại</span>
            </h2>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${shift ? 'bg-emerald-500/15 text-[var(--pitch-green)]' : 'bg-amber-500/15 text-amber-400'}`}>
              {shift ? 'Đang mở' : 'Chưa mở ca'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] space-y-2 text-xs">
            <div className="flex justify-between text-[var(--text-sub)]">
              <span>Trạng thái ca:</span>
              <span className="font-semibold text-[var(--text-main)]">
                {shift ? `Mã ca #${shift._id.substring(0, 8)}` : 'Đang đóng'}
              </span>
            </div>
            {shift && (
              <div className="flex justify-between text-[var(--text-sub)]">
                <span>Tiền đầu ca:</span>
                <span className="font-heading font-bold text-[var(--text-heading)] tabular-nums">
                  {(shift.openingCash || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--text-sub)]">
              {shift ? 'Tiền mặt kết ca (kiểm đếm):' : 'Tiền mặt đầu ca:'}
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-main)] font-heading tabular-nums focus:outline-none focus:border-[var(--pitch-green)]"
                type="number"
                min="0"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder="Nhập số tiền..."
              />
              {shift ? (
                <button
                  className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 font-bold text-xs"
                  onClick={() =>
                    action(() =>
                      req('/canteen/shifts/' + shift._id + '/close', 'POST', {
                        closingCash: Number(cash),
                      }),
                    )
                  }
                >
                  Chốt ca
                </button>
              ) : (
                <button
                  className="phanta-btn-primary px-4 py-2 text-xs font-bold"
                  onClick={() =>
                    action(() =>
                      req('/canteen/shifts/open', 'POST', {
                        openingCash: Number(cash),
                      }),
                    )
                  }
                >
                  Mở ca
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Thêm sản phẩm mới */}
        <div className="lg:col-span-2 phanta-card p-6 space-y-4">
          <h2 className="font-heading font-bold text-base text-[var(--text-heading)] flex items-center gap-2">
            <Plus className="w-4 h-4 text-[var(--pitch-green)]" />
            <span>Thêm món vào thực đơn F&B</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <input
              className="sm:col-span-2 px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] placeholder:text-[var(--text-sub)] focus:outline-none focus:border-[var(--pitch-green)]"
              placeholder="Tên sản phẩm (Vd: Pocari Sweat 500ml)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] font-heading tabular-nums placeholder:text-[var(--text-sub)] focus:outline-none focus:border-[var(--pitch-green)]"
              placeholder="Giá bán (VND)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] font-heading tabular-nums placeholder:text-[var(--text-sub)] focus:outline-none focus:border-[var(--pitch-green)]"
              placeholder="Số lượng tồn"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>

          <button
            disabled={!name || !price || !stock}
            className="phanta-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 ml-auto"
            onClick={() =>
              action(async () => {
                await req('/canteen/products', 'POST', {
                  name,
                  price: Number(price),
                  stock: Number(stock),
                  category,
                });
                setName('');
                setPrice('');
                setStock('');
              })
            }
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lưu món mới</span>
          </button>
        </div>
      </div>

      {/* Thực đơn sản phẩm & Giỏ hàng POS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Grid (2 Cols) */}
        <div className="lg:col-span-2 phanta-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-base text-[var(--text-heading)] flex items-center gap-2">
              <span>Thực đơn F&B phục vụ tại quầy</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-heading font-extrabold bg-[var(--pitch-green)]/15 text-[var(--pitch-green)] border border-[var(--pitch-green)]/30 tabular-nums">
                {products.length} món
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {products.map((p) => {
              const qty = cart[p._id] || 0;
              return (
                <div
                  key={p._id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    qty > 0
                      ? 'bg-[var(--bg-card-inner)] border-[var(--pitch-green)]'
                      : 'bg-[var(--bg-card-inner)]/50 border-[var(--border-subtle)] hover:border-[var(--border-color)]'
                  }`}
                >
                  <div>
                    <h4 className="font-heading font-bold text-xs text-[var(--text-heading)]">{p.name}</h4>
                    <p className="font-heading font-extrabold text-sm text-[var(--pitch-green)] tabular-nums mt-1">
                      {p.price.toLocaleString('vi-VN')} đ
                    </p>
                    <p className="text-[11px] text-[var(--text-sub)] mt-0.5">Tồn kho: {p.stock}</p>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={qty <= 0}
                      onClick={() => setCart((v) => ({ ...v, [p._id]: Math.max(0, qty - 1) }))}
                      className="w-7 h-7 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-card)] disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="font-heading font-bold text-xs text-[var(--text-heading)] tabular-nums w-6 text-center">
                      {qty}
                    </span>
                    <button
                      type="button"
                      disabled={qty >= p.stock}
                      onClick={() => setCart((v) => ({ ...v, [p._id]: Math.min(p.stock, qty + 1) }))}
                      className="w-7 h-7 rounded-lg bg-[var(--pitch-green)] text-slate-950 text-xs font-bold hover:brightness-110 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Giỏ hàng thanh toán POS (1 Col) */}
        <div className="phanta-card p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h3 className="font-heading font-bold text-base text-[var(--text-heading)] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[var(--pitch-green)]" />
              <span>Đơn hàng POS tại quầy</span>
            </h3>

            <div className="p-4 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex justify-between text-xs text-[var(--text-sub)]">
                <span>Số món đã chọn:</span>
                <span className="font-bold text-[var(--text-heading)] tabular-nums">
                  {Object.values(cart).reduce((a, b) => a + b, 0)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-[var(--text-sub)] pt-2 border-t border-[var(--border-subtle)]">
                <span className="font-semibold text-[var(--text-main)]">Tổng tiền thanh toán:</span>
                <span className="font-heading font-black text-lg text-[var(--pitch-green)] tabular-nums">
                  {total.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-[var(--text-sub)]">Phương thức thanh toán:</label>
              <select
                className="w-full px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--pitch-green)]"
                value={payment}
                onChange={(e) => setPayment(e.target.value as any)}
              >
                <option value="CASH">Tiền mặt tại quầy (CASH)</option>
                <option value="TRANSFER">Chuyển khoản QR (PayOS / VietQR)</option>
              </select>
            </div>
          </div>

          <button
            disabled={!shift || !total}
            className="w-full phanta-btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            onClick={() =>
              action(async () => {
                await req('/canteen/orders', 'POST', {
                  paymentMethod: payment,
                  items: Object.entries(cart)
                    .filter(([_, q]) => q > 0)
                    .map(([productId, quantity]) => ({ productId, quantity })),
                });
                setCart({});
              })
            }
          >
            <Receipt className="w-4 h-4" />
            <span>Thanh toán đơn hàng</span>
          </button>
        </div>
      </div>
    </div>
  );
}
