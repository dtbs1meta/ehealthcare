/**
 * eHealthCare Mock Database & API Layer v3.0
 * Simulates a REST API using localStorage with cross-tab synchronization.
 * Maps exactly to SQL schema: QuanLyKham_HoanChinh.sql
 * 
 * FIXED: All PKs now match SQL schema (VARCHAR with prefixes)
 * FIXED: Complete API endpoints for all 3 roles
 * FIXED: Cross-tab broadcast with proper event handlers
 * FIXED: Seed data matches SQL sample data
 */

const DB_TABLES = [
  'ChuyenKhoa', 'PhongKham', 'BenhNhan', 'NhanVien', 'BacSi',
  'HoSoYTe', 'HangDoi', 'SoThuTu', 'LichKham', 'LichLamViec',
  'DonDangKy', 'PhieuTiepNhan', 'PhieuKhamBenh', 'Thuoc',
  'DonThuoc', 'ChiTietDonThuoc', 'TheBHYT', 'TaiKhoanWeb', 'ThongBao'
];

// PK mapping - matches SQL schema exactly
const PK_MAP = {
  'ChuyenKhoa': 'MaCK',
  'PhongKham': 'MaPhongKham',
  'BenhNhan': 'MaBN',
  'NhanVien': 'MaNV',
  'BacSi': 'MaBS',
  'HoSoYTe': 'MaHS',
  'HangDoi': 'MaHangDoi',
  'SoThuTu': 'MaThe',
  'LichKham': 'MaLich',
  'LichLamViec': 'MaLich',
  'DonDangKy': 'MaDK',
  'PhieuTiepNhan': 'MaPhieuTN',
  'PhieuKhamBenh': 'MaPK',
  'Thuoc': 'MaThuoc',
  'DonThuoc': 'MaDT',
  'ChiTietDonThuoc': 'MaCTDT',
  'TheBHYT': 'MaBHYT',
  'TaiKhoanWeb': 'MaTK',
  'ThongBao': 'MaThongBao'
};

// Prefix mapping for auto-generated IDs
const ID_PREFIX = {
  'ChuyenKhoa': 'CK',
  'PhongKham': 'PK',
  'BenhNhan': 'BN',
  'NhanVien': 'NV',
  'BacSi': 'BS',
  'HoSoYTe': 'HS',
  'HangDoi': 'HD',
  'SoThuTu': 'THE',
  'LichKham': 'LK',
  'LichLamViec': 'LLV',
  'DonDangKy': 'DK',
  'PhieuTiepNhan': 'PTN',
  'PhieuKhamBenh': 'PK',
  'Thuoc': 'T',
  'DonThuoc': 'DT',
  'ChiTietDonThuoc': 'CT',
  'TheBHYT': 'BH',
  'TaiKhoanWeb': 'TK',
  'ThongBao': 'TB'
};

// Helper: extract numeric part from ID (e.g., "CK01" -> 1, "BN001" -> 1)
function extractNumber(id) {
  if (!id) return 0;
  const match = String(id).match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

// Helper: generate next ID with proper zero-padding
function generateNextId(table) {
  const prefix = ID_PREFIX[table] || 'ID';
  const data = DB.get(table);
  const pk = PK_MAP[table] || 'id';

  if (data.length === 0) {
    // Return first ID based on table's typical format
    if (table === 'BenhNhan' || table === 'NhanVien' || table === 'BacSi' || 
        table === 'HoSoYTe' || table === 'TheBHYT' || table === 'TaiKhoanWeb') {
      return prefix + '001';
    }
    return prefix + '01';
  }

  const maxNum = Math.max(...data.map(r => extractNumber(r[pk])));
  const nextNum = maxNum + 1;

  // Determine padding based on table
  if (table === 'BenhNhan' || table === 'NhanVien' || table === 'BacSi' || 
      table === 'HoSoYTe' || table === 'TheBHYT' || table === 'TaiKhoanWeb') {
    return prefix + String(nextNum).padStart(3, '0');
  }
  return prefix + String(nextNum).padStart(2, '0');
}

const DB = {
  get: (table) => {
    try {
      const data = localStorage.getItem(`db_${table}`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`DB.get error for ${table}:`, e);
      return [];
    }
  },
  set: (table, data) => {
    try {
      localStorage.setItem(`db_${table}`, JSON.stringify(data));
    } catch (e) {
      console.error(`DB.set error for ${table}:`, e);
    }
  },
  insert: (table, row) => {
    const data = DB.get(table);
    const pk = PK_MAP[table] || 'id';

    // If no ID provided, generate one
    if (!row[pk]) {
      row[pk] = generateNextId(table);
    }

    // Check for duplicate
    const exists = data.find(r => String(r[pk]) === String(row[pk]));
    if (exists) {
      console.warn(`Duplicate PK ${row[pk]} in ${table}, skipping insert`);
      return exists;
    }

    data.push(row);
    DB.set(table, data);
    return row;
  },
  update: (table, pkField, pkVal, updates) => {
    const data = DB.get(table);
    const index = data.findIndex(r => String(r[pkField]) === String(pkVal));
    if (index !== -1) {
      data[index] = { ...data[index], ...updates };
      DB.set(table, data);
      return data[index];
    }
    return null;
  },
  delete: (table, pkField, pkVal) => {
    const data = DB.get(table);
    const filtered = data.filter(r => String(r[pkField]) !== String(pkVal));
    DB.set(table, filtered);
  },
  find: (table, pkField, pkVal) => {
    return DB.get(table).find(r => String(r[pkField]) === String(pkVal));
  },
  findAll: (table, field, val) => {
    return DB.get(table).filter(r => String(r[field]) === String(val));
  },
  broadcast: (event, data) => {
    const key = `ehealth_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const payload = JSON.stringify({ event, data, timestamp: Date.now() });
    try {
      localStorage.setItem(key, payload);
      setTimeout(() => {
        try { localStorage.removeItem(key); } catch (e) {}
      }, 10000);
    } catch (e) {
      console.error('Broadcast error:', e);
    }
  }
};

// Cross-tab event listener
function initCrossTabSync() {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('ehealth_event_')) {
      try {
        const payload = JSON.parse(e.newValue);
        if (payload && payload.event && window.handleCrossTabEvent) {
          window.handleCrossTabEvent(payload.event, payload.data);
        }
      } catch (err) {
        // Ignore parse errors
      }
    }
  });
}
// ==================== DATA INTEGRITY CHECK ====================

function checkDataIntegrity() {
  // Kiểm tra các bảng bắt buộc phải có dữ liệu
  const requiredTables = ['ChuyenKhoa', 'PhongKham', 'BacSi', 'BenhNhan', 'HangDoi', 'NhanVien', 'HoSoYTe', 'Thuoc'];
  for (const table of requiredTables) {
    const data = DB.get(table);
    if (!data || data.length === 0) {
      console.warn(`⚠️ Bảng ${table} trống hoặc không tồn tại - cần reseed`);
      return false;
    }
  }
  
  // Kiểm tra quan hệ: mỗi phòng khám phải có hàng đợi
  const phongKham = DB.get('PhongKham');
  const hangDoi = DB.get('HangDoi');
  for (const pk of phongKham) {
    const hasQueue = hangDoi.some(h => h.MaPhongKham === pk.MaPhongKham);
    if (!hasQueue) {
      console.warn(`⚠️ Phòng ${pk.MaPhongKham} không có hàng đợi - cần reseed`);
      return false;
    }
  }
  
  // Kiểm tra phiên bản data structure
  const currentVersion = 'v3.1';
  const savedVersion = localStorage.getItem('db_schema_version');
  if (savedVersion !== currentVersion) {
    console.warn(`⚠️ Schema version mismatch: ${savedVersion} vs ${currentVersion} - cần reseed`);
    return false;
  }
  
  return true;
}

function forceReseedOnNextLoad() {
  localStorage.setItem('db_force_reseed', 'true');
  console.log('🔄 Will reseed on next load');
}

// Expose recovery function globally
window.forceReseedOnNextLoad = forceReseedOnNextLoad;
window.checkDataIntegrity = checkDataIntegrity;
// ==================== API LAYER ====================

const API = {
  get: async (endpoint) => {
    console.log(`API GET: ${endpoint}`);
    const url = new URL(endpoint, window.location.origin);
    const params = url.searchParams;

    // ===== CHUYEN KHOA =====
    if (endpoint.includes('/api/chuyen-khoa')) {
      const maCK = params.get('maCK');
      let result = DB.get('ChuyenKhoa').filter(ck => ck.TrangThai === 'Hoạt động');
      if (maCK) result = result.filter(ck => ck.MaCK === maCK);
      return result;
    }

    // ===== PHONG KHAM =====
    if (endpoint.includes('/api/phong-kham')) {
      const maCK = params.get('maCK');
      const maPhongKham = params.get('maPhongKham');
      let rooms = DB.get('PhongKham').filter(pk => pk.TrangThaiHoatDong === 1 || pk.TrangThaiHoatDong === '1');
      if (maCK) rooms = rooms.filter(pk => pk.MaCK === maCK);
      if (maPhongKham) rooms = rooms.filter(pk => pk.MaPhongKham === maPhongKham);
      return rooms;
    }

    // ===== BAC SI =====
    if (endpoint.includes('/api/bac-si')) {
      const maCK = params.get('maCK');
      const ngay = params.get('ngay');
      const maBS = params.get('maBS');
      let bacSis = DB.get('BacSi');

      if (maBS) bacSis = bacSis.filter(bs => bs.MaBS === maBS);
      if (maCK) bacSis = bacSis.filter(bs => bs.MaCK === maCK);

      return bacSis.map(bs => {
        const phong = DB.get('PhongKham').find(p => p.MaPhongKham === bs.MaPhongKham);
        const hd = phong ? DB.get('HangDoi').find(h => h.MaPhongKham === phong.MaPhongKham) : null;
        return {
          ...bs,
          TenPhongKham: phong?.TenPhongKham,
          SoPhong: phong?.SoPhong,
          SoLuongDangCho: hd?.SoLuongDangCho || 0,
          MaHangDoi: hd?.MaHangDoi
        };
      }).filter(bs => {
        if (!ngay) return true;
        return DB.get('LichLamViec').some(l => l.MaBS === bs.MaBS && l.NgayLamViec === ngay);
      });
    }

    // ===== BENH NHAN =====
    if (endpoint.match(/\/api\/benh-nhan\/[^\/]+\/ho-so$/)) {
      const maBN = endpoint.split('/')[3];
      const bn = DB.get('BenhNhan').find(b => b.MaBN === maBN);
      if (!bn) return { error: 'Not found' };
      return {
        info: bn,
        medical: DB.get('HoSoYTe').find(hs => hs.MaBN === maBN),
        records: DB.get('PhieuKhamBenh').filter(pk => pk.MaBN === maBN),
        bhyt: DB.get('TheBHYT').find(bh => bh.MaBN === maBN),
        account: DB.get('TaiKhoanWeb').find(tk => tk.MaBN === maBN)
      };
    }

    if (endpoint.match(/\/api\/benh-nhan\/[^\/]+$/)) {
      const maBN = endpoint.split('/').pop();
      return DB.get('BenhNhan').find(b => b.MaBN === maBN);
    }

    if (endpoint.includes('/api/benh-nhan')) {
      const q = params.get('q')?.toLowerCase();
      let result = DB.get('BenhNhan');
      if (q) {
        result = result.filter(bn =>
          (bn.HoTen && bn.HoTen.toLowerCase().includes(q)) ||
          (bn.SDT && bn.SDT.includes(q)) ||
          (bn.MaBN && bn.MaBN.toLowerCase().includes(q.toLowerCase()))
        );
      }
      return result;
    }

    // ===== THUOC =====
    if (endpoint.includes('/api/thuoc')) {
      const q = params.get('q')?.toLowerCase();
      return DB.get('Thuoc').filter(t => 
        !q || (t.TenThuoc && t.TenThuoc.toLowerCase().includes(q))
      );
    }

    // ===== HANG DOI / QUEUE STATUS =====
    if (endpoint.includes('/api/hang-doi/trang-thai')) {
      const maBN = params.get('maBN');
      if (!maBN) return { error: 'Missing maBN' };

      const stt = DB.get('SoThuTu').find(s => 
        s.MaBN === maBN && s.TrangThaiThe === 'WAITING'
      );
      if (!stt) return { error: 'Not in queue' };

      const currentCalled = DB.get('SoThuTu').find(s => 
        s.TrangThaiThe === 'CALLED' && s.MaHangDoi === stt.MaHangDoi
      );
      const waitingList = DB.get('SoThuTu').filter(s =>
        s.MaHangDoi === stt.MaHangDoi &&
        extractNumber(s.SoThuTu) < extractNumber(stt.SoThuTu) &&
        s.TrangThaiThe === 'WAITING'
      );

      return {
        soThuTuCuaBN: stt.SoThuTu,
        soThuTuDangGoi: currentCalled ? currentCalled.SoThuTu : null,
        soNguoiTruocBan: waitingList.length,
        uocTinhPhut: waitingList.length * 15,
        trangThai: stt.TrangThaiThe,
        maHangDoi: stt.MaHangDoi
      };
    }

    // ===== THONG BAO =====
    if (endpoint.includes('/api/thong-bao')) {
      const maBN = params.get('maBN');
      const unread = params.get('unread');
      let notifs = DB.get('ThongBao');
      if (maBN) notifs = notifs.filter(t => t.MaBN === maBN);
      if (unread === 'true') notifs = notifs.filter(t => !t.TrangThaiGui || t.TrangThaiGui === 0 || t.TrangThaiGui === false);
      return notifs.sort((a, b) => new Date(b.ThoiGianGui || 0) - new Date(a.ThoiGianGui || 0));
    }

    // ===== LICH KHAM =====
    if (endpoint.includes('/api/lich-kham')) {
      const maBN = params.get('maBN');
      const trangThai = params.get('trangThai');
      const maLich = endpoint.match(/\/api\/lich-kham\/([^\/]+)$/);

      if (maLich) {
        return DB.get('LichKham').find(l => l.MaLich === maLich[1]);
      }

      let result = DB.get('LichKham');
      if (maBN) result = result.filter(l => l.MaBN === maBN);
      if (trangThai) result = result.filter(l => l.TrangThai === trangThai);
      return result.sort((a, b) => new Date(b.NgayGio || 0) - new Date(a.NgayGio || 0));
    }

    // ===== LICH LAM VIEC =====
    if (endpoint.includes('/api/lich-lam-viec')) {
      const maBS = params.get('maBS');
      const ngay = params.get('ngay');
      let result = DB.get('LichLamViec');
      if (maBS) result = result.filter(l => l.MaBS === maBS);
      if (ngay) result = result.filter(l => l.NgayLamViec === ngay);
      return result;
    }

    // ===== DON DANG KY =====
    if (endpoint.includes('/api/don-dang-ky')) {
      const maBN = params.get('maBN');
      const trangThai = params.get('trangThai');
      let result = DB.get('DonDangKy');
      if (maBN) result = result.filter(d => d.MaBN === maBN);
      if (trangThai) result = result.filter(d => d.TrangThai === trangThai);
      return result;
    }

    // ===== PHIEU KHAM BENH =====
    if (endpoint.includes('/api/phieu-kham')) {
      const maBN = params.get('maBN');
      const maBS = params.get('maBS');
      let result = DB.get('PhieuKhamBenh');
      if (maBN) result = result.filter(p => p.MaBN === maBN);
      if (maBS) result = result.filter(p => p.MaBS === maBS);
      return result.sort((a, b) => new Date(b.NgayKham || 0) - new Date(a.NgayKham || 0));
    }

    // ===== DON THUOC =====
    if (endpoint.includes('/api/don-thuoc')) {
      const maPK = params.get('maPK');
      const maBS = params.get('maBS');
      let result = DB.get('DonThuoc');
      if (maPK) result = result.filter(d => d.MaPK === maPK);
      if (maBS) {
        const pkIds = DB.get('PhieuKhamBenh').filter(p => p.MaBS === maBS).map(p => p.MaPK);
        result = result.filter(d => pkIds.includes(d.MaPK));
      }
      return result;
    }

    // ===== CHI TIET DON THUOC =====
    if (endpoint.includes('/api/chi-tiet-don-thuoc')) {
      const maDT = params.get('maDT');
      let result = DB.get('ChiTietDonThuoc');
      if (maDT) result = result.filter(c => c.MaDT === maDT);
      return result;
    }

    // ===== PHIEU TIEP NHAN =====
    if (endpoint.includes('/api/phieu-tiep-nhan')) {
      const maBN = params.get('maBN');
      let result = DB.get('PhieuTiepNhan');
      if (maBN) result = result.filter(p => p.MaBN === maBN);
      return result;
    }

    // ===== SEARCH =====
    if (endpoint.includes('/api/search')) {
      const q = params.get('q')?.toLowerCase();
      const type = params.get('type') || 'all';
      const results = { patients: [], medicines: [], records: [] };

      if (type === 'all' || type === 'patient') {
        results.patients = DB.get('BenhNhan').filter(bn =>
          !q || (bn.HoTen && bn.HoTen.toLowerCase().includes(q)) ||
          (bn.SDT && bn.SDT.includes(q)) ||
          (bn.MaBN && bn.MaBN.toLowerCase().includes(q))
        );
      }
      if (type === 'all' || type === 'medicine') {
        results.medicines = DB.get('Thuoc').filter(t =>
          !q || (t.TenThuoc && t.TenThuoc.toLowerCase().includes(q))
        );
      }
      if (type === 'all' || type === 'record') {
        results.records = DB.get('PhieuKhamBenh').filter(pk =>
          !q || (pk.ChuanDoan && pk.ChuanDoan.toLowerCase().includes(q)) ||
          (pk.TrieuChung && pk.TrieuChung.toLowerCase().includes(q))
        );
      }
      return results;
    }

    // ===== HANG DOI (full queue for a room) =====
    if (endpoint.includes('/api/hang-doi')) {
      const maHangDoi = params.get('maHangDoi');
      if (maHangDoi) {
        return DB.get('SoThuTu').filter(s => s.MaHangDoi === maHangDoi && s.TrangThaiThe === 'WAITING');
      }
      return DB.get('HangDoi');
    }

    // ===== NHAN VIEN =====
    if (endpoint.includes('/api/nhan-vien')) {
      const maNV = params.get('maNV');
      if (maNV) return DB.get('NhanVien').find(n => n.MaNV === maNV);
      return DB.get('NhanVien');
    }

    // ===== HO SO Y TE =====
    if (endpoint.includes('/api/ho-so-yte')) {
      const maBN = params.get('maBN');
      let result = DB.get('HoSoYTe');
      if (maBN) result = result.filter(h => h.MaBN === maBN);
      return result;
    }

    // ===== THE BHYT =====
    if (endpoint.includes('/api/the-bhyt')) {
      const maBN = params.get('maBN');
      let result = DB.get('TheBHYT');
      if (maBN) result = result.filter(t => t.MaBN === maBN);
      return result;
    }

    return [];
  },

  post: async (endpoint, body) => {
    console.log(`API POST: ${endpoint}`, body);
    let result;

    if (endpoint.includes('/api/lich-kham')) {
      result = DB.insert('LichKham', body);
      DB.broadcast('lich_kham_created', result);
    } 
    else if (endpoint.includes('/api/don-dang-ky')) {
      result = DB.insert('DonDangKy', body);
      DB.broadcast('don_dang_ky_created', result);
    } 
    else if (endpoint.includes('/api/phieu-tiep-nhan')) {
      result = DB.insert('PhieuTiepNhan', body);
    } 
    else if (endpoint.includes('/api/so-thu-tu')) {
      result = DB.insert('SoThuTu', body);
      DB.broadcast('so_thu_tu_created', result);
    } 
    else if (endpoint.includes('/api/benh-nhan')) {
      result = DB.insert('BenhNhan', body);
    } 
    else if (endpoint.includes('/api/phieu-kham')) {
      result = DB.insert('PhieuKhamBenh', body);
      DB.broadcast('phieu_kham_created', result);
    } 
    else if (endpoint.includes('/api/don-thuoc')) {
      result = DB.insert('DonThuoc', body);
    } 
    else if (endpoint.includes('/api/chi-tiet-don-thuoc')) {
      result = DB.insert('ChiTietDonThuoc', body);
    } 
    else if (endpoint.includes('/api/thong-bao')) {
      result = DB.insert('ThongBao', body);
      DB.broadcast('thong_bao_created', result);
    } 
    else if (endpoint.includes('/api/ho-so-yte')) {
      result = DB.insert('HoSoYTe', body);
    }
    else if (endpoint.includes('/api/nhan-vien')) {
      result = DB.insert('NhanVien', body);
    }
    else if (endpoint.includes('/api/bac-si')) {
      result = DB.insert('BacSi', body);
    }
    else if (endpoint.includes('/api/chuyen-khoa')) {
      result = DB.insert('ChuyenKhoa', body);
    }
    else if (endpoint.includes('/api/phong-kham')) {
      result = DB.insert('PhongKham', body);
    }
    else if (endpoint.includes('/api/thuoc')) {
      result = DB.insert('Thuoc', body);
    }
    else if (endpoint.includes('/api/the-bhyt')) {
      result = DB.insert('TheBHYT', body);
    }
    else if (endpoint.includes('/api/tai-khoan-web')) {
      result = DB.insert('TaiKhoanWeb', body);
    }
    else if (endpoint.includes('/api/xu-ly/doi-bac-si')) {
      const { maBN, maHangDoiMoi, maLich, lyDo } = body;
      const stt = DB.get('SoThuTu').find(s => s.MaBN === maBN && s.TrangThaiThe === 'WAITING');
      if (stt) {
        DB.update('SoThuTu', 'MaThe', stt.MaThe, { MaHangDoi: maHangDoiMoi });
      }
      if (maLich) {
        DB.update('LichKham', 'MaLich', maLich, { MaPhongKham: maHangDoiMoi });
      }
      DB.broadcast('patient_transferred', { maBN, maHangDoiMoi, lyDo });
      result = { success: true, message: 'Đã chuyển bệnh nhân' };
    } 
    else {
      result = { success: true };
    }
    return result;
  },

  put: async (endpoint, body) => {
    console.log(`API PUT: ${endpoint}`, body);
    const parts = endpoint.split('/');
    const id = parts[parts.length - 1];

    if (endpoint.includes('/api/so-thu-tu')) {
      const result = DB.update('SoThuTu', 'MaThe', id, body);
      if (result) DB.broadcast('so_thu_tu_updated', result);
      return result;
    }
    if (endpoint.includes('/api/lich-kham')) {
      const result = DB.update('LichKham', 'MaLich', id, body);
      if (result) DB.broadcast('lich_kham_updated', result);
      return result;
    }
    if (endpoint.includes('/api/benh-nhan')) {
      return DB.update('BenhNhan', 'MaBN', id, body);
    }
    if (endpoint.includes('/api/ho-so-yte')) {
      return DB.update('HoSoYTe', 'MaHS', id, body);
    }
    if (endpoint.includes('/api/don-dang-ky')) {
      return DB.update('DonDangKy', 'MaDK', id, body);
    }
    if (endpoint.includes('/api/phieu-kham')) {
      const result = DB.update('PhieuKhamBenh', 'MaPK', id, body);
      if (result) DB.broadcast('phieu_kham_updated', result);
      return result;
    }
    if (endpoint.includes('/api/phieu-tiep-nhan')) {
      return DB.update('PhieuTiepNhan', 'MaPhieuTN', id, body);
    }
    if (endpoint.includes('/api/don-thuoc')) {
      return DB.update('DonThuoc', 'MaDT', id, body);
    }
    if (endpoint.includes('/api/hang-doi')) {
      return DB.update('HangDoi', 'MaHangDoi', id, body);
    }
    if (endpoint.includes('/api/thong-bao')) {
      return DB.update('ThongBao', 'MaThongBao', id, body);
    }
    if (endpoint.includes('/api/bac-si')) {
      return DB.update('BacSi', 'MaBS', id, body);
    }
    if (endpoint.includes('/api/phong-kham')) {
      return DB.update('PhongKham', 'MaPhongKham', id, body);
    }
    return { success: true };
  },

  delete: async (endpoint) => {
    console.log(`API DELETE: ${endpoint}`);
    const parts = endpoint.split('/');
    const id = parts[parts.length - 1];

    if (endpoint.includes('/api/so-thu-tu')) {
      DB.delete('SoThuTu', 'MaThe', id);
      return { success: true };
    }
    if (endpoint.includes('/api/lich-kham')) {
      DB.delete('LichKham', 'MaLich', id);
      return { success: true };
    }
    return { success: false, error: 'Unknown endpoint' };
  }
};

// ==================== SEED DATA ====================

function initSeedData() {
  // Kiểm tra xem có cần reseed không
  const needsReseed = !localStorage.getItem('db_initialized_v3') || 
                      !checkDataIntegrity() ||
                      localStorage.getItem('db_force_reseed') === 'true';
  
  if (!needsReseed) {
    console.log('✅ Database OK - skipping seed');
    return;
  }

  console.log('🔄 Initializing seed data...');
  
  // Xóa flag force reseed nếu có
  localStorage.removeItem('db_force_reseed');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const seed = {
    // ===== CHUYEN KHOA =====
    ChuyenKhoa: [
      { MaCK: 'CK01', TenCK: 'Nội khoa', MoTa: 'Khám và điều trị các bệnh nội khoa tổng quát', ViTri: 'Tầng 2, Khu A', SDT: '02812345678', Email: 'noikhoa@hospital.vn', TrangThai: 'Hoạt động' },
      { MaCK: 'CK02', TenCK: 'Ngoại khoa', MoTa: 'Khám và phẫu thuật các bệnh ngoại khoa', ViTri: 'Tầng 3, Khu A', SDT: '02812345679', Email: 'ngoaikhoa@hospital.vn', TrangThai: 'Hoạt động' },
      { MaCK: 'CK03', TenCK: 'Nhi khoa', MoTa: 'Khám và điều trị trẻ em dưới 15 tuổi', ViTri: 'Tầng 2, Khu B', SDT: '02812345680', Email: 'nhikhoa@hospital.vn', TrangThai: 'Hoạt động' },
      { MaCK: 'CK04', TenCK: 'Da liễu', MoTa: 'Khám và điều trị các bệnh về da', ViTri: 'Tầng 1, Khu B', SDT: '02812345681', Email: 'dalieu@hospital.vn', TrangThai: 'Hoạt động' },
      { MaCK: 'CK05', TenCK: 'Tim mạch', MoTa: 'Khám và điều trị các bệnh tim mạch', ViTri: 'Tầng 4, Khu A', SDT: '02812345682', Email: 'timmach@hospital.vn', TrangThai: 'Hoạt động' },
      { MaCK: 'CK06', TenCK: 'Thần kinh', MoTa: 'Khám và điều trị các bệnh thần kinh', ViTri: 'Tầng 4, Khu B', SDT: '02812345683', Email: 'thankinh@hospital.vn', TrangThai: 'Hoạt động' },
      { MaCK: 'CK07', TenCK: 'Sản phụ khoa', MoTa: 'Khám phụ khoa và theo dõi thai sản', ViTri: 'Tầng 3, Khu B', SDT: '02812345684', Email: 'sanphukhoa@hospital.vn', TrangThai: 'Hoạt động' },
      { MaCK: 'CK08', TenCK: 'Mắt', MoTa: 'Khám và điều trị các bệnh về mắt', ViTri: 'Tầng 1, Khu C', SDT: '02812345685', Email: 'mat@hospital.vn', TrangThai: 'Hoạt động' },
      { MaCK: 'CK09', TenCK: 'Tai Mũi Họng', MoTa: 'Khám và điều trị tai mũi họng', ViTri: 'Tầng 1, Khu C', SDT: '02812345686', Email: 'tmh@hospital.vn', TrangThai: 'Hoạt động' },
      { MaCK: 'CK10', TenCK: 'Cơ xương khớp', MoTa: 'Khám và điều trị các bệnh xương khớp', ViTri: 'Tầng 5, Khu A', SDT: '02812345687', Email: 'xuongkhop@hospital.vn', TrangThai: 'Hoạt động' }
    ],

    // ===== PHONG KHAM =====
    PhongKham: [
      { MaPhongKham: 'PK01', TenPhongKham: 'Phòng Nội khoa 1', SoPhong: 101, MaCK: 'CK01', TrangThaiHoatDong: 1 },
      { MaPhongKham: 'PK02', TenPhongKham: 'Phòng Nội khoa 2', SoPhong: 102, MaCK: 'CK01', TrangThaiHoatDong: 1 },
      { MaPhongKham: 'PK03', TenPhongKham: 'Phòng Ngoại khoa 1', SoPhong: 201, MaCK: 'CK02', TrangThaiHoatDong: 1 },
      { MaPhongKham: 'PK04', TenPhongKham: 'Phòng Ngoại khoa 2', SoPhong: 202, MaCK: 'CK02', TrangThaiHoatDong: 1 },
      { MaPhongKham: 'PK05', TenPhongKham: 'Phòng Nhi khoa 1', SoPhong: 301, MaCK: 'CK03', TrangThaiHoatDong: 1 },
      { MaPhongKham: 'PK06', TenPhongKham: 'Phòng Nhi khoa 2', SoPhong: 302, MaCK: 'CK03', TrangThaiHoatDong: 1 },
      { MaPhongKham: 'PK07', TenPhongKham: 'Phòng Da liễu', SoPhong: 401, MaCK: 'CK04', TrangThaiHoatDong: 1 },
      { MaPhongKham: 'PK08', TenPhongKham: 'Phòng Tim mạch 1', SoPhong: 501, MaCK: 'CK05', TrangThaiHoatDong: 1 },
      { MaPhongKham: 'PK09', TenPhongKham: 'Phòng Tim mạch 2', SoPhong: 502, MaCK: 'CK05', TrangThaiHoatDong: 1 },
      { MaPhongKham: 'PK10', TenPhongKham: 'Phòng Thần kinh', SoPhong: 601, MaCK: 'CK06', TrangThaiHoatDong: 1 },
      { MaPhongKham: 'PK11', TenPhongKham: 'Phòng Sản phụ khoa 1', SoPhong: 701, MaCK: 'CK07', TrangThaiHoatDong: 1 },
      { MaPhongKham: 'PK12', TenPhongKham: 'Phòng Mắt', SoPhong: 801, MaCK: 'CK08', TrangThaiHoatDong: 1 },
      { MaPhongKham: 'PK13', TenPhongKham: 'Phòng Tai Mũi Họng', SoPhong: 901, MaCK: 'CK09', TrangThaiHoatDong: 1 },
      { MaPhongKham: 'PK14', TenPhongKham: 'Phòng Cơ xương khớp', SoPhong: 1001, MaCK: 'CK10', TrangThaiHoatDong: 1 }
    ],

    // ===== HANG DOI =====
    HangDoi: [
      { MaHangDoi: 'HD01', MaPhongKham: 'PK01', SoThuTuTiepTheo: 1, SoLuongDangCho: 0 },
      { MaHangDoi: 'HD02', MaPhongKham: 'PK02', SoThuTuTiepTheo: 1, SoLuongDangCho: 0 },
      { MaHangDoi: 'HD03', MaPhongKham: 'PK03', SoThuTuTiepTheo: 1, SoLuongDangCho: 0 },
      { MaHangDoi: 'HD04', MaPhongKham: 'PK04', SoThuTuTiepTheo: 1, SoLuongDangCho: 0 },
      { MaHangDoi: 'HD05', MaPhongKham: 'PK05', SoThuTuTiepTheo: 1, SoLuongDangCho: 0 },
      { MaHangDoi: 'HD06', MaPhongKham: 'PK06', SoThuTuTiepTheo: 1, SoLuongDangCho: 0 },
      { MaHangDoi: 'HD07', MaPhongKham: 'PK07', SoThuTuTiepTheo: 1, SoLuongDangCho: 0 },
      { MaHangDoi: 'HD08', MaPhongKham: 'PK08', SoThuTuTiepTheo: 1, SoLuongDangCho: 0 },
      { MaHangDoi: 'HD09', MaPhongKham: 'PK09', SoThuTuTiepTheo: 1, SoLuongDangCho: 0 },
      { MaHangDoi: 'HD10', MaPhongKham: 'PK10', SoThuTuTiepTheo: 1, SoLuongDangCho: 0 },
      { MaHangDoi: 'HD11', MaPhongKham: 'PK11', SoThuTuTiepTheo: 1, SoLuongDangCho: 0 },
      { MaHangDoi: 'HD12', MaPhongKham: 'PK12', SoThuTuTiepTheo: 1, SoLuongDangCho: 0 },
      { MaHangDoi: 'HD13', MaPhongKham: 'PK13', SoThuTuTiepTheo: 1, SoLuongDangCho: 0 },
      { MaHangDoi: 'HD14', MaPhongKham: 'PK14', SoThuTuTiepTheo: 1, SoLuongDangCho: 0 }
    ],

    // ===== BAC SI =====
    BacSi: [
      { MaBS: 'BS001', HoTen: 'TS.BS Nguyễn Quang Anh', GioiTinh: 'Nam', SDT: '0922222201', Email: 'quanganh.bs@hospital.vn', ChucVu: 'Trưởng khoa', CaTruc: 'Sáng', MaCK: 'CK01', MaPhongKham: 'PK01' },
      { MaBS: 'BS002', HoTen: 'ThS.BS Trần Thị Bảo', GioiTinh: 'Nữ', SDT: '0922222202', Email: 'bao.bs@hospital.vn', ChucVu: 'Bác sĩ', CaTruc: 'Chiều', MaCK: 'CK01', MaPhongKham: 'PK02' },
      { MaBS: 'BS003', HoTen: 'TS.BS Lê Văn Chính', GioiTinh: 'Nam', SDT: '0922222203', Email: 'chinh.bs@hospital.vn', ChucVu: 'Trưởng khoa', CaTruc: 'Sáng', MaCK: 'CK02', MaPhongKham: 'PK03' },
      { MaBS: 'BS004', HoTen: 'ThS.BS Phạm Thị Diệu', GioiTinh: 'Nữ', SDT: '0922222204', Email: 'dieu.bs@hospital.vn', ChucVu: 'Bác sĩ', CaTruc: 'Chiều', MaCK: 'CK02', MaPhongKham: 'PK04' },
      { MaBS: 'BS005', HoTen: 'BS CKI Hoàng Văn Đức', GioiTinh: 'Nam', SDT: '0922222205', Email: 'duc.bs@hospital.vn', ChucVu: 'Trưởng khoa', CaTruc: 'Sáng', MaCK: 'CK03', MaPhongKham: 'PK05' },
      { MaBS: 'BS006', HoTen: 'ThS.BS Ngô Thị Giang', GioiTinh: 'Nữ', SDT: '0922222206', Email: 'giang.bs@hospital.vn', ChucVu: 'Bác sĩ', CaTruc: 'Tối', MaCK: 'CK03', MaPhongKham: 'PK06' },
      { MaBS: 'BS007', HoTen: 'TS.BS Đặng Văn Hải', GioiTinh: 'Nam', SDT: '0922222207', Email: 'hai.bs@hospital.vn', ChucVu: 'Trưởng khoa', CaTruc: 'Sáng', MaCK: 'CK04', MaPhongKham: 'PK07' },
      { MaBS: 'BS008', HoTen: 'GS.TS Vũ Thị Hằng', GioiTinh: 'Nữ', SDT: '0922222208', Email: 'hang.bs@hospital.vn', ChucVu: 'Trưởng khoa', CaTruc: 'Sáng', MaCK: 'CK05', MaPhongKham: 'PK08' },
      { MaBS: 'BS009', HoTen: 'ThS.BS Bùi Văn Khánh', GioiTinh: 'Nam', SDT: '0922222209', Email: 'khanh.bs@hospital.vn', ChucVu: 'Bác sĩ', CaTruc: 'Chiều', MaCK: 'CK05', MaPhongKham: 'PK09' },
      { MaBS: 'BS010', HoTen: 'TS.BS Đinh Thị Lệ', GioiTinh: 'Nữ', SDT: '0922222210', Email: 'le.bs@hospital.vn', ChucVu: 'Trưởng khoa', CaTruc: 'Sáng', MaCK: 'CK06', MaPhongKham: 'PK10' },
      { MaBS: 'BS011', HoTen: 'ThS.BS Trương Văn Nam', GioiTinh: 'Nam', SDT: '0922222211', Email: 'nam.bs@hospital.vn', ChucVu: 'Trưởng khoa', CaTruc: 'Sáng', MaCK: 'CK07', MaPhongKham: 'PK11' },
      { MaBS: 'BS012', HoTen: 'BS CKI Lý Thị Oanh', GioiTinh: 'Nữ', SDT: '0922222212', Email: 'oanh.bs@hospital.vn', ChucVu: 'Trưởng khoa', CaTruc: 'Sáng', MaCK: 'CK08', MaPhongKham: 'PK12' },
      { MaBS: 'BS013', HoTen: 'ThS.BS Phan Văn Phúc', GioiTinh: 'Nam', SDT: '0922222213', Email: 'phuc.bs@hospital.vn', ChucVu: 'Trưởng khoa', CaTruc: 'Sáng', MaCK: 'CK09', MaPhongKham: 'PK13' },
      { MaBS: 'BS014', HoTen: 'TS.BS Mai Thị Quỳnh', GioiTinh: 'Nữ', SDT: '0922222214', Email: 'quynh.bs@hospital.vn', ChucVu: 'Trưởng khoa', CaTruc: 'Sáng', MaCK: 'CK10', MaPhongKham: 'PK14' },
      { MaBS: 'BS015', HoTen: 'ThS.BS Cao Văn Sơn', GioiTinh: 'Nam', SDT: '0922222215', Email: 'son.bs@hospital.vn', ChucVu: 'Bác sĩ', CaTruc: 'Chiều', MaCK: 'CK01', MaPhongKham: 'PK01' }
    ],

    // ===== NHAN VIEN =====
    NhanVien: [
      { MaNV: 'NV001', HoTen: 'Nguyễn Thị Hương', GioiTinh: 'Nữ', SDT: '0911111101', Email: 'huong.nv@hospital.vn', NgaySinh: '1985-05-10', DiaChi: '12 Lê Duẩn, Q1', CaLamViec: 'Sáng' },
      { MaNV: 'NV002', HoTen: 'Trần Văn Khải', GioiTinh: 'Nam', SDT: '0911111102', Email: 'khai.nv@hospital.vn', NgaySinh: '1990-08-22', DiaChi: '34 Nguyễn Trãi, Q5', CaLamViec: 'Chiều' },
      { MaNV: 'NV003', HoTen: 'Lê Thị Linh', GioiTinh: 'Nữ', SDT: '0911111103', Email: 'linh.nv@hospital.vn', NgaySinh: '1988-03-15', DiaChi: '56 Lê Văn Sỹ, Q3', CaLamViec: 'Sáng' },
      { MaNV: 'NV004', HoTen: 'Phạm Văn Minh', GioiTinh: 'Nam', SDT: '0911111104', Email: 'minh.nv@hospital.vn', NgaySinh: '1992-11-07', DiaChi: '78 CMT8, Q10', CaLamViec: 'Tối' },
      { MaNV: 'NV005', HoTen: 'Hoàng Thị Nga', GioiTinh: 'Nữ', SDT: '0911111105', Email: 'nga.nv@hospital.vn', NgaySinh: '1986-06-28', DiaChi: '90 Đinh Tiên Hoàng, BT', CaLamViec: 'Chiều' }
    ],

    // ===== BENH NHAN =====
    BenhNhan: [
      { MaBN: 'BN001', HoTen: 'Nguyễn Văn An', NgaySinh: '1985-03-12', GioiTinh: 'Nam', DiaChi: '123 Lê Lợi, Q1, TP.HCM', SDT: '0901234561', SDTLienHe: '0901234562', Email: 'an.nguyen@gmail.com', QuanHeBN: null, LoaiUuTien: 'Bình thường' },
      { MaBN: 'BN002', HoTen: 'Trần Thị Bích', NgaySinh: '1990-07-25', GioiTinh: 'Nữ', DiaChi: '45 Nguyễn Huệ, Q1, TP.HCM', SDT: '0901234563', SDTLienHe: null, Email: 'bich.tran@gmail.com', QuanHeBN: null, LoaiUuTien: 'Bình thường' },
      { MaBN: 'BN003', HoTen: 'Lê Minh Cường', NgaySinh: '1978-11-05', GioiTinh: 'Nam', DiaChi: '78 Trần Hưng Đạo, Q5, TP.HCM', SDT: '0901234564', SDTLienHe: '0901234565', Email: 'cuong.le@yahoo.com', QuanHeBN: null, LoaiUuTien: 'Bình thường' },
      { MaBN: 'BN004', HoTen: 'Phạm Thị Dung', NgaySinh: '2015-06-18', GioiTinh: 'Nữ', DiaChi: '56 Điện Biên Phủ, Q3, TP.HCM', SDT: '0901234566', SDTLienHe: '0901234567', Email: 'dung.pham@gmail.com', QuanHeBN: 'Mẹ', LoaiUuTien: 'Trẻ em' },
      { MaBN: 'BN005', HoTen: 'Hoàng Văn Em', NgaySinh: '1955-02-28', GioiTinh: 'Nam', DiaChi: '90 Võ Văn Tần, Q3, TP.HCM', SDT: '0901234568', SDTLienHe: null, Email: 'bn005@gmail.com', QuanHeBN: null, LoaiUuTien: 'Người cao tuổi' }
    ],

    // ===== HO SO Y TE =====
    HoSoYTe: [
      { MaHS: 'HS001', MaBN: 'BN001', MaNV: 'NV001', NhomMau: 'A', Rh: '+', DiUng: null, TienSuBenh: 'Viêm dạ dày 2018', BenhNen: null, NgayTao: '2020-01-10', NgayCapNhat: '2024-06-01', GhiChu: null, HinhThucTao: 'Trực tiếp' },
      { MaHS: 'HS002', MaBN: 'BN002', MaNV: 'NV002', NhomMau: 'B', Rh: '+', DiUng: 'Penicillin', TienSuBenh: 'Dị ứng penicillin', BenhNen: null, NgayTao: '2019-03-15', NgayCapNhat: '2024-05-20', GhiChu: null, HinhThucTao: 'Online' },
      { MaHS: 'HS003', MaBN: 'BN003', MaNV: 'NV001', NhomMau: 'O', Rh: '+', DiUng: null, TienSuBenh: 'Tăng huyết áp', BenhNen: 'Tăng huyết áp', NgayTao: '2018-07-20', NgayCapNhat: '2024-04-10', GhiChu: null, HinhThucTao: 'Trực tiếp' },
      { MaHS: 'HS004', MaBN: 'BN004', MaNV: 'NV003', NhomMau: 'AB', Rh: '-', DiUng: null, TienSuBenh: null, BenhNen: null, NgayTao: '2021-09-05', NgayCapNhat: '2024-03-22', GhiChu: null, HinhThucTao: 'Trực tiếp' },
      { MaHS: 'HS005', MaBN: 'BN005', MaNV: 'NV002', NhomMau: 'A', Rh: '+', DiUng: 'Aspirin', TienSuBenh: 'Đái tháo đường type 2', BenhNen: 'Đái tháo đường, THA', NgayTao: '2015-04-18', NgayCapNhat: '2024-07-01', GhiChu: null, HinhThucTao: 'Trực tiếp' }
    ],

    // ===== THE BHYT =====
    TheBHYT: [
      { MaBHYT: 'BH0000001', MaBN: 'BN001', NgayCap: '2022-01-01', NgayHetHan: '2026-12-31', TyLeChiTra: 80.00, MucChiTra: 50000000, TrangThai: 'Hoạt động', LoaiThe: 'Hộ gia đình', PhiHangThang: 600000, MoTa: 'Thẻ BHYT hộ gia đình' },
      { MaBHYT: 'BH0000002', MaBN: 'BN002', NgayCap: '2021-06-01', NgayHetHan: '2025-05-31', TyLeChiTra: 80.00, MucChiTra: 50000000, TrangThai: 'Hoạt động', LoaiThe: 'Người lao động', PhiHangThang: 700000, MoTa: null },
      { MaBHYT: 'BH0000003', MaBN: 'BN003', NgayCap: '2020-01-01', NgayHetHan: '2024-12-31', TyLeChiTra: 95.00, MucChiTra: 100000000, TrangThai: 'Hoạt động', LoaiThe: 'Cán bộ nhà nước', PhiHangThang: 500000, MoTa: null }
    ],

    // ===== TAI KHOAN WEB =====
    TaiKhoanWeb: [
      { MaTK: 'TK001', MaBN: 'BN001', TenDN: 'annguyen85', MatKhau: 'hashed_pw_001', Email: 'an.nguyen@gmail.com', SDT: '0901234561', NgayTao: '2023-01-10', MaQR: null },
      { MaTK: 'TK002', MaBN: 'BN002', TenDN: 'bichtran90', MatKhau: 'hashed_pw_002', Email: 'bich.tran@gmail.com', SDT: '0901234563', NgayTao: '2022-06-15', MaQR: null }
    ],

    // ===== THUOC =====
    Thuoc: [
      { MaThuoc: 'T001', TenThuoc: 'Omeprazole', DonViTinh: 'Viên nang', MoTa: 'Thuốc ức chế bơm proton, điều trị viêm loét dạ dày' },
      { MaThuoc: 'T002', TenThuoc: 'Amlodipin', DonViTinh: 'Viên nén', MoTa: 'Thuốc hạ huyết áp nhóm chẹn kênh calci' },
      { MaThuoc: 'T003', TenThuoc: 'Metformin', DonViTinh: 'Viên nén', MoTa: 'Thuốc điều trị đái tháo đường type 2' },
      { MaThuoc: 'T004', TenThuoc: 'Cetirizin', DonViTinh: 'Viên nén', MoTa: 'Thuốc kháng histamine điều trị dị ứng' },
      { MaThuoc: 'T005', TenThuoc: 'Amoxicillin', DonViTinh: 'Viên nang', MoTa: 'Kháng sinh nhóm Penicillin phổ rộng' },
      { MaThuoc: 'T006', TenThuoc: 'Paracetamol', DonViTinh: 'Viên nén', MoTa: 'Thuốc hạ sốt, giảm đau' },
      { MaThuoc: 'T007', TenThuoc: 'Ibuprofen', DonViTinh: 'Viên nén', MoTa: 'Thuốc chống viêm không steroid' },
      { MaThuoc: 'T008', TenThuoc: 'Atorvastatin', DonViTinh: 'Viên nén', MoTa: 'Thuốc hạ mỡ máu nhóm statin' },
      { MaThuoc: 'T009', TenThuoc: 'Salbutamol', DonViTinh: 'Bình xịt', MoTa: 'Thuốc giãn phế quản điều trị hen' },
      { MaThuoc: 'T010', TenThuoc: 'Vitamin C', DonViTinh: 'Viên sủi', MoTa: 'Bổ sung vitamin C' },
      { MaThuoc: 'T011', TenThuoc: 'Glucosamin', DonViTinh: 'Viên nang', MoTa: 'Bổ trợ điều trị thoái hóa khớp' },
      { MaThuoc: 'T012', TenThuoc: 'Prednisone', DonViTinh: 'Viên nén', MoTa: 'Corticosteroid điều trị viêm' },
      { MaThuoc: 'T013', TenThuoc: 'Azithromycin', DonViTinh: 'Viên nén', MoTa: 'Kháng sinh điều trị nhiễm khuẩn hô hấp' },
      { MaThuoc: 'T014', TenThuoc: 'Insulin Glargine', DonViTinh: 'Lọ tiêm', MoTa: 'Insulin nền điều trị đái tháo đường' },
      { MaThuoc: 'T015', TenThuoc: 'Bisoprolol', DonViTinh: 'Viên nén', MoTa: 'Thuốc điều trị tăng huyết áp, suy tim' }
    ],

    // ===== LICH LAM VIEC (7 days for all doctors) =====
    LichLamViec: [],

    // ===== Empty tables for runtime data =====
    ThongBao: [],
    LichKham: [],
    DonDangKy: [],
    PhieuTiepNhan: [],
    SoThuTu: [],
    PhieuKhamBenh: [],
    DonThuoc: [],
    ChiTietDonThuoc: []
  };

  // Generate LichLamViec for next 7 days for all doctors
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    seed.BacSi.forEach((bs) => {
      const isMorning = bs.CaTruc === 'Sáng';
      const isAfternoon = bs.CaTruc === 'Chiều';
      const baseId = parseInt(bs.MaBS.replace('BS', '')) * 100 + (i + 1);

      if (isMorning) {
        seed.LichLamViec.push({
          MaLich: 'LLV' + String(baseId).padStart(3, '0'),
          MaBS: bs.MaBS,
          NgayLamViec: dateStr,
          GioBatDau: '07:00',
          GioKT: '11:30',
          GhiChu: `Ca sáng ${seed.ChuyenKhoa.find(ck => ck.MaCK === bs.MaCK)?.TenCK || ''}`
        });
      } else if (isAfternoon) {
        seed.LichLamViec.push({
          MaLich: 'LLV' + String(baseId + 50).padStart(3, '0'),
          MaBS: bs.MaBS,
          NgayLamViec: dateStr,
          GioBatDau: '13:00',
          GioKT: '17:00',
          GhiChu: `Ca chiều ${seed.ChuyenKhoa.find(ck => ck.MaCK === bs.MaCK)?.TenCK || ''}`
        });
      } else {
        // Tối or default to morning
        seed.LichLamViec.push({
          MaLich: 'LLV' + String(baseId).padStart(3, '0'),
          MaBS: bs.MaBS,
          NgayLamViec: dateStr,
          GioBatDau: '07:00',
          GioKT: '11:30',
          GhiChu: `Ca sáng ${seed.ChuyenKhoa.find(ck => ck.MaCK === bs.MaCK)?.TenCK || ''}`
        });
      }
    });
  }

  // Clear existing data first
  DB_TABLES.forEach(table => {
    localStorage.removeItem(`db_${table}`);
  });

  // Insert seed data
  DB_TABLES.forEach(table => {
    if (seed[table]) {
      seed[table].forEach(row => {
        const data = DB.get(table);
        const pk = PK_MAP[table];
        const exists = data.find(r => String(r[pk]) === String(row[pk]));
        if (!exists) {
          data.push(row);
          DB.set(table, data);
        }
      });
    }
  });

  // Lưu flags
  localStorage.setItem('db_initialized_v3', 'true');
  localStorage.setItem('db_schema_version', 'v3.1');
  console.log('✅ Seed data initialized (v3.1)');
}

// ==================== HELPER FUNCTIONS ====================

function generateMaPhieu(prefix, id) {
  return prefix + String(id).padStart(4, '0');
}

// Legacy compatibility - kept for backward compatibility
function getNextId(table) {
  return generateNextId(table);
}

// Get queue status for a specific room
function getQueueStatus(maHangDoi) {
  const hangDoi = DB.get('HangDoi').find(h => h.MaHangDoi === maHangDoi);
  const waiting = DB.get('SoThuTu').filter(s => s.MaHangDoi === maHangDoi && s.TrangThaiThe === 'WAITING');
  const called = DB.get('SoThuTu').find(s => s.MaHangDoi === maHangDoi && s.TrangThaiThe === 'CALLED');

  return {
    hangDoi,
    waiting,
    called,
    totalWaiting: waiting.length,
    currentNumber: called?.SoThuTu || null
  };
}

// Priority queue sort function
function sortByPriority(queueItems) {
  const bns = DB.get('BenhNhan');

  const getPriority = (stt) => {
    const bn = bns.find(b => b.MaBN === stt.MaBN);
    if (bn?.LoaiUuTien === 'Cấp cứu') return 1;
    if (bn?.LoaiUuTien === 'Người cao tuổi') return 2;
    if (bn?.LoaiUuTien === 'Trẻ em') return 3;
    return 4;
  };

  return [...queueItems].sort((a, b) => {
    const pa = getPriority(a);
    const pb = getPriority(b);
    if (pa !== pb) return pa - pb;
    return extractNumber(a.SoThuTu) - extractNumber(b.SoThuTu);
  });
}

// Initialize
initSeedData();
initCrossTabSync();

// Expose globally
window.DB = DB;
window.API = API;
window.generateMaPhieu = generateMaPhieu;
window.getNextId = getNextId;
window.generateNextId = generateNextId;
window.extractNumber = extractNumber;
window.getQueueStatus = getQueueStatus;
window.sortByPriority = sortByPriority;
window.checkDataIntegrity = checkDataIntegrity;
window.forceReseedOnNextLoad = forceReseedOnNextLoad;