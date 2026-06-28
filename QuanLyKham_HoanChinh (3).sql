/*========================================================
    TẠO DATABASE
========================================================*/
CREATE DATABASE QuanLyKham1;
GO

USE QuanLyKham1;
GO

/*========================================================
    XÓA BẢNG NẾU ĐÃ TỒN TẠI
    (theo đúng thứ tự phụ thuộc khóa ngoại)
========================================================*/
DROP TABLE IF EXISTS ChiTietDonThuoc;
DROP TABLE IF EXISTS DonThuoc;
DROP TABLE IF EXISTS Thuoc;
DROP TABLE IF EXISTS PhieuKhamBenh;
DROP TABLE IF EXISTS HoSoYTe;
DROP TABLE IF EXISTS PhieuTiepNhan;
DROP TABLE IF EXISTS TaiKhoanWeb;
DROP TABLE IF EXISTS TheBHYT;
DROP TABLE IF EXISTS SoThuTu;
DROP TABLE IF EXISTS LichKham;
DROP TABLE IF EXISTS DonDangKy;
DROP TABLE IF EXISTS LichLamViec;
DROP TABLE IF EXISTS ThongBao;
DROP TABLE IF EXISTS HangDoi;
DROP TABLE IF EXISTS BacSi;
DROP TABLE IF EXISTS NhanVien;
DROP TABLE IF EXISTS BenhNhan;
DROP TABLE IF EXISTS PhongKham;
DROP TABLE IF EXISTS ChuyenKhoa;
GO

/*========================================================
    BẢNG CHUYÊN KHOA
========================================================*/
CREATE TABLE ChuyenKhoa
(
    MaCK        VARCHAR(10)      PRIMARY KEY,
    TenCK       NVARCHAR(100)    NOT NULL,
    MoTa        NVARCHAR(500)    NULL,
    ViTri       NVARCHAR(100)    NULL,
    SDT         VARCHAR(15)      NULL,
    Email       NVARCHAR(100)    NULL,
    TrangThai   NVARCHAR(50)     DEFAULT N'Hoạt động'
);
GO

/*========================================================
    BẢNG PHÒNG KHÁM
========================================================*/
CREATE TABLE PhongKham
(
    MaPhongKham         VARCHAR(20)  PRIMARY KEY,
    TenPhongKham        NVARCHAR(100) NOT NULL,
    SoPhong             INT           NOT NULL CHECK (SoPhong > 0),
    MaCK                VARCHAR(10)   NOT NULL,
    TrangThaiHoatDong   BIT           NOT NULL DEFAULT 1,
    CONSTRAINT FK_PhongKham_ChuyenKhoa FOREIGN KEY (MaCK) REFERENCES ChuyenKhoa(MaCK)
);
GO

/*========================================================
    BẢNG BỆNH NHÂN
========================================================*/
CREATE TABLE BenhNhan
(
    MaBN        VARCHAR(10)   PRIMARY KEY,
    HoTen       NVARCHAR(100) NOT NULL,
    NgaySinh    DATE          NOT NULL,
    GioiTinh    NVARCHAR(10)  CHECK (GioiTinh IN (N'Nam', N'Nữ', N'Khác')),
    DiaChi      NVARCHAR(255) NULL,
    SDT         VARCHAR(15)   NULL CHECK (LEN(SDT) >= 10),
    SDTLienHe   VARCHAR(15)   NULL,
    Email       NVARCHAR(100) UNIQUE NULL,
    QuanHeBN    NVARCHAR(50)  NULL,
    LoaiUuTien  NVARCHAR(20)
        CHECK (LoaiUuTien IN (N'Bình thường', N'Trẻ em', N'Người cao tuổi', N'Cấp cứu'))
);
GO

/*========================================================
    BẢNG NHÂN VIÊN
========================================================*/
CREATE TABLE NhanVien
(
    MaNV        VARCHAR(20)   PRIMARY KEY,
    HoTen       NVARCHAR(100) NOT NULL,
    GioiTinh    NVARCHAR(10)  CHECK (GioiTinh IN (N'Nam', N'Nữ', N'Khác')),
    SDT         VARCHAR(15)   NULL CHECK (LEN(SDT) >= 10),
    Email       NVARCHAR(100) UNIQUE NULL,
    NgaySinh    DATE          NULL,
    DiaChi      NVARCHAR(255) NULL,
    CaLamViec   NVARCHAR(30)  NULL
);
GO

/*========================================================
    BẢNG BÁC SĨ
========================================================*/
CREATE TABLE BacSi
(
    MaBS        VARCHAR(10)   PRIMARY KEY,
    HoTen       NVARCHAR(100) NOT NULL,
    GioiTinh    NVARCHAR(10)  CHECK (GioiTinh IN (N'Nam', N'Nữ', N'Khác')),
    SDT         VARCHAR(15)   NULL,
    Email       NVARCHAR(100) UNIQUE NULL,
    ChucVu      NVARCHAR(100) NULL,
    CaTruc      NVARCHAR(50)  NULL,
    MaCK        VARCHAR(10)   NOT NULL,
    MaPhongKham VARCHAR(20)   NULL,
    CONSTRAINT FK_BacSi_ChuyenKhoa FOREIGN KEY (MaCK)        REFERENCES ChuyenKhoa(MaCK),
    CONSTRAINT FK_BacSi_PhongKham  FOREIGN KEY (MaPhongKham) REFERENCES PhongKham(MaPhongKham)
);
GO

/*========================================================
    BẢNG HỒ SƠ Y TẾ
========================================================*/
CREATE TABLE HoSoYTe
(
    MaHS        VARCHAR(20)   PRIMARY KEY,
    MaBN        VARCHAR(10)   NOT NULL,
    MaNV        VARCHAR(20)   NOT NULL,
    NhomMau     NVARCHAR(5)   NOT NULL CHECK (NhomMau IN (N'A', N'B', N'AB', N'O')),
    Rh          NVARCHAR(5)   NOT NULL CHECK (Rh IN (N'+', N'-')),
    DiUng       NVARCHAR(255) NULL,
    TienSuBenh  NVARCHAR(350) NULL,
    BenhNen     NVARCHAR(350) NULL,
    NgayTao     DATE          NOT NULL DEFAULT GETDATE(),
    NgayCapNhat DATE          NOT NULL DEFAULT GETDATE(),
    GhiChu      NVARCHAR(350) NULL,
    HinhThucTao NVARCHAR(50)  CHECK (HinhThucTao IN (N'Trực tiếp', N'Online')),
    CONSTRAINT FK_HSYT_BenhNhan FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN),
    CONSTRAINT FK_HSYT_NhanVien FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV)
);
GO

/*========================================================
    BẢNG HÀNG ĐỢI
========================================================*/
CREATE TABLE HangDoi
(
    MaHangDoi       VARCHAR(20) PRIMARY KEY,
    MaPhongKham     VARCHAR(20) NOT NULL UNIQUE,
    SoThuTuTiepTheo INT         NOT NULL DEFAULT 1 CHECK (SoThuTuTiepTheo > 0),
    SoLuongDangCho  INT         DEFAULT 0 CHECK (SoLuongDangCho >= 0),
    CONSTRAINT FK_HangDoi_PhongKham FOREIGN KEY (MaPhongKham) REFERENCES PhongKham(MaPhongKham)
);
GO

/*========================================================
    BẢNG PHIẾU TIẾP NHẬN
========================================================*/
CREATE TABLE PhieuTiepNhan
(
    MaPhieuTN   VARCHAR(10)   PRIMARY KEY,
    MaBN        VARCHAR(10)   NOT NULL,
    SoThuTu     INT           NOT NULL CHECK (SoThuTu > 0),
    NgayTiepNhan DATETIME     NOT NULL DEFAULT GETDATE(),
    TrangThai   NVARCHAR(50)  DEFAULT N'Đang chờ',
    GhiChu      NVARCHAR(255) NULL,
    CONSTRAINT FK_PTN_BenhNhan FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN)
);
GO

/*========================================================
    BẢNG PHIẾU KHÁM BỆNH
========================================================*/
CREATE TABLE PhieuKhamBenh
(
    MaPK            VARCHAR(20)   PRIMARY KEY,
    MaHS            VARCHAR(20)   NOT NULL,
    MaBN            VARCHAR(10)   NOT NULL,
    MaBS            VARCHAR(10)   NOT NULL,
    NgayKham        DATE          NOT NULL,
    TrieuChung      NVARCHAR(500) NULL,
    KetQuaThamKham  NVARCHAR(500) NULL,
    ChuanDoan       NVARCHAR(350) NOT NULL,
    ChiPhi          DECIMAL(18,2) CHECK (ChiPhi >= 0),
    TrangThai       NVARCHAR(50)
        CHECK (TrangThai IN (N'Đang khám', N'Hoàn tất', N'Đã lưu hồ sơ')),
    CONSTRAINT FK_PKB_HSYT   FOREIGN KEY (MaHS) REFERENCES HoSoYTe(MaHS),
    CONSTRAINT FK_PK_BenhNhan FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN),
    CONSTRAINT FK_PK_BacSi   FOREIGN KEY (MaBS) REFERENCES BacSi(MaBS)
);
GO

/*========================================================
    BẢNG THẺ BHYT
========================================================*/
CREATE TABLE TheBHYT
(
    MaBHYT      VARCHAR(20)   PRIMARY KEY,
    MaBN        VARCHAR(10)   NOT NULL,
    NgayCap     DATE          NOT NULL,
    NgayHetHan  DATE          NOT NULL,
    TyLeChiTra  DECIMAL(5,2)  CHECK (TyLeChiTra BETWEEN 0 AND 100),
    MucChiTra   DECIMAL(18,2) CHECK (MucChiTra >= 0),
    TrangThai   NVARCHAR(50)  CHECK (TrangThai IN (N'Hoạt động', N'Khóa')),
    LoaiThe     NVARCHAR(50)  NOT NULL,
    PhiHangThang DECIMAL(18,2) CHECK (PhiHangThang >= 0),
    MoTa        NVARCHAR(350) NULL,
    CONSTRAINT FK_TheBHYT_BenhNhan FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN),
    CONSTRAINT CK_TheBHYT_Ngay     CHECK (NgayHetHan > NgayCap)
);
GO

/*========================================================
    BẢNG TÀI KHOẢN WEB
========================================================*/
CREATE TABLE TaiKhoanWeb
(
    MaTK    VARCHAR(20)   PRIMARY KEY,
    MaBN    VARCHAR(10)   NOT NULL,
    TenDN   NVARCHAR(100) UNIQUE NOT NULL,
    MatKhau NVARCHAR(255) NOT NULL,
    Email   NVARCHAR(100) UNIQUE NOT NULL,
    SDT     NVARCHAR(15)  NOT NULL,
    NgayTao DATE          NOT NULL DEFAULT GETDATE(),
    MaQR    NVARCHAR(350) NULL,
    CONSTRAINT FK_TKWeb_BenhNhan FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN)
);
GO

/*========================================================
    BẢNG THUỐC
========================================================*/
CREATE TABLE Thuoc
(
    MaThuoc    VARCHAR(10)   PRIMARY KEY,
    TenThuoc   NVARCHAR(100) NOT NULL,
    DonViTinh  NVARCHAR(100) NOT NULL,
    MoTa       NVARCHAR(255) NULL
);
GO

/*========================================================
    BẢNG ĐƠN THUỐC
========================================================*/
CREATE TABLE DonThuoc
(
    MaDT    VARCHAR(10)   PRIMARY KEY,
    MaPK    VARCHAR(20)   UNIQUE NOT NULL,
    NgayLap DATE          NOT NULL DEFAULT GETDATE(),
    GhiChu  NVARCHAR(50)  NULL,
    CONSTRAINT FK_DonThuoc_PKB FOREIGN KEY (MaPK) REFERENCES PhieuKhamBenh(MaPK)
);
GO

/*========================================================
    BẢNG CHI TIẾT ĐƠN THUỐC
========================================================*/
CREATE TABLE ChiTietDonThuoc
(
    MaCTDT      VARCHAR(10)   PRIMARY KEY,
    MaDT        VARCHAR(10)   NOT NULL,
    MaThuoc     VARCHAR(10)   NOT NULL,
    SoLuong     INT           NOT NULL CHECK (SoLuong > 0),
    LieuLuong   NVARCHAR(100) NOT NULL,
    CachDung    NVARCHAR(255) NULL,
    ThoiGianDung NVARCHAR(100) NULL,
    CONSTRAINT FK_CTDT_DonThuoc FOREIGN KEY (MaDT)    REFERENCES DonThuoc(MaDT),
    CONSTRAINT FK_CTDT_Thuoc    FOREIGN KEY (MaThuoc) REFERENCES Thuoc(MaThuoc)
);
GO

/*========================================================
    BẢNG LỊCH KHÁM
    (LichKham không phụ thuộc SlotKham nên giữ nguyên)
========================================================*/
CREATE TABLE LichKham
(
    MaLich      VARCHAR(20)   PRIMARY KEY,
    MaBN        VARCHAR(10)   NOT NULL,
    MaPhongKham VARCHAR(20)   NOT NULL,
    NgayGio     DATETIME      NOT NULL,
    GhiChu      NVARCHAR(255) NULL,
    TrangThai   NVARCHAR(50)  NOT NULL
        CHECK (TrangThai IN (N'Đã đặt', N'Đang chờ', N'Đã khám', N'Đã hủy')),
    CONSTRAINT FK_LichKham_BenhNhan  FOREIGN KEY (MaBN)        REFERENCES BenhNhan(MaBN),
    CONSTRAINT FK_LichKham_PhongKham FOREIGN KEY (MaPhongKham) REFERENCES PhongKham(MaPhongKham)
);
GO

/*========================================================
    BẢNG LỊCH LÀM VIỆC
    (Đã bỏ phụ thuộc SlotKham; thêm cột GioiTinh làm ca trực)
========================================================*/
CREATE TABLE LichLamViec
(
    MaLich      VARCHAR(10)   PRIMARY KEY,
    MaBS        VARCHAR(10)   NOT NULL,
    NgayLamViec DATE          NOT NULL,
    GioBatDau   TIME          NOT NULL,
    GioKT       TIME          NOT NULL,
    GhiChu      NVARCHAR(200) NULL,
    CONSTRAINT FK_LLV_BacSi FOREIGN KEY (MaBS) REFERENCES BacSi(MaBS)
);
GO

/*========================================================
    BẢNG ĐƠN ĐĂNG KÝ KHÁM
    (Đã bỏ phụ thuộc SlotKham; thay bằng MaPhongKham)
========================================================*/
CREATE TABLE DonDangKy
(
    MaDK        VARCHAR(10)   PRIMARY KEY,
    MaBN        VARCHAR(10)   NOT NULL,
    MaPhongKham VARCHAR(20)   NOT NULL,
    NgayDK      DATE          NOT NULL,
    TrieuChung  NVARCHAR(500) NULL,
    TrangThai   NVARCHAR(50)  NOT NULL,
    CONSTRAINT FK_DDK_BenhNhan  FOREIGN KEY (MaBN)        REFERENCES BenhNhan(MaBN),
    CONSTRAINT FK_DDK_PhongKham FOREIGN KEY (MaPhongKham) REFERENCES PhongKham(MaPhongKham)
);
GO

/*========================================================
    BẢNG CẤP SỐ THỨ TỰ
========================================================*/
CREATE TABLE SoThuTu
(
    MaThe               VARCHAR(20) PRIMARY KEY,
    MaBN                VARCHAR(10) NOT NULL,
    MaHangDoi           VARCHAR(20) NOT NULL,
    MaLich              VARCHAR(20) NULL,
    SoThuTu             INT         NOT NULL CHECK (SoThuTu > 0),
    TrangThaiThe        NVARCHAR(50) NOT NULL
        CHECK (TrangThaiThe IN (N'WAITING', N'CALLED', N'DONE', N'SKIPPED', N'CANCELLED')),
    ThoiGianCap         DATETIME    NOT NULL DEFAULT GETDATE(),
    ThoiGianDuKienKham  DATETIME    NULL,
    SoLanVangMat        INT         DEFAULT 0 CHECK (SoLanVangMat >= 0),
    CONSTRAINT FK_STT_BenhNhan FOREIGN KEY (MaBN)      REFERENCES BenhNhan(MaBN),
    CONSTRAINT FK_STT_HangDoi  FOREIGN KEY (MaHangDoi) REFERENCES HangDoi(MaHangDoi),
    CONSTRAINT FK_STT_LichKham FOREIGN KEY (MaLich)    REFERENCES LichKham(MaLich)
);
GO

/*========================================================
    BẢNG THÔNG BÁO
========================================================*/
CREATE TABLE ThongBao
(
    MaThongBao  VARCHAR(20)   PRIMARY KEY,
    MaBN        VARCHAR(10)   NULL,
    TieuDe      NVARCHAR(100) NOT NULL,
    NoiDung     NVARCHAR(500) NOT NULL,
    LoaiThongBao NVARCHAR(50)
        CHECK (LoaiThongBao IN (N'Push', N'SMS', N'Email')),
    ThoiGianGui DATETIME      DEFAULT GETDATE(),
    TrangThaiGui BIT          DEFAULT 0,
    CONSTRAINT FK_ThongBao_BenhNhan FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN)
);
GO


/*================================================================
    DỮ LIỆU MẪU
================================================================*/

-- CHUYÊN KHOA
INSERT INTO ChuyenKhoa VALUES
('CK01', N'Nội khoa',           N'Khám và điều trị các bệnh nội khoa tổng quát', N'Tầng 2, Khu A', '02812345678', 'noikhoа@hospital.vn', N'Hoạt động'),
('CK02', N'Ngoại khoa',         N'Khám và phẫu thuật các bệnh ngoại khoa',        N'Tầng 3, Khu A', '02812345679', 'ngoaikhoa@hospital.vn', N'Hoạt động'),
('CK03', N'Nhi khoa',           N'Khám và điều trị trẻ em dưới 15 tuổi',          N'Tầng 2, Khu B', '02812345680', 'nhikhoa@hospital.vn',  N'Hoạt động'),
('CK04', N'Da liễu',            N'Khám và điều trị các bệnh về da',               N'Tầng 1, Khu B', '02812345681', 'dalieu@hospital.vn',   N'Hoạt động'),
('CK05', N'Tim mạch',           N'Khám và điều trị các bệnh tim mạch',            N'Tầng 4, Khu A', '02812345682', 'timmach@hospital.vn',  N'Hoạt động'),
('CK06', N'Thần kinh',          N'Khám và điều trị các bệnh thần kinh',           N'Tầng 4, Khu B', '02812345683', 'thankinhh@hospital.vn', N'Hoạt động'),
('CK07', N'Sản phụ khoa',       N'Khám phụ khoa và theo dõi thai sản',            N'Tầng 3, Khu B', '02812345684', 'sanphukhoa@hospital.vn', N'Hoạt động'),
('CK08', N'Mắt',                N'Khám và điều trị các bệnh về mắt',              N'Tầng 1, Khu C', '02812345685', 'mat@hospital.vn',      N'Hoạt động'),
('CK09', N'Tai Mũi Họng',       N'Khám và điều trị tai mũi họng',                 N'Tầng 1, Khu C', '02812345686', 'tmh@hospital.vn',      N'Hoạt động'),
('CK10', N'Cơ xương khớp',      N'Khám và điều trị các bệnh xương khớp',         N'Tầng 5, Khu A', '02812345687', 'xuongkhop@hospital.vn', N'Hoạt động');
GO

-- PHÒNG KHÁM
INSERT INTO PhongKham VALUES
('PK01', N'Phòng Nội khoa 1',      101, 'CK01', 1),
('PK02', N'Phòng Nội khoa 2',      102, 'CK01', 1),
('PK03', N'Phòng Ngoại khoa 1',    201, 'CK02', 1),
('PK04', N'Phòng Ngoại khoa 2',    202, 'CK02', 1),
('PK05', N'Phòng Nhi khoa 1',      301, 'CK03', 1),
('PK06', N'Phòng Nhi khoa 2',      302, 'CK03', 1),
('PK07', N'Phòng Da liễu',         401, 'CK04', 1),
('PK08', N'Phòng Tim mạch 1',      501, 'CK05', 1),
('PK09', N'Phòng Tim mạch 2',      502, 'CK05', 1),
('PK10', N'Phòng Thần kinh',       601, 'CK06', 1),
('PK11', N'Phòng Sản phụ khoa 1',  701, 'CK07', 1),
('PK12', N'Phòng Mắt',             801, 'CK08', 1),
('PK13', N'Phòng Tai Mũi Họng',    901, 'CK09', 1),
('PK14', N'Phòng Cơ xương khớp', 1001, 'CK10', 1);
GO


-- BỆNH NHÂN
INSERT INTO BenhNhan VALUES
('BN001', N'Nguyễn Văn An',      '1985-03-12', N'Nam',  N'123 Lê Lợi, Q1, TP.HCM',         '0901234561', '0901234562', 'an.nguyen@gmail.com',      NULL, N'Bình thường'),
('BN002', N'Trần Thị Bích',      '1990-07-25', N'Nữ',   N'45 Nguyễn Huệ, Q1, TP.HCM',      '0901234563', NULL,         'bich.tran@gmail.com',      NULL, N'Bình thường'),
('BN003', N'Lê Minh Cường',      '1978-11-05', N'Nam',  N'78 Trần Hưng Đạo, Q5, TP.HCM',   '0901234564', '0901234565', 'cuong.le@yahoo.com',       NULL, N'Bình thường'),
('BN004', N'Phạm Thị Dung',      '2015-06-18', N'Nữ',   N'56 Điện Biên Phủ, Q3, TP.HCM',   '0901234566', '0901234567', 'dung.pham@gmail.com',      N'Mẹ', N'Trẻ em'),
('BN005', N'Hoàng Văn Em',       '1955-02-28', N'Nam',  N'90 Võ Văn Tần, Q3, TP.HCM',      '0901234568', NULL,         'bn005@gmail.com',          NULL, N'Người cao tuổi'),
('BN006', N'Ngô Thị Phương',     '1995-09-14', N'Nữ',   N'12 Cách Mạng Tháng 8, Q10',      '0901234569', '0901234570', 'phuong.ngo@gmail.com',     NULL, N'Bình thường'),
('BN007', N'Đặng Văn Giang',     '1988-04-22', N'Nam',  N'34 Lý Thường Kiệt, Q10, TP.HCM', '0901234571', NULL,         'giang.dang@gmail.com',     NULL, N'Bình thường'),
('BN008', N'Vũ Thị Hoa',         '1972-12-30', N'Nữ',   N'67 Phan Xích Long, Phú Nhuận',   '0901234572', '0901234573', 'hoa.vu@yahoo.com',         NULL, N'Bình thường'),
('BN009', N'Bùi Minh Khoa',      '2018-08-10', N'Nam',  N'23 Hoàng Diệu, Q4, TP.HCM',      '0901234574', '0901234575', 'bn009@gmail.com',          N'Bố', N'Trẻ em'),
('BN010', N'Đinh Thị Lan',       '1960-01-15', N'Nữ',   N'89 Nguyễn Thị Minh Khai, Q1',    '0901234576', NULL,         'lan.dinh@gmail.com',       NULL, N'Người cao tuổi'),
('BN011', N'Trương Văn Mạnh',    '1993-05-07', N'Nam',  N'101 Đinh Tiên Hoàng, Bình Thạnh','0901234577', '0901234578', 'manh.truong@gmail.com',    NULL, N'Bình thường'),
('BN012', N'Lý Thị Ngân',        '1987-10-19', N'Nữ',   N'55 Nơ Trang Long, Bình Thạnh',   '0901234579', NULL,         'ngan.ly@yahoo.com',        NULL, N'Bình thường'),
('BN013', N'Phan Văn Ổn',        '1949-03-03', N'Nam',  N'77 Nguyễn Văn Cừ, Q5, TP.HCM',   '0901234580', '0901234581', 'bn013@gmail.com',          NULL, N'Người cao tuổi'),
('BN014', N'Mai Thị Phúc',       '1998-11-25', N'Nữ',   N'33 Bùi Thị Xuân, Q1, TP.HCM',    '0901234582', NULL,         'phuc.mai@gmail.com',       NULL, N'Bình thường'),
('BN015', N'Cao Văn Quyết',      '1983-07-08', N'Nam',  N'21 Hai Bà Trưng, Q1, TP.HCM',    '0901234583', '0901234584', 'quyet.cao@gmail.com',      NULL, N'Bình thường'),
('BN016', N'Hồ Thị Rin',         '2020-04-12', N'Nữ',   N'44 Lê Văn Sỹ, Q3, TP.HCM',       '0901234585', '0901234586', 'bn016@gmail.com',          N'Mẹ', N'Trẻ em'),
('BN017', N'Dương Văn Sơn',      '1975-08-30', N'Nam',  N'66 Võ Thị Sáu, Q3, TP.HCM',      '0901234587', NULL,         'son.duong@yahoo.com',      NULL, N'Bình thường'),
('BN018', N'Nguyễn Thị Tâm',     '1966-06-06', N'Nữ',   N'88 Trần Quốc Toản, Q3, TP.HCM',  '0901234588', '0901234589', 'tam.nguyen@gmail.com',     NULL, N'Bình thường'),
('BN019', N'Lê Văn Tuấn',        '1991-02-14', N'Nam',  N'99 CMT8, Q10, TP.HCM',           '0901234590', NULL,         'tuan.le@gmail.com',        NULL, N'Bình thường'),
('BN020', N'Phạm Thị Uyên',      '2001-09-09', N'Nữ',   N'15 Đinh Bộ Lĩnh, Bình Thạnh',    '0901234591', '0901234592', 'uyen.pham@gmail.com',      NULL, N'Bình thường'),
('BN021', N'Hoàng Minh Việt',    '1969-12-12', N'Nam',  N'27 Phạm Văn Đồng, Gò Vấp',       '0901234593', NULL,         'bn021@gmail.com',          NULL, N'Bình thường'),
('BN022', N'Trần Thị Xuân',      '1980-03-20', N'Nữ',   N'38 Quang Trung, Gò Vấp',         '0901234594', '0901234595', 'xuan.tran@gmail.com',      NULL, N'Bình thường'),
('BN023', N'Võ Văn Yên',         '2016-11-11', N'Nam',  N'50 Nguyễn Oanh, Gò Vấp',         '0901234596', '0901234597', 'bn023@gmail.com',          N'Bố', N'Trẻ em'),
('BN024', N'Đỗ Thị Ánh',         '1957-07-04', N'Nữ',   N'62 Phạm Ngũ Lão, Q1, TP.HCM',    '0901234598', NULL,         'anh.do@yahoo.com',         NULL, N'Người cao tuổi'),
('BN025', N'Nguyễn Văn Bắc',     '2024-01-20', N'Nam',  N'74 Trần Phú, Q5, TP.HCM',        '0901234599', '0901234600', 'bn025@gmail.com',          N'Mẹ', N'Trẻ em');
GO
-- NHÂN VIÊN
INSERT INTO NhanVien VALUES
('NV001', N'Nguyễn Thị Hương',   N'Nữ',  '0911111101', 'huong.nv@hospital.vn', '1985-05-10', N'12 Lê Duẩn, Q1', N'Sáng'),
('NV002', N'Trần Văn Khải',      N'Nam', '0911111102', 'khai.nv@hospital.vn',  '1990-08-22', N'34 Nguyễn Trãi, Q5', N'Chiều'),
('NV003', N'Lê Thị Linh',        N'Nữ',  '0911111103', 'linh.nv@hospital.vn',  '1988-03-15', N'56 Lê Văn Sỹ, Q3',  N'Sáng'),
('NV004', N'Phạm Văn Minh',      N'Nam', '0911111104', 'minh.nv@hospital.vn',  '1992-11-07', N'78 CMT8, Q10',       N'Tối'),
('NV005', N'Hoàng Thị Nga',      N'Nữ',  '0911111105', 'nga.nv@hospital.vn',   '1986-06-28', N'90 Đinh Tiên Hoàng, BT', N'Chiều');
GO

-- BÁC SĨ
INSERT INTO BacSi VALUES
('BS001', N'TS.BS Nguyễn Quang Anh',  N'Nam', '0922222201', 'quanganh.bs@hospital.vn', N'Trưởng khoa', N'Sáng', 'CK01', 'PK01'),
('BS002', N'ThS.BS Trần Thị Bảo',     N'Nữ',  '0922222202', 'bao.bs@hospital.vn',      N'Bác sĩ',      N'Chiều','CK01', 'PK02'),
('BS003', N'TS.BS Lê Văn Chính',      N'Nam', '0922222203', 'chinh.bs@hospital.vn',    N'Trưởng khoa', N'Sáng', 'CK02', 'PK03'),
('BS004', N'ThS.BS Phạm Thị Diệu',   N'Nữ',  '0922222204', 'dieu.bs@hospital.vn',     N'Bác sĩ',      N'Chiều','CK02', 'PK04'),
('BS005', N'BS CKI Hoàng Văn Đức',   N'Nam', '0922222205', 'duc.bs@hospital.vn',      N'Trưởng khoa', N'Sáng', 'CK03', 'PK05'),
('BS006', N'ThS.BS Ngô Thị Giang',   N'Nữ',  '0922222206', 'giang.bs@hospital.vn',    N'Bác sĩ',      N'Tối',  'CK03', 'PK06'),
('BS007', N'TS.BS Đặng Văn Hải',     N'Nam', '0922222207', 'hai.bs@hospital.vn',      N'Trưởng khoa', N'Sáng', 'CK04', 'PK07'),
('BS008', N'GS.TS Vũ Thị Hằng',      N'Nữ',  '0922222208', 'hang.bs@hospital.vn',     N'Trưởng khoa', N'Sáng', 'CK05', 'PK08'),
('BS009', N'ThS.BS Bùi Văn Khánh',   N'Nam', '0922222209', 'khanh.bs@hospital.vn',    N'Bác sĩ',      N'Chiều','CK05', 'PK09'),
('BS010', N'TS.BS Đinh Thị Lệ',      N'Nữ',  '0922222210', 'le.bs@hospital.vn',       N'Trưởng khoa', N'Sáng', 'CK06', 'PK10'),
('BS011', N'ThS.BS Trương Văn Nam',  N'Nam', '0922222211', 'nam.bs@hospital.vn',      N'Trưởng khoa', N'Sáng', 'CK07', 'PK11'),
('BS012', N'BS CKI Lý Thị Oanh',    N'Nữ',  '0922222212', 'oanh.bs@hospital.vn',     N'Trưởng khoa', N'Sáng', 'CK08', 'PK12'),
('BS013', N'ThS.BS Phan Văn Phúc',   N'Nam', '0922222213', 'phuc.bs@hospital.vn',     N'Trưởng khoa', N'Sáng', 'CK09', 'PK13'),
('BS014', N'TS.BS Mai Thị Quỳnh',    N'Nữ',  '0922222214', 'quynh.bs@hospital.vn',    N'Trưởng khoa', N'Sáng', 'CK10', 'PK14'),
('BS015', N'ThS.BS Cao Văn Sơn',     N'Nam', '0922222215', 'son.bs@hospital.vn',      N'Bác sĩ',      N'Chiều','CK01', 'PK01');
GO

-- HỒ SƠ Y TẾ
INSERT INTO HoSoYTe VALUES
('HS001','BN001','NV001',N'A', N'+', NULL,         N'Viêm dạ dày 2018',       NULL,                   '2020-01-10','2024-06-01',NULL, N'Trực tiếp'),
('HS002','BN002','NV002',N'B', N'+', N'Penicillin', N'Dị ứng penicillin',      NULL,                   '2019-03-15','2024-05-20',NULL, N'Online'),
('HS003','BN003','NV001',N'O', N'+', NULL,          N'Tăng huyết áp',          N'Tăng huyết áp',       '2018-07-20','2024-04-10',NULL, N'Trực tiếp'),
('HS004','BN004','NV003',N'AB',N'-', NULL,          NULL,                      NULL,                   '2021-09-05','2024-03-22',NULL, N'Trực tiếp'),
('HS005','BN005','NV002',N'A', N'+', N'Aspirin',    N'Đái tháo đường type 2',  N'Đái tháo đường, THA', '2015-04-18','2024-07-01',NULL, N'Trực tiếp'),
('HS006','BN006','NV004',N'B', N'-', NULL,          NULL,                      NULL,                   '2022-02-28','2024-02-28',NULL, N'Online'),
('HS007','BN007','NV001',N'O', N'+', NULL,          N'Gãy tay 2017',           NULL,                   '2020-06-14','2024-06-14',NULL, N'Trực tiếp'),
('HS008','BN008','NV003',N'A', N'+', N'Sulfa',      N'Viêm khớp',              N'Viêm khớp mãn tính',  '2017-11-02','2024-05-02',NULL, N'Trực tiếp'),
('HS009','BN009','NV002',N'B', N'+', NULL,          NULL,                      NULL,                   '2019-08-10','2024-08-10',NULL, N'Trực tiếp'),
('HS010','BN010','NV005',N'O', N'-', N'NSAID',      N'Đau lưng mãn tính',      N'Loãng xương',         '2016-01-05','2024-01-05',NULL, N'Trực tiếp'),
('HS011','BN011','NV001',N'AB',N'+', NULL,          NULL,                      NULL,                   '2021-04-20','2024-04-20',NULL, N'Online'),
('HS012','BN012','NV004',N'A', N'+', NULL,          N'Dị ứng da 2020',         NULL,                   '2020-10-19','2024-10-19',NULL, N'Trực tiếp'),
('HS013','BN013','NV002',N'B', N'+', NULL,          N'Viêm phổi 2015',         N'COPD',                '2015-03-03','2024-03-03',NULL, N'Trực tiếp'),
('HS014','BN014','NV003',N'O', N'+', NULL,          NULL,                      NULL,                   '2022-11-25','2024-11-25',NULL, N'Online'),
('HS015','BN015','NV005',N'A', N'-', N'Amoxicillin',N'Dị ứng amoxicillin',     NULL,                   '2019-07-08','2024-07-08',NULL, N'Trực tiếp'),
('HS016','BN016','NV001',N'B', N'+', NULL,          NULL,                      NULL,                   '2021-04-12','2024-04-12',NULL, N'Trực tiếp'),
('HS017','BN017','NV002',N'O', N'+', NULL,          N'Phẫu thuật ruột thừa',   NULL,                   '2018-08-30','2024-08-30',NULL, N'Trực tiếp'),
('HS018','BN018','NV004',N'AB',N'-', N'Morphine',   N'Đau thần kinh',          N'Đái tháo đường type 1','2016-06-06','2024-06-06',NULL, N'Trực tiếp'),
('HS019','BN019','NV003',N'A', N'+', NULL,          NULL,                      NULL,                   '2020-02-14','2024-02-14',NULL, N'Online'),
('HS020','BN020','NV005',N'B', N'+', NULL,          NULL,                      NULL,                   '2022-09-09','2024-09-09',NULL, N'Online'),
('HS021','BN021','NV001',N'O', N'+', NULL,          N'Cao huyết áp',           N'Tăng huyết áp',       '2019-12-12','2024-12-12',NULL, N'Trực tiếp'),
('HS022','BN022','NV002',N'A', N'+', NULL,          NULL,                      NULL,                   '2021-03-20','2024-03-20',NULL, N'Trực tiếp'),
('HS023','BN023','NV003',N'B', N'+', NULL,          NULL,                      NULL,                   '2022-11-11','2024-11-11',NULL, N'Trực tiếp'),
('HS024','BN024','NV004',N'O', N'-', N'Codeine',    N'Đái tháo đường',         N'Đái tháo đường, THA', '2015-07-04','2024-07-04',NULL, N'Trực tiếp'),
('HS025','BN025','NV005',N'AB',N'+', NULL,          NULL,                      NULL,                   '2024-01-20','2024-06-01',NULL, N'Trực tiếp');
GO

-- HÀNG ĐỢI
INSERT INTO HangDoi VALUES
('HD01','PK01', 8, 5),('HD02','PK02', 5, 3),('HD03','PK03',12, 7),('HD04','PK04', 6, 2),
('HD05','PK05', 9, 6),('HD06','PK06', 4, 1),('HD07','PK07',11, 4),('HD08','PK08',15, 9),
('HD09','PK09', 7, 3),('HD10','PK10', 6, 2),('HD11','PK11', 8, 4),('HD12','PK12', 5, 1),
('HD13','PK13', 7, 2),('HD14','PK14', 4, 0);
GO

-- PHIẾU TIẾP NHẬN
INSERT INTO PhieuTiepNhan VALUES
('PTN001','BN001',1,'2025-01-05 08:00', N'Đang chờ',   NULL),
('PTN002','BN002',2,'2025-01-05 08:15', N'Đã tiếp nhận',NULL),
('PTN003','BN003',3,'2025-01-06 09:00', N'Đang chờ',   NULL),
('PTN004','BN004',4,'2025-01-07 08:30', N'Đã tiếp nhận',NULL),
('PTN005','BN005',5,'2025-01-08 10:00', N'Đang chờ',   NULL),
('PTN006','BN006',1,'2025-02-10 08:00', N'Đã tiếp nhận',NULL),
('PTN007','BN007',2,'2025-02-11 09:00', N'Đang chờ',   NULL),
('PTN008','BN008',3,'2025-02-12 11:00', N'Đã tiếp nhận',NULL),
('PTN009','BN009',1,'2025-03-01 08:45', N'Đang chờ',   NULL),
('PTN010','BN010',6,'2025-03-02 14:00', N'Đã tiếp nhận',NULL);
GO

-- LỊCH KHÁM
INSERT INTO LichKham VALUES
('LK001','BN001','PK01','2025-01-10 08:00', NULL, N'Đã khám'),
('LK002','BN002','PK02','2025-01-10 09:00', NULL, N'Đã khám'),
('LK003','BN003','PK08','2025-01-15 08:30', NULL, N'Đã khám'),
('LK004','BN004','PK05','2025-01-20 10:00', NULL, N'Đã khám'),
('LK005','BN005','PK01','2025-02-05 08:00', NULL, N'Đã khám'),
('LK006','BN006','PK07','2025-02-12 14:00', NULL, N'Đã khám'),
('LK007','BN007','PK03','2025-02-18 08:30', NULL, N'Đã hủy'),
('LK008','BN008','PK14','2025-03-01 09:00', NULL, N'Đã khám'),
('LK009','BN009','PK05','2025-03-10 08:00', NULL, N'Đã khám'),
('LK010','BN010','PK14','2025-03-15 10:30', NULL, N'Đã khám'),
('LK011','BN011','PK01','2025-03-20 08:00', NULL, N'Đã khám'),
('LK012','BN012','PK07','2025-04-01 09:00', NULL, N'Đã khám'),
('LK013','BN013','PK01','2025-04-05 08:00', NULL, N'Đã khám'),
('LK014','BN014','PK11','2025-04-10 08:30', NULL, N'Đã khám'),
('LK015','BN015','PK08','2025-04-15 09:00', NULL, N'Đã khám'),
('LK016','BN016','PK05','2025-04-20 10:00', NULL, N'Đã khám'),
('LK017','BN017','PK03','2025-04-22 08:30', NULL, N'Đã khám'),
('LK018','BN018','PK10','2025-05-01 09:00', NULL, N'Đã khám'),
('LK019','BN019','PK01','2025-05-05 08:00', NULL, N'Đã khám'),
('LK020','BN020','PK11','2025-05-10 10:00', NULL, N'Đã khám'),
('LK021','BN001','PK08','2025-05-15 08:00', NULL, N'Đã khám'),
('LK022','BN003','PK01','2025-05-20 09:00', NULL, N'Đã khám'),
('LK023','BN005','PK08','2025-06-01 08:30', NULL, N'Đã khám'),
('LK024','BN021','PK08','2025-06-03 09:00', NULL, N'Đã khám'),
('LK025','BN022','PK07','2025-06-04 14:00', NULL, N'Đã khám'),
('LK026','BN023','PK05','2025-06-05 08:00', NULL, N'Đang chờ'),
('LK027','BN024','PK01','2025-06-05 09:00', NULL, N'Đang chờ'),
('LK028','BN025','PK05','2025-06-05 10:00', NULL, N'Đã đặt'),
('LK029','BN002','PK07','2025-06-05 11:00', NULL, N'Đã đặt'),
('LK030','BN010','PK01','2025-06-05 08:30', NULL, N'Đang chờ');
GO

-- PHIẾU KHÁM BỆNH
INSERT INTO PhieuKhamBenh VALUES
('PK0001','HS001','BN001','BS001','2025-01-10',N'Đau thượng vị, buồn nôn',       N'Bụng mềm, ấn đau vùng thượng vị', N'Viêm dạ dày cấp',         200000, N'Đã lưu hồ sơ'),
('PK0002','HS002','BN002','BS002','2025-01-10',N'Ngứa da, nổi mề đay',           N'Mề đay toàn thân',                 N'Dị ứng da',               150000, N'Đã lưu hồ sơ'),
('PK0003','HS003','BN003','BS008','2025-01-15',N'Đau ngực, khó thở',             N'HA 160/100, tim đều',              N'Tăng huyết áp cấp',       300000, N'Đã lưu hồ sơ'),
('PK0004','HS004','BN004','BS005','2025-01-20',N'Ho, sốt nhẹ',                   N'Họng đỏ, amygdale sưng',           N'Viêm họng cấp',           180000, N'Đã lưu hồ sơ'),
('PK0005','HS005','BN005','BS001','2025-02-05',N'Khát nước nhiều, tiểu nhiều',   N'Glucose máu 12 mmol/L',            N'Đái tháo đường type 2',   250000, N'Đã lưu hồ sơ'),
('PK0006','HS006','BN006','BS007','2025-02-12',N'Nổi mụn, ngứa mặt',            N'Mụn trứng cá vùng mặt',           N'Mụn trứng cá',            200000, N'Đã lưu hồ sơ'),
('PK0007','HS007','BN007','BS003','2025-02-18',N'Đau bụng phải dưới',            N'Bụng cứng, phản ứng thành bụng',  N'Viêm ruột thừa cấp',      500000, N'Đã lưu hồ sơ'),
('PK0008','HS008','BN008','BS014','2025-03-01',N'Đau khớp gối, sưng',            N'Khớp gối sưng, hạn chế vận động', N'Viêm khớp gối',           280000, N'Đã lưu hồ sơ'),
('PK0009','HS009','BN009','BS005','2025-03-10',N'Sốt cao, ho',                   N'Nhiệt độ 39°C, phổi rale ẩm',     N'Viêm phổi',               350000, N'Đã lưu hồ sơ'),
('PK0010','HS010','BN010','BS014','2025-03-15',N'Đau lưng',                      N'Cột sống thắt lưng đau',           N'Thoái hóa cột sống',      220000, N'Đã lưu hồ sơ'),
('PK0011','HS011','BN011','BS001','2025-03-20',N'Mệt mỏi, chán ăn',             N'Khám không thấy bất thường',       N'Suy nhược cơ thể',        180000, N'Đã lưu hồ sơ'),
('PK0012','HS012','BN012','BS007','2025-04-01',N'Vảy nến, ngứa',                 N'Vảy nến vùng khuỷu tay',          N'Vảy nến',                 230000, N'Đã lưu hồ sơ'),
('PK0013','HS013','BN013','BS001','2025-04-05',N'Khó thở, ho đờm',              N'SpO2 92%, phổi rale ẩm',           N'Đợt cấp COPD',            400000, N'Đã lưu hồ sơ'),
('PK0014','HS014','BN014','BS011','2025-04-10',N'Đau bụng dưới, kinh không đều',N'Tử cung bình thường',              N'Rối loạn kinh nguyệt',    200000, N'Đã lưu hồ sơ'),
('PK0015','HS015','BN015','BS008','2025-04-15',N'Đau ngực, hồi hộp',            N'ECG nhịp xoang',                   N'Rối loạn nhịp tim nhẹ',   350000, N'Đã lưu hồ sơ'),
('PK0016','HS016','BN016','BS005','2025-04-20',N'Tiêu chảy, nôn',               N'Mất nước nhẹ',                     N'Viêm dạ dày ruột cấp',    180000, N'Đã lưu hồ sơ'),
('PK0017','HS017','BN017','BS003','2025-04-22',N'Đau bụng quanh rốn',           N'Bụng mềm',                         N'Đau bụng chức năng',      150000, N'Đã lưu hồ sơ'),
('PK0018','HS018','BN018','BS010','2025-05-01',N'Tê bì tay chân',               N'Phản xạ gân xương bình thường',    N'Bệnh đa dây thần kinh',   300000, N'Đã lưu hồ sơ'),
('PK0019','HS019','BN019','BS001','2025-05-05',N'Đau đầu, mệt mỏi',            N'Huyết áp bình thường',             N'Đau đầu căng thẳng',      150000, N'Đã lưu hồ sơ'),
('PK0020','HS020','BN020','BS011','2025-05-10',N'Chậm kinh, nghén',             N'Thai 8 tuần',                      N'Thai nghén bình thường',  200000, N'Đã lưu hồ sơ'),
('PK0021','HS001','BN001','BS008','2025-05-15',N'Đau ngực trái',                N'ECG bình thường',                  N'Đau ngực không điển hình',280000, N'Đã lưu hồ sơ'),
('PK0022','HS003','BN003','BS001','2025-05-20',N'Mệt mỏi, HA cao',             N'HA 170/110',                       N'Tăng huyết áp không kiểm soát',320000,N'Đã lưu hồ sơ'),
('PK0023','HS021','BN021','BS008','2025-06-03',N'Khó thở khi gắng sức',        N'Tim đều, không gian',              N'Bệnh tim thiếu máu cục bộ',350000,N'Hoàn tất'),
('PK0024','HS022','BN022','BS007','2025-06-04',N'Mụn bọc nhiều',               N'Mụn bọc vùng lưng',               N'Mụn trứng cá nặng',       250000, N'Hoàn tất'),
('PK0025','HS005','BN005','BS008','2025-06-01',N'Đau ngực, HA cao',            N'HA 180/110, ECG thay đổi',         N'Cơn tăng huyết áp',       400000, N'Đã lưu hồ sơ');
GO

-- THẺ BHYT
INSERT INTO TheBHYT VALUES
('BH0000001','BN001','2022-01-01','2026-12-31', 80.00, 50000000, N'Hoạt động', N'Hộ gia đình', 600000, N'Thẻ BHYT hộ gia đình'),
('BH0000002','BN002','2021-06-01','2025-05-31', 80.00, 50000000, N'Hoạt động', N'Người lao động', 700000, NULL),
('BH0000003','BN003','2020-01-01','2024-12-31', 95.00, 100000000,N'Hoạt động', N'Cán bộ nhà nước', 500000, NULL),
('BH0000004','BN004','2022-09-01','2026-08-31', 100.00,50000000, N'Hoạt động', N'Trẻ em dưới 6 tuổi', 0,   N'Miễn phí cho trẻ em'),
('BH0000005','BN005','2019-01-01','2027-12-31', 95.00, 100000000,N'Hoạt động', N'Người về hưu',  450000, NULL),
('BH0000006','BN007','2021-03-01','2025-02-28', 80.00, 50000000, N'Khóa',      N'Người lao động', 700000, N'Thẻ đã hết hạn'),
('BH0000007','BN008','2023-01-01','2026-12-31', 80.00, 50000000, N'Hoạt động', N'Hộ gia đình', 600000, NULL),
('BH0000008','BN009','2022-06-01','2026-05-31', 100.00,50000000, N'Hoạt động', N'Trẻ em dưới 6 tuổi', 0, N'Miễn phí'),
('BH0000009','BN010','2020-01-01','2025-12-31', 95.00, 100000000,N'Hoạt động', N'Người về hưu',  450000, NULL),
('BH0000010','BN013','2018-01-01','2024-12-31', 95.00, 100000000,N'Hoạt động', N'Người về hưu',  450000, NULL),
('BH0000011','BN015','2022-01-01','2026-12-31', 80.00, 50000000, N'Hoạt động', N'Người lao động', 700000, NULL),
('BH0000012','BN016','2022-04-01','2026-03-31', 100.00,50000000, N'Hoạt động', N'Trẻ em dưới 6 tuổi', 0, NULL),
('BH0000013','BN018','2020-06-01','2024-05-31', 80.00, 50000000, N'Khóa',      N'Người lao động', 700000, N'Thẻ hết hạn'),
('BH0000014','BN021','2021-01-01','2025-12-31', 80.00, 50000000, N'Hoạt động', N'Hộ gia đình', 600000, NULL),
('BH0000015','BN024','2019-07-01','2027-06-30', 95.00, 100000000,N'Hoạt động', N'Người về hưu',  450000, NULL);
GO

-- TÀI KHOẢN WEB
INSERT INTO TaiKhoanWeb VALUES
('TK001','BN001','annguyen85',  'hashed_pw_001','an.nguyen@gmail.com',  '0901234561','2023-01-10',NULL),
('TK002','BN002','bichtran90',  'hashed_pw_002','bich.tran@gmail.com',  '0901234563','2022-06-15',NULL),
('TK003','BN006','phuongngo95', 'hashed_pw_003','phuong.ngo@gmail.com', '0901234569','2023-03-20',NULL),
('TK004','BN007','giangdang88', 'hashed_pw_004','giang.dang@gmail.com', '0901234571','2023-05-01',NULL),
('TK005','BN011','manhtruong93','hashed_pw_005','manh.truong@gmail.com','0901234577','2022-11-11',NULL),
('TK006','BN014','phucmai98',   'hashed_pw_006','phuc.mai@gmail.com',   '0901234582','2024-01-05',NULL),
('TK007','BN019','tuanle91',    'hashed_pw_007','tuan.le@gmail.com',    '0901234590','2023-07-07',NULL),
('TK008','BN020','uyenpham01',  'hashed_pw_008','uyen.pham@gmail.com',  '0901234591','2023-08-08',NULL);
GO

-- THUỐC
INSERT INTO Thuoc VALUES
('T001', N'Omeprazole',      N'Viên nang',   N'Thuốc ức chế bơm proton, điều trị viêm loét dạ dày'),
('T002', N'Amlodipin',       N'Viên nén',    N'Thuốc hạ huyết áp nhóm chẹn kênh calci'),
('T003', N'Metformin',       N'Viên nén',    N'Thuốc điều trị đái tháo đường type 2'),
('T004', N'Cetirizin',       N'Viên nén',    N'Thuốc kháng histamine điều trị dị ứng'),
('T005', N'Amoxicillin',     N'Viên nang',   N'Kháng sinh nhóm Penicillin phổ rộng'),
('T006', N'Paracetamol',     N'Viên nén',    N'Thuốc hạ sốt, giảm đau'),
('T007', N'Ibuprofen',       N'Viên nén',    N'Thuốc chống viêm không steroid'),
('T008', N'Atorvastatin',    N'Viên nén',    N'Thuốc hạ mỡ máu nhóm statin'),
('T009', N'Salbutamol',      N'Bình xịt',    N'Thuốc giãn phế quản điều trị hen'),
('T010', N'Vitamin C',       N'Viên sủi',    N'Bổ sung vitamin C'),
('T011', N'Glucosamin',      N'Viên nang',   N'Bổ trợ điều trị thoái hóa khớp'),
('T012', N'Prednisone',      N'Viên nén',    N'Corticosteroid điều trị viêm'),
('T013', N'Azithromycin',    N'Viên nén',    N'Kháng sinh điều trị nhiễm khuẩn hô hấp'),
('T014', N'Insulin Glargine',N'Lọ tiêm',     N'Insulin nền điều trị đái tháo đường'),
('T015', N'Bisoprolol',      N'Viên nén',    N'Thuốc điều trị tăng huyết áp, suy tim');
GO

-- ĐƠN THUỐC
INSERT INTO DonThuoc VALUES
('DT001','PK0001','2025-01-10',N'Uống sau ăn'),
('DT002','PK0002','2025-01-10',NULL),
('DT003','PK0003','2025-01-15',N'Tái khám sau 2 tuần'),
('DT004','PK0004','2025-01-20',NULL),
('DT005','PK0005','2025-02-05',N'Kiểm tra đường huyết định kỳ'),
('DT006','PK0006','2025-02-12',NULL),
('DT007','PK0008','2025-03-01',N'Tái khám sau 1 tháng'),
('DT008','PK0009','2025-03-10',NULL),
('DT009','PK0010','2025-03-15',NULL),
('DT010','PK0011','2025-03-20',N'Tăng cường nghỉ ngơi'),
('DT011','PK0012','2025-04-01',N'Bôi thêm kem ngoài da'),
('DT012','PK0013','2025-04-05',N'Tái khám ngay nếu khó thở tăng'),
('DT013','PK0014','2025-04-10',NULL),
('DT014','PK0015','2025-04-15',N'Theo dõi nhịp tim'),
('DT015','PK0016','2025-04-20',N'Bù nước điện giải'),
('DT016','PK0018','2025-05-01',N'Tái khám sau 3 tuần'),
('DT017','PK0019','2025-05-05',N'Nghỉ ngơi, giảm căng thẳng'),
('DT018','PK0021','2025-05-15',NULL),
('DT019','PK0022','2025-05-20',N'Đo HA hàng ngày'),
('DT020','PK0025','2025-06-01',N'Nhập viện theo dõi');
GO

-- CHI TIẾT ĐƠN THUỐC
INSERT INTO ChiTietDonThuoc VALUES
('CT001','DT001','T001', 30,N'20mg/ngày',      N'Uống trước ăn 30 phút',  N'7 ngày'),
('CT002','DT001','T006', 20,N'500mg x 3/ngày', N'Uống sau ăn',            N'5 ngày'),
('CT003','DT002','T004', 14,N'10mg/ngày',      N'Uống buổi tối',          N'2 tuần'),
('CT004','DT003','T002', 30,N'5mg/ngày',       N'Uống buổi sáng',         N'1 tháng'),
('CT005','DT003','T015', 30,N'5mg/ngày',       N'Uống buổi sáng',         N'1 tháng'),
('CT006','DT004','T005', 21,N'500mg x 3/ngày', N'Uống sau ăn',            N'7 ngày'),
('CT007','DT004','T006', 15,N'500mg khi sốt',  N'Uống khi sốt >38.5',     N'5 ngày'),
('CT008','DT005','T003', 60,N'500mg x 2/ngày', N'Uống sau ăn',            N'1 tháng'),
('CT009','DT005','T014',  1,N'10 đơn vị/ngày', N'Tiêm dưới da buổi tối',  N'1 tháng'),
('CT010','DT006','T004', 10,N'10mg/ngày',      N'Uống buổi tối',          N'10 ngày'),
('CT011','DT007','T011', 30,N'500mg x 2/ngày', N'Uống sau ăn',            N'1 tháng'),
('CT012','DT007','T007', 20,N'400mg x 2/ngày', N'Uống sau ăn',            N'10 ngày'),
('CT013','DT008','T013', 10,N'500mg/ngày',     N'Uống buổi sáng',         N'5 ngày'),
('CT014','DT008','T006', 15,N'500mg khi sốt',  N'Uống khi sốt >38.5',     N'5 ngày'),
('CT015','DT009','T011', 60,N'500mg x 2/ngày', N'Uống sau ăn',            N'1 tháng'),
('CT016','DT010','T010', 30,N'1g/ngày',        N'Uống buổi sáng',         N'1 tháng'),
('CT017','DT011','T012', 20,N'5mg/ngày',       N'Uống buổi sáng',         N'2 tuần'),
('CT018','DT012','T009', 1, N'2 nhát xịt khi cần', N'Khi khó thở',        N'Khi cần'),
('CT019','DT012','T013', 5, N'500mg/ngày',     N'Uống buổi sáng',         N'5 ngày'),
('CT020','DT013','T004', 14,N'10mg/ngày',      N'Uống buổi tối',          N'2 tuần'),
('CT021','DT014','T008', 30,N'20mg/ngày',      N'Uống buổi tối',          N'1 tháng'),
('CT022','DT014','T015', 30,N'5mg/ngày',       N'Uống buổi sáng',         N'1 tháng'),
('CT023','DT015','T006', 20,N'500mg x 3/ngày', N'Uống sau ăn',            N'3 ngày'),
('CT024','DT016','T003', 60,N'500mg x 2/ngày', N'Uống sau ăn',            N'1 tháng'),
('CT025','DT016','T006', 30,N'500mg khi đau',  N'Uống khi cần',           N'1 tháng'),
('CT026','DT017','T006', 10,N'500mg x 3/ngày', N'Uống sau ăn',            N'3 ngày'),
('CT027','DT018','T008', 30,N'40mg/ngày',      N'Uống buổi tối',          N'1 tháng'),
('CT028','DT018','T015', 30,N'10mg/ngày',      N'Uống buổi sáng',         N'1 tháng'),
('CT029','DT019','T002', 30,N'10mg/ngày',      N'Uống buổi sáng',         N'1 tháng'),
('CT030','DT019','T015', 30,N'10mg/ngày',      N'Uống buổi sáng',         N'1 tháng'),
('CT031','DT020','T002', 30,N'10mg/ngày',      N'Uống buổi sáng',         N'1 tháng'),
('CT032','DT020','T015', 30,N'10mg/ngày',      N'Uống buổi sáng',         N'1 tháng');
GO

-- LỊCH LÀM VIỆC
INSERT INTO LichLamViec VALUES
('LLV01','BS001','2025-06-05','07:00','11:30',N'Ca sáng nội khoa'),
('LLV02','BS002','2025-06-05','13:00','17:00',N'Ca chiều nội khoa'),
('LLV03','BS003','2025-06-05','07:00','11:30',N'Ca sáng ngoại khoa'),
('LLV04','BS005','2025-06-05','07:00','11:30',N'Ca sáng nhi khoa'),
('LLV05','BS007','2025-06-05','07:00','11:30',N'Ca sáng da liễu'),
('LLV06','BS008','2025-06-05','07:00','11:30',N'Ca sáng tim mạch'),
('LLV07','BS009','2025-06-05','13:00','17:00',N'Ca chiều tim mạch'),
('LLV08','BS010','2025-06-05','07:00','11:30',N'Ca sáng thần kinh'),
('LLV09','BS011','2025-06-05','07:00','11:30',N'Ca sáng sản phụ khoa'),
('LLV10','BS012','2025-06-05','07:00','11:30',N'Ca sáng mắt'),
('LLV11','BS001','2025-06-06','07:00','11:30',NULL),
('LLV12','BS003','2025-06-06','07:00','11:30',NULL),
('LLV13','BS008','2025-06-06','07:00','11:30',NULL),
('LLV14','BS001','2025-06-02','07:00','11:30',N'Ca sáng nội khoa'),
('LLV15','BS002','2025-06-02','13:00','17:00',N'Ca chiều nội khoa'),
('LLV16','BS001','2025-06-03','07:00','11:30',NULL),
('LLV17','BS008','2025-06-03','07:00','11:30',NULL),
('LLV18','BS001','2025-05-20','07:00','11:30',NULL),
('LLV19','BS002','2025-05-20','13:00','17:00',NULL),
('LLV20','BS008','2025-05-15','07:00','11:30',NULL);
GO

-- ĐƠN ĐĂNG KÝ KHÁM
INSERT INTO DonDangKy VALUES
('DK001','BN001','PK01','2025-06-05',N'Đau dạ dày',       N'Đã xác nhận'),
('DK002','BN003','PK08','2025-06-05',N'Đau ngực',         N'Đã xác nhận'),
('DK003','BN005','PK08','2025-06-05',N'Khó thở',          N'Đã xác nhận'),
('DK004','BN006','PK07','2025-06-05',N'Mụn da',           N'Đã xác nhận'),
('DK005','BN010','PK14','2025-06-05',N'Đau lưng',         N'Đã xác nhận'),
('DK006','BN011','PK01','2025-06-05',N'Mệt mỏi',          N'Chờ xác nhận'),
('DK007','BN012','PK07','2025-06-05',N'Ngứa da',          N'Chờ xác nhận'),
('DK008','BN015','PK08','2025-06-05',N'Tim đập nhanh',    N'Đã xác nhận'),
('DK009','BN019','PK01','2025-06-06',N'Đau đầu',          N'Chờ xác nhận'),
('DK010','BN020','PK11','2025-06-06',N'Thai kỳ',          N'Đã xác nhận'),
('DK011','BN002','PK07','2025-06-06',N'Dị ứng da',        N'Đã xác nhận'),
('DK012','BN004','PK05','2025-06-07',N'Ho sốt',           N'Chờ xác nhận'),
('DK013','BN007','PK03','2025-06-07',N'Đau bụng',         N'Đã hủy'),
('DK014','BN009','PK05','2025-06-07',N'Sốt cao',          N'Đã xác nhận'),
('DK015','BN001','PK08','2025-06-08',N'Tái khám tim mạch',N'Đã xác nhận'),
('DK016','BN003','PK01','2025-06-08',N'Tái khám huyết áp',N'Chờ xác nhận'),
('DK017','BN008','PK14','2025-06-08',N'Đau khớp',         N'Đã xác nhận'),
('DK018','BN013','PK01','2025-06-08',N'Khó thở',          N'Đã xác nhận'),
('DK019','BN001','PK01','2025-06-08',N'Đau dạ dày tái phát',N'Đã xác nhận'),
('DK020','BN005','PK01','2025-06-09',N'Kiểm tra tiểu đường',N'Chờ xác nhận');
GO

-- SỐ THỨ TỰ
INSERT INTO SoThuTu VALUES
('THE001','BN001','HD01','LK001', 1, N'DONE',     '2025-01-10 07:30','2025-01-10 08:00',0),
('THE002','BN002','HD02','LK002', 1, N'DONE',     '2025-01-10 08:00','2025-01-10 09:00',0),
('THE003','BN003','HD08','LK003', 1, N'DONE',     '2025-01-15 07:30','2025-01-15 08:30',0),
('THE004','BN004','HD05','LK004', 1, N'DONE',     '2025-01-20 09:00','2025-01-20 10:00',0),
('THE005','BN005','HD01','LK005', 2, N'DONE',     '2025-02-05 07:30','2025-02-05 08:00',0),
('THE006','BN006','HD07','LK006', 1, N'DONE',     '2025-02-12 13:30','2025-02-12 14:00',0),
('THE007','BN007','HD03','LK007', 1, N'CANCELLED','2025-02-18 07:30','2025-02-18 08:30',0),
('THE008','BN008','HD14','LK008', 1, N'DONE',     '2025-03-01 08:30','2025-03-01 09:00',0),
('THE009','BN009','HD05','LK009', 2, N'DONE',     '2025-03-10 07:30','2025-03-10 08:00',0),
('THE010','BN010','HD14','LK010', 2, N'DONE',     '2025-03-15 10:00','2025-03-15 10:30',0),
('THE011','BN011','HD01','LK011', 3, N'DONE',     '2025-03-20 07:30','2025-03-20 08:00',0),
('THE012','BN012','HD07','LK012', 2, N'DONE',     '2025-04-01 08:30','2025-04-01 09:00',0),
('THE013','BN013','HD01','LK013', 4, N'DONE',     '2025-04-05 07:30','2025-04-05 08:00',0),
('THE014','BN014','HD11','LK014', 1, N'DONE',     '2025-04-10 08:00','2025-04-10 08:30',0),
('THE015','BN015','HD08','LK015', 3, N'DONE',     '2025-04-15 08:30','2025-04-15 09:00',0),
('THE016','BN016','HD05','LK016', 3, N'DONE',     '2025-04-20 09:30','2025-04-20 10:00',0),
('THE017','BN017','HD03','LK017', 2, N'DONE',     '2025-04-22 08:00','2025-04-22 08:30',0),
('THE018','BN018','HD10','LK018', 1, N'DONE',     '2025-05-01 08:30','2025-05-01 09:00',0),
('THE019','BN019','HD01','LK019', 5, N'DONE',     '2025-05-05 07:30','2025-05-05 08:00',0),
('THE020','BN020','HD11','LK020', 2, N'DONE',     '2025-05-10 09:30','2025-05-10 10:00',0),
('THE021','BN001','HD08','LK021', 4, N'DONE',     '2025-05-15 07:30','2025-05-15 08:00',0),
('THE022','BN003','HD01','LK022', 6, N'DONE',     '2025-05-20 08:30','2025-05-20 09:00',0),
('THE023','BN005','HD08','LK023', 5, N'DONE',     '2025-06-01 07:30','2025-06-01 08:30',0),
('THE024','BN021','HD08','LK024', 6, N'WAITING',  '2025-06-03 08:30','2025-06-03 09:00',0),
('THE025','BN022','HD07','LK025', 3, N'WAITING',  '2025-06-04 13:30','2025-06-04 14:00',0),
('THE026','BN023','HD05','LK026', 4, N'WAITING',  '2025-06-05 07:30','2025-06-05 08:00',0),
('THE027','BN024','HD01','LK027', 7, N'WAITING',  '2025-06-05 08:00','2025-06-05 09:00',0),
('THE028','BN010','HD01','LK030', 8, N'WAITING',  '2025-06-05 08:00','2025-06-05 08:30',0),
('THE029','BN001','HD01', NULL,   9, N'CALLED',   '2025-06-05 07:00','2025-06-05 08:00',0),
('THE030','BN002','HD07', NULL,   4, N'SKIPPED',  '2025-06-05 07:00','2025-06-05 08:00',1);
GO

-- THÔNG BÁO
INSERT INTO ThongBao VALUES
('TB001','BN001',N'Lịch khám hôm nay',         N'Bạn có lịch khám lúc 08:00 tại Phòng Nội khoa 1',    N'Push', '2025-06-05 07:00',1),
('TB002','BN003',N'Lịch khám hôm nay',         N'Bạn có lịch khám lúc 08:30 tại Phòng Tim mạch 1',   N'Push', '2025-06-05 07:00',1),
('TB003','BN005',N'Nhắc nhở uống thuốc',        N'Đã đến giờ uống Metformin buổi tối',                 N'SMS',  '2025-06-04 20:00',1),
('TB004','BN002',N'Thẻ BHYT sắp hết hạn',      N'Thẻ BHYT của bạn sẽ hết hạn sau 30 ngày',           N'Email','2025-05-01 09:00',1),
('TB005',NULL,  N'Thông báo hệ thống',          N'Hệ thống sẽ bảo trì từ 22:00-24:00 ngày 10/06/2025',N'Push', '2025-06-10 08:00',0),
('TB006','BN015',N'Kết quả xét nghiệm',        N'Kết quả ECG của bạn đã có, mời đến nhận',            N'Email','2025-04-16 08:00',1),
('TB007','BN010',N'Nhắc tái khám',             N'Đến hạn tái khám cơ xương khớp tháng 06/2025',       N'Push', '2025-06-01 08:00',1),
('TB008','BN009',N'Lịch khám trẻ em',          N'Lịch khám tiêm chủng ngày 07/06/2025 lúc 08:00',    N'SMS',  '2025-06-06 18:00',0);
GO


/*================================================================
    PHẦN TRUY VẤN THEO FILE eH
================================================================*/

/*------------------------------------------------------------
  A. BỆNH NHÂN - Danh sách & tìm kiếm
------------------------------------------------------------*/

-- 1. Danh sách tất cả bệnh nhân
SELECT * FROM BenhNhan ORDER BY MaBN;

-- 2. Tìm bệnh nhân theo mã bệnh nhân
SELECT * FROM BenhNhan WHERE MaBN = 'BN001';

-- 3. Tìm bệnh nhân theo họ tên (tìm kiếm mờ)
SELECT * FROM BenhNhan
WHERE HoTen LIKE N'%Nguyễn%'
ORDER BY HoTen;

-- 4. Tìm bệnh nhân theo CCCD
--    (Lưu ý: schema hiện tại chưa có cột CCCD trong BenhNhan;
--     truy vấn mẫu dùng cột SDT thay thế cho đến khi bổ sung cột CCCD)
SELECT * FROM BenhNhan WHERE SDT = '0901234561';

-- 5. Danh sách bệnh nhân theo giới tính
SELECT * FROM BenhNhan WHERE GioiTinh = N'Nam'   ORDER BY HoTen;
SELECT * FROM BenhNhan WHERE GioiTinh = N'Nữ'    ORDER BY HoTen;

-- 6. Danh sách bệnh nhân theo độ tuổi (>= 60)
SELECT *, DATEDIFF(YEAR, NgaySinh, GETDATE()) AS Tuoi
FROM BenhNhan
WHERE DATEDIFF(YEAR, NgaySinh, GETDATE()) >= 60
ORDER BY NgaySinh;

-- 7. Danh sách bệnh nhân sinh trong năm hiện tại
SELECT * FROM BenhNhan WHERE YEAR(NgaySinh) = YEAR(GETDATE());

-- 8. Danh sách bệnh nhân đăng ký trong tháng
--    (dùng NgayTao từ HoSoYTe vì BenhNhan không có NgayDangKy)
SELECT bn.*, hs.NgayTao AS NgayTaoHoSo
FROM BenhNhan bn
JOIN HoSoYTe hs ON bn.MaBN = hs.MaBN
WHERE MONTH(hs.NgayTao) = MONTH(GETDATE())
  AND YEAR(hs.NgayTao)  = YEAR(GETDATE());

-- 9. Danh sách bệnh nhân có email
SELECT * FROM BenhNhan WHERE Email IS NOT NULL ORDER BY HoTen;

-- 10. Danh sách bệnh nhân chưa có email
SELECT * FROM BenhNhan WHERE Email IS NULL ORDER BY HoTen;

-- 11. Danh sách bệnh nhân theo địa chỉ (TP.HCM)
SELECT * FROM BenhNhan WHERE DiaChi LIKE N'%TP.HCM%' ORDER BY HoTen;

/*------------------------------------------------------------
  A. BỆNH NHÂN - Thống kê
------------------------------------------------------------*/

-- 12. Thống kê số lượng bệnh nhân
SELECT COUNT(*) AS TongSoBenhNhan FROM BenhNhan;

-- 13. Thống kê bệnh nhân theo giới tính
SELECT GioiTinh, COUNT(*) AS SoLuong
FROM BenhNhan
GROUP BY GioiTinh;

-- 14. Thống kê bệnh nhân theo nhóm tuổi
SELECT
    NhomTuoi =
        CASE
            WHEN DATEDIFF(YEAR, NgaySinh, GETDATE()) < 6   THEN N'Dưới 6 tuổi'
            WHEN DATEDIFF(YEAR, NgaySinh, GETDATE()) < 18  THEN N'6 - 17 tuổi'
            WHEN DATEDIFF(YEAR, NgaySinh, GETDATE()) < 40  THEN N'18 - 39 tuổi'
            WHEN DATEDIFF(YEAR, NgaySinh, GETDATE()) < 60  THEN N'40 - 59 tuổi'
            ELSE N'Từ 60 tuổi trở lên'
        END,
    COUNT(*) AS SoLuong
FROM BenhNhan
GROUP BY
    CASE
        WHEN DATEDIFF(YEAR, NgaySinh, GETDATE()) < 6   THEN N'Dưới 6 tuổi'
        WHEN DATEDIFF(YEAR, NgaySinh, GETDATE()) < 18  THEN N'6 - 17 tuổi'
        WHEN DATEDIFF(YEAR, NgaySinh, GETDATE()) < 40  THEN N'18 - 39 tuổi'
        WHEN DATEDIFF(YEAR, NgaySinh, GETDATE()) < 60  THEN N'40 - 59 tuổi'
        ELSE N'Từ 60 tuổi trở lên'
    END
ORDER BY MIN(NgaySinh);

/*------------------------------------------------------------
  B. THẺ BẢO HIỂM Y TẾ - Danh sách & tìm kiếm
------------------------------------------------------------*/

-- 15. Danh sách thẻ BHYT
SELECT b.*, bn.HoTen FROM TheBHYT b JOIN BenhNhan bn ON b.MaBN = bn.MaBN;

-- 16. Tìm thẻ BHYT theo mã thẻ
SELECT b.*, bn.HoTen FROM TheBHYT b JOIN BenhNhan bn ON b.MaBN = bn.MaBN
WHERE b.MaBHYT = 'BH0000001';

-- 17. Danh sách bệnh nhân có BHYT
SELECT bn.*
FROM BenhNhan bn
WHERE EXISTS (SELECT 1 FROM TheBHYT bh WHERE bh.MaBN = bn.MaBN);

-- 18. Danh sách bệnh nhân chưa có BHYT
SELECT bn.*
FROM BenhNhan bn
WHERE NOT EXISTS (SELECT 1 FROM TheBHYT bh WHERE bh.MaBN = bn.MaBN);

-- 19. Danh sách thẻ BHYT sắp hết hạn (trong 30 ngày tới)
SELECT b.*, bn.HoTen
FROM TheBHYT b JOIN BenhNhan bn ON b.MaBN = bn.MaBN
WHERE b.NgayHetHan BETWEEN GETDATE() AND DATEADD(DAY, 30, GETDATE())
  AND b.TrangThai = N'Hoạt động';

-- 20. Danh sách thẻ BHYT đã hết hạn
SELECT b.*, bn.HoTen
FROM TheBHYT b JOIN BenhNhan bn ON b.MaBN = bn.MaBN
WHERE b.NgayHetHan < GETDATE();

/*------------------------------------------------------------
  B. BHYT - Thống kê
------------------------------------------------------------*/

-- 21. Thống kê mức hưởng BHYT
SELECT LoaiThe, AVG(TyLeChiTra) AS TyLeChiTraTB,
       SUM(MucChiTra) AS TongMucChiTra, COUNT(*) AS SoThe
FROM TheBHYT
GROUP BY LoaiThe;

/*------------------------------------------------------------
  C. CHUYÊN KHOA - BÁC SĨ
------------------------------------------------------------*/

-- 22. Danh sách chuyên khoa
SELECT * FROM ChuyenKhoa ORDER BY MaCK;

-- 23. Danh sách bác sĩ
SELECT bs.*, ck.TenCK, pk.TenPhongKham
FROM BacSi bs
JOIN ChuyenKhoa ck ON bs.MaCK = ck.MaCK
LEFT JOIN PhongKham pk ON bs.MaPhongKham = pk.MaPhongKham
ORDER BY bs.HoTen;

-- 24. Danh sách bác sĩ theo chuyên khoa
SELECT bs.*, ck.TenCK
FROM BacSi bs JOIN ChuyenKhoa ck ON bs.MaCK = ck.MaCK
WHERE bs.MaCK = 'CK01'
ORDER BY bs.HoTen;

-- 25. Tìm bác sĩ theo tên
SELECT * FROM BacSi WHERE HoTen LIKE N'%Nguyễn%';

-- 26. Tìm bác sĩ theo chức vụ
SELECT * FROM BacSi WHERE ChucVu = N'Trưởng khoa';

-- 27. Danh sách bác sĩ có lịch làm việc
SELECT DISTINCT bs.MaBS, bs.HoTen, bs.MaCK
FROM BacSi bs
WHERE EXISTS (SELECT 1 FROM LichLamViec llv WHERE llv.MaBS = bs.MaBS);

-- 28. Danh sách bác sĩ chưa có lịch làm việc
SELECT bs.MaBS, bs.HoTen, bs.MaCK
FROM BacSi bs
WHERE NOT EXISTS (SELECT 1 FROM LichLamViec llv WHERE llv.MaBS = bs.MaBS);

-- 29. Tìm bác sĩ theo số điện thoại
SELECT * FROM BacSi WHERE SDT = '0922222201';

-- 30. Danh sách trưởng khoa
SELECT bs.*, ck.TenCK
FROM BacSi bs JOIN ChuyenKhoa ck ON bs.MaCK = ck.MaCK
WHERE bs.ChucVu = N'Trưởng khoa'
ORDER BY ck.TenCK;

/*------------------------------------------------------------
  C. Thống kê bác sĩ
------------------------------------------------------------*/

-- 31. Thống kê tổng số bác sĩ
SELECT COUNT(*) AS TongSoBacSi FROM BacSi;

-- 32. Thống kê số lượng bác sĩ theo chuyên khoa
SELECT ck.TenCK, COUNT(bs.MaBS) AS SoBacSi
FROM ChuyenKhoa ck
LEFT JOIN BacSi bs ON ck.MaCK = bs.MaCK
GROUP BY ck.MaCK, ck.TenCK
ORDER BY SoBacSi DESC;

-- 33. Danh sách bác sĩ khám nhiều nhất
SELECT TOP 5 bs.MaBS, bs.HoTen, ck.TenCK, COUNT(pk.MaPK) AS SoLuotKham
FROM BacSi bs
JOIN ChuyenKhoa ck ON bs.MaCK = ck.MaCK
JOIN PhieuKhamBenh pk ON bs.MaBS = pk.MaBS
GROUP BY bs.MaBS, bs.HoTen, ck.TenCK
ORDER BY SoLuotKham DESC;

/*------------------------------------------------------------
  D. LỊCH LÀM VIỆC
------------------------------------------------------------*/

-- 34. Danh sách lịch làm việc
SELECT llv.*, bs.HoTen AS TenBacSi
FROM LichLamViec llv JOIN BacSi bs ON llv.MaBS = bs.MaBS
ORDER BY llv.NgayLamViec, llv.GioBatDau;

-- 35. Lịch làm việc theo bác sĩ
SELECT llv.*, bs.HoTen
FROM LichLamViec llv JOIN BacSi bs ON llv.MaBS = bs.MaBS
WHERE llv.MaBS = 'BS001'
ORDER BY llv.NgayLamViec;

-- 36. Lịch làm việc theo ngày
SELECT llv.*, bs.HoTen
FROM LichLamViec llv JOIN BacSi bs ON llv.MaBS = bs.MaBS
WHERE llv.NgayLamViec = '2025-06-05'
ORDER BY llv.GioBatDau;

-- 37. Lịch làm việc trong tuần (tuần hiện tại)
SELECT llv.*, bs.HoTen
FROM LichLamViec llv JOIN BacSi bs ON llv.MaBS = bs.MaBS
WHERE llv.NgayLamViec >= DATEADD(DAY, 1 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE))
  AND llv.NgayLamViec <  DATEADD(DAY, 8 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE))
ORDER BY llv.NgayLamViec, llv.GioBatDau;

-- 38. Lịch làm việc trong tháng
SELECT llv.*, bs.HoTen
FROM LichLamViec llv JOIN BacSi bs ON llv.MaBS = bs.MaBS
WHERE MONTH(llv.NgayLamViec) = MONTH(GETDATE())
  AND YEAR(llv.NgayLamViec)  = YEAR(GETDATE())
ORDER BY llv.NgayLamViec;

-- 39. Danh sách bác sĩ trực hôm nay
SELECT DISTINCT bs.MaBS, bs.HoTen, bs.ChucVu, ck.TenCK
FROM BacSi bs
JOIN ChuyenKhoa ck ON bs.MaCK = ck.MaCK
JOIN LichLamViec llv ON bs.MaBS = llv.MaBS
WHERE llv.NgayLamViec = CAST(GETDATE() AS DATE);

/*------------------------------------------------------------
  D. Thống kê lịch làm việc
------------------------------------------------------------*/

-- 40. Tổng số ca làm việc
SELECT COUNT(*) AS TongSoCa FROM LichLamViec;

-- 41. Thống kê ca làm việc theo bác sĩ
SELECT bs.HoTen, COUNT(llv.MaLich) AS SoCa
FROM BacSi bs
LEFT JOIN LichLamViec llv ON bs.MaBS = llv.MaBS
GROUP BY bs.MaBS, bs.HoTen
ORDER BY SoCa DESC;

-- 42. Tìm ca làm việc dài nhất
SELECT TOP 1 llv.*, bs.HoTen,
    DATEDIFF(MINUTE, llv.GioBatDau, llv.GioKT) AS ThoiLuongPhut
FROM LichLamViec llv JOIN BacSi bs ON llv.MaBS = bs.MaBS
ORDER BY DATEDIFF(MINUTE, llv.GioBatDau, llv.GioKT) DESC;

-- 43. Tìm ca làm việc ngắn nhất
SELECT TOP 1 llv.*, bs.HoTen,
    DATEDIFF(MINUTE, llv.GioBatDau, llv.GioKT) AS ThoiLuongPhut
FROM LichLamViec llv JOIN BacSi bs ON llv.MaBS = bs.MaBS
ORDER BY DATEDIFF(MINUTE, llv.GioBatDau, llv.GioKT) ASC;

/*------------------------------------------------------------
  E. ĐƠN ĐĂNG KÝ KHÁM
------------------------------------------------------------*/

-- 44. Danh sách đơn đăng ký khám
SELECT dk.*, bn.HoTen, pk.TenPhongKham
FROM DonDangKy dk
JOIN BenhNhan bn ON dk.MaBN = bn.MaBN
JOIN PhongKham pk ON dk.MaPhongKham = pk.MaPhongKham
ORDER BY dk.NgayDK;

-- 45. Danh sách đăng ký theo bệnh nhân
SELECT dk.*, pk.TenPhongKham
FROM DonDangKy dk
JOIN PhongKham pk ON dk.MaPhongKham = pk.MaPhongKham
WHERE dk.MaBN = 'BN001'
ORDER BY dk.NgayDK;

-- 46. Danh sách đăng ký theo slot khám (phòng khám)
SELECT dk.*, bn.HoTen
FROM DonDangKy dk JOIN BenhNhan bn ON dk.MaBN = bn.MaBN
WHERE dk.MaPhongKham = 'PK01'
ORDER BY dk.NgayDK;

-- 47. Danh sách đăng ký trong ngày
SELECT dk.*, bn.HoTen, pk.TenPhongKham
FROM DonDangKy dk
JOIN BenhNhan bn ON dk.MaBN = bn.MaBN
JOIN PhongKham pk ON dk.MaPhongKham = pk.MaPhongKham
WHERE dk.NgayDK = CAST(GETDATE() AS DATE);

-- 48. Danh sách đăng ký trong tháng
SELECT dk.*, bn.HoTen
FROM DonDangKy dk JOIN BenhNhan bn ON dk.MaBN = bn.MaBN
WHERE MONTH(dk.NgayDK) = MONTH(GETDATE())
  AND YEAR(dk.NgayDK)  = YEAR(GETDATE())
ORDER BY dk.NgayDK;

-- 49. Danh sách đăng ký đã xác nhận
SELECT dk.*, bn.HoTen
FROM DonDangKy dk JOIN BenhNhan bn ON dk.MaBN = bn.MaBN
WHERE dk.TrangThai = N'Đã xác nhận';

-- 50. Danh sách đăng ký bị hủy
SELECT dk.*, bn.HoTen
FROM DonDangKy dk JOIN BenhNhan bn ON dk.MaBN = bn.MaBN
WHERE dk.TrangThai = N'Đã hủy';

/*------------------------------------------------------------
  E. Thống kê đơn đăng ký
------------------------------------------------------------*/

-- 51. Thống kê số lượng đăng ký
SELECT COUNT(*) AS TongDonDangKy FROM DonDangKy;

-- 52. Thống kê số đăng ký theo ngày
SELECT NgayDK, COUNT(*) AS SoDangKy
FROM DonDangKy
GROUP BY NgayDK
ORDER BY NgayDK;

-- 53. Thống kê số đăng ký theo trạng thái
SELECT TrangThai, COUNT(*) AS SoLuong
FROM DonDangKy
GROUP BY TrangThai;

/*------------------------------------------------------------
  F. HÀNG ĐỢI KHÁM
------------------------------------------------------------*/

-- 54. Danh sách hàng đợi khám
SELECT hd.*, pk.TenPhongKham, ck.TenCK
FROM HangDoi hd
JOIN PhongKham pk ON hd.MaPhongKham = pk.MaPhongKham
JOIN ChuyenKhoa ck ON pk.MaCK = ck.MaCK
ORDER BY hd.SoLuongDangCho DESC;

-- 55. Danh sách bệnh nhân đang chờ khám
SELECT stt.*, bn.HoTen, bn.LoaiUuTien, hd.MaPhongKham, pk.TenPhongKham
FROM SoThuTu stt
JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
JOIN HangDoi hd ON stt.MaHangDoi = hd.MaHangDoi
JOIN PhongKham pk ON hd.MaPhongKham = pk.MaPhongKham
WHERE stt.TrangThaiThe = N'WAITING'
ORDER BY stt.SoThuTu;

-- 56. Danh sách bệnh nhân đã được gọi khám
SELECT stt.*, bn.HoTen
FROM SoThuTu stt JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
WHERE stt.TrangThaiThe = N'CALLED';

-- 57. Danh sách bệnh nhân đã hoàn thành khám
SELECT stt.*, bn.HoTen
FROM SoThuTu stt JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
WHERE stt.TrangThaiThe = N'DONE';

-- 58. Danh sách bệnh nhân bỏ lượt khám
SELECT stt.*, bn.HoTen
FROM SoThuTu stt JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
WHERE stt.TrangThaiThe IN (N'SKIPPED', N'CANCELLED');

-- 59. Danh sách bệnh nhân ưu tiên (đang chờ)
SELECT stt.*, bn.HoTen, bn.LoaiUuTien
FROM SoThuTu stt JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
WHERE stt.TrangThaiThe = N'WAITING'
  AND bn.LoaiUuTien IN (N'Trẻ em', N'Người cao tuổi', N'Cấp cứu')
ORDER BY
    CASE bn.LoaiUuTien
        WHEN N'Cấp cứu'        THEN 1
        WHEN N'Người cao tuổi' THEN 2
        WHEN N'Trẻ em'         THEN 3
    END, stt.SoThuTu;

-- 60. Danh sách bệnh nhân theo số thứ tự tăng dần
SELECT stt.*, bn.HoTen
FROM SoThuTu stt JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
WHERE stt.TrangThaiThe = N'WAITING'
ORDER BY stt.SoThuTu ASC;

-- 61. Danh sách bệnh nhân theo số thứ tự giảm dần
SELECT stt.*, bn.HoTen
FROM SoThuTu stt JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
WHERE stt.TrangThaiThe = N'WAITING'
ORDER BY stt.SoThuTu DESC;

-- 62. Tìm bệnh nhân có số thứ tự nhỏ nhất (đang chờ)
SELECT TOP 1 stt.*, bn.HoTen
FROM SoThuTu stt JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
WHERE stt.TrangThaiThe = N'WAITING'
ORDER BY stt.SoThuTu ASC;

-- 63. Tìm bệnh nhân có số thứ tự lớn nhất (đang chờ)
SELECT TOP 1 stt.*, bn.HoTen
FROM SoThuTu stt JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
WHERE stt.TrangThaiThe = N'WAITING'
ORDER BY stt.SoThuTu DESC;

-- 64. Tra cứu số thứ tự của bệnh nhân
SELECT stt.SoThuTu, stt.TrangThaiThe, stt.ThoiGianCap, bn.HoTen, pk.TenPhongKham
FROM SoThuTu stt
JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
JOIN HangDoi hd ON stt.MaHangDoi = hd.MaHangDoi
JOIN PhongKham pk ON hd.MaPhongKham = pk.MaPhongKham
WHERE stt.MaBN = 'BN001' AND stt.TrangThaiThe = N'WAITING';

-- 65. Xác định bệnh nhân tiếp theo được gọi khám
SELECT TOP 1 stt.*, bn.HoTen, bn.LoaiUuTien
FROM SoThuTu stt JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
WHERE stt.TrangThaiThe = N'WAITING'
ORDER BY
    CASE bn.LoaiUuTien
        WHEN N'Cấp cứu'        THEN 1
        WHEN N'Người cao tuổi' THEN 2
        WHEN N'Trẻ em'         THEN 3
        ELSE 4
    END, stt.SoThuTu ASC;

-- 66. Xác định bệnh nhân cuối cùng trong hàng đợi
SELECT TOP 1 stt.*, bn.HoTen
FROM SoThuTu stt JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
WHERE stt.TrangThaiThe = N'WAITING'
ORDER BY stt.SoThuTu DESC;

-- 67. Tính số người đang đứng trước một bệnh nhân (BN024, STT=7)
SELECT COUNT(*) AS SoNguoiDungTruoc
FROM SoThuTu
WHERE TrangThaiThe = N'WAITING'
  AND SoThuTu < (
      SELECT SoThuTu FROM SoThuTu
      WHERE MaBN = 'BN024' AND TrangThaiThe = N'WAITING'
  );

/*-------- F. Theo chuyên khoa --------*/

-- 68. Danh sách bệnh nhân chờ khám theo chuyên khoa
SELECT ck.TenCK, pk.TenPhongKham, stt.SoThuTu, bn.HoTen, bn.LoaiUuTien
FROM SoThuTu stt
JOIN BenhNhan bn  ON stt.MaBN = bn.MaBN
JOIN HangDoi hd   ON stt.MaHangDoi = hd.MaHangDoi
JOIN PhongKham pk ON hd.MaPhongKham = pk.MaPhongKham
JOIN ChuyenKhoa ck ON pk.MaCK = ck.MaCK
WHERE stt.TrangThaiThe = N'WAITING'
ORDER BY ck.TenCK, stt.SoThuTu;

-- 69. Thống kê số lượng bệnh nhân chờ theo chuyên khoa
SELECT ck.TenCK, COUNT(stt.MaThe) AS SoBenhNhanCho
FROM SoThuTu stt
JOIN HangDoi hd    ON stt.MaHangDoi = hd.MaHangDoi
JOIN PhongKham pk  ON hd.MaPhongKham = pk.MaPhongKham
JOIN ChuyenKhoa ck ON pk.MaCK = ck.MaCK
WHERE stt.TrangThaiThe = N'WAITING'
GROUP BY ck.MaCK, ck.TenCK
ORDER BY SoBenhNhanCho DESC;

-- 70. Xác định số thứ tự đầu tiên của từng chuyên khoa
SELECT ck.TenCK, MIN(stt.SoThuTu) AS SoThuTuDauTien
FROM SoThuTu stt
JOIN HangDoi hd    ON stt.MaHangDoi = hd.MaHangDoi
JOIN PhongKham pk  ON hd.MaPhongKham = pk.MaPhongKham
JOIN ChuyenKhoa ck ON pk.MaCK = ck.MaCK
WHERE stt.TrangThaiThe = N'WAITING'
GROUP BY ck.MaCK, ck.TenCK;

-- 71. Xác định số thứ tự cuối cùng của từng chuyên khoa
SELECT ck.TenCK, MAX(stt.SoThuTu) AS SoThuTuCuoiCung
FROM SoThuTu stt
JOIN HangDoi hd    ON stt.MaHangDoi = hd.MaHangDoi
JOIN PhongKham pk  ON hd.MaPhongKham = pk.MaPhongKham
JOIN ChuyenKhoa ck ON pk.MaCK = ck.MaCK
WHERE stt.TrangThaiThe = N'WAITING'
GROUP BY ck.MaCK, ck.TenCK;

-- 72. Tìm chuyên khoa có hàng đợi dài nhất
SELECT TOP 1 ck.TenCK, COUNT(stt.MaThe) AS SoBenhNhanCho
FROM SoThuTu stt
JOIN HangDoi hd    ON stt.MaHangDoi = hd.MaHangDoi
JOIN PhongKham pk  ON hd.MaPhongKham = pk.MaPhongKham
JOIN ChuyenKhoa ck ON pk.MaCK = ck.MaCK
WHERE stt.TrangThaiThe = N'WAITING'
GROUP BY ck.MaCK, ck.TenCK
ORDER BY SoBenhNhanCho DESC;

/*-------- F. Theo bác sĩ --------*/

-- 73. Danh sách bệnh nhân chờ khám theo bác sĩ
SELECT bs.HoTen AS TenBacSi, stt.SoThuTu, bn.HoTen AS TenBenhNhan
FROM SoThuTu stt
JOIN BenhNhan bn  ON stt.MaBN = bn.MaBN
JOIN HangDoi hd   ON stt.MaHangDoi = hd.MaHangDoi
JOIN PhongKham pk ON hd.MaPhongKham = pk.MaPhongKham
JOIN BacSi bs     ON pk.MaPhongKham = bs.MaPhongKham
WHERE stt.TrangThaiThe = N'WAITING'
ORDER BY bs.HoTen, stt.SoThuTu;

-- 74. Thống kê số lượng bệnh nhân chờ của từng bác sĩ
SELECT bs.HoTen, COUNT(stt.MaThe) AS SoBenhNhanCho
FROM BacSi bs
JOIN PhongKham pk ON bs.MaPhongKham = pk.MaPhongKham
JOIN HangDoi hd   ON pk.MaPhongKham = hd.MaPhongKham
JOIN SoThuTu stt  ON hd.MaHangDoi = stt.MaHangDoi
WHERE stt.TrangThaiThe = N'WAITING'
GROUP BY bs.MaBS, bs.HoTen
ORDER BY SoBenhNhanCho DESC;

-- 75. Xác định bệnh nhân tiếp theo của từng bác sĩ
SELECT bs.HoTen AS TenBacSi,
       (SELECT TOP 1 bn.HoTen
        FROM SoThuTu s2
        JOIN HangDoi h2   ON s2.MaHangDoi = h2.MaHangDoi
        JOIN BenhNhan bn  ON s2.MaBN = bn.MaBN
        WHERE h2.MaPhongKham = pk.MaPhongKham
          AND s2.TrangThaiThe = N'WAITING'
        ORDER BY s2.SoThuTu) AS BenhNhanTiepTheo
FROM BacSi bs
JOIN PhongKham pk ON bs.MaPhongKham = pk.MaPhongKham;

-- 76. Tìm bác sĩ có nhiều bệnh nhân chờ nhất
SELECT TOP 1 bs.HoTen, COUNT(stt.MaThe) AS SoBenhNhanCho
FROM BacSi bs
JOIN PhongKham pk ON bs.MaPhongKham = pk.MaPhongKham
JOIN HangDoi hd   ON pk.MaPhongKham = hd.MaPhongKham
JOIN SoThuTu stt  ON hd.MaHangDoi = stt.MaHangDoi
WHERE stt.TrangThaiThe = N'WAITING'
GROUP BY bs.MaBS, bs.HoTen
ORDER BY SoBenhNhanCho DESC;

-- 77. Tìm bác sĩ có ít bệnh nhân chờ nhất
SELECT TOP 1 bs.HoTen, COUNT(stt.MaThe) AS SoBenhNhanCho
FROM BacSi bs
JOIN PhongKham pk ON bs.MaPhongKham = pk.MaPhongKham
JOIN HangDoi hd   ON pk.MaPhongKham = hd.MaPhongKham
JOIN SoThuTu stt  ON hd.MaHangDoi = stt.MaHangDoi
WHERE stt.TrangThaiThe = N'WAITING'
GROUP BY bs.MaBS, bs.HoTen
ORDER BY SoBenhNhanCho ASC;

/*-------- F. Theo thời gian --------*/

-- 78. Danh sách bệnh nhân đăng ký trong ngày
SELECT stt.*, bn.HoTen
FROM SoThuTu stt JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
WHERE CAST(stt.ThoiGianCap AS DATE) = CAST(GETDATE() AS DATE);

-- 79. Danh sách bệnh nhân đăng ký theo khoảng thời gian
SELECT stt.*, bn.HoTen
FROM SoThuTu stt JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
WHERE stt.ThoiGianCap BETWEEN '2025-06-01' AND '2025-06-05 23:59:59';

-- 80. Thống kê lượt đăng ký theo ngày
SELECT CAST(ThoiGianCap AS DATE) AS Ngay, COUNT(*) AS SoLuot
FROM SoThuTu
GROUP BY CAST(ThoiGianCap AS DATE)
ORDER BY Ngay;

-- 81. Thống kê lượt đăng ký theo tuần
SELECT DATEPART(YEAR, ThoiGianCap) AS Nam,
       DATEPART(WEEK, ThoiGianCap) AS Tuan,
       COUNT(*) AS SoLuot
FROM SoThuTu
GROUP BY DATEPART(YEAR, ThoiGianCap), DATEPART(WEEK, ThoiGianCap)
ORDER BY Nam, Tuan;

-- 82. Thống kê lượt đăng ký theo tháng
SELECT YEAR(ThoiGianCap) AS Nam, MONTH(ThoiGianCap) AS Thang, COUNT(*) AS SoLuot
FROM SoThuTu
GROUP BY YEAR(ThoiGianCap), MONTH(ThoiGianCap)
ORDER BY Nam, Thang;

/*-------- F. Trường hợp nhiều khoa --------*/

-- 83. Danh sách bệnh nhân đăng ký nhiều chuyên khoa trong cùng ngày
SELECT stt.MaBN, bn.HoTen, CAST(stt.ThoiGianCap AS DATE) AS Ngay,
       COUNT(DISTINCT pk.MaCK) AS SoChuyenKhoa
FROM SoThuTu stt
JOIN BenhNhan bn  ON stt.MaBN = bn.MaBN
JOIN HangDoi hd   ON stt.MaHangDoi = hd.MaHangDoi
JOIN PhongKham pk ON hd.MaPhongKham = pk.MaPhongKham
GROUP BY stt.MaBN, bn.HoTen, CAST(stt.ThoiGianCap AS DATE)
HAVING COUNT(DISTINCT pk.MaCK) > 1;

-- 84. Danh sách bệnh nhân có nhiều số thứ tự khác nhau
SELECT MaBN, COUNT(*) AS SoThe
FROM SoThuTu
GROUP BY MaBN
HAVING COUNT(*) > 1
ORDER BY SoThe DESC;

-- 85. Thống kê số chuyên khoa mà mỗi bệnh nhân đăng ký
SELECT stt.MaBN, bn.HoTen, COUNT(DISTINCT pk.MaCK) AS SoChuyenKhoa
FROM SoThuTu stt
JOIN BenhNhan bn  ON stt.MaBN = bn.MaBN
JOIN HangDoi hd   ON stt.MaHangDoi = hd.MaHangDoi
JOIN PhongKham pk ON hd.MaPhongKham = pk.MaPhongKham
GROUP BY stt.MaBN, bn.HoTen
ORDER BY SoChuyenKhoa DESC;

-- 86. Tìm bệnh nhân đăng ký nhiều chuyên khoa nhất
SELECT TOP 1 stt.MaBN, bn.HoTen, COUNT(DISTINCT pk.MaCK) AS SoChuyenKhoa
FROM SoThuTu stt
JOIN BenhNhan bn  ON stt.MaBN = bn.MaBN
JOIN HangDoi hd   ON stt.MaHangDoi = hd.MaHangDoi
JOIN PhongKham pk ON hd.MaPhongKham = pk.MaPhongKham
GROUP BY stt.MaBN, bn.HoTen
ORDER BY SoChuyenKhoa DESC;

-- 87. Kiểm tra các lịch khám bị trùng thời gian giữa các khoa
SELECT a.MaBN, bn.HoTen, a.NgayGio AS Lich1, b.NgayGio AS Lich2,
       a.MaPhongKham AS Phong1, b.MaPhongKham AS Phong2
FROM LichKham a
JOIN LichKham b ON a.MaBN = b.MaBN AND a.MaLich < b.MaLich
JOIN BenhNhan bn ON a.MaBN = bn.MaBN
WHERE a.NgayGio = b.NgayGio AND a.MaPhongKham <> b.MaPhongKham;

/*-------- F. Ước lượng hàng đợi --------*/

-- 88. Ước tính thời gian chờ của bệnh nhân (giả sử mỗi ca 15 phút)
SELECT stt.MaBN, bn.HoTen, stt.SoThuTu,
       (stt.SoThuTu - MIN(stt2.SoThuTu) OVER (PARTITION BY stt.MaHangDoi)) * 15 AS UocTinhPhutCho
FROM SoThuTu stt
JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
JOIN SoThuTu stt2 ON stt.MaHangDoi = stt2.MaHangDoi AND stt2.TrangThaiThe = N'WAITING'
WHERE stt.TrangThaiThe = N'WAITING';

-- 89. Ước tính thời gian khám còn lại của hàng đợi (mỗi ca 15 phút)
SELECT hd.MaHangDoi, pk.TenPhongKham,
       COUNT(stt.MaThe) * 15 AS TongPhutConLai
FROM HangDoi hd
JOIN PhongKham pk ON hd.MaPhongKham = pk.MaPhongKham
JOIN SoThuTu stt  ON hd.MaHangDoi = stt.MaHangDoi
WHERE stt.TrangThaiThe = N'WAITING'
GROUP BY hd.MaHangDoi, pk.TenPhongKham;

-- 90. Thống kê thời gian chờ trung bình (phút, từ ThoiGianCap đến ThoiGianDuKienKham)
SELECT AVG(DATEDIFF(MINUTE, stt.ThoiGianCap, stt.ThoiGianDuKienKham)) AS TBPhutCho
FROM SoThuTu stt
WHERE stt.ThoiGianDuKienKham IS NOT NULL;

-- 91. Thống kê thời gian chờ theo chuyên khoa
SELECT ck.TenCK,
       AVG(DATEDIFF(MINUTE, stt.ThoiGianCap, stt.ThoiGianDuKienKham)) AS TBPhutCho
FROM SoThuTu stt
JOIN HangDoi hd    ON stt.MaHangDoi = hd.MaHangDoi
JOIN PhongKham pk  ON hd.MaPhongKham = pk.MaPhongKham
JOIN ChuyenKhoa ck ON pk.MaCK = ck.MaCK
WHERE stt.ThoiGianDuKienKham IS NOT NULL
GROUP BY ck.MaCK, ck.TenCK;

-- 92. Thống kê thời gian chờ theo bác sĩ
SELECT bs.HoTen,
       AVG(DATEDIFF(MINUTE, stt.ThoiGianCap, stt.ThoiGianDuKienKham)) AS TBPhutCho
FROM SoThuTu stt
JOIN HangDoi hd   ON stt.MaHangDoi = hd.MaHangDoi
JOIN PhongKham pk ON hd.MaPhongKham = pk.MaPhongKham
JOIN BacSi bs     ON pk.MaPhongKham = bs.MaPhongKham
WHERE stt.ThoiGianDuKienKham IS NOT NULL
GROUP BY bs.MaBS, bs.HoTen;

/*-------- F. Thống kê chung --------*/

-- 93. Thống kê số lượng bệnh nhân đang chờ
SELECT COUNT(*) AS SoBenhNhanDangCho
FROM SoThuTu WHERE TrangThaiThe = N'WAITING';

-- 94. Thống kê số lượng bệnh nhân theo trạng thái hàng đợi
SELECT TrangThaiThe, COUNT(*) AS SoLuong
FROM SoThuTu GROUP BY TrangThaiThe;

-- 95. Thống kê số lượng bệnh nhân theo mức độ ưu tiên
SELECT bn.LoaiUuTien, COUNT(stt.MaThe) AS SoLuong
FROM SoThuTu stt
JOIN BenhNhan bn ON stt.MaBN = bn.MaBN
WHERE stt.TrangThaiThe = N'WAITING'
GROUP BY bn.LoaiUuTien;

/*------------------------------------------------------------
  G. HỒ SƠ BỆNH ÁN - PHIẾU KHÁM
------------------------------------------------------------*/

-- 96. Danh sách hồ sơ bệnh án
SELECT hs.*, bn.HoTen, nv.HoTen AS NhanVienTao
FROM HoSoYTe hs
JOIN BenhNhan bn ON hs.MaBN = bn.MaBN
JOIN NhanVien nv ON hs.MaNV = nv.MaNV
ORDER BY hs.NgayTao DESC;

-- 97. Hồ sơ bệnh án theo bệnh nhân
SELECT hs.*, nv.HoTen AS NhanVienTao
FROM HoSoYTe hs JOIN NhanVien nv ON hs.MaNV = nv.MaNV
WHERE hs.MaBN = 'BN001';

-- 98. Danh sách bệnh nhân có bệnh nền
SELECT bn.*, hs.BenhNen
FROM BenhNhan bn JOIN HoSoYTe hs ON bn.MaBN = hs.MaBN
WHERE hs.BenhNen IS NOT NULL AND hs.BenhNen <> '';

-- 99. Danh sách bệnh nhân dị ứng thuốc
SELECT bn.*, hs.DiUng
FROM BenhNhan bn JOIN HoSoYTe hs ON bn.MaBN = hs.MaBN
WHERE hs.DiUng IS NOT NULL AND hs.DiUng <> '';

-- 100. Danh sách phiếu khám
SELECT pk.*, bn.HoTen AS TenBenhNhan, bs.HoTen AS TenBacSi
FROM PhieuKhamBenh pk
JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
JOIN BacSi bs    ON pk.MaBS = bs.MaBS
ORDER BY pk.NgayKham DESC;

-- 101. Danh sách phiếu khám theo ngày
SELECT pk.*, bn.HoTen
FROM PhieuKhamBenh pk JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
WHERE pk.NgayKham = '2025-01-10';

-- 102. Danh sách phiếu khám theo bác sĩ
SELECT pk.*, bn.HoTen
FROM PhieuKhamBenh pk JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
WHERE pk.MaBS = 'BS001'
ORDER BY pk.NgayKham DESC;

-- 103. Danh sách phiếu khám theo chẩn đoán
SELECT pk.*, bn.HoTen
FROM PhieuKhamBenh pk JOIN BenhNhan bn ON pk.MaBN = bn.MaBN
WHERE pk.ChuanDoan LIKE N'%Tăng huyết áp%';

/*-------- G. Thống kê --------*/

-- 104. Thống kê số phiếu khám
SELECT COUNT(*) AS TongPhieuKham FROM PhieuKhamBenh;

-- 105. Thống kê số lượt khám theo ngày
SELECT NgayKham, COUNT(*) AS SoLuotKham
FROM PhieuKhamBenh GROUP BY NgayKham ORDER BY NgayKham;

-- 106. Thống kê số lượt khám theo tháng
SELECT YEAR(NgayKham) AS Nam, MONTH(NgayKham) AS Thang, COUNT(*) AS SoLuot
FROM PhieuKhamBenh GROUP BY YEAR(NgayKham), MONTH(NgayKham) ORDER BY Nam, Thang;

-- 107. Danh sách bệnh nhân khám nhiều lần nhất
SELECT TOP 5 bn.MaBN, bn.HoTen, COUNT(pk.MaPK) AS SoLanKham
FROM BenhNhan bn JOIN PhieuKhamBenh pk ON bn.MaBN = pk.MaBN
GROUP BY bn.MaBN, bn.HoTen
ORDER BY SoLanKham DESC;

/*------------------------------------------------------------
  H. ĐƠN THUỐC - THUỐC
------------------------------------------------------------*/

-- 108. Danh sách thuốc
SELECT * FROM Thuoc ORDER BY TenThuoc;

-- 109. Tìm thuốc theo mã thuốc
SELECT * FROM Thuoc WHERE MaThuoc = 'T001';

-- 110. Tìm thuốc theo tên thuốc
SELECT * FROM Thuoc WHERE TenThuoc LIKE N'%Omep%';

-- 111. Danh sách thuốc theo nhóm thuốc (đơn vị tính)
SELECT DonViTinh, COUNT(*) AS SoLoaiThuoc
FROM Thuoc GROUP BY DonViTinh;

-- 112. Danh sách thuốc còn sử dụng (tất cả thuốc hiện có)
SELECT * FROM Thuoc;

-- 113. Danh sách thuốc sắp hết hạn / đã hết hạn
--     (Schema hiện tại chưa có NgayHetHan trên bảng Thuoc; truy vấn mẫu)
SELECT * FROM Thuoc WHERE MaThuoc IS NOT NULL; -- Placeholder

-- 114. Danh sách đơn thuốc
SELECT dt.*, pk.ChuanDoan, bn.HoTen, bs.HoTen AS TenBacSi
FROM DonThuoc dt
JOIN PhieuKhamBenh pk ON dt.MaPK = pk.MaPK
JOIN BenhNhan bn       ON pk.MaBN = bn.MaBN
JOIN BacSi bs          ON pk.MaBS = bs.MaBS
ORDER BY dt.NgayLap DESC;

-- 115. Danh sách đơn thuốc theo bệnh nhân
SELECT dt.*, pk.ChuanDoan
FROM DonThuoc dt JOIN PhieuKhamBenh pk ON dt.MaPK = pk.MaPK
WHERE pk.MaBN = 'BN001'
ORDER BY dt.NgayLap;

-- 116. Danh sách đơn thuốc theo bác sĩ
SELECT dt.*, pk.ChuanDoan, bn.HoTen
FROM DonThuoc dt
JOIN PhieuKhamBenh pk ON dt.MaPK = pk.MaPK
JOIN BenhNhan bn       ON pk.MaBN = bn.MaBN
WHERE pk.MaBS = 'BS001';

-- 117. Danh sách đơn thuốc theo phiếu khám
SELECT dt.*, ctdt.MaThuoc, t.TenThuoc, ctdt.SoLuong, ctdt.LieuLuong, ctdt.CachDung
FROM DonThuoc dt
JOIN ChiTietDonThuoc ctdt ON dt.MaDT = ctdt.MaDT
JOIN Thuoc t               ON ctdt.MaThuoc = t.MaThuoc
WHERE dt.MaPK = 'PK0001';

-- 118. Danh sách đơn thuốc trong ngày
SELECT dt.*, bn.HoTen
FROM DonThuoc dt
JOIN PhieuKhamBenh pk ON dt.MaPK = pk.MaPK
JOIN BenhNhan bn       ON pk.MaBN = bn.MaBN
WHERE dt.NgayLap = CAST(GETDATE() AS DATE);

-- 119. Danh sách đơn thuốc theo khoảng thời gian
SELECT dt.*, bn.HoTen
FROM DonThuoc dt
JOIN PhieuKhamBenh pk ON dt.MaPK = pk.MaPK
JOIN BenhNhan bn       ON pk.MaBN = bn.MaBN
WHERE dt.NgayLap BETWEEN '2025-01-01' AND '2025-06-30';

-- 120. Danh sách thuốc trong từng đơn thuốc
SELECT dt.MaDT, t.TenThuoc, ctdt.SoLuong, ctdt.LieuLuong, ctdt.CachDung
FROM ChiTietDonThuoc ctdt
JOIN DonThuoc dt ON ctdt.MaDT = dt.MaDT
JOIN Thuoc t     ON ctdt.MaThuoc = t.MaThuoc
ORDER BY dt.MaDT;

-- 121. Danh sách thuốc được kê cho bệnh nhân
SELECT bn.HoTen, t.TenThuoc, ctdt.SoLuong, ctdt.LieuLuong, dt.NgayLap
FROM ChiTietDonThuoc ctdt
JOIN DonThuoc dt       ON ctdt.MaDT = dt.MaDT
JOIN Thuoc t           ON ctdt.MaThuoc = t.MaThuoc
JOIN PhieuKhamBenh pk  ON dt.MaPK = pk.MaPK
JOIN BenhNhan bn       ON pk.MaBN = bn.MaBN
WHERE bn.MaBN = 'BN001'
ORDER BY dt.NgayLap;

-- 122. Tổng số lượng thuốc trong mỗi đơn thuốc
SELECT dt.MaDT, bn.HoTen, SUM(ctdt.SoLuong) AS TongSoLuongThuoc
FROM DonThuoc dt
JOIN ChiTietDonThuoc ctdt ON dt.MaDT = ctdt.MaDT
JOIN PhieuKhamBenh pk     ON dt.MaPK = pk.MaPK
JOIN BenhNhan bn          ON pk.MaBN = bn.MaBN
GROUP BY dt.MaDT, bn.HoTen
ORDER BY TongSoLuongThuoc DESC;

/*-------- H. Thống kê --------*/

-- 123. Thống kê số lượng đơn thuốc
SELECT COUNT(*) AS TongDonThuoc FROM DonThuoc;

-- 124. Thống kê số lượng thuốc đã kê
SELECT SUM(SoLuong) AS TongSoLuongDaKe FROM ChiTietDonThuoc;

-- 125. Thống kê số lượng thuốc theo nhóm (đơn vị tính)
SELECT t.DonViTinh, SUM(ctdt.SoLuong) AS TongSoLuong
FROM ChiTietDonThuoc ctdt JOIN Thuoc t ON ctdt.MaThuoc = t.MaThuoc
GROUP BY t.DonViTinh;

-- 126. Thống kê thuốc được kê nhiều nhất
SELECT TOP 5 t.MaThuoc, t.TenThuoc, SUM(ctdt.SoLuong) AS TongSoLuong
FROM ChiTietDonThuoc ctdt JOIN Thuoc t ON ctdt.MaThuoc = t.MaThuoc
GROUP BY t.MaThuoc, t.TenThuoc
ORDER BY TongSoLuong DESC;

-- 127. Thống kê thuốc được kê ít nhất
SELECT TOP 5 t.MaThuoc, t.TenThuoc, SUM(ctdt.SoLuong) AS TongSoLuong
FROM ChiTietDonThuoc ctdt JOIN Thuoc t ON ctdt.MaThuoc = t.MaThuoc
GROUP BY t.MaThuoc, t.TenThuoc
ORDER BY TongSoLuong ASC;

-- 128. Thống kê chi phí thuốc theo bệnh nhân
--     (ChiPhi ghi trong PhieuKhamBenh bao gồm chi phí khám)
SELECT bn.MaBN, bn.HoTen, SUM(pk.ChiPhi) AS TongChiPhiKham
FROM BenhNhan bn JOIN PhieuKhamBenh pk ON bn.MaBN = pk.MaBN
GROUP BY bn.MaBN, bn.HoTen
ORDER BY TongChiPhiKham DESC;

-- 129. Thống kê chi phí thuốc theo tháng
SELECT YEAR(pk.NgayKham) AS Nam, MONTH(pk.NgayKham) AS Thang,
       SUM(pk.ChiPhi) AS TongChiPhi
FROM PhieuKhamBenh pk
GROUP BY YEAR(pk.NgayKham), MONTH(pk.NgayKham)
ORDER BY Nam, Thang;
GO
