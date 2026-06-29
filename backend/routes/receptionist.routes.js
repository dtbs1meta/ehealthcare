const express = require("express");
const router = express.Router();
const { sql, getPool } = require("../db");

function makeId(prefix, totalLength = 20) {
    const time = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return (prefix + time + random).slice(0, totalLength);
}

function mapPriority(priority) {
    const text = String(priority || "Bình thường").toLowerCase();
    if (text.includes("cấp cứu")) return "Cấp cứu";
    if (text.includes("trẻ")) return "Trẻ em";
    if (text.includes("cao tuổi") || text.includes("người già") || text.includes("nguoi gia")) return "Người cao tuổi";
    return "Bình thường";
}

router.get("/api/receptionist/rooms", async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT
                pk.MaPhongKham,
                pk.TenPhongKham,
                pk.SoPhong,
                pk.TrangThaiHoatDong,
                ck.MaCK,
                ck.TenCK,
                bs.MaBS,
                bs.HoTen AS HoTenBacSi,
                hd.MaHangDoi,
                hd.SoThuTuTiepTheo,
                hd.SoLuongDangCho
            FROM PhongKham pk
            LEFT JOIN ChuyenKhoa ck ON pk.MaCK = ck.MaCK
            OUTER APPLY (
                SELECT TOP 1 b.MaBS, b.HoTen
                FROM BacSi b
                WHERE b.MaPhongKham = pk.MaPhongKham
                ORDER BY b.MaBS
            ) bs
            LEFT JOIN HangDoi hd ON pk.MaPhongKham = hd.MaPhongKham
            ORDER BY pk.SoPhong ASC, pk.MaPhongKham ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy danh sách phòng khám", error: err.message });
    }
});

router.get("/api/receptionist/queue", async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT
                stt.MaThe,
                stt.MaBN,
                stt.MaHangDoi,
                stt.SoThuTu,
                stt.TrangThaiThe,
                stt.ThoiGianCap,
                stt.SoLanVangMat,
                bn.HoTen,
                bn.NgaySinh,
                bn.GioiTinh,
                bn.SDT,
                bn.LoaiUuTien,
                hd.MaPhongKham,
                pk.SoPhong,
                pk.TenPhongKham,
                ck.TenCK,
                bs.HoTen AS HoTenBacSi,
                ptn.GhiChu AS TrieuChung
            FROM SoThuTu stt
            JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
            LEFT JOIN HangDoi hd ON stt.MaHangDoi = hd.MaHangDoi
            LEFT JOIN PhongKham pk ON hd.MaPhongKham = pk.MaPhongKham
            LEFT JOIN ChuyenKhoa ck ON pk.MaCK = ck.MaCK
            OUTER APPLY (
                SELECT TOP 1 b.HoTen
                FROM BacSi b
                WHERE b.MaPhongKham = pk.MaPhongKham
                ORDER BY b.MaBS
            ) bs
            OUTER APPLY (
                SELECT TOP 1 p.GhiChu
                FROM PhieuTiepNhan p
                WHERE p.MaBN = bn.MaBN
                ORDER BY p.NgayTiepNhan DESC
            ) ptn
            WHERE CONVERT(date, stt.ThoiGianCap) = CONVERT(date, GETDATE())
            ORDER BY
                CASE stt.TrangThaiThe
                    WHEN N'CALLED' THEN 1
                    WHEN N'WAITING' THEN 2
                    WHEN N'SKIPPED' THEN 3
                    WHEN N'DONE' THEN 4
                    ELSE 5
                END,
                CASE bn.LoaiUuTien
                    WHEN N'Cấp cứu' THEN 1
                    WHEN N'Trẻ em' THEN 2
                    WHEN N'Người cao tuổi' THEN 2
                    ELSE 3
                END,
                stt.SoThuTu ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy hàng đợi lễ tân", error: err.message });
    }
});

router.get("/api/receptionist/patients", async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT TOP 300
                bn.MaBN,
                bn.HoTen,
                bn.NgaySinh,
                bn.GioiTinh,
                bn.DiaChi,
                bn.SDT,
                bn.Email,
                bn.LoaiUuTien,
                latest.MaThe,
                latest.SoThuTu,
                latest.TrangThaiThe,
                latest.ThoiGianCap,
                pk.MaPhongKham,
                pk.SoPhong,
                pk.TenPhongKham
            FROM BenhNhan bn
            OUTER APPLY (
                SELECT TOP 1 *
                FROM SoThuTu s
                WHERE s.MaBN = bn.MaBN
                ORDER BY s.ThoiGianCap DESC
            ) latest
            LEFT JOIN HangDoi hd ON latest.MaHangDoi = hd.MaHangDoi
            LEFT JOIN PhongKham pk ON hd.MaPhongKham = pk.MaPhongKham
            ORDER BY bn.MaBN DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy danh sách bệnh nhân", error: err.message });
    }
});

router.post("/api/receptionist/ticket", async (req, res) => {
    const {
        HoTen,
        NgaySinh,
        GioiTinh,
        SDT,
        DiaChi,
        Email,
        LoaiUuTien,
        TrieuChung,
        MaPhongKham,
        MaNV
    } = req.body;

    if (!HoTen || !NgaySinh || !MaPhongKham) {
        return res.status(400).json({ message: "Thiếu HoTen, NgaySinh hoặc MaPhongKham" });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        let patient = null;
        if (SDT) {
            const existed = await transaction.request()
                .input("SDT", sql.VarChar, SDT)
                .query("SELECT TOP 1 * FROM BenhNhan WHERE SDT = @SDT");
            patient = existed.recordset[0] || null;
        }

        if (!patient) {
            const MaBN = makeId("BN", 10);
            const priority = mapPriority(LoaiUuTien);

            await transaction.request()
                .input("MaBN", sql.VarChar, MaBN)
                .input("HoTen", sql.NVarChar, HoTen)
                .input("NgaySinh", sql.Date, NgaySinh)
                .input("GioiTinh", sql.NVarChar, GioiTinh || "Khác")
                .input("DiaChi", sql.NVarChar, DiaChi || null)
                .input("SDT", sql.VarChar, SDT || null)
                .input("Email", sql.NVarChar, Email || null)
                .input("LoaiUuTien", sql.NVarChar, priority)
                .query(`
                    INSERT INTO BenhNhan
                    (MaBN, HoTen, NgaySinh, GioiTinh, DiaChi, SDT, Email, LoaiUuTien)
                    VALUES
                    (@MaBN, @HoTen, @NgaySinh, @GioiTinh, @DiaChi, @SDT, @Email, @LoaiUuTien)
                `);

            patient = { MaBN, HoTen, NgaySinh, GioiTinh: GioiTinh || "Khác", SDT, LoaiUuTien: priority };

            const nvResult = await transaction.request()
                .input("MaNV", sql.VarChar, MaNV || null)
                .query(`
                    SELECT TOP 1 MaNV
                    FROM NhanVien
                    WHERE MaNV = ISNULL(@MaNV, MaNV)
                    ORDER BY MaNV
                `);
            const safeMaNV = nvResult.recordset[0]?.MaNV;

            if (safeMaNV) {
                const MaHS = makeId("HS", 20);
                await transaction.request()
                    .input("MaHS", sql.VarChar, MaHS)
                    .input("MaBN", sql.VarChar, MaBN)
                    .input("MaNV", sql.VarChar, safeMaNV)
                    .query(`
                        INSERT INTO HoSoYTe
                        (MaHS, MaBN, MaNV, NhomMau, Rh, DiUng, TienSuBenh, BenhNen, HinhThucTao)
                        VALUES
                        (@MaHS, @MaBN, @MaNV, N'O', N'+', NULL, NULL, NULL, N'Trực tiếp')
                    `);
            }
        } else {
            // Nếu SĐT đã tồn tại, cập nhật lại thông tin theo form lễ tân.
            // Trước đây đoạn này chỉ cập nhật LoaiUuTien nên khi test lại cùng SĐT,
            // tên bệnh nhân vẫn hiện tên cũ trong database.
            const priority = mapPriority(LoaiUuTien || patient.LoaiUuTien);

            await transaction.request()
                .input("MaBN", sql.VarChar, patient.MaBN)
                .input("HoTen", sql.NVarChar, HoTen)
                .input("NgaySinh", sql.Date, NgaySinh)
                .input("GioiTinh", sql.NVarChar, GioiTinh || patient.GioiTinh || "Khác")
                .input("DiaChi", sql.NVarChar, DiaChi || patient.DiaChi || null)
                .input("Email", sql.NVarChar, Email || patient.Email || null)
                .input("LoaiUuTien", sql.NVarChar, priority)
                .query(`
                    UPDATE BenhNhan
                    SET HoTen = @HoTen,
                        NgaySinh = @NgaySinh,
                        GioiTinh = @GioiTinh,
                        DiaChi = @DiaChi,
                        Email = @Email,
                        LoaiUuTien = @LoaiUuTien
                    WHERE MaBN = @MaBN
                `);

            patient.HoTen = HoTen;
            patient.NgaySinh = NgaySinh;
            patient.GioiTinh = GioiTinh || patient.GioiTinh || "Khác";
            patient.DiaChi = DiaChi || patient.DiaChi || null;
            patient.Email = Email || patient.Email || null;
            patient.LoaiUuTien = priority;
        }

        let hdResult = await transaction.request()
            .input("MaPhongKham", sql.VarChar, MaPhongKham)
            .query("SELECT TOP 1 * FROM HangDoi WHERE MaPhongKham = @MaPhongKham");

        let hangDoi = hdResult.recordset[0];
        if (!hangDoi) {
            const MaHangDoi = makeId("HD", 20);
            await transaction.request()
                .input("MaHangDoi", sql.VarChar, MaHangDoi)
                .input("MaPhongKham", sql.VarChar, MaPhongKham)
                .query(`
                    INSERT INTO HangDoi (MaHangDoi, MaPhongKham, SoThuTuTiepTheo, SoLuongDangCho)
                    VALUES (@MaHangDoi, @MaPhongKham, 1, 0)
                `);
            hangDoi = { MaHangDoi, SoThuTuTiepTheo: 1, SoLuongDangCho: 0 };
        }

        const SoThuTu = hangDoi.SoThuTuTiepTheo || 1;
        const MaThe = makeId("STT", 20);
        await transaction.request()
            .input("MaThe", sql.VarChar, MaThe)
            .input("MaBN", sql.VarChar, patient.MaBN)
            .input("MaHangDoi", sql.VarChar, hangDoi.MaHangDoi)
            .input("SoThuTu", sql.Int, SoThuTu)
            .query(`
                INSERT INTO SoThuTu
                (MaThe, MaBN, MaHangDoi, MaLich, SoThuTu, TrangThaiThe, ThoiGianCap, SoLanVangMat)
                VALUES
                (@MaThe, @MaBN, @MaHangDoi, NULL, @SoThuTu, N'WAITING', GETDATE(), 0)
            `);

        const MaPhieuTN = makeId("PT", 10);
        await transaction.request()
            .input("MaPhieuTN", sql.VarChar, MaPhieuTN)
            .input("MaBN", sql.VarChar, patient.MaBN)
            .input("SoThuTu", sql.Int, SoThuTu)
            .input("GhiChu", sql.NVarChar, TrieuChung || null)
            .query(`
                INSERT INTO PhieuTiepNhan
                (MaPhieuTN, MaBN, SoThuTu, NgayTiepNhan, TrangThai, GhiChu)
                VALUES
                (@MaPhieuTN, @MaBN, @SoThuTu, GETDATE(), N'Đang chờ', @GhiChu)
            `);

        await transaction.request()
            .input("MaHangDoi", sql.VarChar, hangDoi.MaHangDoi)
            .query(`
                UPDATE HangDoi
                SET SoThuTuTiepTheo = SoThuTuTiepTheo + 1,
                    SoLuongDangCho = SoLuongDangCho + 1
                WHERE MaHangDoi = @MaHangDoi
            `);

        const roomResult = await transaction.request()
            .input("MaPhongKham", sql.VarChar, MaPhongKham)
            .query(`
                SELECT TOP 1 pk.*, ck.TenCK, bs.HoTen AS HoTenBacSi
                FROM PhongKham pk
                LEFT JOIN ChuyenKhoa ck ON pk.MaCK = ck.MaCK
                LEFT JOIN BacSi bs ON pk.MaPhongKham = bs.MaPhongKham
                WHERE pk.MaPhongKham = @MaPhongKham
            `);

        await transaction.commit();

        const room = roomResult.recordset[0] || {};
        const prefix = room.TenCK?.includes("Tim") ? "TM" : room.TenCK?.includes("Thần") ? "TK" : room.TenCK?.includes("Da") ? "DL" : room.TenCK?.includes("Tai") ? "TMH" : "A";

        res.json({
            message: "Cấp số thứ tự thành công",
            patient,
            room,
            ticket: { MaThe, MaBN: patient.MaBN, MaHangDoi: hangDoi.MaHangDoi, SoThuTu, TrangThaiThe: "WAITING" },
            sttText: `${prefix}-${String(SoThuTu).padStart(3, "0")}`
        });
    } catch (err) {
        try { await transaction.rollback(); } catch (_) { }
        res.status(500).json({ message: "Lỗi cấp số thứ tự", error: err.message });
    }
});

router.put("/api/receptionist/ticket/:maThe/status", async (req, res) => {
    try {
        const status = String(req.body.TrangThaiThe || "").toUpperCase();
        const allowed = ["WAITING", "CALLED", "DONE", "SKIPPED", "CANCELLED"];
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: "Trạng thái không hợp lệ" });
        }

        const pool = await getPool();
        await pool.request()
            .input("MaThe", sql.VarChar, req.params.maThe)
            .input("TrangThaiThe", sql.NVarChar, status)
            .query(`
                UPDATE SoThuTu
                SET TrangThaiThe = @TrangThaiThe,
                    SoLanVangMat = CASE WHEN @TrangThaiThe = N'SKIPPED' THEN SoLanVangMat + 1 ELSE SoLanVangMat END
                WHERE MaThe = @MaThe
            `);

        res.json({ message: "Đã cập nhật trạng thái" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi cập nhật trạng thái", error: err.message });
    }
});

router.put("/api/receptionist/call/:maThe", async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input("MaThe", sql.VarChar, req.params.maThe)
            .query("UPDATE SoThuTu SET TrangThaiThe = N'CALLED' WHERE MaThe = @MaThe");
        res.json({ message: "Đã gọi bệnh nhân" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi gọi bệnh nhân", error: err.message });
    }
});

router.put("/api/receptionist/skip/:maThe", async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input("MaThe", sql.VarChar, req.params.maThe)
            .query("UPDATE SoThuTu SET TrangThaiThe = N'SKIPPED', SoLanVangMat = SoLanVangMat + 1 WHERE MaThe = @MaThe");
        res.json({ message: "Đã bỏ qua bệnh nhân" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi bỏ qua bệnh nhân", error: err.message });
    }
});

router.put("/api/receptionist/resume/:maThe", async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input("MaThe", sql.VarChar, req.params.maThe)
            .query("UPDATE SoThuTu SET TrangThaiThe = N'WAITING' WHERE MaThe = @MaThe");
        res.json({ message: "Đã đưa bệnh nhân trở lại hàng đợi" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi khôi phục bệnh nhân", error: err.message });
    }
});

router.put("/api/receptionist/call-next", async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT TOP 1
                stt.MaThe,
                stt.SoThuTu,
                bn.MaBN,
                bn.HoTen,
                bn.LoaiUuTien
            FROM SoThuTu stt
            JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
            WHERE stt.TrangThaiThe = N'WAITING'
              AND CONVERT(date, stt.ThoiGianCap) = CONVERT(date, GETDATE())
            ORDER BY
                CASE bn.LoaiUuTien
                    WHEN N'Cấp cứu' THEN 1
                    WHEN N'Trẻ em' THEN 2
                    WHEN N'Người cao tuổi' THEN 2
                    ELSE 3
                END,
                stt.SoThuTu ASC
        `);

        if (!result.recordset.length) {
            return res.status(404).json({ message: "Không có bệnh nhân đang chờ" });
        }

        const patient = result.recordset[0];
        await pool.request()
            .input("MaThe", sql.VarChar, patient.MaThe)
            .query("UPDATE SoThuTu SET TrangThaiThe = N'CALLED' WHERE MaThe = @MaThe");

        res.json({ message: "Đã gọi bệnh nhân tiếp theo", patient });
    } catch (err) {
        res.status(500).json({ message: "Lỗi gọi bệnh nhân tiếp theo", error: err.message });
    }
});

router.put("/api/receptionist/transfer/:maThe", async (req, res) => {
    try {
        const { MaPhongKham } = req.body;
        if (!MaPhongKham) return res.status(400).json({ message: "Thiếu MaPhongKham" });

        const pool = await getPool();
        const hd = await pool.request()
            .input("MaPhongKham", sql.VarChar, MaPhongKham)
            .query("SELECT TOP 1 MaHangDoi FROM HangDoi WHERE MaPhongKham = @MaPhongKham");

        if (!hd.recordset.length) {
            return res.status(404).json({ message: "Không tìm thấy hàng đợi của phòng khám" });
        }

        await pool.request()
            .input("MaThe", sql.VarChar, req.params.maThe)
            .input("MaHangDoi", sql.VarChar, hd.recordset[0].MaHangDoi)
            .query(`
                UPDATE SoThuTu
                SET MaHangDoi = @MaHangDoi,
                    TrangThaiThe = N'WAITING'
                WHERE MaThe = @MaThe
            `);

        res.json({ message: "Đã chuyển bệnh nhân sang phòng mới" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi chuyển phòng", error: err.message });
    }
});

// ==================== PATIENT API ROUTES ====================

module.exports = router;
