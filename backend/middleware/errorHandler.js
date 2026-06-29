function errorHandler(err, req, res, next) {
  console.error("Lỗi server:", err);
  res.status(500).json({
    message: "Lỗi server",
    error: err.message
  });
}

module.exports = errorHandler;
