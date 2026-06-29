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

app.listen(3000, () => {
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
    console.log("Server đang chạy tại http://localhost:3000");
});