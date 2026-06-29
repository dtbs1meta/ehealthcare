# AI Backend - eHealthCare RAG

## Chạy lần đầu

```powershell
cd "D:\hoccode\pttkht do an\ai_backend"
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
notepad .env
python main.py
```

Sau khi chạy, kiểm tra:

```text
http://localhost:8000/status
```

Backend này chạy riêng với Node backend. Node vẫn ở port 3000, AI chạy ở port 8000.
