const express = require("express");
const router = express.Router();
const { sql, getPool } = require("../db");

function normalizeText(value) {
    return (value ?? "").toString().trim();
}

function normalizePatientPriority(value) {
    const v = normalizeText(value);
    if (["Cấp cứu", "Trẻ em", "Người cao tuổi", "Bình thường"].includes(v)) return v;
    return "Bình thường";
}

async function makeNextPatientId(pool) {
    const result = await pool.request().query(`
    SELECT ISNULL(MAX(TRY_CONVERT(INT, SUBSTRING(MaBN, 3, 20))), 0) + 1 AS NextNum
    FROM BenhNhan
    WHERE MaBN LIKE 'BN%'
  `);
    return "BN" + String(result.recordset[0].NextNum).padStart(3, "0");
}

async function makeNextAccountId(pool) {
    const result = await pool.request().query(`
    SELECT ISNULL(MAX(TRY_CONVERT(INT, SUBSTRING(MaTK, 3, 20))), 0) + 1 AS NextNum
    FROM TaiKhoanWeb
    WHERE MaTK LIKE 'TK%'
  `);
    return "TK" + String(result.recordset[0].NextNum).padStart(3, "0");
}

async function makeNextHoSoId(pool) {
    const result = await pool.request().query(`
    SELECT ISNULL(MAX(TRY_CONVERT(INT, SUBSTRING(MaHS, 3, 20))), 0) + 1 AS NextNum
    FROM HoSoYTe
    WHERE MaHS LIKE 'HS%'
  `);
    return "HS" + String(result.recordset[0].NextNum).padStart(3, "0");
}

async function getDefaultNhanVien(pool) {
    const result = await pool.request().query(`
    SELECT TOP 1 MaNV
    FROM NhanVien
    ORDER BY MaNV
  `);
    return result.recordset[0]?.MaNV || "NV001";
}





// Tạo tài khoản bệnh nhân mới: tạo BenhNhan + TaiKhoanWeb + HoSoYTe mặc định
router.post("/api/auth/register-patient", async (req, res) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        const HoTen = normalizeText(req.body.HoTen);
        const NgaySinh = normalizeText(req.body.NgaySinh);
        const GioiTinh = normalizeText(req.body.GioiTinh || "Nam");
        const SDT = normalizeText(req.body.SDT);
        const Email = normalizeText(req.body.Email);
        const DiaChi = normalizeText(req.body.DiaChi);
        const TenDN = normalizeText(req.body.TenDN || req.body.username);
        const MatKhau = normalizeText(req.body.MatKhau || req.body.password);
        const LoaiUuTien = normalizePatientPriority(req.body.LoaiUuTien);

        if (!HoTen || !NgaySinh || !SDT || !Email || !TenDN || !MatKhau) {
            return res.status(400).json({ message: "Vui lòng nhập đủ họ tên, ngày sinh, SĐT, email, tên đăng nhập, mật khẩu" });
        }

        if (!/^\d{10,15}$/.test(SDT)) {
            return res.status(400).json({ message: "Số điện thoại phải từ 10 đến 15 chữ số" });
        }

        await transaction.begin();
        const request = new sql.Request(transaction);

        const duplicate = await request
            .input("TenDN_Check", sql.NVarChar(100), TenDN)
            .input("Email_Check", sql.NVarChar(100), Email)
            .input("SDT_Check", sql.NVarChar(15), SDT)
            .query(`
        SELECT TOP 1 MaTK, TenDN, Email, SDT
        FROM TaiKhoanWeb
        WHERE TenDN = @TenDN_Check OR Email = @Email_Check OR SDT = @SDT_Check
      `);

        if (duplicate.recordset.length > 0) {
            await transaction.rollback();
            return res.status(409).json({ message: "Tên đăng nhập, email hoặc SĐT đã có tài khoản" });
        }

        const MaBN = await makeNextPatientId(pool);
        const MaTK = await makeNextAccountId(pool);
        const MaHS = await makeNextHoSoId(pool);
        const MaNV = await getDefaultNhanVien(pool);

        await new sql.Request(transaction)
            .input("MaBN", sql.VarChar(10), MaBN)
            .input("HoTen", sql.NVarChar(100), HoTen)
            .input("NgaySinh", sql.Date, NgaySinh)
            .input("GioiTinh", sql.NVarChar(10), GioiTinh)
            .input("DiaChi", sql.NVarChar(255), DiaChi || null)
            .input("SDT", sql.VarChar(15), SDT)
            .input("Email", sql.NVarChar(100), Email)
            .input("LoaiUuTien", sql.NVarChar(20), LoaiUuTien)
            .query(`
        INSERT INTO BenhNhan
          (MaBN, HoTen, NgaySinh, GioiTinh, DiaChi, SDT, SDTLienHe, Email, QuanHeBN, LoaiUuTien)
        VALUES
          (@MaBN, @HoTen, @NgaySinh, @GioiTinh, @DiaChi, @SDT, NULL, @Email, NULL, @LoaiUuTien)
      `);

        await new sql.Request(transaction)
            .input("MaTK", sql.VarChar(20), MaTK)
            .input("MaBN", sql.VarChar(10), MaBN)
            .input("TenDN", sql.NVarChar(100), TenDN)
            .input("MatKhau", sql.NVarChar(255), MatKhau)
            .input("Email", sql.NVarChar(100), Email)
            .input("SDT", sql.NVarChar(15), SDT)
            .query(`
        INSERT INTO TaiKhoanWeb (MaTK, MaBN, TenDN, MatKhau, Email, SDT, NgayTao, MaQR)
        VALUES (@MaTK, @MaBN, @TenDN, @MatKhau, @Email, @SDT, GETDATE(), NULL)
      `);

        await new sql.Request(transaction)
            .input("MaHS", sql.VarChar(20), MaHS)
            .input("MaBN", sql.VarChar(10), MaBN)
            .input("MaNV", sql.VarChar(20), MaNV)
            .query(`
        INSERT INTO HoSoYTe
          (MaHS, MaBN, MaNV, NhomMau, Rh, DiUng, TienSuBenh, BenhNen, NgayTao, NgayCapNhat, GhiChu, HinhThucTao)
        VALUES
          (@MaHS, @MaBN, @MaNV, N'O', N'+', NULL, NULL, NULL, GETDATE(), GETDATE(), N'Tạo từ đăng ký tài khoản web', N'Online')
      `);

        await transaction.commit();

        res.json({
            message: "Tạo tài khoản bệnh nhân thành công",
            user: {
                role: "patient",
                maBN: MaBN,
                maTK: MaTK,
                tenDN: TenDN,
                hoTen: HoTen,
                email: Email,
                sdt: SDT
            }
        });
    } catch (err) {
        try { await transaction.rollback(); } catch (_) { }
        console.error("Lỗi đăng ký tài khoản bệnh nhân:", err);
        res.status(500).json({ message: "Lỗi đăng ký tài khoản bệnh nhân", error: err.message });
    }
});

// Xem danh sách tài khoản bệnh nhân để test
router.get("/api/auth/patient-accounts", async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
      SELECT tk.MaTK, tk.MaBN, bn.HoTen, tk.TenDN, tk.Email, tk.SDT, tk.NgayTao
      FROM TaiKhoanWeb tk
      JOIN BenhNhan bn ON tk.MaBN = bn.MaBN
      ORDER BY tk.MaBN
    `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy danh sách tài khoản bệnh nhân", error: err.message });
    }
});


function normalizeDoctorText(value) {
    return (value ?? "").toString().trim();
}

async function ensureDoctorAccountTable(pool) {
    await pool.request().query(`
    IF OBJECT_ID('dbo.TaiKhoanBacSi', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.TaiKhoanBacSi
      (
        MaTKBS  VARCHAR(20)    PRIMARY KEY,
        MaBS    VARCHAR(10)    NOT NULL,
        TenDN   NVARCHAR(100)  NOT NULL UNIQUE,
        MatKhau NVARCHAR(255)  NOT NULL,
        Email   NVARCHAR(100)  NOT NULL UNIQUE,
        SDT     NVARCHAR(15)   NOT NULL,
        NgayTao DATE           NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_TKBS_BacSi FOREIGN KEY (MaBS) REFERENCES dbo.BacSi(MaBS)
      );
    END
  `);
}

// Đăng nhập bác sĩ: có thể nhập MaBS, TenDN, Email hoặc SDT
router.post("/api/auth/doctor-login", async (req, res) => {
    try {
        const login = normalizeDoctorText(req.body.TenDN || req.body.username || req.body.login);
        const password = normalizeDoctorText(req.body.MatKhau || req.body.password);

        if (!login || !password) {
            return res.status(400).json({ message: "Vui lòng nhập tài khoản và mật khẩu" });
        }

        const pool = await getPool();
        await ensureDoctorAccountTable(pool);

        const result = await pool.request()
            .input("login", sql.NVarChar(100), login)
            .input("password", sql.NVarChar(255), password)
            .query(`
        SELECT TOP 1
          tk.MaTKBS,
          tk.MaBS,
          tk.TenDN,
          tk.Email,
          tk.SDT,
          bs.HoTen,
          bs.GioiTinh,
          bs.ChucVu,
          bs.CaTruc,
          bs.MaCK,
          ck.TenCK,
          bs.MaPhongKham,
          pk.TenPhongKham,
          pk.SoPhong
        FROM dbo.TaiKhoanBacSi tk
        JOIN dbo.BacSi bs ON tk.MaBS = bs.MaBS
        LEFT JOIN dbo.ChuyenKhoa ck ON bs.MaCK = ck.MaCK
        LEFT JOIN dbo.PhongKham pk ON bs.MaPhongKham = pk.MaPhongKham
        WHERE (tk.TenDN = @login OR tk.Email = @login OR tk.SDT = @login OR tk.MaBS = @login)
          AND tk.MatKhau = @password
      `);

        if (result.recordset.length === 0) {
            return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu bác sĩ" });
        }

        const u = result.recordset[0];
        res.json({
            message: "Đăng nhập bác sĩ thành công",
            user: {
                role: "doctor",
                maBS: u.MaBS,
                maTKBS: u.MaTKBS,
                tenDN: u.TenDN,
                hoTen: u.HoTen,
                gioiTinh: u.GioiTinh,
                chucVu: u.ChucVu,
                caTruc: u.CaTruc,
                maCK: u.MaCK,
                tenCK: u.TenCK,
                maPhongKham: u.MaPhongKham,
                tenPhongKham: u.TenPhongKham,
                soPhong: u.SoPhong,
                email: u.Email,
                sdt: u.SDT
            }
        });
    } catch (err) {
        console.error("Lỗi đăng nhập bác sĩ:", err);
        res.status(500).json({ message: "Lỗi đăng nhập bác sĩ", error: err.message });
    }
});

// Xem danh sách tài khoản bác sĩ để test
router.get("/api/auth/doctor-accounts", async (req, res) => {
    try {
        const pool = await getPool();
        await ensureDoctorAccountTable(pool);

        const result = await pool.request().query(`
      SELECT
        tk.MaTKBS,
        tk.MaBS,
        bs.HoTen,
        tk.TenDN,
        tk.Email,
        tk.SDT,
        tk.MatKhau AS MatKhauDemo,
        ck.TenCK,
        pk.SoPhong,
        pk.TenPhongKham
      FROM dbo.TaiKhoanBacSi tk
      JOIN dbo.BacSi bs ON tk.MaBS = bs.MaBS
      LEFT JOIN dbo.ChuyenKhoa ck ON bs.MaCK = ck.MaCK
      LEFT JOIN dbo.PhongKham pk ON bs.MaPhongKham = pk.MaPhongKham
      ORDER BY tk.MaBS
    `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy danh sách tài khoản bác sĩ", error: err.message });
    }
});

// Lấy thông tin bác sĩ đang đăng nhập



function unifiedAuthText(value) {
    return (value ?? "").toString().trim();
}

async function unifiedAuthObjectExists(pool, objectName) {
    const result = await pool.request()
        .input("ObjectName", sql.NVarChar(128), objectName)
        .query("SELECT OBJECT_ID(@ObjectName, 'U') AS ObjectId");
    return !!result.recordset[0]?.ObjectId;
}

async function unifiedAuthEnsureReceptionistAccountTable(pool) {
    await pool.request().query(`
        IF OBJECT_ID('dbo.TaiKhoanLeTan', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.TaiKhoanLeTan (
                MaTKLT     VARCHAR(20)    PRIMARY KEY,
                MaNV       VARCHAR(20)    NOT NULL UNIQUE,
                TenDN      NVARCHAR(100)  UNIQUE NOT NULL,
                MatKhau    NVARCHAR(255)  NOT NULL,
                Email      NVARCHAR(100)  NULL,
                SDT        VARCHAR(15)    NULL,
                TrangThai  NVARCHAR(30)   DEFAULT N'Hoạt động',
                NgayTao    DATETIME       DEFAULT GETDATE(),
                CONSTRAINT FK_TKLT_NhanVien FOREIGN KEY (MaNV) REFERENCES dbo.NhanVien(MaNV)
            );
        END
    `);

    await pool.request().query(`
        DECLARE @base INT;
        SELECT @base = ISNULL(MAX(TRY_CONVERT(INT, SUBSTRING(MaTKLT, 5, 20))), 0)
        FROM dbo.TaiKhoanLeTan
        WHERE MaTKLT LIKE 'TKLT%';

        ;WITH MissingNV AS (
            SELECT nv.MaNV, nv.Email, nv.SDT,
                   ROW_NUMBER() OVER (ORDER BY nv.MaNV) AS rn
            FROM dbo.NhanVien nv
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.TaiKhoanLeTan tk WHERE tk.MaNV = nv.MaNV
            )
        )
        INSERT INTO dbo.TaiKhoanLeTan (MaTKLT, MaNV, TenDN, MatKhau, Email, SDT, TrangThai, NgayTao)
        SELECT
            'TKLT' + RIGHT('000' + CAST(@base + rn AS VARCHAR(10)), 3),
            MaNV,
            MaNV,
            N'123456',
            Email,
            SDT,
            N'Hoạt động',
            GETDATE()
        FROM MissingNV;
    `);
}

router.post("/api/auth/login", async (req, res) => {
    try {
        const username = unifiedAuthText(req.body.username || req.body.TenDN || req.body.login);
        const password = unifiedAuthText(req.body.password || req.body.MatKhau);
        let role = unifiedAuthText(req.body.role || req.body.VaiTro).toLowerCase();

        if (!role) {
            const upper = username.toUpperCase();
            if (upper.startsWith("BN")) role = "patient";
            else if (upper.startsWith("BS")) role = "doctor";
            else if (upper.startsWith("NV")) role = "receptionist";
        }

        if (!username || !password || !role) {
            return res.status(400).json({ message: "Thiếu tài khoản, mật khẩu hoặc vai trò" });
        }

        const pool = await getPool();

        // ===== BỆNH NHÂN =====
        if (role === "patient") {
            const result = await pool.request()
                .input("username", sql.NVarChar(100), username)
                .input("password", sql.NVarChar(255), password)
                .query(`
                    SELECT TOP 1
                        tk.MaTK,
                        tk.MaBN,
                        tk.TenDN,
                        tk.Email,
                        tk.SDT,
                        bn.HoTen
                    FROM dbo.TaiKhoanWeb tk
                    JOIN dbo.BenhNhan bn ON tk.MaBN = bn.MaBN
                    WHERE
                        (tk.TenDN = @username OR tk.Email = @username OR tk.SDT = @username OR tk.MaBN = @username)
                        AND tk.MatKhau = @password
                `);

            if (!result.recordset.length) {
                return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu bệnh nhân" });
            }

            const u = result.recordset[0];
            return res.json({
                message: "Đăng nhập bệnh nhân thành công",
                user: {
                    role: "patient",
                    maBN: u.MaBN,
                    maTK: u.MaTK,
                    tenDN: u.TenDN,
                    hoTen: u.HoTen,
                    email: u.Email,
                    sdt: u.SDT
                }
            });
        }

        // ===== BÁC SĨ =====
        if (role === "doctor") {
            let record = null;
            const hasDoctorAccountTable = await unifiedAuthObjectExists(pool, "dbo.TaiKhoanBacSi");

            if (hasDoctorAccountTable) {
                const result = await pool.request()
                    .input("username", sql.NVarChar(100), username)
                    .input("password", sql.NVarChar(255), password)
                    .query(`
                        SELECT TOP 1
                            tk.MaTKBS,
                            tk.MaBS,
                            tk.TenDN,
                            tk.Email,
                            tk.SDT,
                            bs.HoTen,
                            bs.GioiTinh,
                            bs.ChucVu,
                            bs.CaTruc,
                            bs.MaCK,
                            bs.MaPhongKham,
                            ck.TenCK,
                            pk.TenPhongKham,
                            pk.SoPhong
                        FROM dbo.TaiKhoanBacSi tk
                        JOIN dbo.BacSi bs ON tk.MaBS = bs.MaBS
                        LEFT JOIN dbo.ChuyenKhoa ck ON bs.MaCK = ck.MaCK
                        LEFT JOIN dbo.PhongKham pk ON bs.MaPhongKham = pk.MaPhongKham
                        WHERE
                            (tk.TenDN = @username OR tk.Email = @username OR tk.SDT = @username OR tk.MaBS = @username)
                            AND tk.MatKhau = @password
                    `);
                record = result.recordset[0] || null;
            }

            // Fallback demo: nếu chưa có bảng tài khoản bác sĩ, cho đăng nhập MaBS / 123456
            if (!record && password === "123456") {
                const result = await pool.request()
                    .input("username", sql.NVarChar(100), username)
                    .query(`
                        SELECT TOP 1
                            NULL AS MaTKBS,
                            bs.MaBS,
                            bs.MaBS AS TenDN,
                            bs.Email,
                            bs.SDT,
                            bs.HoTen,
                            bs.GioiTinh,
                            bs.ChucVu,
                            bs.CaTruc,
                            bs.MaCK,
                            bs.MaPhongKham,
                            ck.TenCK,
                            pk.TenPhongKham,
                            pk.SoPhong
                        FROM dbo.BacSi bs
                        LEFT JOIN dbo.ChuyenKhoa ck ON bs.MaCK = ck.MaCK
                        LEFT JOIN dbo.PhongKham pk ON bs.MaPhongKham = pk.MaPhongKham
                        WHERE bs.MaBS = @username OR bs.Email = @username OR bs.SDT = @username
                    `);
                record = result.recordset[0] || null;
            }

            if (!record) {
                return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu bác sĩ" });
            }

            return res.json({
                message: "Đăng nhập bác sĩ thành công",
                user: {
                    role: "doctor",
                    maBS: record.MaBS,
                    maTKBS: record.MaTKBS,
                    tenDN: record.TenDN,
                    hoTen: record.HoTen,
                    gioiTinh: record.GioiTinh,
                    chucVu: record.ChucVu,
                    caTruc: record.CaTruc,
                    maCK: record.MaCK,
                    tenCK: record.TenCK,
                    maPhongKham: record.MaPhongKham,
                    tenPhongKham: record.TenPhongKham,
                    soPhong: record.SoPhong,
                    email: record.Email,
                    sdt: record.SDT
                }
            });
        }

        // ===== LỄ TÂN =====
        if (role === "receptionist") {
            await unifiedAuthEnsureReceptionistAccountTable(pool);

            let result = await pool.request()
                .input("username", sql.NVarChar(100), username)
                .input("password", sql.NVarChar(255), password)
                .query(`
                    SELECT TOP 1
                        tk.MaTKLT,
                        tk.MaNV,
                        tk.TenDN,
                        tk.Email,
                        tk.SDT,
                        nv.HoTen,
                        nv.GioiTinh,
                        nv.CaLamViec
                    FROM dbo.TaiKhoanLeTan tk
                    JOIN dbo.NhanVien nv ON tk.MaNV = nv.MaNV
                    WHERE
                        (tk.TenDN = @username OR tk.Email = @username OR tk.SDT = @username OR tk.MaNV = @username)
                        AND tk.MatKhau = @password
                        AND ISNULL(tk.TrangThai, N'Hoạt động') = N'Hoạt động'
                `);

            let record = result.recordset[0] || null;

            // Fallback demo: MaNV / 123456
            if (!record && password === "123456") {
                result = await pool.request()
                    .input("username", sql.NVarChar(100), username)
                    .query(`
                        SELECT TOP 1
                            NULL AS MaTKLT,
                            nv.MaNV,
                            nv.MaNV AS TenDN,
                            nv.Email,
                            nv.SDT,
                            nv.HoTen,
                            nv.GioiTinh,
                            nv.CaLamViec
                        FROM dbo.NhanVien nv
                        WHERE nv.MaNV = @username OR nv.Email = @username OR nv.SDT = @username
                    `);
                record = result.recordset[0] || null;
            }

            if (!record) {
                return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu lễ tân" });
            }

            return res.json({
                message: "Đăng nhập lễ tân thành công",
                user: {
                    role: "receptionist",
                    maNV: record.MaNV,
                    maTKLT: record.MaTKLT,
                    tenDN: record.TenDN,
                    hoTen: record.HoTen,
                    gioiTinh: record.GioiTinh,
                    caLamViec: record.CaLamViec,
                    email: record.Email,
                    sdt: record.SDT
                }
            });
        }

        return res.status(400).json({ message: "Vai trò đăng nhập không hợp lệ" });
    } catch (err) {
        console.error("Lỗi đăng nhập:", err);
        res.status(500).json({ message: "Lỗi đăng nhập", error: err.message });
    }
});

router.get("/api/auth/receptionist-accounts", async (req, res) => {
    try {
        const pool = await getPool();
        await unifiedAuthEnsureReceptionistAccountTable(pool);

        const result = await pool.request().query(`
            SELECT
                tk.MaTKLT,
                tk.MaNV,
                nv.HoTen,
                tk.TenDN,
                tk.MatKhau AS MatKhauDemo,
                tk.Email,
                tk.SDT,
                tk.TrangThai,
                nv.CaLamViec
            FROM dbo.TaiKhoanLeTan tk
            JOIN dbo.NhanVien nv ON tk.MaNV = nv.MaNV
            ORDER BY tk.MaNV
        `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy danh sách tài khoản lễ tân", error: err.message });
    }
});

module.exports = router;
