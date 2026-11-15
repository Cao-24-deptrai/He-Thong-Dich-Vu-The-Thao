/**
 * GOLDEN STAR SPORTS HUB - FRONTEND LOGIC (EPICS E04, E06, E16)
 * Real-time state management, audio synthesis, and interactive workflows
 */

// Sound Synthesizer via Web Audio API
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }
  playBeep() {
    if (!this.enabled) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }
  playSuccess() {
    if (!this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.12, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.28);
    });
  }
  playAlert() {
    if (!this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;
    [440, 370].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0.08, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.2);
    });
  }
}

const sfx = new SoundFX();

// Global App State
const state = {
  activeEpic: 'E04',
  activeSubView: 'e04-vietqr',
  currentOrder: null,
  vietqrOrders: [],
  unmatchedTx: [],
  refunds: [],
  posProducts: [],
  posCart: [],
  currentShift: null,
  shiftHistory: [],
  dashboardData: null,
  occupancyData: null,
  auditLogs: [],
  timerInterval: null,
  remainingSeconds: 900 // 15 minutes
};

// Utilities
function formatVND(amount) {
  return (amount || 0).toLocaleString('vi-VN') + ' đ';
}

function formatDate(isoStr) {
  if (!isoStr) return '--:--';
  const d = new Date(isoStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate()}/${d.getMonth() + 1}`;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '✓';
  if (type === 'warning') icon = '⚠';
  if (type === 'danger') icon = '✕';
  
  toast.innerHTML = `<span style="font-size:1.1rem; font-weight:800">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================
// NAVIGATION HANDLERS
// ==========================================

function switchEpic(epicId) {
  state.activeEpic = epicId;
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.epic === epicId);
  });
  document.querySelectorAll('.epic-viewport').forEach(view => {
    view.style.display = (view.id === `epic-${epicId.toLowerCase()}`) ? 'block' : 'none';
  });

  // Default subviews
  if (epicId === 'E04') switchSubView('e04-vietqr');
  if (epicId === 'E06') switchSubView('e06-pos');
  if (epicId === 'E16') switchSubView('e16-dashboard');
}

function switchSubView(subviewId) {
  state.activeSubView = subviewId;
  document.querySelectorAll('.subnav-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subview === subviewId);
  });
  document.querySelectorAll('.subview-section').forEach(section => {
    section.classList.toggle('active', section.id === `section-${subviewId}`);
  });

  // Refresh data on switch
  if (subviewId === 'e04-vietqr') loadVietqrOrders();
  if (subviewId === 'e04-rescue') loadUnmatchedTx();
  if (subviewId === 'e04-refunds') loadRefunds();
  if (subviewId === 'e06-pos') loadPosProducts();
  if (subviewId === 'e06-inventory') loadInventory();
  if (subviewId === 'e06-shift') loadShiftData();
  if (subviewId === 'e16-dashboard') loadDashboard();
  if (subviewId === 'e16-occupancy') loadOccupancy();
  if (subviewId === 'e16-audit') loadAuditLogs();
}

// ==========================================
// EPIC E04: VIETQR, CỨU ĐƠN & HOÀN TIỀN
// ==========================================

async function loadVietqrOrders() {
  try {
    const res = await fetch('/api/e04/orders');
    const orders = await res.json();
    state.vietqrOrders = orders;
    
    // Pick pending order as current or default
    const active = orders.find(o => o.status === 'PENDING') || orders[0];
    if (active) {
      renderActiveVietQR(active);
    }
    renderVietqrOrdersTable(orders);
  } catch (err) {
    console.error('Lỗi tải đơn VietQR:', err);
  }
}

function renderActiveVietQR(order) {
  state.currentOrder = order;
  document.getElementById('qrCourtName').textContent = order.courtName;
  document.getElementById('qrTimeSlot').textContent = order.timeSlot;
  document.getElementById('qrAmount').textContent = formatVND(order.amount);
  document.getElementById('qrOrderId').textContent = order.orderId;
  document.getElementById('qrAccountNum').textContent = order.accountNumber;
  document.getElementById('qrBankName').textContent = order.bankName;
  document.getElementById('qrAccountName').textContent = order.accountName;
  document.getElementById('qrMemo').textContent = order.memo;

  const statusEl = document.getElementById('qrStatusBadge');
  if (order.status === 'PAID') {
    statusEl.innerHTML = `<span class="badge badge-success">✓ ĐÃ THANH TOÁN THÀNH CÔNG</span>`;
    document.getElementById('pollingStatusText').innerHTML = `<span style="color:var(--accent-lime)">Giao dịch đã khớp hoàn tất lúc ${formatDate(order.paidAt)}</span>`;
    document.getElementById('qrSimulateSuccessBtn').style.display = 'none';
  } else if (order.status === 'EXPIRED') {
    statusEl.innerHTML = `<span class="badge badge-danger">✕ ĐÃ HẾT HẠN</span>`;
    document.getElementById('pollingStatusText').textContent = 'Đơn đã hết hạn thanh toán 15 phút.';
    document.getElementById('qrSimulateSuccessBtn').style.display = 'none';
  } else {
    statusEl.innerHTML = `<span class="badge badge-pending">⏱ CHỜ THANH TOÁN (VIETQR POLLING)</span>`;
    document.getElementById('pollingStatusText').textContent = 'Đang lắng nghe tín hiệu chuyển khoản ngân hàng... (chu kỳ 2s)';
    document.getElementById('qrSimulateSuccessBtn').style.display = 'inline-flex';
    startTimer();
  }

  // Draw Dynamic VietQR Pattern
  drawVietQRPattern(order);
}

function drawVietQRPattern(order) {
  const canvas = document.getElementById('qrCanvas');
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Generate deterministic QR-like grid based on orderId and amount
  const seedStr = `${order.orderId}-${order.amount}-${order.memo}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }

  const cellSize = 7;
  const numCells = Math.floor(width / cellSize);

  ctx.fillStyle = '#0b130e';

  // Corner Position Marks (Standard QR 7x7 squares)
  function drawPositionMarker(x, y) {
    ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#0b130e';
    ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
  }

  drawPositionMarker(2 * cellSize, 2 * cellSize); // Top-left
  drawPositionMarker((numCells - 9) * cellSize, 2 * cellSize); // Top-right
  drawPositionMarker(2 * cellSize, (numCells - 9) * cellSize); // Bottom-left

  // Random matrix filler with pseudo-random seed
  for (let r = 2; r < numCells - 2; r++) {
    for (let c = 2; c < numCells - 2; c++) {
      // skip corner squares
      if ((r < 10 && c < 10) || (r < 10 && c > numCells - 11) || (r > numCells - 11 && c < 10)) {
        continue;
      }
      const val = Math.sin(r * 12.9898 + c * 78.233 + hash) * 43758.5453;
      if ((val - Math.floor(val)) > 0.48) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  }

  // Center VietQR logo icon overlay
  const centerSize = 44;
  const cx = width / 2;
  const cy = height / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - centerSize / 2, cy - centerSize / 2, centerSize, centerSize);
  ctx.strokeStyle = '#003399';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - centerSize / 2, cy - centerSize / 2, centerSize, centerSize);

  ctx.fillStyle = '#003399';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VietQR', cx, cy);
}

function startTimer() {
  clearInterval(state.timerInterval);
  state.remainingSeconds = 900; // 15 mins
  const timerEl = document.getElementById('qrCountdownText');

  state.timerInterval = setInterval(() => {
    if (state.remainingSeconds <= 0) {
      clearInterval(state.timerInterval);
      timerEl.textContent = '00:00 (Hết hạn)';
      return;
    }
    state.remainingSeconds--;
    const mins = Math.floor(state.remainingSeconds / 60).toString().padStart(2, '0');
    const secs = (state.remainingSeconds % 60).toString().padStart(2, '0');
    timerEl.textContent = `${mins}:${secs}`;
  }, 1000);
}

function copyToClipboard(text, msg) {
  navigator.clipboard.writeText(text).then(() => {
    sfx.playBeep();
    showToast(msg || `Đã sao chép: ${text}`);
  });
}

async function simulateWebhookTransfer(isFailure = false) {
  if (!state.currentOrder) return;
  try {
    const res = await fetch('/api/e04/simulate-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: state.currentOrder.orderId, isFailure })
    });
    const data = await res.json();
    if (data.success) {
      sfx.playSuccess();
      showToast(`⚡ Webhook IPN: Ghi nhận tiền vào! Khách đã chuyển ${formatVND(state.currentOrder.amount)}!`);
      loadVietqrOrders();
    } else {
      sfx.playAlert();
      showToast('Đơn đã chuyển sang trạng thái hết hạn!', 'warning');
      loadVietqrOrders();
    }
  } catch (err) {
    showToast('Lỗi khi giả lập webhook', 'danger');
  }
}

function renderVietqrOrdersTable(orders) {
  const tbody = document.getElementById('vietqrOrdersTableBody');
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong>${o.orderId}</strong></td>
      <td>
        <div>${o.customerName}</div>
        <small style="color:var(--text-muted)">${o.customerPhone}</small>
      </td>
      <td>${o.courtName}</td>
      <td>${o.timeSlot}</td>
      <td style="color:var(--accent-lime); font-weight:700">${formatVND(o.amount)}</td>
      <td>
        ${o.status === 'PAID' ? '<span class="badge badge-success">ĐÃ THANH TOÁN</span>' :
          o.status === 'EXPIRED' ? '<span class="badge badge-danger">HẾT HẠN</span>' :
          '<span class="badge badge-pending">CHỜ CHUYỂN KHOẢN</span>'}
      </td>
      <td>
        <button class="btn btn-secondary" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="selectOrderToView('${o.orderId}')">
          Xem QR
        </button>
      </td>
    </tr>
  `).join('');
}

function selectOrderToView(orderId) {
  const o = state.vietqrOrders.find(item => item.orderId === orderId);
  if (o) {
    renderActiveVietQR(o);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Đang hiển thị mã QR đơn ${o.orderId}`);
  }
}

// Modal Create New Booking
function openNewBookingModal() {
  document.getElementById('newBookingModal').classList.add('active');
}
function closeNewBookingModal() {
  document.getElementById('newBookingModal').classList.remove('active');
}

async function handleCreateBookingSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('newBookingForm');
  const payload = {
    customerName: form.custName.value,
    customerPhone: form.custPhone.value,
    courtName: form.courtSelect.value,
    timeSlot: form.timeSlotInput.value,
    amount: form.courtAmount.value
  };

  try {
    const res = await fetch('/api/e04/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      sfx.playSuccess();
      showToast(`Đã khởi tạo đơn ${data.order.orderId} & sinh mã VietQR!`);
      closeNewBookingModal();
      loadVietqrOrders();
    }
  } catch (err) {
    showToast('Lỗi tạo đơn', 'danger');
  }
}

// ==========================================
// E04: TRUNG TÂM CỨU ĐƠN (RESCUE ENGINE)
// ==========================================

async function loadUnmatchedTx() {
  try {
    const res = await fetch('/api/e04/unmatched-transactions');
    state.unmatchedTx = await res.json();
    renderUnmatchedTxTable();
  } catch (err) {
    console.error('Lỗi tải giao dịch đối soát:', err);
  }
}

function renderUnmatchedTxTable() {
  const container = document.getElementById('unmatchedTxTableBody');
  container.innerHTML = state.unmatchedTx.map(tx => `
    <tr>
      <td><strong>${tx.bankTransId}</strong></td>
      <td>
        <span class="badge badge-info">${tx.bankName}</span><br>
        <small style="color:var(--text-muted)">${formatDate(tx.transferTime)}</small>
      </td>
      <td style="color:var(--accent-lime); font-weight:800; font-size:1rem;">${formatVND(tx.amount)}</td>
      <td>
        <div style="background:var(--bg-card-hover); padding:0.4rem 0.6rem; border-radius:4px; font-family:monospace; font-size:0.8rem; border-left:3px solid var(--accent-orange);">
          "${tx.rawContent}"
        </div>
        <small style="color:var(--text-secondary)">Từ: ${tx.senderName} (${tx.senderAccount})</small>
      </td>
      <td>
        ${tx.rescueStatus === 'MATCHED' ? 
          `<span class="badge badge-success">✓ ĐÃ CỨU ĐƠN (${tx.matchedWith})</span>` : 
          `<div style="display:flex; flex-direction:column; gap:0.35rem;">
            <span class="badge badge-pending">⚠ CHƯA KHỚP CÚ PHÁP</span>
            <small style="color:var(--accent-lime)">Gợi ý: ${tx.suggestedBookingId}</small>
          </div>`
        }
      </td>
      <td>
        ${tx.rescueStatus === 'PENDING' ? `
          <button class="btn btn-accent" style="padding:0.35rem 0.75rem; font-size:0.78rem;" onclick="openRescueModal('${tx.bankTransId}')">
            ⚡ Cứu Đơn & Duyệt Sân
          </button>
        ` : `<span style="color:var(--text-muted); font-size:0.8rem;">Đã hoàn tất</span>`}
      </td>
    </tr>
  `).join('');
}

let activeRescueTx = null;
function openRescueModal(txId) {
  activeRescueTx = state.unmatchedTx.find(t => t.bankTransId === txId);
  if (!activeRescueTx) return;

  document.getElementById('rescueTxIdDisplay').textContent = activeRescueTx.bankTransId;
  document.getElementById('rescueAmountDisplay').textContent = formatVND(activeRescueTx.amount);
  document.getElementById('rescueRawContentDisplay').textContent = `"${activeRescueTx.rawContent}"`;
  document.getElementById('rescueBookingIdInput').value = activeRescueTx.suggestedBookingId || 'SPORT-BK-8924';
  document.getElementById('rescueReasonInput').value = 'Khách chuyển đúng số tiền nhưng ghi thiếu cú pháp mã đơn';

  document.getElementById('rescueOrderModal').classList.add('active');
}

function closeRescueModal() {
  document.getElementById('rescueOrderModal').classList.remove('active');
}

async function handleConfirmRescue() {
  if (!activeRescueTx) return;
  const bookingId = document.getElementById('rescueBookingIdInput').value.trim();
  const reason = document.getElementById('rescueReasonInput').value.trim();

  if (!bookingId) {
    showToast('Vui lòng nhập mã đơn đặt sân', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/e04/rescue-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankTransId: activeRescueTx.bankTransId,
        bookingId: bookingId,
        rescueReason: reason
      })
    });
    const data = await res.json();
    if (data.success) {
      sfx.playSuccess();
      showToast(`⚡ Cứu đơn thành công! Đơn ${bookingId} đã được khớp và kích hoạt giữ chỗ.`);
      closeRescueModal();
      loadUnmatchedTx();
      loadVietqrOrders();
    }
  } catch (err) {
    showToast('Lỗi cứu đơn', 'danger');
  }
}

// ==========================================
// E04: QUẢN LÝ HOÀN TIỀN (REFUNDS)
// ==========================================

async function loadRefunds() {
  try {
    const res = await fetch('/api/e04/refunds');
    state.refunds = await res.json();
    renderRefundsTable();
  } catch (err) {
    console.error('Lỗi tải hoàn tiền:', err);
  }
}

function renderRefundsTable() {
  const container = document.getElementById('refundsTableBody');
  container.innerHTML = state.refunds.map(r => `
    <tr>
      <td><strong>${r.refundId}</strong></td>
      <td>
        <strong>${r.bookingId}</strong><br>
        <small style="color:var(--text-muted)">${r.customerName} (${r.customerPhone})</small>
      </td>
      <td>${r.reason}</td>
      <td style="color:var(--accent-lime); font-weight:700">${formatVND(r.refundAmount)}</td>
      <td>
        <span class="badge ${r.method === 'VIETQR_REVERSE' ? 'badge-info' : (r.method === 'CASH' ? 'badge-purple' : 'badge-pending')}">
          ${r.method === 'VIETQR_REVERSE' ? 'VietQR Ngược' : (r.method === 'CASH' ? 'Tiền Mặt Quầy' : 'Ví Hội Viên')}
        </span>
      </td>
      <td>
        ${r.status === 'COMPLETED' ? '<span class="badge badge-success">✓ ĐÃ HOÀN TẤT</span>' :
          r.status === 'APPROVED_PENDING_PAYOUT' ? '<span class="badge badge-pending">ĐÃ DUYỆT - CHỜ CHI TIỀN</span>' :
          r.status === 'REJECTED' ? '<span class="badge badge-danger">TỪ CHỐI</span>' :
          '<span class="badge badge-info">CHỜ DUYỆT</span>'}
      </td>
      <td>
        ${r.status === 'APPROVED_PENDING_PAYOUT' || r.status === 'PENDING' ? `
          <button class="btn btn-primary" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="processRefundAction('${r.refundId}', 'APPROVE')">
            Duyệt & Chi tiền
          </button>
          <button class="btn btn-danger" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="processRefundAction('${r.refundId}', 'REJECT')">
            Từ chối
          </button>
        ` : `<small style="color:var(--text-muted)">Đã xử lý</small>`}
      </td>
    </tr>
  `).join('');
}

async function processRefundAction(refundId, action) {
  const refund = state.refunds.find(r => r.refundId === refundId);
  if (!refund) return;

  const note = prompt(action === 'APPROVE' ? 'Nhập ghi chú duyệt hoàn tiền:' : 'Nhập lý do từ chối:');
  if (note === null) return;

  try {
    const res = await fetch('/api/e04/refunds/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refundId, action, approverNote: note })
    });
    const data = await res.json();
    if (data.success) {
      if (action === 'APPROVE') sfx.playSuccess();
      else sfx.playAlert();
      showToast(`Đã ${action === 'APPROVE' ? 'duyệt hoàn tiền' : 'từ chối hoàn tiền'} cho đơn ${refund.bookingId}!`);
      loadRefunds();
    }
  } catch (err) {
    showToast('Lỗi xử lý hoàn tiền', 'danger');
  }
}

// ==========================================
// EPIC E06: QUẦY POS, KHO & CA THU NGÂN
// ==========================================

let activeCategory = 'ALL';

async function loadPosProducts() {
  try {
    const res = await fetch('/api/e06/products');
    state.posProducts = await res.json();
    renderPosProductGrid();
  } catch (err) {
    console.error('Lỗi tải sản phẩm POS:', err);
  }
}

function filterPosCategory(category, btn) {
  activeCategory = category;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderPosProductGrid();
}

function renderPosProductGrid() {
  const grid = document.getElementById('posProductGrid');
  const search = (document.getElementById('posSearchInput')?.value || '').toLowerCase();

  const filtered = state.posProducts.filter(p => {
    const matchesCat = (activeCategory === 'ALL' || p.category === activeCategory);
    const matchesSearch = p.name.toLowerCase().includes(search) || p.barcode.includes(search);
    return matchesCat && matchesSearch;
  });

  const getEmoji = (cat) => {
    switch (cat) {
      case 'BEVERAGE': return '🥤';
      case 'RENTAL': return '🎾';
      case 'EQUIPMENT': return '🏸';
      case 'SNACK': return '🍫';
      case 'COMBO': return '⚡';
      default: return '📦';
    }
  };

  grid.innerHTML = filtered.map(p => {
    const isLow = p.stock <= p.minThreshold;
    const fallbackEmoji = getEmoji(p.category);
    return `
      <div class="pos-product-card" onclick="addToCart('${p.id}')">
        ${isLow ? '<span class="badge badge-danger pos-prd-badge">Sắp hết hàng</span>' : ''}
        <div class="pos-product-image-box">
          <img src="${p.imageUrl || ''}" alt="${p.name}" loading="lazy" 
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="pos-product-image-fallback" style="display:none;">${fallbackEmoji}</div>
        </div>
        <div class="pos-prd-name">${p.name}</div>
        <div class="pos-prd-stock ${isLow ? 'low-stock' : ''}">
          Tồn kho: ${p.stock} ${p.unit}
        </div>
        <div class="pos-prd-price">${formatVND(p.price)}</div>
      </div>
    `;
  }).join('');
}

function addToCart(productId) {
  const prd = state.posProducts.find(p => p.id === productId);
  if (!prd) return;

  if (prd.stock <= 0) {
    sfx.playAlert();
    showToast(`Sản phẩm "${prd.name}" đã hết hàng!`, 'danger');
    return;
  }

  const existing = state.posCart.find(i => i.id === productId);
  if (existing) {
    if (existing.qty >= prd.stock) {
      showToast(`Đã đạt giới hạn tồn kho (${prd.stock} ${prd.unit})!`, 'warning');
      return;
    }
    existing.qty++;
  } else {
    state.posCart.push({
      id: prd.id,
      name: prd.name,
      price: prd.price,
      unit: prd.unit,
      qty: 1
    });
  }

  sfx.playBeep();
  renderCart();
}

function updateCartQty(productId, delta) {
  const item = state.posCart.find(i => i.id === productId);
  const prd = state.posProducts.find(p => p.id === productId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    state.posCart = state.posCart.filter(i => i.id !== productId);
  } else if (prd && item.qty > prd.stock) {
    item.qty = prd.stock;
    showToast(`Số lượng tồn chỉ còn ${prd.stock}!`, 'warning');
  }

  renderCart();
}

function clearCart() {
  state.posCart = [];
  renderCart();
}

let activePaymentMethod = 'CASH';
function setPaymentMethod(method, btn) {
  activePaymentMethod = method;
  document.querySelectorAll('.pm-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const cashHelper = document.getElementById('cashHelperBox');
  if (cashHelper) {
    cashHelper.style.display = (method === 'CASH') ? 'block' : 'none';
  }
}

function renderCart() {
  const container = document.getElementById('cartItemsList');
  const countEl = document.getElementById('cartItemCount');
  const totalEl = document.getElementById('cartTotalDisplay');

  let total = 0;
  let count = 0;

  if (state.posCart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:3rem 1rem; color:var(--text-muted)">
        <div style="font-size:2rem; margin-bottom:0.5rem">🛒</div>
        Chưa có sản phẩm nào trong giỏ.<br>Nhấp vào sản phẩm để chọn.
      </div>
    `;
  } else {
    container.innerHTML = state.posCart.map(i => {
      const lineTotal = i.price * i.qty;
      total += lineTotal;
      count += i.qty;
      return `
        <div class="cart-item-row">
          <div class="cart-item-info">
            <div class="cart-item-name">${i.name}</div>
            <div class="cart-item-unit-price">${formatVND(i.price)} × ${i.qty}</div>
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem">
            <div style="font-weight:700; color:var(--accent-lime); font-size:0.85rem">${formatVND(lineTotal)}</div>
            <div class="cart-qty-ctrl">
              <button class="btn-qty" onclick="updateCartQty('${i.id}', -1)">-</button>
              <span style="font-size:0.8rem; font-weight:700; width:18px; text-align:center">${i.qty}</span>
              <button class="btn-qty" onclick="updateCartQty('${i.id}', 1)">+</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  countEl.textContent = count;
  totalEl.textContent = formatVND(total);
  calcCashChange();
}

function quickCash(amount) {
  const input = document.getElementById('customerCashGiven');
  if (input) {
    input.value = amount;
    calcCashChange();
  }
}

function calcCashChange() {
  const total = state.posCart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const givenInput = document.getElementById('customerCashGiven');
  const changeEl = document.getElementById('cashChangeReturn');
  if (!givenInput || !changeEl) return;

  const given = Number(givenInput.value) || 0;
  const change = Math.max(0, given - total);
  changeEl.textContent = formatVND(change);
  if (given > 0 && given < total) {
    changeEl.textContent = `Thiếu ${formatVND(total - given)}`;
    changeEl.style.color = '#ef4444';
  } else {
    changeEl.style.color = 'var(--accent-lime)';
  }
}

async function handleCheckout() {
  if (state.posCart.length === 0) {
    showToast('Giỏ hàng trống!', 'warning');
    return;
  }

  const total = state.posCart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const payload = {
    items: state.posCart,
    paymentMethod: activePaymentMethod,
    discount: 0,
    customerInfo: 'Khách tại quầy POS'
  };

  try {
    const res = await fetch('/api/e06/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      sfx.playSuccess();
      showToast(`Đã thanh toán đơn POS ${data.order.id} (${formatVND(data.order.total)})!`);
      
      // Show receipt modal
      renderReceipt(data.order);
      
      // Clear cart & update inventory
      state.posCart = [];
      renderCart();
      loadPosProducts();
      loadShiftData();
    } else {
      sfx.playAlert();
      showToast(data.error || 'Lỗi thanh toán', 'danger');
    }
  } catch (err) {
    showToast('Lỗi khi checkout POS', 'danger');
  }
}

function renderReceipt(order) {
  const container = document.getElementById('receiptContent');
  container.innerHTML = `
    <div class="thermal-receipt">
      <div class="receipt-title">TỔ HỢP THỂ THAO SAO VÀNG</div>
      <div class="receipt-sub">GOLDEN STAR SPORTS HUB - QUẦY POS M12<br>Số 88 Sân Vận Động, TP.HCM • Hotline: 1900 8888</div>
      <div class="receipt-divider"></div>
      <div class="receipt-row"><span>Mã hoá đơn:</span><strong>${order.id}</strong></div>
      <div class="receipt-row"><span>Thời gian:</span><span>${formatDate(order.time)}</span></div>
      <div class="receipt-row"><span>Thu ngân:</span><span>${order.cashierName}</span></div>
      <div class="receipt-row"><span>Phương thức:</span><span>${order.paymentMethod}</span></div>
      <div class="receipt-divider"></div>
      <div style="margin: 0.5rem 0;">
        ${order.items.map(item => `
          <div class="receipt-row">
            <span>${item.name} (x${item.qty})</span>
            <strong>${formatVND(item.price * item.qty)}</strong>
          </div>
        `).join('')}
      </div>
      <div class="receipt-divider"></div>
      <div class="receipt-row" style="font-size: 0.95rem; font-weight: 900;">
        <span>TỔNG CỘNG:</span>
        <span style="color: #000;">${formatVND(order.total)}</span>
      </div>
      <div class="receipt-divider"></div>
      <div style="text-align:center; font-size: 0.72rem; color: #444; margin-top:0.5rem;">
        Cảm ơn quý khách đã luyện tập & ủng hộ!<br>Hẹn gặp lại quý khách!
      </div>
    </div>
  `;
  document.getElementById('receiptModal').classList.add('active');
}

function closeReceiptModal() {
  document.getElementById('receiptModal').classList.remove('active');
}

// ==========================================
// E06: QUẢN LÝ KHO (INVENTORY M12)
// ==========================================

async function loadInventory() {
  try {
    const res = await fetch('/api/e06/products');
    state.posProducts = await res.json();
    renderInventoryTable();
  } catch (err) {
    console.error('Lỗi tải kho:', err);
  }
}

function renderInventoryTable() {
  const tbody = document.getElementById('inventoryTableBody');
  const alertCountEl = document.getElementById('lowStockCountBadge');

  let lowCount = 0;
  tbody.innerHTML = state.posProducts.map(p => {
    const isLow = p.stock <= p.minThreshold;
    if (isLow) lowCount++;
    return `
      <tr>
        <td><code>${p.barcode}</code></td>
        <td><strong>${p.name}</strong></td>
        <td><span class="badge badge-info">${p.category}</span></td>
        <td>${formatVND(p.cost)}</td>
        <td style="color:var(--accent-lime); font-weight:700">${formatVND(p.price)}</td>
        <td style="font-weight:800; font-size:1rem; ${isLow ? 'color:#ef4444' : 'color:#fff'}">
          ${p.stock} ${p.unit}
        </td>
        <td>${p.minThreshold} ${p.unit}</td>
        <td>
          ${isLow ? '<span class="badge badge-danger">⚠ SẮP HẾT HÀNG</span>' : '<span class="badge badge-success">ĐỦ HÀNG</span>'}
        </td>
        <td>
          <button class="btn btn-secondary" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="openStockAdjustModal('${p.id}')">
            ⚡ Điều chỉnh / Nhập
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (alertCountEl) alertCountEl.textContent = `${lowCount} mặt hàng`;
}

let activeAdjustProduct = null;
function openStockAdjustModal(prdId) {
  activeAdjustProduct = state.posProducts.find(p => p.id === prdId);
  if (!activeAdjustProduct) return;

  document.getElementById('adjustPrdName').textContent = activeAdjustProduct.name;
  document.getElementById('adjustPrdCurrentStock').textContent = `${activeAdjustProduct.stock} ${activeAdjustProduct.unit}`;
  document.getElementById('adjustQtyInput').value = 10;
  document.getElementById('stockAdjustModal').classList.add('active');
}
function closeStockAdjustModal() {
  document.getElementById('stockAdjustModal').classList.remove('active');
}

async function handleStockAdjustSubmit(e) {
  e.preventDefault();
  if (!activeAdjustProduct) return;

  const type = document.getElementById('adjustTypeSelect').value;
  const qty = document.getElementById('adjustQtyInput').value;
  const reason = document.getElementById('adjustReasonInput').value;

  try {
    const res = await fetch('/api/e06/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: activeAdjustProduct.id,
        type,
        quantity: qty,
        reason
      })
    });
    const data = await res.json();
    if (data.success) {
      sfx.playSuccess();
      showToast(`Đã điều chỉnh tồn kho cho ${activeAdjustProduct.name}!`);
      closeStockAdjustModal();
      loadInventory();
      loadPosProducts();
    }
  } catch (err) {
    showToast('Lỗi điều chỉnh kho', 'danger');
  }
}

// ==========================================
// E06: CA THU NGÂN & KÉT TIỀN
// ==========================================

async function loadShiftData() {
  try {
    const res = await fetch('/api/e06/shift/current');
    const data = await res.json();
    state.currentShift = data.currentShift;
    state.shiftHistory = data.history;

    renderShiftView();
  } catch (err) {
    console.error('Lỗi tải dữ liệu ca:', err);
  }
}

function renderShiftView() {
  const s = state.currentShift;
  if (!s) return;

  document.getElementById('shiftIdDisplay').textContent = s.shiftId;
  document.getElementById('shiftNameDisplay').textContent = s.shiftName;
  document.getElementById('shiftCashierDisplay').textContent = s.cashierName;
  const staffIdEl = document.getElementById('shiftStaffIdDisplay');
  if (staffIdEl) staffIdEl.textContent = `Mã NV: ${s.cashierStaffId || 'NV-HUYEN-06'}`;
  document.getElementById('shiftOpenedAtDisplay').textContent = formatDate(s.openedAt);

  document.getElementById('shiftInitialCashDisplay').textContent = formatVND(s.initialCash);
  document.getElementById('shiftCashSalesDisplay').textContent = formatVND(s.cashSales);
  document.getElementById('shiftVietqrSalesDisplay').textContent = formatVND(s.vietqrSales);
  document.getElementById('shiftCardSalesDisplay').textContent = formatVND(s.cardPosSales);
  document.getElementById('shiftExpectedCashDisplay').textContent = formatVND(s.expectedCashInDrawer);

  // Render Owner Inspection Box (Cổng Chủ Tổ Hợp Kiểm Tra)
  renderOwnerInspectionBox();

  // Render History Table
  renderShiftHistoryTable();
}

function renderOwnerInspectionBox() {
  const box = document.getElementById('ownerInspectionBox');
  if (!box) return;

  // Find most recent pending shift or last shift
  const pendingShift = state.shiftHistory.find(h => h.ownerAuditStatus === 'PENDING_OWNER_AUDIT');
  const latestShift = pendingShift || state.shiftHistory[0];

  if (!latestShift) {
    box.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:1rem;">Chưa có biên bản bàn giao ca nào cần kiểm tra.</div>`;
    return;
  }

  const isPending = (latestShift.ownerAuditStatus === 'PENDING_OWNER_AUDIT');
  const isApproved = (latestShift.ownerAuditStatus === 'OWNER_APPROVED');
  const isFlagged = (latestShift.ownerAuditStatus === 'FLAGGED_DISCREPANCY');

  box.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
      <div>
        <div style="font-size:0.75rem; color:var(--text-muted)">Biên bản ca gần nhất cần kiểm tra:</div>
        <div style="font-size:1.05rem; font-weight:800; color:#fff;">
          ${latestShift.shiftName} (${latestShift.shiftId})
        </div>
        <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">
          Thu ngân giao: <strong style="color:var(--accent-lime)">${latestShift.cashierName}</strong> ➔ Người nhận bàn giao: <strong style="color:#38bdf8">${latestShift.handoverTo || 'Đặng Minh Quân (Ca Chiều 12:00 - 18:00)'}</strong>
        </div>
      </div>
      <div>
        ${isPending ? `<span class="badge badge-pending" style="font-size:0.8rem; padding:0.3rem 0.6rem;">⏱ CHỜ CHỦ KIỂM TRA & DUYỆT</span>` :
          isApproved ? `<span class="badge badge-success" style="font-size:0.8rem; padding:0.3rem 0.6rem;">✓ CHỦ ĐÃ XÁC NHẬN</span>` :
          `<span class="badge badge-danger" style="font-size:0.8rem; padding:0.3rem 0.6rem;">⚠ CẢNH BÁO BẤT THƯỜNG</span>`}
      </div>
    </div>

    <div class="grid-4" style="margin-bottom:0.85rem;">
      <div style="background:var(--bg-card-inner); padding:0.6rem; border-radius:6px;">
        <small style="color:var(--text-muted)">Tiền Lý Thuyết Sổ Sách:</small>
        <div style="font-weight:700; color:#fff;">${formatVND(latestShift.expectedCash)}</div>
      </div>
      <div style="background:var(--bg-card-inner); padding:0.6rem; border-radius:6px;">
        <small style="color:var(--text-muted)">Tiền Mặt Thực Kiểm:</small>
        <div style="font-weight:800; color:var(--accent-lime);">${formatVND(latestShift.actualCashCounted)}</div>
      </div>
      <div style="background:var(--bg-card-inner); padding:0.6rem; border-radius:6px;">
        <small style="color:var(--text-muted)">Chênh Lệch Két:</small>
        <div style="font-weight:700; color:${latestShift.difference === 0 ? 'var(--accent-lime)' : '#ef4444'}">
          ${latestShift.difference === 0 ? 'Khớp 100% (0 đ)' : (latestShift.difference > 0 ? `Thừa +${formatVND(latestShift.difference)}` : `Thiếu -${formatVND(Math.abs(latestShift.difference))}`)}
        </div>
      </div>
      <div style="background:var(--bg-card-inner); padding:0.6rem; border-radius:6px;">
        <small style="color:var(--text-muted)">Doanh Thu VietQR + Thẻ:</small>
        <div style="font-weight:700; color:#38bdf8;">${formatVND((latestShift.vietqrTotal || 0) + (latestShift.cardPosTotal || 0))}</div>
      </div>
    </div>

    <div style="font-size:0.78rem; color:var(--text-secondary); background:rgba(255,255,255,0.03); padding:0.5rem; border-radius:4px; margin-bottom:0.75rem;">
      <strong>Ghi chú bàn giao:</strong> "${latestShift.note || 'Không có ghi chú'}"<br>
      ${latestShift.ownerAuditNotes ? `<span style="color:#fdba74"><strong>Ý kiến của Chủ:</strong> ${latestShift.ownerAuditNotes}</span>` : ''}
    </div>

    <!-- Chủ Action Buttons -->
    <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
      ${isPending ? `
        <button class="btn btn-primary" onclick="handleOwnerAudit('${latestShift.shiftId}', 'APPROVE')">
          ✓ Chủ Xác Nhận & Phê Duyệt Két Tiền
        </button>
        <button class="btn btn-danger" onclick="handleOwnerAudit('${latestShift.shiftId}', 'FLAG')">
          ⚠ Yêu Cầu Giải Trình Nghi Vấn
        </button>
      ` : `
        <button class="btn btn-secondary" onclick="handleOwnerAudit('${latestShift.shiftId}', 'APPROVE')">
          📝 Cập Nhật Ý Kiến Của Chủ
        </button>
      `}
    </div>
  `;
}

function renderShiftHistoryTable() {
  const historyTbody = document.getElementById('shiftHistoryTableBody');
  if (!historyTbody) return;

  historyTbody.innerHTML = state.shiftHistory.map(h => {
    const isApproved = h.ownerAuditStatus === 'OWNER_APPROVED';
    const isPending = h.ownerAuditStatus === 'PENDING_OWNER_AUDIT';
    const isFlagged = h.ownerAuditStatus === 'FLAGGED_DISCREPANCY';

    return `
      <tr>
        <td><strong>${h.shiftId}</strong></td>
        <td>
          <strong>${h.shiftName}</strong><br>
          <small style="color:var(--text-muted)">${formatDate(h.openedAt)} - ${formatDate(h.closedAt)}</small>
        </td>
        <td>
          <div style="color:var(--accent-lime); font-weight:700;">${h.cashierName}</div>
          <small style="color:var(--text-muted)">${h.cashierStaffId || ''}</small>
        </td>
        <td>
          <div style="color:#38bdf8; font-weight:700;">${h.handoverTo || 'Chưa chỉ định'}</div>
        </td>
        <td style="color:var(--accent-lime); font-weight:800; font-size:0.95rem;">${formatVND(h.actualCashCounted)}</td>
        <td>
          ${h.difference === 0 ? '<span class="badge badge-success">✓ CÂN BẰNG (0đ)</span>' :
            h.difference > 0 ? `<span class="badge badge-pending">THỪA +${formatVND(h.difference)}</span>` :
            `<span class="badge badge-danger">THIẾU -${formatVND(Math.abs(h.difference))}</span>`}
        </td>
        <td>
          ${isApproved ? '<span class="badge badge-success">✓ CHỦ ĐÃ XÁC NHẬN</span>' :
            isPending ? '<span class="badge badge-pending">⏱ CHỜ CHỦ DUYỆT</span>' :
            isFlagged ? '<span class="badge badge-danger">⚠ CHỦ CẢNH BÁO LỆCH</span>' :
            '<span class="badge badge-info">ĐANG TRỰC BAN</span>'}
        </td>
        <td>
          ${isPending ? `
            <button class="btn btn-primary" style="padding:0.25rem 0.55rem; font-size:0.75rem;" onclick="handleOwnerAudit('${h.shiftId}', 'APPROVE')">
              Chủ Duyệt
            </button>
            <button class="btn btn-danger" style="padding:0.25rem 0.55rem; font-size:0.75rem;" onclick="handleOwnerAudit('${h.shiftId}', 'FLAG')">
              Bắt lỗi
            </button>
          ` : `
            <small style="color:var(--text-muted)">Đã kiểm tra</small>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

// Close shift Modal
function openCloseShiftModal() {
  const s = state.currentShift;
  document.getElementById('modalExpectedCash').textContent = formatVND(s.expectedCashInDrawer);
  calcDenominations();
  document.getElementById('closeShiftModal').classList.add('active');
}
function closeCloseShiftModal() {
  document.getElementById('closeShiftModal').classList.remove('active');
}

const denominations = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000];

// Tự động điền mẫu kiểm đếm két tiền khớp chính xác 100% bao gồm cả tiền lẻ 5k, 2k, 1k
function quickFillMatchedDenominations() {
  const sampleBreakdown = {
    500000: 4, // 2,000,000 đ
    200000: 3, //   600,000 đ
    100000: 3, //   300,000 đ
    50000: 1,  //    50,000 đ
    20000: 1,  //    20,000 đ
    10000: 0,  //         0 đ
    5000: 1,   //     5,000 đ (Tiền thối lẻ thể thao)
    2000: 2,   //     4,000 đ (Tiền thối lẻ thể thao)
    1000: 1    //     1,000 đ (Tiền thối lẻ thể thao)
  }; // Tổng cộng: 2,980,000 đ (Khớp 100% tiền lý thuyết của Cáp Nguyễn Thanh Huyền)

  denominations.forEach(val => {
    const input = document.getElementById(`denom_${val}`);
    if (input) input.value = sampleBreakdown[val] !== undefined ? sampleBreakdown[val] : 0;
  });
  calcDenominations();
  showToast('Đã điền kiểm đếm đầy đủ 9 mệnh giá (từ 500k đến 1k) khớp 100% két!');
}

function calcDenominations() {
  let totalCounted = 0;
  const breakdown = {};

  denominations.forEach(val => {
    const input = document.getElementById(`denom_${val}`);
    const count = Number(input?.value) || 0;
    const sub = val * count;
    totalCounted += sub;
    breakdown[val] = count;
    const label = document.getElementById(`denom_total_${val}`);
    if (label) label.textContent = formatVND(sub);
  });

  const countedEl = document.getElementById('modalCountedCash');
  const diffEl = document.getElementById('modalDiffCash');
  const expected = state.currentShift.expectedCashInDrawer;
  const diff = totalCounted - expected;

  countedEl.textContent = formatVND(totalCounted);
  if (diff === 0) {
    diffEl.textContent = 'Khớp hoàn toàn (0 đ)';
    diffEl.style.color = 'var(--accent-lime)';
  } else if (diff > 0) {
    diffEl.textContent = `Thừa két: +${formatVND(diff)}`;
    diffEl.style.color = '#f59e0b';
  } else {
    diffEl.textContent = `Thiếu két: -${formatVND(Math.abs(diff))}`;
    diffEl.style.color = '#ef4444';
  }
}

async function handleConfirmCloseShift() {
  let totalCounted = 0;
  const breakdown = {};
  denominations.forEach(val => {
    const count = Number(document.getElementById(`denom_${val}`)?.value) || 0;
    totalCounted += val * count;
    breakdown[val] = count;
  });

  const targetSelect = document.getElementById('handoverTargetSelect');
  const handoverShiftCode = targetSelect?.value || 'CA_CHIEU';
  const handoverToStaff = targetSelect?.options[targetSelect.selectedIndex]?.dataset?.name || 'Đặng Minh Quân (Ca Chiều 12:00 - 18:00)';
  const note = document.getElementById('closeShiftNote')?.value || 'Cáp Nguyễn Thanh Huyền bàn giao ca';

  try {
    const res = await fetch('/api/e06/shift/handover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countedCash: totalCounted,
        cashBreakdown: breakdown,
        handoverToStaff,
        handoverShiftCode,
        note
      })
    });
    const data = await res.json();
    if (data.success) {
      sfx.playSuccess();
      showToast(`⚡ Cáp Nguyễn Thanh Huyền đã bàn giao ca thành công cho ${handoverToStaff}! Đang gửi Chủ tổ hợp kiểm tra.`);
      closeCloseShiftModal();
      loadShiftData();
      loadAuditLogs();
    }
  } catch (err) {
    showToast('Lỗi bàn giao ca', 'danger');
  }
}

// Chủ Tổ Hợp Kiểm Tra & Duyệt Ca
async function handleOwnerAudit(shiftId, action) {
  let note = '';
  if (action === 'APPROVE') {
    note = prompt('Nhập ý kiến phê duyệt của Chủ (Hoàng Đình Dũng):', 'Chủ tổ hợp Hoàng Đình Dũng: Đã kiểm tra số dư khớp, duyệt đóng ca thành công.');
  } else {
    note = prompt('Nhập lý do Chủ phát hiện bất thường / yêu cầu giải trình:', 'Phát hiện chênh lệch tiền mặt thực kiểm so với camera, yêu cầu thu ngân giải trình!');
  }
  if (note === null) return;

  try {
    const res = await fetch('/api/e06/shift/owner-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shiftId,
        action,
        ownerNotes: note
      })
    });
    const data = await res.json();
    if (data.success) {
      if (action === 'APPROVE') sfx.playSuccess();
      else sfx.playAlert();
      showToast(`Chủ tổ hợp đã ${action === 'APPROVE' ? 'PHÊ DUYỆT' : 'ĐÁNH DẤU BẤT THƯỜNG'} ca ${shiftId}!`);
      loadShiftData();
      loadAuditLogs();
    }
  } catch (err) {
    showToast('Lỗi khi Chủ kiểm tra ca', 'danger');
  }
}

// ==========================================
// EPIC E16: BÁO CÁO & KIỂM TOÁN (M17)
// ==========================================

async function loadDashboard() {
  try {
    const res = await fetch('/api/e16/reports/dashboard');
    state.dashboardData = await res.json();
    renderDashboardView(state.dashboardData);
  } catch (err) {
    console.error('Lỗi tải Dashboard M17:', err);
  }
}

function renderDashboardView(data) {
  if (!data) return;
  document.getElementById('kpiTodayRevenue').textContent = formatVND(data.kpis.totalRevenueToday);
  document.getElementById('kpiTodayBookings').textContent = data.kpis.totalBookingsToday;
  document.getElementById('kpiOccupancyRate').textContent = `${data.kpis.avgOccupancyRate}%`;
  document.getElementById('kpiLowStock').textContent = data.kpis.lowStockCount;

  // Render 7-day Trend Bar Chart
  renderTrendChart(data.sevenDayTrend);

  // Render Channel Breakdown
  renderChannelBreakdown(data.channelBreakdown);

  // Render Payment Methods
  renderPaymentMethods(data.paymentBreakdown);
}

function renderTrendChart(trendData) {
  const container = document.getElementById('trendChartContainer');
  if (!container) return;

  const maxRev = Math.max(...trendData.map(t => t.revenue));
  container.innerHTML = `
    <div style="display:flex; align-items:flex-end; justify-content:space-between; height:200px; padding-top:20px; gap:8px;">
      ${trendData.map(t => {
        const heightPct = Math.round((t.revenue / maxRev) * 160);
        return `
          <div style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
            <div style="font-size:0.68rem; color:var(--text-muted); margin-bottom:4px;">${Math.round(t.revenue / 1000000)}Tr</div>
            <div style="width:100%; max-width:42px; height:${heightPct}px; background:linear-gradient(180deg, var(--accent-lime) 0%, rgba(34,197,94,0.3) 100%); border-radius:4px 4px 0 0; transition:height 0.3s ease; box-shadow:0 0 10px rgba(156,255,147,0.15);"></div>
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:6px; font-weight:600;">${t.date.split(' ')[0]}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderChannelBreakdown(channels) {
  const container = document.getElementById('channelBreakdownContainer');
  if (!container) return;

  container.innerHTML = channels.map(c => `
    <div style="margin-bottom:0.75rem">
      <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:0.3rem">
        <span>${c.channel}</span>
        <strong>${formatVND(c.amount)} (${c.percentage}%)</strong>
      </div>
      <div style="background:var(--bg-card-inner); height:8px; border-radius:4px; overflow:hidden">
        <div style="background:${c.color}; width:${c.percentage}%; height:100%; border-radius:4px"></div>
      </div>
    </div>
  `).join('');
}

function renderPaymentMethods(payments) {
  const container = document.getElementById('paymentMethodsContainer');
  if (!container) return;

  container.innerHTML = payments.map(p => `
    <div class="app-card-inner" style="margin-bottom:0.6rem; display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:0.6rem;">
        <span style="font-size:1.3rem;">${p.icon === 'qr' ? '⚡' : (p.icon === 'cash' ? '💵' : '💳')}</span>
        <div>
          <div style="font-size:0.85rem; font-weight:700;">${p.method}</div>
          <small style="color:var(--text-muted)">Chiếm tỷ trọng: ${p.percentage}%</small>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:800; color:var(--accent-lime); font-size:0.95rem">${formatVND(p.amount)}</div>
      </div>
    </div>
  `).join('');
}

// Occupancy Heatmap
async function loadOccupancy() {
  try {
    const res = await fetch('/api/e16/reports/occupancy');
    state.occupancyData = await res.json();
    renderHeatmap();
  } catch (err) {
    console.error('Lỗi tải Heatmap:', err);
  }
}

function renderHeatmap() {
  const data = state.occupancyData;
  if (!data) return;

  document.getElementById('peakHourDisplay').textContent = data.peakHoursSummary.peakSlot;
  document.getElementById('offPeakHourDisplay').textContent = data.peakHoursSummary.offPeakSlot;
  document.getElementById('pricingStrategyDisplay').textContent = data.peakHoursSummary.recommendation;

  const table = document.getElementById('heatmapTable');
  let headerHtml = '<tr><th>Ngày / Khung giờ</th>';
  data.hours.forEach(h => {
    headerHtml += `<th>${h}</th>`;
  });
  headerHtml += '</tr>';

  let rowsHtml = '';
  data.days.forEach((day, dayIdx) => {
    rowsHtml += `<tr><td style="font-weight:700; font-size:0.75rem; color:#fff; white-space:nowrap; padding:0.4rem 0.6rem;">${day}</td>`;
    data.hours.forEach(hourStr => {
      const cellData = data.heatmap.find(item => item.dayIdx === dayIdx && item.hour === hourStr);
      const rate = cellData ? cellData.occupancyRate : 0;
      const booked = cellData ? cellData.bookedCourts : 0;

      // Color interpolation: dark forest (#142817) -> intense neon lime (#4ade80) -> golden yellow (#eab308)
      let bg = '#142817';
      let textColor = '#6ee7b7';
      if (rate >= 85) {
        bg = '#22c55e';
        textColor = '#0c0f0c';
      } else if (rate >= 65) {
        bg = '#15803d';
        textColor = '#f0fdf4';
      } else if (rate >= 40) {
        bg = '#14532d';
        textColor = '#bbf7d0';
      }

      rowsHtml += `
        <td>
          <div class="heatmap-cell" style="background:${bg}; color:${textColor}" 
               title="${day} lúc ${hourStr}: Đã đặt ${booked}/16 sân (${rate}%)"
               onclick="showToast('${day} ${hourStr}: Đã đặt ${booked}/16 sân (${rate}%)')">
            ${rate}%
          </div>
        </td>
      `;
    });
    rowsHtml += '</tr>';
  });

  table.innerHTML = headerHtml + rowsHtml;
}

// Audit Logs
async function loadAuditLogs() {
  const epic = document.getElementById('auditFilterEpic')?.value || 'ALL';
  const severity = document.getElementById('auditFilterSeverity')?.value || 'ALL';
  const search = document.getElementById('auditSearchInput')?.value || '';

  try {
    const res = await fetch(`/api/e16/audit-logs?epic=${epic}&severity=${severity}&search=${encodeURIComponent(search)}`);
    state.auditLogs = await res.json();
    renderAuditLogsTable();
  } catch (err) {
    console.error('Lỗi tải Audit Logs:', err);
  }
}

function renderAuditLogsTable() {
  const tbody = document.getElementById('auditLogsTableBody');
  tbody.innerHTML = state.auditLogs.map(log => {
    let sevBadge = 'badge-info';
    if (log.severity === 'SUCCESS') sevBadge = 'badge-success';
    if (log.severity === 'WARNING') sevBadge = 'badge-pending';
    if (log.severity === 'CRITICAL') sevBadge = 'badge-danger';

    return `
      <tr>
        <td><code>${log.id}</code></td>
        <td><small>${formatDate(log.timestamp)}</small></td>
        <td><span class="badge ${log.epic === 'E04' ? 'badge-info' : (log.epic === 'E06' ? 'badge-purple' : 'badge-success')}">${log.epic}</span></td>
        <td><span class="badge ${sevBadge}">${log.action}</span></td>
        <td><strong>${log.actor}</strong></td>
        <td>
          ${log.detail}
          ${log.metadata ? `<details style="margin-top:0.25rem; font-size:0.75rem;"><summary style="color:var(--text-muted); cursor:pointer">Chi tiết JSON</summary><pre style="background:var(--bg-card-inner); padding:0.4rem; border-radius:4px; margin-top:0.25rem;">${JSON.stringify(log.metadata, null, 2)}</pre></details>` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function exportAuditCsv() {
  if (state.auditLogs.length === 0) {
    showToast('Không có dữ liệu để xuất', 'warning');
    return;
  }
  const headers = ['Mã Log', 'Thời gian', 'Phân hệ', 'Hành động', 'Người thực hiện', 'Chi tiết'];
  const rows = state.auditLogs.map(l => [
    l.id,
    l.timestamp,
    l.epic,
    l.action,
    `"${l.actor}"`,
    `"${l.detail.replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Nhat_ky_kiem_toan_M17_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('Đã xuất file đối soát kiểm toán CSV thành công!');
}

// Initializer on window load
window.addEventListener('DOMContentLoaded', () => {
  // Update live clock and dynamic day of week / date
  const updateLiveTime = () => {
    const el = document.getElementById('liveClock');
    const badgeEl = document.getElementById('liveDayOfWeekBadge');
    const now = new Date();
    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = daysOfWeek[now.getDay()];
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const timeFormatted = now.toLocaleTimeString('vi-VN');
    const isWeekend = (now.getDay() === 0 || now.getDay() === 6);

    if (el) {
      el.textContent = `${dayName}, ${dateFormatted} • ${timeFormatted}`;
    }
    if (badgeEl) {
      badgeEl.innerHTML = `${dayName}, ${dateFormatted} ${isWeekend ? '<strong style="color:#fdba74"> • Cuối tuần đông khách (Mở ca gãy)</strong>' : ' • Ngày thường (3 Ca chính)'}`;
    }
  };
  updateLiveTime();
  setInterval(updateLiveTime, 1000);

  // Sound toggle button
  const soundBtn = document.getElementById('toggleSoundBtn');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      sfx.enabled = !sfx.enabled;
      soundBtn.textContent = sfx.enabled ? '🔊' : '🔇';
      showToast(sfx.enabled ? 'Đã bật hiệu ứng âm thanh quầy' : 'Đã tắt âm thanh');
    });
  }

  // Initial load
  switchEpic('E04');
});
