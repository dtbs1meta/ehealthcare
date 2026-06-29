const express = require("express");
const router = express.Router();
const { sql, getPool } = require("../db");

router.get("/", (req, res) => {
    res.send("Backend eHealthCare đang chạy");
});

router.get("/api/test-db", async (req, res) => {
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

router.get("/api/benhnhan", async (req, res) => {
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

module.exports = router;
