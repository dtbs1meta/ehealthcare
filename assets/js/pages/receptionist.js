// eHealthCare - JS tách từ receptionist.html

// ==================== SESSION & AUTH ====================
const rawUser = sessionStorage.getItem('user');
const user = rawUser ? JSON.parse(rawUser) : { role: 'receptionist', maNV: 'NV001', HoTen: 'Lễ tân demo' };
if (user && user.role && user.role !== 'receptionist') {
  window.location.href = 'index.html';
}
const CURRENT_NV_ID = user?.maNV || user?.MaNV || 'NV001';
const API_BASE = 'http://localhost:3000';

// ==================== DATA FROM DATABASE ====================
let selectedRoom = null;
let rooms = [];
let queue = [];
let patients = [];
let refreshTimer = null;

// ==================== API HELPERS ====================
async function apiRequest(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let data = null;
  try { data = await response.json(); } catch (_) { data = null; }

  if (!response.ok) {
    const message = data?.message || data?.error || `Lỗi API ${response.status}`;
    throw new Error(message);
  }
  return data;
}

async function apiTry(paths, options = {}) {
  let lastError = null;
  for (const path of paths) {
    try { return await apiRequest(path, options); }
    catch (err) { lastError = err; }
  }
  throw lastError;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[ch]));
}

function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('vi-VN');
}

function calcAge(dateValue) {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return new Date().getFullYear() - d.getFullYear();
}

function getPriorityNumber(value) {
  const text = String(value || '').toLowerCase();
  if (text.includes('cấp cứu')) return 1;
  if (text.includes('trẻ') || text.includes('cao tuổi') || text.includes('người già') || text.includes('nguoi gia')) return 2;
  return 3;
}

function getPriorityLabel(priority) {
  if (priority === 1) return 'P1 - Cấp cứu';
  if (priority === 2) return 'P2 - Ưu tiên';
  return 'P3 - Bình thường';
}

function getStatusText(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'WAITING') return 'Chờ';
  if (s === 'CALLED') return 'Đang gọi';
  if (s === 'DONE') return 'Hoàn tất';
  if (s === 'SKIPPED') return 'Bỏ qua';
  if (s === 'CANCELLED') return 'Đã hủy';
  return status || '---';
}

function getStatusClass(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'WAITING') return 'waiting';
  if (s === 'CALLED') return 'serving';
  if (s === 'DONE') return 'done';
  return 'skip';
}

function normalizeRoom(room) {
  return {
    MaPhongKham: room.MaPhongKham || room.id || room.maPhongKham,
    MaHangDoi: room.MaHangDoi || room.maHangDoi,
    TenPhongKham: room.TenPhongKham || room.tenPhongKham || room.TenCK || room.dept || 'Phòng khám',
    SoPhong: room.SoPhong || room.soPhong || room.room || room.MaPhongKham,
    TenCK: room.TenCK || room.tenChuyenKhoa || room.dept || '',
    HoTenBacSi: room.HoTenBacSi || room.BacSi || room.doctor || '---',
    TrangThaiHoatDong: room.TrangThaiHoatDong !== false && room.TrangThaiHoatDong !== 0
  };
}

function normalizeQueueItem(item) {
  const priority = getPriorityNumber(item.LoaiUuTien || item.priorityLabel);
  const maThe = item.MaThe || item.id || item.MaSoThuTu;
  const soThuTu = item.SoThuTu || item.STT || item.stt || '';
  const room = rooms.find(r => r.MaHangDoi === item.MaHangDoi || r.MaPhongKham === item.MaPhongKham);
  const prefix = room?.TenCK?.includes('Tim') ? 'TM' : room?.TenCK?.includes('Thần') ? 'TK' : room?.TenCK?.includes('Da') ? 'DL' : room?.TenCK?.includes('Tai') ? 'TMH' : 'A';

  return {
    raw: item,
    MaThe: maThe,
    MaBN: item.MaBN,
    MaHangDoi: item.MaHangDoi,
    MaPhongKham: item.MaPhongKham || room?.MaPhongKham,
    SoThuTu: Number(soThuTu) || 0,
    stt: item.SoHieu || `${prefix}-${String(soThuTu).padStart(3, '0')}`,
    name: item.HoTen || item.name || 'Chưa có tên',
    dob: item.NgaySinh || item.dob,
    yob: item.NgaySinh ? new Date(item.NgaySinh).getFullYear() : item.yob,
    gender: item.GioiTinh || item.gender || '',
    phone: item.SDT || item.phone || '',
    priority,
    priorityLabel: item.LoaiUuTien || getPriorityLabel(priority),
    symptom: item.TrieuChung || item.GhiChu || item.symptom || '',
    room: item.SoPhong || room?.SoPhong || item.MaPhongKham || item.MaHangDoi || '',
    dept: item.TenPhongKham || item.TenCK || room?.TenPhongKham || room?.TenCK || '',
    doctor: item.HoTenBacSi || room?.HoTenBacSi || '',
    waitCount: item.SoLanVangMat || item.WaitCount || 0,
    status: String(item.TrangThaiThe || item.status || 'WAITING').toUpperCase(),
    time: item.ThoiGianCap
  };
}

function uniqueQueueRows(list) {
  const seen = new Map();
  (list || []).forEach(item => {
    const key = item.MaThe || `${item.MaBN || ''}-${item.MaHangDoi || item.MaPhongKham || ''}-${item.SoThuTu || ''}-${item.ThoiGianCap || ''}`;
    if (!seen.has(key)) seen.set(key, item);
  });
  return Array.from(seen.values());
}

function normalizePatient(item) {
  const q = queue.find(x => x.MaBN === item.MaBN);
  return {
    MaBN: item.MaBN,
    HoTen: item.HoTen || 'Chưa có tên',
    NgaySinh: item.NgaySinh,
    GioiTinh: item.GioiTinh || '',
    SDT: item.SDT || '',
    Email: item.Email || '',
    DiaChi: item.DiaChi || '',
    LoaiUuTien: item.LoaiUuTien || 'Bình thường',
    TrangThaiThe: item.TrangThaiThe || q?.status || '',
    SoThuTu: item.SoThuTu || q?.SoThuTu || '',
    MaThe: item.MaThe || q?.MaThe || '',
    MaPhongKham: item.MaPhongKham || q?.MaPhongKham || '',
    TenPhongKham: item.TenPhongKham || q?.dept || '',
    SoPhong: item.SoPhong || q?.room || ''
  };
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('dashTime').textContent = new Date().toLocaleString('vi-VN');
  await loadAllData();
  refreshTimer = setInterval(loadAllData, 10000);
});

window.addEventListener('beforeunload', () => {
  if (refreshTimer) clearInterval(refreshTimer);
});

async function loadAllData() {
  try {
    await loadRooms();
    await loadQueue();
    await loadPatients();
    renderRooms();
    renderQueue();
    renderPriority();
    renderTransfer();
    renderDSBN();
    updateStats();
    populateSelects();
    document.getElementById('dashTime').textContent = new Date().toLocaleString('vi-VN');
  } catch (err) {
    console.error(err);
    showToast('Lỗi tải dữ liệu từ database: ' + err.message, 'error');
  }
}

async function loadRooms() {
  const data = await apiTry(['/api/receptionist/rooms', '/api/phong-kham']);
  const mappedRooms = (Array.isArray(data) ? data : []).map(normalizeRoom);
  const seenRooms = new Set();
  rooms = mappedRooms.filter(room => {
    const key = room.MaPhongKham || room.SoPhong;
    if (!key) return true;
    if (seenRooms.has(key)) return false;
    seenRooms.add(key);
    return true;
  });
}

async function loadQueue() {
  const data = await apiTry(['/api/receptionist/queue', '/api/doctor/queue', '/api/sothutu']);
  queue = uniqueQueueRows((Array.isArray(data) ? data : []).map(normalizeQueueItem));
}

async function loadPatients() {
  const data = await apiTry(['/api/receptionist/patients', '/api/benhnhan']);
  patients = (Array.isArray(data) ? data : []).map(normalizePatient);
}

function populateSelects() {
  const fillRoomSelect = (id, includeEmpty = false) => {
    const s = document.getElementById(id);
    if (!s) return;
    const current = s.value;
    s.innerHTML = (includeEmpty ? '<option value="">-- Chọn phòng --</option>' : '') +
      rooms.map(r => `<option value="${escapeAttr(r.MaPhongKham)}">P${escapeHtml(r.SoPhong)} - ${escapeHtml(r.TenPhongKham)} (${escapeHtml(r.HoTenBacSi)})</option>`).join('');
    if (current) s.value = current;
  };

  fillRoomSelect('chuyen-room', true);
  fillRoomSelect('ins-room', true);

  const sttSel = document.getElementById('chuyen-stt');
  if (sttSel) {
    const current = sttSel.value;
    const data = queue.filter(q => ['WAITING', 'CALLED', 'SKIPPED'].includes(q.status));
    sttSel.innerHTML = '<option value="">-- Chọn STT --</option>' +
      data.map(q => `<option value="${escapeAttr(q.MaThe)}">${escapeHtml(q.stt)} - ${escapeHtml(q.name)}</option>`).join('');
    if (current) sttSel.value = current;
    sttSel.onchange = updateTransferDoctorInfo;
  }
  updateTransferDoctorInfo();
}

function updateTransferDoctorInfo() {
  const maThe = document.getElementById('chuyen-stt')?.value;
  const q = queue.find(x => x.MaThe === maThe);
  const input = document.getElementById('chuyen-bsht');
  if (input) input.value = q ? `${q.doctor || '---'} / ${q.dept || '---'}` : '';
}

// ==================== NAV ====================
function showPage(pageId, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
  if (btn) {
    document.querySelectorAll('.sidebar-link').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  if (pageId === 'dashboard') updateStats();
  if (pageId === 'queue') renderQueue();
  if (pageId === 'priority') renderPriority();
  if (pageId === 'doipk') { renderTransfer(); populateSelects(); }
  if (pageId === 'danhsachbn') renderDSBN();
}

// ==================== STATS ====================
function updateStats() {
  const todayQueue = uniqueQueueRows(queue);
  const waiting = uniqueQueueRows(queue).filter(s => s.status === 'WAITING');
  const p1 = waiting.filter(s => s.priority === 1).length;
  const p2 = waiting.filter(s => s.priority === 2).length;

  document.getElementById('stat-total').textContent = todayQueue.length;
  document.getElementById('stat-p1').textContent = p1;
  document.getElementById('stat-p2').textContent = p2;
  document.getElementById('stat-wait').textContent = waiting.length;
  document.getElementById('queueCount').textContent = waiting.length;

  const dash = document.getElementById('dashQueue');
  if (!waiting.length) {
    dash.innerHTML = '<div class="empty-state">Không có bệnh nhân đang chờ</div>';
    return;
  }

  dash.innerHTML = computeQueueOrder(waiting).slice(0, 5).map(q => `
    <div class="queue-item">
      <div class="queue-priority p${q.priority}">${q.priority}</div>
      <div class="queue-info">
        <div class="queue-name">${escapeHtml(q.name)}</div>
        <div class="queue-meta">${escapeHtml(q.stt)} · ${escapeHtml(q.dept || '---')} · Phòng ${escapeHtml(q.room || '---')}</div>
      </div>
      <div class="queue-stt">${escapeHtml(q.stt)}</div>
      <span class="badge badge-waiting">Đang chờ</span>
    </div>`).join('');
}

// ==================== ROOMS ====================
function renderRooms() {
  const g = document.getElementById('roomGrid');
  if (!rooms.length) {
    g.innerHTML = '<div class="empty-state">Chưa có dữ liệu phòng khám từ database</div>';
    return;
  }
  g.innerHTML = rooms.map(r => `
    <div class="room-card ${selectedRoom === r.MaPhongKham ? 'selected' : ''}" onclick="selectRoom('${escapeAttr(r.MaPhongKham)}')">
      <div class="room-num">${escapeHtml(r.SoPhong)}</div>
      <div class="room-dept">${escapeHtml(r.TenPhongKham)}</div>
      <div style="font-size:12px;color:var(--text-sub);margin-top:4px;">${escapeHtml(r.HoTenBacSi)}</div>
      <div class="room-status ${r.TrangThaiHoatDong ? 'free' : 'busy'}">${r.TrangThaiHoatDong ? '🟢 Hoạt động' : '🔴 Tạm dừng'}</div>
    </div>`).join('');
}

function selectRoom(id) {
  selectedRoom = id;
  renderRooms();
}

// ==================== CAP SO THU TU ====================
async function capSoThuTu() {
  const name = document.getElementById('cs-name').value.trim();
  const dob = document.getElementById('cs-dob').value;
  const phone = document.getElementById('cs-phone').value.trim();
  const gender = document.getElementById('cs-gender').value;
  const priority = document.getElementById('cs-priority').value;
  const symptom = document.getElementById('cs-symptom').value.trim();

  if (!name || !dob || !phone) {
    showToast('Vui lòng nhập đầy đủ thông tin bắt buộc!', 'error');
    return;
  }
  if (!selectedRoom) {
    showToast('Vui lòng chọn phòng khám!', 'error');
    return;
  }

  try {
    const result = await apiRequest('/api/receptionist/ticket', {
      method: 'POST',
      body: JSON.stringify({
        HoTen: name,
        NgaySinh: dob,
        GioiTinh: gender,
        SDT: phone,
        LoaiUuTien: priority,
        TrieuChung: symptom,
        MaPhongKham: selectedRoom,
        MaNV: CURRENT_NV_ID
      })
    });

    const ticket = result.ticket || result;
    const patient = result.patient || result.benhNhan || {};
    const room = result.room || rooms.find(r => r.MaPhongKham === selectedRoom) || {};
    const sttText = result.sttText || ticket.SoHieu || `${ticket.SoThuTu || ''}`;

    document.getElementById('ticketPreview').style.display = 'block';
    document.getElementById('ticketNum').textContent = sttText;
    document.getElementById('ticketInfo').innerHTML = `${escapeHtml(name || patient.HoTen || '')}<br>${escapeHtml(room.TenPhongKham || '')} - Phòng ${escapeHtml(room.SoPhong || '')}<br>Ưu tiên: ${escapeHtml(patient.LoaiUuTien || priority)}`;

    showToast(`Cấp STT ${sttText} thành công!`, 'success');
    document.getElementById('cs-name').value = '';
    document.getElementById('cs-dob').value = '';
    document.getElementById('cs-phone').value = '';
    document.getElementById('cs-symptom').value = '';
    await loadAllData();
  } catch (err) {
    showToast('Không cấp được số thứ tự: ' + err.message, 'error');
  }
}

// ==================== PRIORITY QUEUE ALGORITHM ====================
function computeQueueOrder(waiting) {
  const p1 = waiting.filter(s => s.priority === 1).sort((a,b) => a.SoThuTu - b.SoThuTu);
  const p2 = waiting.filter(s => s.priority === 2).sort((a,b) => a.SoThuTu - b.SoThuTu);
  const p3 = waiting.filter(s => s.priority === 3).sort((a,b) => a.SoThuTu - b.SoThuTu);
  const starvingP3 = p3.filter(s => (s.waitCount || 0) >= 5);
  const normalP3 = p3.filter(s => (s.waitCount || 0) < 5);

  const interleaved = [];
  let p2i = 0, p3i = 0;
  while (p2i < p2.length || p3i < normalP3.length) {
    if (p2i < p2.length) interleaved.push(p2[p2i++]);
    if (p2i < p2.length) interleaved.push(p2[p2i++]);
    if (p3i < normalP3.length) interleaved.push(normalP3[p3i++]);
  }
  return [...p1, ...starvingP3, ...interleaved];
}

function getWaitTime(idx) {
  const minsPerPatient = 15;
  const totalMins = idx * minsPerPatient;
  if (totalMins < 60) return `~${totalMins} phút`;
  return `~${Math.floor(totalMins/60)} giờ ${totalMins%60} phút`;
}

// ==================== RENDER QUEUE ====================
function renderQueue() {
  const search = (document.getElementById('queueSearch')?.value || '').toLowerCase();
  const filter = document.getElementById('queueFilter')?.value || 'all';
  const c = document.getElementById('queueList');
  let data = uniqueQueueRows(queue).filter(q => q.status === 'WAITING' || q.status === 'CALLED');
  if (filter !== 'all') data = data.filter(q => q.priority === parseInt(filter));
  if (search) data = data.filter(q => q.name.toLowerCase().includes(search) || q.stt.toLowerCase().includes(search) || q.phone.includes(search));
  data = computeQueueOrder(data);

  if (!data.length) {
    c.innerHTML = '<div class="empty-state">Không có bệnh nhân nào</div>';
    return;
  }

  c.innerHTML = data.map((q, idx) => `
    <div class="queue-item">
      <div class="queue-priority p${q.priority}">${q.priority}</div>
      <div class="queue-info">
        <div class="queue-name">${escapeHtml(q.name)} <span style="font-weight:400;color:var(--text-muted);">(${escapeHtml(calcAge(q.dob) || '')}t)</span></div>
        <div class="queue-meta">${escapeHtml(q.stt)} · ${escapeHtml(q.dept || '---')} · Phòng ${escapeHtml(q.room || '---')} · ${escapeHtml(q.symptom || '')}</div>
        ${q.waitCount > 0 ? '<div style="font-size:11px;color:var(--warning);">Vắng/bỏ qua ' + q.waitCount + ' lần</div>' : ''}
      </div>
      <div class="queue-wait">${getWaitTime(idx)}</div>
      <div class="action-btns">
        <button class="btn btn-primary btn-sm" onclick="callPatient('${escapeAttr(q.MaThe)}')">📢 Gọi</button>
        <button class="btn btn-outline btn-sm" onclick="skipPatient('${escapeAttr(q.MaThe)}')">⏭️ Bỏ qua</button>
      </div>
    </div>`).join('');
}

function renderPriority() {
  const c = document.getElementById('priorityList');
  const data = computeQueueOrder(uniqueQueueRows(queue).filter(q => q.status === 'WAITING')); 
  if (!data.length) {
    c.innerHTML = '<tr><td colspan="7" class="empty-state">Không có bệnh nhân ưu tiên</td></tr>';
    return;
  }
  c.innerHTML = data.map((q, idx) => `
    <tr>
      <td><strong>${escapeHtml(q.stt)}</strong></td>
      <td>${escapeHtml(q.name)}</td>
      <td>${escapeHtml(calcAge(q.dob) || '')}</td>
      <td><span class="badge badge-p${q.priority}">${escapeHtml(getPriorityLabel(q.priority))}</span></td>
      <td style="font-weight:700;color:var(--p${q.priority});">${q.priority}</td>
      <td>${escapeHtml(q.symptom || q.priorityLabel || '')}</td>
      <td>${getWaitTime(idx)}</td>
    </tr>`).join('');
}

// ==================== QUEUE ACTIONS ====================
async function nextPatient() {
  try {
    const waiting = uniqueQueueRows(queue).filter(q => q.status === 'WAITING');
    if (!waiting.length) {
      showToast('Không có bệnh nhân đang chờ!', 'warning');
      return;
    }
    const result = await apiTry(['/api/receptionist/call-next', '/api/doctor/next'], { method: 'PUT' });
    const patient = result.patient || result;
    showToast(`Đã gọi bệnh nhân ${patient.HoTen || patient.name || ''}`, 'success');
    await loadAllData();
  } catch (err) {
    showToast('Không gọi được bệnh nhân tiếp theo: ' + err.message, 'error');
  }
}

async function callPatient(maThe) {
  if (!maThe) return;
  try {
    const q = queue.find(x => x.MaThe === maThe);
    await apiTry([
      `/api/receptionist/call/${encodeURIComponent(maThe)}`,
      `/api/receptionist/ticket/${encodeURIComponent(maThe)}/status`
    ], {
      method: 'PUT',
      body: JSON.stringify({ TrangThaiThe: 'CALLED' })
    });
    showToast(`Gọi bệnh nhân ${q?.name || ''} - STT ${q?.stt || ''}`, 'success');
    await loadAllData();
  } catch (err) {
    showToast('Không gọi được bệnh nhân: ' + err.message, 'error');
  }
}

async function skipPatient(maThe) {
  if (!maThe) return;
  try {
    const q = queue.find(x => x.MaThe === maThe);
    await apiTry([
      `/api/receptionist/skip/${encodeURIComponent(maThe)}`,
      `/api/receptionist/ticket/${encodeURIComponent(maThe)}/status`
    ], {
      method: 'PUT',
      body: JSON.stringify({ TrangThaiThe: 'SKIPPED' })
    });
    showToast(`Đã bỏ qua ${q?.name || ''} - STT ${q?.stt || ''}`, 'warning');
    await loadAllData();
  } catch (err) {
    showToast('Không bỏ qua được bệnh nhân: ' + err.message, 'error');
  }
}

function insertPatient() {
  populateSelects();
  openModal('modal-insert');
}

async function confirmInsert() {
  const name = document.getElementById('ins-name').value.trim();
  const yob = parseInt(document.getElementById('ins-yob').value);
  const roomId = document.getElementById('ins-room').value;
  const level = parseInt(document.getElementById('ins-level').value);
  const reason = document.getElementById('ins-reason').value.trim();
  if (!name || !yob || !roomId) {
    showToast('Vui lòng nhập đầy đủ!', 'error');
    return;
  }

  try {
    const priority = level === 1 ? 'Cấp cứu' : 'Trẻ em';
    const result = await apiRequest('/api/receptionist/ticket', {
      method: 'POST',
      body: JSON.stringify({
        HoTen: name,
        NgaySinh: `${yob}-01-01`,
        GioiTinh: 'Khác',
        SDT: null,
        LoaiUuTien: priority,
        TrieuChung: reason || 'Chen hàng khẩn',
        MaPhongKham: roomId,
        MaNV: CURRENT_NV_ID
      })
    });
    closeModal('modal-insert');
    showToast(`Đã chen hàng ${name} - STT ${result.sttText || result.ticket?.SoThuTu || ''}`, 'success');
    document.getElementById('ins-name').value = '';
    document.getElementById('ins-yob').value = '';
    document.getElementById('ins-reason').value = '';
    await loadAllData();
  } catch (err) {
    showToast('Không chen hàng được: ' + err.message, 'error');
  }
}

// ==================== CHUYEN BAC SI ====================
async function chuyenBacSi() {
  const maThe = document.getElementById('chuyen-stt').value;
  const roomId = document.getElementById('chuyen-room').value;
  const reason = document.getElementById('chuyen-lydo').value;
  const note = document.getElementById('chuyen-ghichu').value;
  if (!maThe || !roomId) {
    showToast('Vui lòng chọn STT và phòng!', 'error');
    return;
  }

  try {
    await apiRequest(`/api/receptionist/transfer/${encodeURIComponent(maThe)}`, {
      method: 'PUT',
      body: JSON.stringify({ MaPhongKham: roomId, LyDo: reason, GhiChu: note })
    });
    showToast('Đã chuyển bệnh nhân sang phòng mới', 'success');
    document.getElementById('chuyen-ghichu').value = '';
    await loadAllData();
  } catch (err) {
    showToast('Không chuyển được bệnh nhân: ' + err.message, 'error');
  }
}

async function treoTrangThai() {
  const maThe = document.getElementById('chuyen-stt').value;
  if (!maThe) {
    showToast('Vui lòng chọn STT!', 'error');
    return;
  }

  try {
    await apiTry([
      `/api/receptionist/skip/${encodeURIComponent(maThe)}`,
      `/api/receptionist/ticket/${encodeURIComponent(maThe)}/status`
    ], {
      method: 'PUT',
      body: JSON.stringify({ TrangThaiThe: 'SKIPPED' })
    });
    showToast('Đã treo/bỏ qua trạng thái bệnh nhân', 'warning');
    await loadAllData();
  } catch (err) {
    showToast('Không treo được trạng thái: ' + err.message, 'error');
  }
}

function renderTransfer() {
  const c = document.getElementById('transferList');
  const data = queue.filter(q => q.status === 'SKIPPED' || q.status === 'CANCELLED');
  if (!data.length) {
    c.innerHTML = '<div class="empty-state">Không có bệnh nhân treo/skipped</div>';
    return;
  }
  c.innerHTML = data.map(q => `
    <div class="queue-item">
      <div class="queue-priority p${q.priority}">${q.priority}</div>
      <div class="queue-info"><div class="queue-name">${escapeHtml(q.name)}</div><div class="queue-meta">${escapeHtml(q.stt)} · ${escapeHtml(q.dept || '')} · Phòng ${escapeHtml(q.room || '')}</div></div>
      <span class="badge badge-skip">${escapeHtml(getStatusText(q.status))}</span>
      <button class="btn btn-primary btn-sm" onclick="resumePatient('${escapeAttr(q.MaThe)}')">▶️ Tiếp tục</button>
    </div>`).join('');
}

async function resumePatient(maThe) {
  if (!maThe) return;
  try {
    await apiTry([
      `/api/receptionist/resume/${encodeURIComponent(maThe)}`,
      `/api/receptionist/ticket/${encodeURIComponent(maThe)}/status`
    ], {
      method: 'PUT',
      body: JSON.stringify({ TrangThaiThe: 'WAITING' })
    });
    showToast('Đã đưa bệnh nhân trở lại hàng đợi', 'success');
    await loadAllData();
  } catch (err) {
    showToast('Không khôi phục được bệnh nhân: ' + err.message, 'error');
  }
}

// ==================== DANH SACH BN ====================
function renderDSBN() {
  const search = (document.getElementById('bnSearch')?.value || '').toLowerCase();
  const filter = document.getElementById('bnFilter')?.value || 'all';
  const c = document.getElementById('dsbnList');

  let data = patients;
  if (filter !== 'all') {
    data = data.filter(p => {
      const st = String(p.TrangThaiThe || '').toUpperCase();
      if (filter === 'waiting') return st === 'WAITING' || st === 'CALLED';
      if (filter === 'done') return st === 'DONE';
      return true;
    });
  }
  if (search) {
    data = data.filter(p =>
      p.HoTen.toLowerCase().includes(search) ||
      String(p.SDT || '').includes(search) ||
      String(p.MaBN || '').toLowerCase().includes(search)
    );
  }

  if (!data.length) {
    c.innerHTML = '<tr><td colspan="7" class="empty-state">Không có bệnh nhân</td></tr>';
    return;
  }

  c.innerHTML = data.map(p => `
    <tr>
      <td>${escapeHtml(p.MaBN)}</td>
      <td>${escapeHtml(p.HoTen)}</td>
      <td>${escapeHtml(formatDate(p.NgaySinh))}</td>
      <td>${escapeHtml(p.GioiTinh)}</td>
      <td>${escapeHtml(p.SDT)}</td>
      <td>${escapeHtml(p.SoPhong ? 'Phòng ' + p.SoPhong : '')} ${escapeHtml(p.TenPhongKham || '')}</td>
      <td><span class="badge badge-${getStatusClass(p.TrangThaiThe)}">${escapeHtml(getStatusText(p.TrangThaiThe))}</span></td>
    </tr>`).join('');
}

// ==================== MODAL ====================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if(e.target===o) o.classList.remove('open'); }));

// ==================== TOAST ====================
function showToast(msg, type) {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.innerHTML = '<div>' + escapeHtml(msg) + '</div>';
  c.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}
