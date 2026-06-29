const sql = require("mssql/msnodesqlv8");

const config = {
  connectionString:
    process.env.SQLSERVER_CONNECTION_STRING ||
    "Driver={ODBC Driver 17 for SQL Server};Server=localhost\\SQLEXPRESS02;Database=QuanLyKham1;Trusted_Connection=Yes;TrustServerCertificate=Yes;"
};

let poolPromise = null;

async function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(config);
  }

  try {
    return await poolPromise;
  } catch (err) {
    poolPromise = null;
    throw err;
  }
}

module.exports = { sql, getPool };
