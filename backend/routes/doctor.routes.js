const express = require("express");
const router = express.Router();
const { sql, getPool } = require("../db");

router.get("/api/doctor/queue", async (req, res) => {
    try {
        const pool = await getPool();

        const result = await pool.request().query(`
            SELECT 
                stt.MaThe,
                stt.SoThuTu,
                stt.TrangThaiThe,
                stt.ThoiGianCap,
                bn.MaBN,
                bn.HoTen,
                bn.NgaySinh,
                bn.GioiTinh,
                bn.SDT,
                bn.LoaiUuTien,
                hs.MaHS,
                hs.DiUng,
                hs.TienSuBenh,
                hs.BenhNen
            FROM SoThuTu stt
            JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
            LEFT JOIN HoSoYTe hs ON bn.MaBN = hs.MaBN
            WHERE stt.TrangThaiThe IN (N'WAITING', N'CALLED')
            ORDER BY 
                CASE 
                    WHEN bn.LoaiUuTien = N'Cấp cứu' THEN 1
                    WHEN bn.LoaiUuTien = N'Trẻ em' THEN 2
                    WHEN bn.LoaiUuTien = N'Người cao tuổi' THEN 3
                    ELSE 4
                END,
                stt.SoThuTu ASC
        `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({
            message: "Lỗi lấy hàng chờ bác sĩ",
            error: err.message
        });
    }
});
router.put("/api/doctor/next", async (req, res) => {
    try {
        const pool = await getPool();

        const nextPatient = await pool.request().query(`
            SELECT TOP 1 
                stt.MaThe,
                stt.SoThuTu,
                stt.TrangThaiThe,
                bn.MaBN,
                bn.HoTen,
                bn.NgaySinh,
                bn.GioiTinh,
                bn.SDT,
                bn.LoaiUuTien
            FROM SoThuTu stt
            JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
            WHERE stt.TrangThaiThe = N'WAITING'
            ORDER BY 
                CASE 
                    WHEN bn.LoaiUuTien = N'Cấp cứu' THEN 1
                    WHEN bn.LoaiUuTien = N'Trẻ em' THEN 2
                    WHEN bn.LoaiUuTien = N'Người cao tuổi' THEN 3
                    ELSE 4
                END,
                stt.SoThuTu ASC
        `);

        if (nextPatient.recordset.length === 0) {
            return res.status(404).json({ message: "Không có bệnh nhân đang chờ" });
        }

        const patient = nextPatient.recordset[0];

        await pool.request()
            .input("MaThe", sql.VarChar, patient.MaThe)
            .query(`
                UPDATE SoThuTu
                SET TrangThaiThe = N'CALLED'
                WHERE MaThe = @MaThe
            `);

        res.json({
            message: "Đã gọi bệnh nhân tiếp theo",
            patient
        });
    } catch (err) {
        res.status(500).json({
            message: "Lỗi gọi bệnh nhân tiếp theo",
            error: err.message
        });
    }
});
router.get("/api/doctor/patient/:maBN", async (req, res) => {
    try {
        const pool = await getPool();

        const result = await pool.request()
            .input("MaBN", sql.VarChar, req.params.maBN)
            .query(`
                SELECT 
                    bn.MaBN,
                    bn.HoTen,
                    bn.NgaySinh,
                    bn.GioiTinh,
                    bn.DiaChi,
                    bn.SDT,
                    bn.Email,
                    bn.LoaiUuTien,
                    hs.MaHS,
                    hs.NhomMau,
                    hs.Rh,
                    hs.DiUng,
                    hs.TienSuBenh,
                    hs.BenhNen,
                    hs.GhiChu
                FROM BenhNhan bn
                LEFT JOIN HoSoYTe hs ON bn.MaBN = hs.MaBN
                WHERE bn.MaBN = @MaBN
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bệnh nhân" });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({
            message: "Lỗi lấy chi tiết bệnh nhân",
            error: err.message
        });
    }
});
router.get("/api/thuoc", async (req, res) => {
    try {
        const pool = await getPool();

        const result = await pool.request().query(`
            SELECT MaThuoc, TenThuoc, DonViTinh, MoTa
            FROM Thuoc
            ORDER BY TenThuoc
        `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({
            message: "Lỗi lấy danh sách thuốc",
            error: err.message
        });
    }
});
function makeId(prefix, length = 8) {
    return prefix + Date.now().toString().slice(-length);
}

router.post("/api/doctor/exam", async (req, res) => {
    const {
        MaBN,
        MaHS,
        MaBS,
        TrieuChung,
        KetQuaThamKham,
        ChuanDoan,
        ChiPhi,
        prescription
    } = req.body;

    if (!MaBN || !MaHS || !MaBS || !ChuanDoan) {
        return res.status(400).json({
            message: "Thiếu MaBN, MaHS, MaBS hoặc ChuanDoan"
        });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const MaPK = makeId("PK", 8);

        await transaction.request()
            .input("MaPK", sql.VarChar, MaPK)
            .input("MaHS", sql.VarChar, MaHS)
            .input("MaBN", sql.VarChar, MaBN)
            .input("MaBS", sql.VarChar, MaBS)
            .input("TrieuChung", sql.NVarChar, TrieuChung || "")
            .input("KetQuaThamKham", sql.NVarChar, KetQuaThamKham || "")
            .input("ChuanDoan", sql.NVarChar, ChuanDoan)
            .input("ChiPhi", sql.Decimal(18, 2), ChiPhi || 0)
            .query(`
                INSERT INTO PhieuKhamBenh
                (MaPK, MaHS, MaBN, MaBS, NgayKham, TrieuChung, KetQuaThamKham, ChuanDoan, ChiPhi, TrangThai)
                VALUES
                (@MaPK, @MaHS, @MaBN, @MaBS, GETDATE(), @TrieuChung, @KetQuaThamKham, @ChuanDoan, @ChiPhi, N'Hoàn tất')
            `);

        if (Array.isArray(prescription) && prescription.length > 0) {
            const MaDT = makeId("DT", 8);

            await transaction.request()
                .input("MaDT", sql.VarChar, MaDT)
                .input("MaPK", sql.VarChar, MaPK)
                .query(`
                    INSERT INTO DonThuoc (MaDT, MaPK, NgayLap, GhiChu)
                    VALUES (@MaDT, @MaPK, GETDATE(), N'Đơn thuốc bác sĩ kê')
                `);

            for (let i = 0; i < prescription.length; i++) {
                const item = prescription[i];

                const MaCTDT = "CT" + Date.now().toString().slice(-6) + String(i + 1).padStart(2, "0");

                await transaction.request()
                    .input("MaCTDT", sql.VarChar, MaCTDT)
                    .input("MaDT", sql.VarChar, MaDT)
                    .input("MaThuoc", sql.VarChar, item.MaThuoc)
                    .input("SoLuong", sql.Int, Number(item.SoLuong || 1))
                    .input("LieuLuong", sql.NVarChar, item.LieuLuong || "")
                    .input("CachDung", sql.NVarChar, item.CachDung || "")
                    .input("ThoiGianDung", sql.NVarChar, item.ThoiGianDung || "")
                    .query(`
                        INSERT INTO ChiTietDonThuoc
                        (MaCTDT, MaDT, MaThuoc, SoLuong, LieuLuong, CachDung, ThoiGianDung)
                        VALUES
                        (@MaCTDT, @MaDT, @MaThuoc, @SoLuong, @LieuLuong, @CachDung, @ThoiGianDung)
                    `);
            }
        }

        await transaction.request()
            .input("MaBN", sql.VarChar, MaBN)
            .query(`
                UPDATE SoThuTu
                SET TrangThaiThe = N'DONE'
                WHERE MaBN = @MaBN AND TrangThaiThe IN (N'WAITING', N'CALLED')
            `);

        await transaction.commit();

        res.json({
            message: "Đã lưu phiếu khám thành công",
            MaPK
        });
    } catch (err) {
        await transaction.rollback();

        res.status(500).json({
            message: "Lỗi lưu phiếu khám",
            error: err.message
        });
    }
});



function normalizeDoctorText(value) {
    return (value ?? "").toString().trim();
}

router.get("/api/doctor/me", async (req, res) => {
    try {
        const maBS = normalizeDoctorText(req.query.maBS);
        if (!maBS) return res.status(400).json({ message: "Thiếu maBS" });

        const pool = await getPool();
        const result = await pool.request()
            .input("MaBS", sql.VarChar(10), maBS)
            .query(`
        SELECT TOP 1
          bs.MaBS,
          bs.HoTen,
          bs.GioiTinh,
          bs.SDT,
          bs.Email,
          bs.ChucVu,
          bs.CaTruc,
          bs.MaCK,
          ck.TenCK,
          bs.MaPhongKham,
          pk.TenPhongKham,
          pk.SoPhong
        FROM dbo.BacSi bs
        LEFT JOIN dbo.ChuyenKhoa ck ON bs.MaCK = ck.MaCK
        LEFT JOIN dbo.PhongKham pk ON bs.MaPhongKham = pk.MaPhongKham
        WHERE bs.MaBS = @MaBS
      `);

        if (!result.recordset.length) {
            return res.status(404).json({ message: "Không tìm thấy bác sĩ" });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy thông tin bác sĩ", error: err.message });
    }
});

// Hàng đợi riêng theo bác sĩ đang đăng nhập
router.get("/api/doctor/my-queue", async (req, res) => {
    try {
        const maBS = normalizeDoctorText(req.query.maBS);
        if (!maBS) return res.status(400).json({ message: "Thiếu maBS" });

        const pool = await getPool();
        const result = await pool.request()
            .input("MaBS", sql.VarChar(10), maBS)
            .query(`
        SELECT
          stt.MaThe,
          stt.MaBN,
          stt.MaHangDoi,
          stt.MaLich,
          stt.SoThuTu,
          stt.TrangThaiThe,
          stt.ThoiGianCap,
          stt.ThoiGianDuKienKham,
          stt.SoLanVangMat,
          bn.HoTen,
          bn.NgaySinh,
          bn.GioiTinh,
          bn.SDT,
          bn.LoaiUuTien,
          hs.MaHS,
          hs.NhomMau,
          hs.Rh,
          hs.DiUng,
          hs.TienSuBenh,
          hs.BenhNen,
          ptn.GhiChu AS TrieuChung,
          pk.MaPhongKham,
          pk.TenPhongKham,
          pk.SoPhong,
          ck.TenCK,
          bs.MaBS,
          bs.HoTen AS TenBacSi
        FROM dbo.SoThuTu stt
        JOIN dbo.BenhNhan bn ON stt.MaBN = bn.MaBN
        JOIN dbo.HangDoi hd ON stt.MaHangDoi = hd.MaHangDoi
        JOIN dbo.PhongKham pk ON hd.MaPhongKham = pk.MaPhongKham
        JOIN dbo.BacSi bs ON bs.MaPhongKham = pk.MaPhongKham AND bs.MaBS = @MaBS
        LEFT JOIN dbo.ChuyenKhoa ck ON pk.MaCK = ck.MaCK
        LEFT JOIN dbo.LichKham lk ON stt.MaLich = lk.MaLich
        OUTER APPLY (
          SELECT TOP 1 h.*
          FROM dbo.HoSoYTe h
          WHERE h.MaBN = bn.MaBN
          ORDER BY h.NgayCapNhat DESC, h.MaHS DESC
        ) hs
        OUTER APPLY (
          SELECT TOP 1 p.GhiChu
          FROM dbo.PhieuTiepNhan p
          WHERE p.MaBN = bn.MaBN
          ORDER BY p.NgayTiepNhan DESC, p.MaPhieuTN DESC
        ) ptn
        WHERE stt.TrangThaiThe IN (N'WAITING', N'CALLED', N'SKIPPED')
          AND CONVERT(date, stt.ThoiGianCap) = CONVERT(date, GETDATE())
        ORDER BY
          CASE
            WHEN bn.LoaiUuTien = N'Cấp cứu' THEN 1
            WHEN bn.LoaiUuTien IN (N'Trẻ em', N'Người cao tuổi') THEN 2
            ELSE 3
          END,
          stt.SoThuTu ASC
      `);

        res.json(result.recordset);
    } catch (err) {
        console.error("Lỗi lấy hàng đợi riêng bác sĩ:", err);
        res.status(500).json({ message: "Lỗi lấy hàng đợi riêng bác sĩ", error: err.message });
    }
});

// Gọi bệnh nhân tiếp theo trong hàng đợi riêng của bác sĩ
router.put("/api/doctor/my-next", async (req, res) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        const maBS = normalizeDoctorText(req.body.MaBS || req.body.maBS || req.query.maBS);
        if (!maBS) return res.status(400).json({ message: "Thiếu MaBS" });

        await transaction.begin();

        const next = await new sql.Request(transaction)
            .input("MaBS", sql.VarChar(10), maBS)
            .query(`
        SELECT TOP 1
          stt.MaThe,
          stt.MaBN,
          stt.SoThuTu,
          bn.HoTen,
          bn.NgaySinh,
          bn.GioiTinh,
          bn.SDT,
          bn.LoaiUuTien
        FROM dbo.SoThuTu stt
        JOIN dbo.BenhNhan bn ON stt.MaBN = bn.MaBN
        JOIN dbo.HangDoi hd ON stt.MaHangDoi = hd.MaHangDoi
        JOIN dbo.PhongKham pk ON hd.MaPhongKham = pk.MaPhongKham
        JOIN dbo.BacSi bs ON bs.MaPhongKham = pk.MaPhongKham AND bs.MaBS = @MaBS
        WHERE stt.TrangThaiThe = N'WAITING'
          AND CONVERT(date, stt.ThoiGianCap) = CONVERT(date, GETDATE())
        ORDER BY
          CASE
            WHEN bn.LoaiUuTien = N'Cấp cứu' THEN 1
            WHEN bn.LoaiUuTien IN (N'Trẻ em', N'Người cao tuổi') THEN 2
            ELSE 3
          END,
          stt.SoThuTu ASC
      `);

        if (!next.recordset.length) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không còn bệnh nhân đang chờ trong hàng đợi của bác sĩ này" });
        }

        const row = next.recordset[0];

        await new sql.Request(transaction)
            .input("MaThe", sql.VarChar(20), row.MaThe)
            .query(`
        UPDATE dbo.SoThuTu
        SET TrangThaiThe = N'CALLED'
        WHERE MaThe = @MaThe
      `);

        await transaction.commit();

        res.json({
            message: "Đã gọi bệnh nhân tiếp theo",
            patient: row
        });
    } catch (err) {
        try { await transaction.rollback(); } catch (_) { }
        console.error("Lỗi gọi bệnh nhân tiếp theo của bác sĩ:", err);
        res.status(500).json({ message: "Lỗi gọi bệnh nhân tiếp theo", error: err.message });
    }
});
// ==================== AUTH LOGIN FIX: PATIENT + DOCTOR + RECEPTIONIST ====================

module.exports = router;
