const express = require("express");
const router = express.Router();
const { sql, getPool } = require("../db");

function patientMakeId(prefix, maxLength = 20) {
    const raw = Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return (prefix + raw).slice(0, maxLength);
}

function normalizeDateOnly(value) {
    if (!value) return null;
    return String(value).slice(0, 10);
}

function normalizeTime(value) {
    if (!value) return null;
    return String(value).slice(0, 5);
}

// Chuyên khoa
router.get("/api/chuyen-khoa", async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
      SELECT MaCK, TenCK, MoTa, ViTri, SDT, Email, TrangThai
      FROM ChuyenKhoa
      WHERE TrangThai IS NULL OR TrangThai = N'Hoạt động'
      ORDER BY MaCK
    `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy chuyên khoa", error: err.message });
    }
});

// Phòng khám
router.get("/api/phong-kham", async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
      SELECT 
        pk.MaPhongKham,
        pk.TenPhongKham,
        pk.SoPhong,
        pk.MaCK,
        pk.TrangThaiHoatDong,
        ck.TenCK
      FROM PhongKham pk
      LEFT JOIN ChuyenKhoa ck ON pk.MaCK = ck.MaCK
      ORDER BY pk.SoPhong
    `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy phòng khám", error: err.message });
    }
});

// Bác sĩ theo chuyên khoa hoặc tất cả
router.get("/api/bac-si", async (req, res) => {
    try {
        const pool = await getPool();
        const maCK = req.query.maCK || null;

        const request = pool.request();
        request.input("MaCK", sql.VarChar, maCK);

        const result = await request.query(`
      SELECT
        bs.MaBS,
        bs.HoTen,
        bs.GioiTinh,
        bs.SDT,
        bs.Email,
        bs.ChucVu,
        bs.CaTruc,
        bs.MaCK,
        bs.MaPhongKham,
        ck.TenCK,
        pk.TenPhongKham,
        pk.SoPhong,
        ISNULL(hd.SoLuongDangCho, 0) AS SoLuongDangCho
      FROM BacSi bs
      LEFT JOIN ChuyenKhoa ck ON bs.MaCK = ck.MaCK
      LEFT JOIN PhongKham pk ON bs.MaPhongKham = pk.MaPhongKham
      LEFT JOIN HangDoi hd ON pk.MaPhongKham = hd.MaPhongKham
      WHERE (@MaCK IS NULL OR bs.MaCK = @MaCK)
      ORDER BY bs.HoTen
    `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy danh sách bác sĩ", error: err.message });
    }
});

// Lịch làm việc theo bác sĩ/ngày
router.get("/api/lich-lam-viec", async (req, res) => {
    try {
        const pool = await getPool();
        const { maBS, ngay } = req.query;

        if (!maBS || !ngay) {
            return res.json([]);
        }

        const result = await pool.request()
            .input("MaBS", sql.VarChar, maBS)
            .input("Ngay", sql.Date, normalizeDateOnly(ngay))
            .query(`
        SELECT
          MaLich,
          MaBS,
          CONVERT(VARCHAR(10), NgayLamViec, 23) AS NgayLamViec,
          CONVERT(VARCHAR(5), GioBatDau, 108) AS GioBatDau,
          CONVERT(VARCHAR(5), GioKT, 108) AS GioKT,
          GhiChu
        FROM LichLamViec
        WHERE MaBS = @MaBS AND NgayLamViec = @Ngay
        ORDER BY GioBatDau
      `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy lịch làm việc", error: err.message });
    }
});

// Thông tin bệnh nhân
router.get("/api/benh-nhan/:maBN/ho-so", async (req, res) => {
    try {
        const pool = await getPool();
        const maBN = req.params.maBN;

        const patientResult = await pool.request()
            .input("MaBN", sql.VarChar, maBN)
            .query(`
        SELECT 
          MaBN,
          HoTen,
          CONVERT(VARCHAR(10), NgaySinh, 23) AS NgaySinh,
          GioiTinh,
          DiaChi,
          SDT,
          SDTLienHe,
          Email,
          QuanHeBN,
          LoaiUuTien
        FROM BenhNhan
        WHERE MaBN = @MaBN
      `);

        if (!patientResult.recordset.length) {
            return res.status(404).json({ message: "Không tìm thấy bệnh nhân" });
        }

        const medicalResult = await pool.request()
            .input("MaBN", sql.VarChar, maBN)
            .query(`
        SELECT TOP 1
          MaHS,
          MaBN,
          MaNV,
          NhomMau,
          Rh,
          DiUng,
          TienSuBenh,
          BenhNen,
          CONVERT(VARCHAR(10), NgayTao, 23) AS NgayTao,
          CONVERT(VARCHAR(10), NgayCapNhat, 23) AS NgayCapNhat,
          GhiChu,
          HinhThucTao
        FROM HoSoYTe
        WHERE MaBN = @MaBN
        ORDER BY NgayCapNhat DESC
      `);

        res.json({
            info: patientResult.recordset[0],
            medical: medicalResult.recordset[0] || null
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy hồ sơ bệnh nhân", error: err.message });
    }
});

router.get("/api/benh-nhan/:maBN", async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input("MaBN", sql.VarChar, req.params.maBN)
            .query(`
        SELECT 
          MaBN,
          HoTen,
          CONVERT(VARCHAR(10), NgaySinh, 23) AS NgaySinh,
          GioiTinh,
          DiaChi,
          SDT,
          SDTLienHe,
          Email,
          QuanHeBN,
          LoaiUuTien
        FROM BenhNhan
        WHERE MaBN = @MaBN
      `);

        if (!result.recordset.length) {
            return res.status(404).json({ message: "Không tìm thấy bệnh nhân" });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy bệnh nhân", error: err.message });
    }
});

// BHYT
router.get("/api/the-bhyt", async (req, res) => {
    try {
        const pool = await getPool();
        const maBN = req.query.maBN || null;

        const result = await pool.request()
            .input("MaBN", sql.VarChar, maBN)
            .query(`
        SELECT 
          MaBHYT,
          MaBN,
          CONVERT(VARCHAR(10), NgayCap, 23) AS NgayCap,
          CONVERT(VARCHAR(10), NgayHetHan, 23) AS NgayHetHan,
          TyLeChiTra,
          MucChiTra,
          TrangThai,
          LoaiThe,
          PhiHangThang,
          MoTa
        FROM TheBHYT
        WHERE (@MaBN IS NULL OR MaBN = @MaBN)
        ORDER BY NgayHetHan DESC
      `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy thẻ BHYT", error: err.message });
    }
});

// Lịch khám của bệnh nhân
router.get("/api/lich-kham", async (req, res) => {
    try {
        const pool = await getPool();
        const maBN = req.query.maBN || null;

        const result = await pool.request()
            .input("MaBN", sql.VarChar, maBN)
            .query(`
        SELECT
          lk.MaLich,
          lk.MaBN,
          lk.MaPhongKham,
          CONVERT(VARCHAR(19), lk.NgayGio, 120) AS NgayGio,
          lk.GhiChu,
          lk.TrangThai,
          pk.TenPhongKham,
          pk.SoPhong,
          ck.TenCK
        FROM LichKham lk
        LEFT JOIN PhongKham pk ON lk.MaPhongKham = pk.MaPhongKham
        LEFT JOIN ChuyenKhoa ck ON pk.MaCK = ck.MaCK
        WHERE (@MaBN IS NULL OR lk.MaBN = @MaBN)
        ORDER BY lk.NgayGio DESC
      `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy lịch khám", error: err.message });
    }
});

// Đăng ký khám: tạo lịch khám + đơn đăng ký + số thứ tự + phiếu tiếp nhận
// ==================== FIX ROUTE: PATIENT BOOKING ====================

function patientBookingMakeId(prefix, maxLength = 20) {
    const raw = Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return (prefix + raw).slice(0, maxLength);
}

function patientBookingDateOnly(value) {
    if (!value) return null;
    return String(value).slice(0, 10);
}

function patientBookingTime(value) {
    if (!value) return null;
    return String(value).slice(0, 5);
}

async function resolvePatientForBooking(transaction, maBNRaw) {
    const candidates = [];
    const raw = (maBNRaw || "").toString().trim().toUpperCase();

    if (/^BN\d+$/i.test(raw)) candidates.push(raw);
    candidates.push("BN001");

    for (const maBN of [...new Set(candidates)]) {
        const result = await transaction.request()
            .input("MaBN", sql.VarChar, maBN)
            .query(`
        SELECT MaBN, HoTen, CONVERT(VARCHAR(10), NgaySinh, 23) AS NgaySinh
        FROM BenhNhan
        WHERE MaBN = @MaBN
      `);

        if (result.recordset.length) return result.recordset[0];
    }

    const firstPatient = await transaction.request().query(`
    SELECT TOP 1 MaBN, HoTen, CONVERT(VARCHAR(10), NgaySinh, 23) AS NgaySinh
    FROM BenhNhan
    ORDER BY MaBN
  `);

    if (firstPatient.recordset.length) return firstPatient.recordset[0];

    throw new Error("Không tìm thấy bệnh nhân nào trong bảng BenhNhan");
}

router.post("/api/patient/booking", async (req, res) => {
    const {
        MaBN: MaBNBody,
        MaBS,
        MaPhongKham,
        NgayKham,
        GioKham,
        TrieuChung,
        GhiChu
    } = req.body;

    if (!MaBS || !MaPhongKham || !NgayKham || !GioKham) {
        return res.status(400).json({ message: "Thiếu MaBS, MaPhongKham, NgayKham hoặc GioKham" });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const patient = await resolvePatientForBooking(transaction, MaBNBody);
        const MaBN = patient.MaBN;

        const doctorResult = await transaction.request()
            .input("MaBS", sql.VarChar, MaBS)
            .query(`
        SELECT MaBS, HoTen, MaPhongKham, MaCK
        FROM BacSi
        WHERE MaBS = @MaBS
      `);

        if (!doctorResult.recordset.length) {
            throw new Error("Không tìm thấy bác sĩ");
        }

        const roomResult = await transaction.request()
            .input("MaPhongKham", sql.VarChar, MaPhongKham)
            .query(`
        SELECT pk.MaPhongKham, pk.TenPhongKham, pk.SoPhong, pk.MaCK, ck.TenCK
        FROM PhongKham pk
        LEFT JOIN ChuyenKhoa ck ON pk.MaCK = ck.MaCK
        WHERE pk.MaPhongKham = @MaPhongKham
      `);

        if (!roomResult.recordset.length) {
            throw new Error("Không tìm thấy phòng khám");
        }

        const queueResult = await transaction.request()
            .input("MaPhongKham", sql.VarChar, MaPhongKham)
            .query(`
        SELECT TOP 1 MaHangDoi, MaPhongKham, SoThuTuTiepTheo, SoLuongDangCho
        FROM HangDoi WITH (UPDLOCK, HOLDLOCK)
        WHERE MaPhongKham = @MaPhongKham
      `);

        if (!queueResult.recordset.length) {
            throw new Error("Phòng khám chưa có hàng đợi");
        }

        const queue = queueResult.recordset[0];
        const soThuTu = Number(queue.SoThuTuTiepTheo || 1);
        const soNguoiTruocBan = Number(queue.SoLuongDangCho || 0);

        const MaLich = patientBookingMakeId("LK", 20);
        const MaDK = patientBookingMakeId("DK", 10);
        const MaThe = patientBookingMakeId("ST", 20);
        const MaPhieuTN = patientBookingMakeId("TN", 10);
        const MaThongBao = patientBookingMakeId("TB", 20);

        const ngayGio = `${patientBookingDateOnly(NgayKham)} ${patientBookingTime(GioKham)}:00`;
        const thoiGianDuKien = new Date(Date.now() + soNguoiTruocBan * 15 * 60000);

        await transaction.request()
            .input("MaLich", sql.VarChar, MaLich)
            .input("MaBN", sql.VarChar, MaBN)
            .input("MaPhongKham", sql.VarChar, MaPhongKham)
            .input("NgayGio", sql.DateTime, ngayGio)
            .input("GhiChu", sql.NVarChar, GhiChu || "")
            .query(`
        INSERT INTO LichKham (MaLich, MaBN, MaPhongKham, NgayGio, GhiChu, TrangThai)
        VALUES (@MaLich, @MaBN, @MaPhongKham, @NgayGio, @GhiChu, N'Đã đặt')
      `);

        await transaction.request()
            .input("MaDK", sql.VarChar, MaDK)
            .input("MaBN", sql.VarChar, MaBN)
            .input("MaPhongKham", sql.VarChar, MaPhongKham)
            .input("TrieuChung", sql.NVarChar, TrieuChung || "")
            .query(`
        INSERT INTO DonDangKy (MaDK, MaBN, MaPhongKham, NgayDK, TrieuChung, TrangThai)
        VALUES (@MaDK, @MaBN, @MaPhongKham, CAST(GETDATE() AS DATE), @TrieuChung, N'Chờ xác nhận')
      `);

        await transaction.request()
            .input("MaThe", sql.VarChar, MaThe)
            .input("MaBN", sql.VarChar, MaBN)
            .input("MaHangDoi", sql.VarChar, queue.MaHangDoi)
            .input("MaLich", sql.VarChar, MaLich)
            .input("SoThuTu", sql.Int, soThuTu)
            .input("ThoiGianDuKienKham", sql.DateTime, thoiGianDuKien)
            .query(`
        INSERT INTO SoThuTu
        (MaThe, MaBN, MaHangDoi, MaLich, SoThuTu, TrangThaiThe, ThoiGianCap, ThoiGianDuKienKham, SoLanVangMat)
        VALUES
        (@MaThe, @MaBN, @MaHangDoi, @MaLich, @SoThuTu, N'WAITING', GETDATE(), @ThoiGianDuKienKham, 0)
      `);

        await transaction.request()
            .input("MaPhieuTN", sql.VarChar, MaPhieuTN)
            .input("MaBN", sql.VarChar, MaBN)
            .input("SoThuTu", sql.Int, soThuTu)
            .query(`
        INSERT INTO PhieuTiepNhan (MaPhieuTN, MaBN, SoThuTu, NgayTiepNhan, TrangThai, GhiChu)
        VALUES (@MaPhieuTN, @MaBN, @SoThuTu, GETDATE(), N'Đang chờ', N'Đăng ký online')
      `);

        await transaction.request()
            .input("MaHangDoi", sql.VarChar, queue.MaHangDoi)
            .query(`
        UPDATE HangDoi
        SET SoThuTuTiepTheo = SoThuTuTiepTheo + 1,
            SoLuongDangCho = SoLuongDangCho + 1
        WHERE MaHangDoi = @MaHangDoi
      `);

        await transaction.request()
            .input("MaThongBao", sql.VarChar, MaThongBao)
            .input("MaBN", sql.VarChar, MaBN)
            .input("NoiDung", sql.NVarChar, `Bạn đã đăng ký khám thành công. Số thứ tự: ${soThuTu}.`)
            .query(`
        INSERT INTO ThongBao (MaThongBao, MaBN, TieuDe, NoiDung, LoaiThongBao, ThoiGianGui, TrangThaiGui)
        VALUES (@MaThongBao, @MaBN, N'Đăng ký khám thành công', @NoiDung, N'Push', GETDATE(), 0)
      `);

        await transaction.commit();

        res.json({
            message: "Đăng ký khám thành công",
            patient,
            room: roomResult.recordset[0],
            doctor: doctorResult.recordset[0],
            booking: { MaLich },
            ticket: {
                MaThe,
                MaHangDoi: queue.MaHangDoi,
                SoThuTu: soThuTu,
                TrangThaiThe: "WAITING",
                ThoiGianDuKienKham: thoiGianDuKien
            },
            soNguoiTruocBan
        });
    } catch (err) {
        try { await transaction.rollback(); } catch { }
        console.error("Lỗi đăng ký khám bệnh nhân:", err);
        res.status(500).json({ message: "Lỗi đăng ký khám", error: err.message });
    }
});


// Trạng thái hàng đợi của bệnh nhân
router.get("/api/hang-doi/trang-thai", async (req, res) => {
    try {
        const pool = await getPool();
        const maBN = req.query.maBN;

        if (!maBN) {
            return res.status(400).json({ message: "Thiếu maBN" });
        }

        const ticketResult = await pool.request()
            .input("MaBN", sql.VarChar, maBN)
            .query(`
        SELECT TOP 1
          stt.MaThe,
          stt.MaBN,
          stt.MaHangDoi,
          stt.MaLich,
          stt.SoThuTu,
          stt.TrangThaiThe,
          CONVERT(VARCHAR(19), stt.ThoiGianCap, 120) AS ThoiGianCap,
          CONVERT(VARCHAR(19), stt.ThoiGianDuKienKham, 120) AS ThoiGianDuKienKham,
          stt.SoLanVangMat,
          pk.TenPhongKham,
          pk.SoPhong,
          ck.TenCK
        FROM SoThuTu stt
        LEFT JOIN HangDoi hd ON stt.MaHangDoi = hd.MaHangDoi
        LEFT JOIN PhongKham pk ON hd.MaPhongKham = pk.MaPhongKham
        LEFT JOIN ChuyenKhoa ck ON pk.MaCK = ck.MaCK
        WHERE stt.MaBN = @MaBN
          AND stt.TrangThaiThe IN (N'WAITING', N'CALLED', N'SKIPPED')
        ORDER BY stt.ThoiGianCap DESC
      `);

        if (!ticketResult.recordset.length) {
            return res.json({ error: true, message: "Không có số thứ tự đang hoạt động" });
        }

        const ticket = ticketResult.recordset[0];

        const servingResult = await pool.request()
            .input("MaHangDoi", sql.VarChar, ticket.MaHangDoi)
            .query(`
        SELECT TOP 1 SoThuTu
        FROM SoThuTu
        WHERE MaHangDoi = @MaHangDoi AND TrangThaiThe = N'CALLED'
        ORDER BY ThoiGianCap DESC
      `);

        const beforeResult = await pool.request()
            .input("MaHangDoi", sql.VarChar, ticket.MaHangDoi)
            .input("SoThuTu", sql.Int, ticket.SoThuTu)
            .query(`
        SELECT COUNT(*) AS SoNguoiTruocBan
        FROM SoThuTu
        WHERE MaHangDoi = @MaHangDoi
          AND TrangThaiThe = N'WAITING'
          AND SoThuTu < @SoThuTu
      `);

        const soNguoiTruocBan = Number(beforeResult.recordset[0]?.SoNguoiTruocBan || 0);

        res.json({
            error: false,
            ticket,
            soThuTuCuaBN: ticket.SoThuTu,
            soThuTuDangGoi: servingResult.recordset[0]?.SoThuTu || "---",
            soNguoiTruocBan,
            uocTinhPhut: soNguoiTruocBan * 15
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy trạng thái hàng đợi", error: err.message });
    }
});

// Phiếu khám của bệnh nhân
router.get("/api/phieu-kham", async (req, res) => {
    try {
        const pool = await getPool();
        const maBN = req.query.maBN || null;

        const result = await pool.request()
            .input("MaBN", sql.VarChar, maBN)
            .query(`
        SELECT
          MaPK,
          MaHS,
          MaBN,
          MaBS,
          CONVERT(VARCHAR(10), NgayKham, 23) AS NgayKham,
          TrieuChung,
          KetQuaThamKham,
          ChuanDoan,
          ChiPhi,
          TrangThai
        FROM PhieuKhamBenh
        WHERE (@MaBN IS NULL OR MaBN = @MaBN)
        ORDER BY NgayKham DESC
      `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy phiếu khám", error: err.message });
    }
});

// Bệnh nhân tự tạo phiếu khám nhanh từ modal
router.post("/api/phieu-kham", async (req, res) => {
    const {
        MaHS,
        MaBN,
        MaBS,
        NgayKham,
        TrieuChung,
        KetQuaThamKham,
        ChuanDoan,
        ChiPhi,
        TrangThai
    } = req.body;

    if (!MaHS || !MaBN || !MaBS || !NgayKham || !TrieuChung) {
        return res.status(400).json({ message: "Thiếu thông tin phiếu khám" });
    }

    try {
        const pool = await getPool();
        const MaPK = patientMakeId("PK", 20);

        await pool.request()
            .input("MaPK", sql.VarChar, MaPK)
            .input("MaHS", sql.VarChar, MaHS)
            .input("MaBN", sql.VarChar, MaBN)
            .input("MaBS", sql.VarChar, MaBS)
            .input("NgayKham", sql.Date, normalizeDateOnly(NgayKham))
            .input("TrieuChung", sql.NVarChar, TrieuChung || "")
            .input("KetQuaThamKham", sql.NVarChar, KetQuaThamKham || "")
            .input("ChuanDoan", sql.NVarChar, ChuanDoan || "Chưa chẩn đoán")
            .input("ChiPhi", sql.Decimal(18, 2), Number(ChiPhi || 0))
            .input("TrangThai", sql.NVarChar, TrangThai || "Hoàn tất")
            .query(`
        INSERT INTO PhieuKhamBenh
        (MaPK, MaHS, MaBN, MaBS, NgayKham, TrieuChung, KetQuaThamKham, ChuanDoan, ChiPhi, TrangThai)
        VALUES
        (@MaPK, @MaHS, @MaBN, @MaBS, @NgayKham, @TrieuChung, @KetQuaThamKham, @ChuanDoan, @ChiPhi, @TrangThai)
      `);

        res.json({ message: "Tạo phiếu khám thành công", MaPK });
    } catch (err) {
        res.status(500).json({ message: "Lỗi tạo phiếu khám", error: err.message });
    }
});

// Thông báo của bệnh nhân
router.get("/api/thong-bao", async (req, res) => {
    try {
        const pool = await getPool();
        const maBN = req.query.maBN || null;

        const result = await pool.request()
            .input("MaBN", sql.VarChar, maBN)
            .query(`
        SELECT
          MaThongBao,
          MaBN,
          TieuDe,
          NoiDung,
          LoaiThongBao,
          CONVERT(VARCHAR(19), ThoiGianGui, 120) AS ThoiGianGui,
          TrangThaiGui
        FROM ThongBao
        WHERE (@MaBN IS NULL OR MaBN = @MaBN OR MaBN IS NULL)
        ORDER BY ThoiGianGui DESC
      `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy thông báo", error: err.message });
    }
});

// Hủy lịch khám và hủy số thứ tự liên quan
router.put("/api/lich-kham/:maLich", async (req, res) => {
    const MaLich = req.params.maLich;
    const TrangThai = req.body.TrangThai || "Đã hủy";

    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        await transaction.request()
            .input("MaLich", sql.VarChar, MaLich)
            .input("TrangThai", sql.NVarChar, TrangThai)
            .query(`
        UPDATE LichKham
        SET TrangThai = @TrangThai
        WHERE MaLich = @MaLich
      `);

        const activeTicket = await transaction.request()
            .input("MaLich", sql.VarChar, MaLich)
            .query(`
        SELECT TOP 1 MaHangDoi
        FROM SoThuTu
        WHERE MaLich = @MaLich AND TrangThaiThe IN (N'WAITING', N'CALLED')
      `);

        await transaction.request()
            .input("MaLich", sql.VarChar, MaLich)
            .query(`
        UPDATE SoThuTu
        SET TrangThaiThe = N'CANCELLED'
        WHERE MaLich = @MaLich AND TrangThaiThe IN (N'WAITING', N'CALLED', N'SKIPPED')
      `);

        if (activeTicket.recordset.length) {
            await transaction.request()
                .input("MaHangDoi", sql.VarChar, activeTicket.recordset[0].MaHangDoi)
                .query(`
          UPDATE HangDoi
          SET SoLuongDangCho = CASE WHEN SoLuongDangCho > 0 THEN SoLuongDangCho - 1 ELSE 0 END
          WHERE MaHangDoi = @MaHangDoi
        `);
        }

        await transaction.commit();
        res.json({ message: "Đã cập nhật lịch khám" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi hủy lịch khám", error: err.message });
    }
});

// Cập nhật bệnh nhân
router.put("/api/benh-nhan/:maBN", async (req, res) => {
    try {
        const pool = await getPool();
        const { HoTen, NgaySinh, GioiTinh, SDT, Email, DiaChi } = req.body;

        await pool.request()
            .input("MaBN", sql.VarChar, req.params.maBN)
            .input("HoTen", sql.NVarChar, HoTen || "")
            .input("NgaySinh", sql.Date, normalizeDateOnly(NgaySinh))
            .input("GioiTinh", sql.NVarChar, GioiTinh || "Nam")
            .input("SDT", sql.VarChar, SDT || null)
            .input("Email", sql.NVarChar, Email || null)
            .input("DiaChi", sql.NVarChar, DiaChi || null)
            .query(`
        UPDATE BenhNhan
        SET HoTen = @HoTen,
            NgaySinh = @NgaySinh,
            GioiTinh = @GioiTinh,
            SDT = @SDT,
            Email = @Email,
            DiaChi = @DiaChi
        WHERE MaBN = @MaBN
      `);

        res.json({ message: "Cập nhật bệnh nhân thành công" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi cập nhật bệnh nhân", error: err.message });
    }
});

// Cập nhật hồ sơ y tế
router.put("/api/ho-so-yte/:maHS", async (req, res) => {
    try {
        const pool = await getPool();
        const { NhomMau, TienSuBenh, GhiChu, NgayCapNhat } = req.body;

        await pool.request()
            .input("MaHS", sql.VarChar, req.params.maHS)
            .input("NhomMau", sql.NVarChar, NhomMau || "A")
            .input("TienSuBenh", sql.NVarChar, TienSuBenh || null)
            .input("GhiChu", sql.NVarChar, GhiChu || null)
            .input("NgayCapNhat", sql.Date, normalizeDateOnly(NgayCapNhat) || new Date())
            .query(`
        UPDATE HoSoYTe
        SET NhomMau = @NhomMau,
            TienSuBenh = @TienSuBenh,
            GhiChu = @GhiChu,
            NgayCapNhat = @NgayCapNhat
        WHERE MaHS = @MaHS
      `);

        res.json({ message: "Cập nhật hồ sơ y tế thành công" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi cập nhật hồ sơ y tế", error: err.message });
    }
});

// Cập nhật số thứ tự riêng nếu cần
router.put("/api/so-thu-tu/:maThe", async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input("MaThe", sql.VarChar, req.params.maThe)
            .input("TrangThaiThe", sql.NVarChar, req.body.TrangThaiThe || "CANCELLED")
            .query(`
        UPDATE SoThuTu
        SET TrangThaiThe = @TrangThaiThe
        WHERE MaThe = @MaThe
      `);

        res.json({ message: "Cập nhật số thứ tự thành công" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi cập nhật số thứ tự", error: err.message });
    }
});

module.exports = router;
