const express = require("express");
const cors = require("cors");
const sql = require("mssql/msnodesqlv8");

const app = express();
app.use(cors());
app.use(express.json());

const config = {
    connectionString:
        "Driver={ODBC Driver 17 for SQL Server};Server=localhost\\SQLEXPRESS02;Database=QuanLyKham1;Trusted_Connection=Yes;TrustServerCertificate=Yes;"
};

async function getPool() {
    return await sql.connect(config);
}

app.get("/", (req, res) => {
    res.send("Backend eHealthCare đang chạy");
});

app.get("/api/test-db", async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT DB_NAME() AS database_name");
        res.json({
            message: "Kết nối SQL Server thành công",
            database: result.recordset[0].database_name
        });
    } catch (err) {
        res.status(500).json({
            message: "Lỗi kết nối SQL Server",
            error: err.message
        });
    }
});

app.get("/api/benhnhan", async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT TOP 50 * FROM BenhNhan");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({
            message: "Lỗi lấy danh sách bệnh nhân",
            error: err.message
        });
    }
});

app.get("/api/doctor/queue", async (req, res) => {
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
app.put("/api/doctor/next", async (req, res) => {
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
app.get("/api/doctor/patient/:maBN", async (req, res) => {
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
app.get("/api/thuoc", async (req, res) => {
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

app.post("/api/doctor/exam", async (req, res) => {
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

// ==================== RECEPTIONIST API ROUTES ====================
// Dán toàn bộ khối này vào backend/server.js, đặt TRƯỚC app.listen(...)

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

app.get("/api/receptionist/rooms", async (req, res) => {
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

app.get("/api/receptionist/queue", async (req, res) => {
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

app.get("/api/receptionist/patients", async (req, res) => {
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

app.post("/api/receptionist/ticket", async (req, res) => {
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

app.put("/api/receptionist/ticket/:maThe/status", async (req, res) => {
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

app.put("/api/receptionist/call/:maThe", async (req, res) => {
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

app.put("/api/receptionist/skip/:maThe", async (req, res) => {
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

app.put("/api/receptionist/resume/:maThe", async (req, res) => {
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

app.put("/api/receptionist/call-next", async (req, res) => {
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

app.put("/api/receptionist/transfer/:maThe", async (req, res) => {
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
// Dán block này vào backend/server.js, trước app.listen(...)
// Block dùng các biến đã có trong server.js: app, getPool, sql

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
app.get("/api/chuyen-khoa", async (req, res) => {
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
app.get("/api/phong-kham", async (req, res) => {
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
app.get("/api/bac-si", async (req, res) => {
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
app.get("/api/lich-lam-viec", async (req, res) => {
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
app.get("/api/benh-nhan/:maBN/ho-so", async (req, res) => {
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

app.get("/api/benh-nhan/:maBN", async (req, res) => {
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
app.get("/api/the-bhyt", async (req, res) => {
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
app.get("/api/lich-kham", async (req, res) => {
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
// Thay TOÀN BỘ route cũ app.post("/api/patient/booking", ...) bằng block này.
// Block dùng biến đã có trong server.js: app, getPool, sql

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

app.post("/api/patient/booking", async (req, res) => {
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
app.get("/api/hang-doi/trang-thai", async (req, res) => {
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
app.get("/api/phieu-kham", async (req, res) => {
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
app.post("/api/phieu-kham", async (req, res) => {
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
app.get("/api/thong-bao", async (req, res) => {
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
app.put("/api/lich-kham/:maLich", async (req, res) => {
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
app.put("/api/benh-nhan/:maBN", async (req, res) => {
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
app.put("/api/ho-so-yte/:maHS", async (req, res) => {
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
app.put("/api/so-thu-tu/:maThe", async (req, res) => {
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


app.listen(3000, () => {


    console.log("Server đang chạy tại http://localhost:3000");
});