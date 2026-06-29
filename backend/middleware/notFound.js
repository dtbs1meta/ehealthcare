function notFound(req, res) {
  res.status(404).json({
    message: "Không tìm thấy API",
    path: req.originalUrl
  });
}

module.exports = notFound;
