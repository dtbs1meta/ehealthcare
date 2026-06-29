const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use(require("./routes/core.routes"));
app.use(require("./routes/auth.routes"));
app.use(require("./routes/patient.routes"));
app.use(require("./routes/doctor.routes"));
app.use(require("./routes/receptionist.routes"));

app.use((req, res) => {
  res.status(404).json({ message: "Không tìm thấy API", path: req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error("Lỗi server:", err);
  res.status(500).json({ message: "Lỗi server", error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
