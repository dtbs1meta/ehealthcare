Cách dùng backend tối ưu:

1. Backup thư mục backend hiện tại.
2. Chép các file trong thư mục backend này vào D:\hoccode\pttkht do an\backend.
3. Chạy:
   npm install
   node server.js

Backend đã được tách route:
- routes/core.routes.js
- routes/auth.routes.js
- routes/patient.routes.js
- routes/doctor.routes.js
- routes/receptionist.routes.js
- db.js

Chưa thay đổi bảo mật, chỉ tối ưu cấu trúc và giảm trùng code trong server.js.
