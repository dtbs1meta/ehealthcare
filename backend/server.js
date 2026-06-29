const express = require("express");
const cors = require("cors");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use(require("./routes/core.routes"));
app.use(require("./routes/auth.routes"));
app.use(require("./routes/patient.routes"));
app.use(require("./routes/doctor.routes"));
app.use(require("./routes/receptionist.routes"));

app.use(notFound);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
