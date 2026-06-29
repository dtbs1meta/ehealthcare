// eHealthCare - JS tách từ patient.html

const API_BASE = window.API_BASE || "http://localhost:3000";

    const API = {
      async request(path, options = {}) {
        const response = await fetch(API_BASE + path, {
          headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
          },
          ...options
        });

        let data = null;
        const text = await response.text();
        if (text) {
          try { data = JSON.parse(text); }
          catch { data = text; }
        }

        if (!response.ok) {
          const message = data?.message || data?.error || `Lỗi API ${response.status}`;
          throw new Error(message);
        }

        return data;
      },
      get(path) {
        return this.request(path);
      },
      post(path, body) {
        return this.request(path, {
          method: "POST",
          body: JSON.stringify(body || {})
        });
      },
      put(path, body) {
        return this.request(path, {
          method: "PUT",
          body: JSON.stringify(body || {})
        });
      },
      delete(path) {
        return this.request(path, { method: "DELETE" });
      }
    };

// ==================== SESSION & AUTH ====================
    // Mỗi bệnh nhân phải đăng nhập riêng từ index.html.
    // Không auto-login BN001 nữa, để tránh tài khoản nào cũng xem cùng một hồ sơ.
    const user = JSON.parse(sessionStorage.getItem('user') || 'null');
    if (!user || user.role !== 'patient' || !(user.maBN || user.MaBN)) {
      window.location.href = 'index.html';
      throw new Error('Chưa đăng nhập tài khoản bệnh nhân');
    }

    let CURRENT_BN_ID = (user.maBN || user.MaBN).toString().trim().toUpperCase();
    if (!/^BN\d+$/i.test(CURRENT_BN_ID)) {
      sessionStorage.removeItem('user');
      window.location.href = 'index.html';
      throw new Error('Mã bệnh nhân không hợp lệ');
    }
    sessionStorage.setItem('user', JSON.stringify({ ...user, role: 'patient', maBN: CURRENT_BN_ID }));

    function logout() {
      sessionStorage.removeItem('user');
      window.location.href = 'index.html';
    }

    // ==================== DATA ====================
    let state = { spec: null, doctor: null, date: null, slot: null, bookings: [] };
    let cancelBookingId = null;
    let currentPatient = null;
    let currentHoSo = null;
    const workingHours = ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

    // ==================== INIT ====================
    document.addEventListener('DOMContentLoaded', () => {
      loadPatientData();
      renderSpecialties();
      renderDates();
      renderPhieuList();
      renderNotifications();
      renderCancelList();
      updateQueueStatus();
      setInterval(updateQueueStatus, 15000);
      document.getElementById('pk-date').value = new Date().toISOString().split('T')[0];
      loadDoctorSelect();
      loadDeptSelect();
    });

    // ==================== LOAD PATIENT DATA ====================
            async function loadPatientData() {
      try {
        const data = await API.get(`/api/benh-nhan/${CURRENT_BN_ID}/ho-so`);
        
        // Kiểm tra lỗi hoặc dữ liệu rỗng
        if (data.error || !data.info) {
          throw new Error(data.error || 'Empty patient data');
        }
        
        currentPatient = data.info;
        currentHoSo = data.medical;

        // Update header
        document.getElementById('headerAvatar').textContent = getInitials(data.info.HoTen);
        document.getElementById('headerUserName').textContent = data.info.HoTen;

        // Update profile info grid
        document.getElementById('pi-name').textContent = data.info.HoTen || '---';
        document.getElementById('pi-id').textContent = data.info.MaBN || '---';
        document.getElementById('pi-dob').textContent = formatDate(data.info.NgaySinh) || '---';
        document.getElementById('pi-gender').textContent = data.info.GioiTinh || '---';
        document.getElementById('pi-phone').textContent = data.info.SDT || '---';
        document.getElementById('pi-address').textContent = data.info.DiaChi || '---';
        document.getElementById('pi-email').textContent = data.info.Email || '---';

        if (data.medical) {
          document.getElementById('pi-blood').textContent = (data.medical.NhomMau || '') + (data.medical.Rh || '');
        }

        // Update profile form
        document.getElementById('upd-name').value = data.info.HoTen || '';
        document.getElementById('upd-dob').value = data.info.NgaySinh || '';
        document.getElementById('upd-gender').value = data.info.GioiTinh || 'Nam';
        document.getElementById('upd-phone').value = data.info.SDT || '';
        document.getElementById('upd-email').value = data.info.Email || '';
        document.getElementById('upd-address').value = data.info.DiaChi || '';
        if (data.medical) {
          document.getElementById('upd-blood').value = data.medical.NhomMau || 'A';
          document.getElementById('upd-medical').value = [
            data.medical.TienSuBenh || '',
            data.medical.DiUng ? 'Dị ứng: ' + data.medical.DiUng : ''
          ].filter(Boolean).join('. ');
        }

        // Load BHYT
        loadBHYT();
      } catch (e) {
        console.error('loadPatientData error:', e);
        
        // Tự động khôi phục nếu dữ liệu bị hỏng
        if (e.message?.includes('Not found') || e.message?.includes('Empty')) {
          showToast('🔄 Dữ liệu bị hỏng, đang khôi phục...', 'warning');
          
          // Gọi reseed và reload
          if (window.forceReseedOnNextLoad) {
            window.forceReseedOnNextLoad();
          }
          // Xóa version cũ để buộc reseed
          localStorage.removeItem('db_schema_version');
          
          setTimeout(() => {
            location.reload();
          }, 1500);
          return;
        }
        
        showToast('Không thể tải thông tin bệnh nhân', 'error');
      }
    }

    async function loadBHYT() {
      try {
        const bhytList = await API.get(`/api/the-bhyt?maBN=${CURRENT_BN_ID}`);
        if (bhytList && bhytList.length > 0) {
          const bhyt = bhytList[0];
          document.getElementById('bhyt-ma').textContent = bhyt.MaBHYT || '---';
          document.getElementById('bhyt-loai').textContent = bhyt.LoaiThe || '---';
          document.getElementById('bhyt-ngaycap').textContent = formatDate(bhyt.NgayCap) || '---';
          document.getElementById('bhyt-ngayhethan').textContent = formatDate(bhyt.NgayHetHan) || '---';
          document.getElementById('bhyt-tyle').textContent = bhyt.TyLeChiTra ? bhyt.TyLeChiTra + '%' : '---';
          document.getElementById('bhyt-trangthai').textContent = bhyt.TrangThai || '---';
        } else {
          document.getElementById('bhyt-ma').textContent = 'Chưa có thẻ BHYT';
          document.getElementById('bhyt-loai').textContent = '---';
          document.getElementById('bhyt-ngaycap').textContent = '---';
          document.getElementById('bhyt-ngayhethan').textContent = '---';
          document.getElementById('bhyt-tyle').textContent = '---';
          document.getElementById('bhyt-trangthai').textContent = '---';
        }
      } catch (e) {
        console.error('loadBHYT error:', e);
      }
    }

    function getInitials(name) {
      if (!name) return 'BN';
      const parts = name.split(' ');
      return parts.slice(-1)[0].charAt(0).toUpperCase();
    }

    function formatDate(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d)) return dateStr;
      return d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear();
    }

    function formatDateTime(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d)) return dateStr;
      return d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear() + ' ' +
        d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }

    // ==================== NAVIGATION ====================
    function showPage(pageId, btn) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-' + pageId).classList.add('active');
      if (btn) {
        document.querySelectorAll('.sidebar-link').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      // Refresh data when switching pages
      if (pageId === 'queue') updateQueueStatus();
      if (pageId === 'records') { loadPatientData(); renderPhieuList(); }
      if (pageId === 'notifications') renderNotifications();
      if (pageId === 'cancel') renderCancelList();
      if (pageId === 'profile') loadPatientData();
    }

    // ==================== BOOKING ====================
    async function renderSpecialties() {
      const g = document.getElementById('specialtyGrid');
      try {
        const data = await API.get('/api/chuyen-khoa');
        const emojiMap = {
          'Nội khoa': '🩺', 'Ngoại khoa': '🔪', 'Nhi khoa': '🧸',
          'Da liễu': '🧬', 'Tai Mũi Họng': '👂', 'Tiêu hóa': '🍽️',
          'Cơ xương khớp': '🦴', 'Mắt': '👁️', 'Tim mạch': '❤️',
          'Thần kinh': '🧠', 'Sản phụ khoa': '🤰'
        };
        g.innerHTML = data.map((s) => `
          <div class="spec-chip" id="spec-${s.MaCK}" onclick="selectSpec('${s.MaCK}')">
            <span class="spec-emoji">${emojiMap[s.TenCK] || '🏥'}</span>
            <span class="spec-name">${s.TenCK}</span>
            <div class="spec-check" id="check-${s.MaCK}"></div>
          </div>`).join('');
      } catch (e) {
        g.innerHTML = '<div class="empty-state">Không thể tải danh sách chuyên khoa</div>';
      }
    }

    const RAG_BASE_URL = window.RAG_BASE_URL || 'http://localhost:8000';

    function keywordSymptomSuggest(text) {
      const keywordMap = {
        'đau đầu': ['Thần kinh', 'Nội khoa'],
        'sốt': ['Nội khoa', 'Nhi khoa'],
        'ho': ['Nội khoa', 'Tai Mũi Họng'],
        'đau ngực': ['Tim mạch', 'Nội khoa'],
        'đau bụng': ['Nội khoa', 'Ngoại khoa'],
        'mụn': ['Da liễu'],
        'ngứa': ['Da liễu', 'Nội khoa'],
        'đau mắt': ['Mắt'],
        'đau tai': ['Tai Mũi Họng'],
        'đau răng': ['Tai Mũi Họng'],
        'đau khớp': ['Cơ xương khớp'],
        'đau lưng': ['Cơ xương khớp', 'Thần kinh'],
        'chóng mặt': ['Thần kinh', 'Tai Mũi Họng'],
        'khó thở': ['Tim mạch', 'Nội khoa'],
        'tiểu nhiều': ['Nội khoa'],
        'kinh nguyệt': ['Sản phụ khoa'],
        'thai': ['Sản phụ khoa'],
        'trẻ em': ['Nhi khoa'],
        'trẻ': ['Nhi khoa']
      };
      const lowerTxt = text.toLowerCase();
      let suggested = [];
      for (const [kw, depts] of Object.entries(keywordMap)) {
        if (lowerTxt.includes(kw)) suggested.push(...depts);
      }
      return [...new Set(suggested)];
    }

    function escapeHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function clearAISuggestionHighlight() {
      document.querySelectorAll('.spec-chip').forEach(chip => {
        chip.style.borderColor = '';
        chip.style.borderWidth = '';
        chip.style.boxShadow = '';
      });
    }

    function showAISuggestionResult(message, type = 'success') {
      const box = document.getElementById('aiSuggestionResult');
      if (!box) return;
      box.style.display = 'block';
      box.innerHTML = message;
      box.style.borderColor = type === 'warning' ? 'var(--warning)' : 'var(--primary)';
      box.style.background = type === 'warning' ? 'var(--warning-light)' : 'var(--primary-light)';
    }

    async function askRAGForSpecialty(symptomText, specNames) {
      const prompt = `Bạn là trợ lý AI của hệ thống eHealthCare. Nhiệm vụ: dựa trên triệu chứng bệnh nhân mô tả, chỉ gợi ý chuyên khoa phù hợp trong danh sách sau: ${specNames.join(', ')}. Không chẩn đoán bệnh. Trả lời ngắn gọn bằng tiếng Việt, gồm: 1) Chuyên khoa gợi ý, 2) Lý do ngắn, 3) Lưu ý đi khám sớm nếu triệu chứng nặng. Triệu chứng bệnh nhân: ${symptomText}`;

      const res = await fetch(`${RAG_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: [],
          session_id: `patient-symptom-${CURRENT_BN_ID || 'guest'}`
        })
      });

      if (!res.ok) throw new Error(`AI backend lỗi HTTP ${res.status}`);
      const data = await res.json();
      return data.reply || '';
    }

    async function analyzeSymptom() {
      const txt = document.getElementById('symptomInput').value.trim();
      if (!txt) { showToast('Vui lòng nhập triệu chứng!', 'warning'); return; }

      const btn = document.querySelector('button[onclick="analyzeSymptom()"]');
      const originalText = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ AI đang phân tích...';
      }
      clearAISuggestionHighlight();

      try {
        const specs = await API.get('/api/chuyen-khoa');
        const specNames = specs.map(s => s.TenCK);

        let aiReply = '';
        let suggested = [];
        let usedAI = true;

        try {
          aiReply = await askRAGForSpecialty(txt, specNames);
          const aiReplyLower = aiReply.toLowerCase();
          suggested = specNames.filter(name => aiReplyLower.includes(name.toLowerCase()));

          // Nếu AI trả lời diễn giải nhưng không ghi đúng tên khoa trong DB, dùng thêm bộ từ khóa để vẫn tô sáng được.
          if (suggested.length === 0) {
            suggested = keywordSymptomSuggest(txt).filter(name => specNames.includes(name));
          }
        } catch (aiError) {
          console.warn('AI backend chưa chạy, dùng gợi ý keyword:', aiError.message);
          usedAI = false;
          suggested = keywordSymptomSuggest(txt);
          aiReply = suggested.length
            ? `Gợi ý tạm thời theo từ khóa: ${suggested.join(', ')}. AI backend chưa chạy nên hệ thống dùng bộ luật đơn giản.`
            : 'AI backend chưa chạy và hệ thống chưa nhận diện được triệu chứng cụ thể. Vui lòng chọn khoa thủ công.';
        }

        suggested = [...new Set(suggested)].filter(name => specNames.includes(name));

        if (suggested.length === 0) {
          showAISuggestionResult(`⚠️ ${aiReply}`, 'warning');
          showToast('Không nhận diện được chuyên khoa cụ thể. Vui lòng chọn khoa thủ công.', 'warning');
          return;
        }

        specs.forEach(s => {
          const chip = document.getElementById(`spec-${s.MaCK}`);
          if (chip && suggested.includes(s.TenCK)) {
            chip.style.borderColor = 'var(--warning)';
            chip.style.borderWidth = '2px';
            chip.style.boxShadow = '0 0 0 4px rgba(230,81,0,0.12)';
          }
        });

        showAISuggestionResult(`🤖 <strong>${usedAI ? 'AI gợi ý' : 'Gợi ý tạm thời'}:</strong><br>${escapeHtml(aiReply).replace(/\n/g, '<br>')}<br><br><strong>Chuyên khoa được tô sáng:</strong> ${suggested.join(', ')}`);
        showToast('💡 Gợi ý: ' + suggested.join(', ') + ' — Vui lòng chọn khoa phù hợp', 'success');
      } catch (e) {
        console.error(e);
        showToast('Không thể phân tích triệu chứng. Vui lòng chọn khoa thủ công.', 'warning');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }
    }

    async function selectSpec(maCK) {
      try {
        const data = await API.get('/api/chuyen-khoa');
        const spec = data.find(s => s.MaCK === maCK);
        if (!spec) return;
        state.spec = spec;
        document.querySelectorAll('.spec-chip').forEach(c => {
          c.classList.toggle('selected', c.id === `spec-${maCK}`);
        });
        updateSteps(2);
        await renderDoctors(spec);
        document.getElementById('card-doctor').style.opacity = '1';
        document.getElementById('card-doctor').style.pointerEvents = 'auto';
        document.getElementById('doctor-desc').textContent = 'Khoa: ' + spec.TenCK;
      } catch (e) {
        console.error('selectSpec error:', e);
      }
    }

    async function renderDoctors(spec) {
      const g = document.getElementById('doctorList');
      g.innerHTML = '<div class="empty-state">Đang tải danh sách bác sĩ...</div>';

      try {
        const today = new Date().toISOString().split('T')[0];
        const docs = await API.get(`/api/bac-si?maCK=${spec.MaCK}&ngay=${today}`);

        if (!docs.length) {
          g.innerHTML = '<div class="empty-state">Hiện không có bác sĩ trực hôm nay</div>';
          return;
        }

        g.innerHTML = docs.map((d) => `
          <div class="doctor-card" id="doc-${d.MaBS}" onclick="selectDoctor('${d.MaBS}')">
            <div class="doctor-avatar">${d.GioiTinh === 'Nữ' ? '👩‍⚕️' : '👨‍⚕️'}</div>
            <div>
              <div class="doctor-name">${d.HoTen}</div>
              <div class="doctor-title">${spec.TenCK} · ${d.ChucVu || 'Bác sĩ'}</div>
              <div style="font-size:11px;color:var(--text-muted);">${d.SoLuongDangCho || 0} BN đang chờ</div>
            </div>
            <div class="doctor-slots" id="docsl-${d.MaBS}">Chọn</div>
          </div>`).join('');
      } catch (e) {
        g.innerHTML = '<div class="empty-state">Không thể tải danh sách bác sĩ</div>';
      }
    }

    async function selectDoctor(maBS) {
      try {
        const docs = await API.get(`/api/bac-si?maCK=${state.spec.MaCK}`);
        const doctor = docs.find(d => d.MaBS === maBS);
        if (!doctor) return;
        state.doctor = doctor;
        document.querySelectorAll('.doctor-card').forEach(c => {
          c.classList.toggle('selected', c.id === `doc-${maBS}`);
          const slotEl = c.querySelector('.doctor-slots');
          if (slotEl) slotEl.textContent = c.id === `doc-${maBS}` ? 'Đã chọn ✓' : 'Chọn';
        });
        updateSteps(3);
        document.getElementById('card-slot').style.opacity = '1';
        document.getElementById('card-slot').style.pointerEvents = 'auto';
        if (state.date) renderSlots(state.date);
      } catch (e) {
        console.error('selectDoctor error:', e);
      }
    }

    function renderDates() {
      const c = document.getElementById('dateTabs');
      const today = new Date();
      let html = '';
      const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const iso = d.toISOString().split('T')[0];
        const label = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : dayLabels[d.getDay()];
        const dm = d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0');
        html += `<button class="date-tab ${i === 0 ? 'active' : ''}" id="dt-${iso}" onclick="selectDate('${iso}',this)">${label}<span class="date-day">${dm}</span></button>`;
      }
      c.innerHTML = html;
      state.date = today.toISOString().split('T')[0];
    }

    async function selectDate(iso, btn) {
      state.date = iso;
      document.querySelectorAll('.date-tab').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      if (state.doctor) await renderSlots(iso);
    }

    async function renderSlots(date) {
      const c = document.getElementById('slotContainer');
      if (!state.doctor) {
        c.innerHTML = '<div class="empty-state">Vui lòng chọn bác sĩ trước</div>';
        return;
      }

      try {
        // Get existing appointments for this patient on this date
        const existingLich = await API.get(`/api/lich-kham?maBN=${CURRENT_BN_ID}`);
        const takenSlots = existingLich
          .filter(l => l.NgayGio && l.NgayGio.startsWith(date) && l.TrangThai !== 'Đã hủy')
          .map(l => l.NgayGio.split(' ')[1].substring(0, 5));

        // Get doctor's schedule for this date
        const llv = await API.get(`/api/lich-lam-viec?maBS=${state.doctor.MaBS}&ngay=${date}`);
        let availableSlots = [];

        if (llv && llv.length > 0) {
          // Generate slots based on working hours
          for (const schedule of llv) {
            const start = schedule.GioBatDau;
            const end = schedule.GioKT;
            const startH = parseInt(start.split(':')[0]);
            const startM = parseInt(start.split(':')[1]);
            const endH = parseInt(end.split(':')[0]);
            const endM = parseInt(end.split(':')[1]);

            let h = startH, m = startM;
            while (h < endH || (h === endH && m < endM)) {
              const timeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
              availableSlots.push(timeStr);
              m += 30;
              if (m >= 60) { m -= 60; h++; }
            }
          }
        } else {
          // Fallback: use default working hours
          availableSlots = [...workingHours];
        }

        // Remove duplicates and sort
        availableSlots = [...new Set(availableSlots)].sort();

        const morning = availableSlots.filter(t => parseInt(t) < 12).map(t => makeSlotBtn(t, takenSlots.includes(t))).join('');
        const afternoon = availableSlots.filter(t => parseInt(t) >= 12).map(t => makeSlotBtn(t, takenSlots.includes(t))).join('');

        c.innerHTML = '';
        if (morning) {
          c.innerHTML += `<div class="section-label">Buổi sáng</div><div class="slot-grid">${morning}</div>`;
        }
        if (afternoon) {
          c.innerHTML += `<div class="section-label" style="margin-top:14px;">Buổi chiều</div><div class="slot-grid">${afternoon}</div>`;
        }
        if (!morning && !afternoon) {
          c.innerHTML = '<div class="empty-state">Không có khung giờ khả dụng cho ngày này</div>';
        }
      } catch (e) {
        console.error('renderSlots error:', e);
        c.innerHTML = '<div class="empty-state">Không thể tải khung giờ</div>';
      }
    }

    function makeSlotBtn(time, taken) {
      const sel = state.slot === time;
      const cls = taken ? 'conflict' : sel ? 'selected' : '';
      const dis = taken ? 'disabled' : '';
      const lbl = taken ? 'Trùng lịch' : sel ? 'Đã chọn ✓' : 'Còn chỗ';
      return `<button class="slot-btn ${cls}" ${dis} onclick="selectSlot('${time}')">${time}<small>${lbl}</small></button>`;
    }

    function selectSlot(time) {
      state.slot = time;
      renderSlots(state.date);
      updateSteps(4);
      updateSummary();
    }

    function updateSummary() {
      const el = document.getElementById('bookingSummary');
      const c = document.getElementById('summaryContent');
      c.innerHTML = `<div class="sum-row">
        <div><span class="sum-label">Khoa:</span> <span class="sum-val">${state.spec ? state.spec.TenCK : ''}</span></div>
        <div><span class="sum-label">Bác sĩ:</span> <span class="sum-val" style="color:var(--primary);">${state.doctor ? state.doctor.HoTen : ''}</span></div>
        <div><span class="sum-label">Ngày:</span> <span class="sum-val">${state.date ? formatDate(state.date) : ''}</span></div>
        <div><span class="sum-label">Giờ:</span> <span class="sum-val">${state.slot || ''}</span></div>
      </div>`;
      el.classList.add('show');
    }

    function updateSteps(n) {
      for (let i = 1; i <= 4; i++) {
        const el = document.getElementById('s' + i);
        el.classList.remove('active', 'done');
        if (i < n) el.classList.add('done');
        else if (i === n) el.classList.add('active');
      }
    }
    async function submitBooking() {
      if (!state.spec || !state.doctor || !state.date || !state.slot) {
        showToast('Vui lòng chọn đầy đủ thông tin!', 'error');
        return;
      }

      const submitBtn = document.querySelector('#bookingSummary .btn-primary');
      const oldText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Đang đăng ký...';
      }

      try {
        const symptom = document.getElementById('symptomInput').value.trim();

        const result = await API.post('/api/patient/booking', {
          MaBN: CURRENT_BN_ID,
          MaBS: state.doctor.MaBS,
          MaPhongKham: state.doctor.MaPhongKham,
          NgayKham: state.date,
          GioKham: state.slot,
          TrieuChung: symptom,
          GhiChu: `Đăng ký online - ${state.spec.TenCK}`
        });

        const ticket = result.ticket || {};
        const patient = result.patient || currentPatient || {};
        const room = result.room || {};
        const waitingBefore = Number(result.soNguoiTruocBan || 0);

        document.getElementById('t-stt').textContent = ticket.SoThuTu || '---';
        document.getElementById('t-name').textContent = patient.HoTen || currentPatient?.HoTen || '---';
        document.getElementById('t-dob').textContent = formatDate(patient.NgaySinh || currentPatient?.NgaySinh);
        document.getElementById('t-dept').textContent = state.spec.TenCK;
        document.getElementById('t-doc').textContent = state.doctor.HoTen;
        document.getElementById('t-room').textContent = room.TenPhongKham
          ? `${room.TenPhongKham} - Phòng ${room.SoPhong || ''}`
          : (state.doctor.MaPhongKham || '---');
        document.getElementById('t-date').textContent = formatDate(state.date);
        document.getElementById('t-time').textContent = state.slot;
        document.getElementById('t-waiting').textContent = waitingBefore;
        document.getElementById('t-est').textContent = waitingBefore * 15;

        openModal('modal-ticket');
        showToast('Đăng ký khám và cấp số thứ tự thành công!', 'success');

        await updateQueueStatus();
        await renderCancelList();
        await renderNotifications();

        state = { spec: null, doctor: null, date: state.date, slot: null, bookings: [] };
        document.querySelectorAll('.spec-chip').forEach(c => c.classList.remove('selected'));
        document.getElementById('card-doctor').style.opacity = '0.5';
        document.getElementById('card-doctor').style.pointerEvents = 'none';
        document.getElementById('card-slot').style.opacity = '0.5';
        document.getElementById('card-slot').style.pointerEvents = 'none';
        document.getElementById('bookingSummary').classList.remove('show');
        document.getElementById('slotContainer').innerHTML = '<div class="empty-state">Vui lòng chọn bác sĩ và ngày khám</div>';
        updateSteps(1);

      } catch (e) {
        console.error('submitBooking error:', e);
        showToast('Có lỗi xảy ra khi đặt lịch: ' + e.message, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = oldText || '✅ Hoàn tất đăng ký';
        }
      }
    }


    // ==================== QUEUE STATUS ====================
    async function updateQueueStatus() {
      try {
        const res = await API.get(`/api/hang-doi/trang-thai?maBN=${CURRENT_BN_ID}`);
        if (res.error || !res.ticket) {
          document.getElementById('q-current').textContent = '---';
          document.getElementById('q-serving').textContent = '---';
          document.getElementById('q-wait').textContent = '0';
          document.getElementById('q-time').textContent = 'Không có lịch';
          document.getElementById('ticketNum').textContent = '---';
          document.getElementById('ticketRoom').textContent = 'Chưa có số thứ tự';
          document.getElementById('ticketTime').textContent = 'Vui lòng đăng ký khám để nhận số';
          document.getElementById('ticketStatus').textContent = 'Chưa đăng ký';
          document.getElementById('ticketStatus').className = 'badge badge-waiting';
          return;
        }

        const ticket = res.ticket;

        document.getElementById('q-current').textContent = res.soThuTuCuaBN || ticket.SoThuTu || '---';
        document.getElementById('q-serving').textContent = res.soThuTuDangGoi || '---';
        document.getElementById('q-wait').textContent = res.soNguoiTruocBan || 0;
        document.getElementById('q-time').textContent = `Ước tính: ~${res.uocTinhPhut || 0} phút`;

        document.getElementById('ticketNum').textContent = ticket.SoThuTu || '---';
        document.getElementById('ticketRoom').textContent =
          ticket.TenPhongKham
            ? `${ticket.TenPhongKham} - Phòng ${ticket.SoPhong || ''}`
            : '---';
        document.getElementById('ticketTime').textContent =
          ticket.ThoiGianDuKienKham
            ? 'Dự kiến: ' + formatDateTime(ticket.ThoiGianDuKienKham)
            : '---';

        const statusMap = {
          'WAITING': { text: 'Đang chờ khám', cls: 'badge-waiting' },
          'CALLED': { text: 'Đang gọi khám', cls: 'badge-active' },
          'DONE': { text: 'Hoàn tất', cls: 'badge-done' },
          'SKIPPED': { text: 'Bỏ lượt', cls: 'badge-cancel' },
          'CANCELLED': { text: 'Đã hủy', cls: 'badge-cancel' }
        };
        const st = statusMap[ticket.TrangThaiThe] || { text: ticket.TrangThaiThe, cls: 'badge-waiting' };
        const badge = document.getElementById('ticketStatus');
        badge.textContent = st.text;
        badge.className = 'badge ' + st.cls;

        if (ticket.TrangThaiThe === 'CALLED') {
          showToast('🔔 ĐẾN LƯỢT BẠN! Vui lòng vào phòng khám.', 'success');
        }
      } catch (e) {
        console.error('updateQueueStatus error:', e);
      }
    }


    // Auto refresh queue every 15 seconds
    setInterval(updateQueueStatus, 15000);

    // ==================== PHIẾU KHÁM ====================
    async function renderPhieuList() {
      const c = document.getElementById('phieuList');
      c.innerHTML = '<div class="empty-state">Đang tải...</div>';

      try {
        const phieus = await API.get(`/api/phieu-kham?maBN=${CURRENT_BN_ID}`);

        if (!phieus || phieus.length === 0) {
          c.innerHTML = '<div class="empty-state">Chưa có phiếu khám nào</div>';
          return;
        }

        // Get doctor info for each phieu
        const allDoctors = await API.get('/api/bac-si');
        const allDepts = await API.get('/api/chuyen-khoa');

        c.innerHTML = phieus.map((p) => {
          const bs = allDoctors.find(d => d.MaBS === p.MaBS);
          const dept = bs ? allDepts.find(dk => dk.MaCK === bs.MaCK) : null;
          const statusMap = {
            'Đang khám': { cls: 'badge-active', text: 'Đang khám' },
            'Hoàn tất': { cls: 'badge-done', text: 'Hoàn tất' },
            'Đã lưu hồ sơ': { cls: 'badge-done', text: 'Đã lưu hồ sơ' }
          };
          const st = statusMap[p.TrangThai] || { cls: 'badge-waiting', text: p.TrangThai };

          return `
          <div class="phieu-card">
            <div class="phieu-header">
              <div>
                <div style="font-weight:600;font-size:14px;">Phiếu khám - ${formatDate(p.NgayKham)}</div>
                <div style="font-size:12px;color:var(--text-sub);">${bs ? bs.HoTen : p.MaBS} · ${dept ? dept.TenCK : '---'}</div>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                <span class="badge ${st.cls}">${st.text}</span>
                <button class="btn btn-ghost btn-sm" onclick="document.getElementById('phieu-body-${p.MaPK}').classList.toggle('open')">▾ Xem</button>
              </div>
            </div>
            <div class="phieu-body" id="phieu-body-${p.MaPK}">
              <div class="phieu-grid">
                <div class="phieu-field"><div class="phieu-label">Triệu chứng</div><div class="phieu-val">${p.TrieuChung || '---'}</div></div>
                <div class="phieu-field"><div class="phieu-label">Chẩn đoán</div><div class="phieu-val">${p.ChuanDoan || '---'}</div></div>
                <div class="phieu-field"><div class="phieu-label">Kết quả thăm khám</div><div class="phieu-val">${p.KetQuaThamKham || '---'}</div></div>
                <div class="phieu-field"><div class="phieu-label">Chi phí</div><div class="phieu-val">${p.ChiPhi ? p.ChiPhi.toLocaleString('vi-VN') + ' VNĐ' : '---'}</div></div>
              </div>
            </div>
          </div>`;
        }).join('');
      } catch (e) {
        console.error('renderPhieuList error:', e);
        c.innerHTML = '<div class="empty-state">Không thể tải danh sách phiếu khám</div>';
      }
    }

    async function loadDoctorSelect() {
      try {
        const docs = await API.get('/api/bac-si');
        const sel = document.getElementById('pk-bs');
        sel.innerHTML = '<option value="">-- Chọn bác sĩ --</option>' +
          docs.map(d => `<option value="${d.MaBS}">${d.HoTen}</option>`).join('');
      } catch (e) {
        console.error('loadDoctorSelect error:', e);
      }
    }

    async function loadDeptSelect() {
      try {
        const depts = await API.get('/api/chuyen-khoa');
        const sel = document.getElementById('pk-dept');
        sel.innerHTML = '<option value="">-- Chọn khoa --</option>' +
          depts.map(d => `<option value="${d.MaCK}">${d.TenCK}</option>`).join('');
      } catch (e) {
        console.error('loadDeptSelect error:', e);
      }
    }

    async function submitPhieu() {
      const date = document.getElementById('pk-date').value;
      const maBS = document.getElementById('pk-bs').value;
      const reason = document.getElementById('pk-reason').value;

      if (!date || !maBS || !reason) {
        showToast('Vui lòng nhập đầy đủ thông tin bắt buộc!', 'error');
        return;
      }

      try {
        // Nếu bệnh nhân chưa có hồ sơ y tế, backend sẽ tự tạo MaHS mới
        const newPhieu = await API.post('/api/phieu-kham', {
          MaHS: currentHoSo?.MaHS || null,
          MaBN: CURRENT_BN_ID,
          MaBS: maBS,
          NgayKham: date,
          TrieuChung: reason,
          KetQuaThamKham: document.getElementById('pk-temp').value ? `Nhiệt độ: ${document.getElementById('pk-temp').value}°C, HA: ${document.getElementById('pk-bp').value || '---'}, Nhịp tim: ${document.getElementById('pk-heart').value || '---'}` : null,
          ChuanDoan: document.getElementById('pk-diag').value || 'Chưa chẩn đoán',
          ChiPhi: 200000,
          TrangThai: 'Hoàn tất'
        });

        document.getElementById('phieu-success').style.display = 'flex';
        showToast('Tạo phiếu khám thành công!', 'success');
        renderPhieuList();
        setTimeout(() => {
          closeModal('modal-phieu');
          document.getElementById('phieu-success').style.display = 'none';
          // Reset form
          document.getElementById('pk-date').value = new Date().toISOString().split('T')[0];
          document.getElementById('pk-bs').value = '';
          document.getElementById('pk-dept').value = '';
          document.getElementById('pk-temp').value = '';
          document.getElementById('pk-bp').value = '';
          document.getElementById('pk-heart').value = '';
          document.getElementById('pk-reason').value = '';
          document.getElementById('pk-diag').value = '';
          document.getElementById('pk-note').value = '';
        }, 1500);
      } catch (e) {
        console.error('submitPhieu error:', e);
        showToast('Có lỗi xảy ra khi tạo phiếu khám', 'error');
      }
    }

    // ==================== NOTIFICATIONS ====================
    async function renderNotifications() {
      const c = document.getElementById('notifList');
      c.innerHTML = '<div class="empty-state">Đang tải...</div>';

      try {
        const notifs = await API.get(`/api/thong-bao?maBN=${CURRENT_BN_ID}`);

        if (!notifs || notifs.length === 0) {
          c.innerHTML = '<div class="empty-state">Không có thông báo nào</div>';
          return;
        }

        const iconMap = {
          'Push': { icon: '📢', cls: 'info' },
          'SMS': { icon: '💬', cls: 'warning' },
          'Email': { icon: '📧', cls: 'success' }
        };

        c.innerHTML = notifs.map(n => {
          const ic = iconMap[n.LoaiThongBao] || { icon: '📌', cls: 'info' };
          const isUnread = !n.TrangThaiGui || n.TrangThaiGui === 0 || n.TrangThaiGui === false;
          return `
          <div class="notif-item ${isUnread ? 'unread' : ''}">
            <div class="notif-icon ${ic.cls}">${ic.icon}</div>
            <div>
              <div class="notif-title">${n.TieuDe}</div>
              <div class="notif-text">${n.NoiDung}</div>
              <div class="notif-time">${formatDateTime(n.ThoiGianGui)} · ${n.LoaiThongBao}</div>
            </div>
          </div>`;
        }).join('');
      } catch (e) {
        console.error('renderNotifications error:', e);
        c.innerHTML = '<div class="empty-state">Không thể tải thông báo</div>';
      }
    }

    // ==================== CANCEL ====================
    async function renderCancelList() {
      const tbody = document.getElementById('cancelList');
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">Đang tải...</td></tr>';

      try {
        const lichKham = await API.get(`/api/lich-kham?maBN=${CURRENT_BN_ID}`);
        const phongKham = await API.get('/api/phong-kham');

        if (!lichKham || lichKham.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">Không có lịch khám nào</td></tr>';
          return;
        }

        tbody.innerHTML = lichKham.map(lk => {
          const room = phongKham.find(p => p.MaPhongKham === lk.MaPhongKham);
          const d = lk.NgayGio ? new Date(lk.NgayGio) : null;
          const date = d && !isNaN(d) ? d.toISOString().split('T')[0] : '';
          const time = d && !isNaN(d)
            ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : '';

          const statusMap = {
            'Đã đặt': { cls: 'badge-booked', text: 'Đã đặt' },
            'Đang chờ': { cls: 'badge-waiting', text: 'Đang chờ' },
            'Đã khám': { cls: 'badge-done', text: 'Đã khám' },
            'Đã hủy': { cls: 'badge-cancel', text: 'Đã hủy' }
          };
          const st = statusMap[lk.TrangThai] || { cls: 'badge-waiting', text: lk.TrangThai };
          const canCancel = lk.TrangThai === 'Đã đặt' || lk.TrangThai === 'Đang chờ';

          return `
          <tr>
            <td>${formatDate(date)}</td>
            <td>${room ? room.TenPhongKham : lk.MaPhongKham}</td>
            <td>${time}</td>
            <td><span class="badge ${st.cls}">${st.text}</span></td>
            <td><button class="btn btn-danger btn-sm" ${!canCancel ? 'disabled' : ''} onclick="askCancel('${lk.MaLich}')">Hủy</button></td>
          </tr>`;
        }).join('');
      } catch (e) {
        console.error('renderCancelList error:', e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">Không thể tải danh sách lịch khám</td></tr>';
      }
    }

    function filterCancel() {
      const q = document.getElementById('cancelSearch').value.toLowerCase();
      const rows = document.querySelectorAll('#cancelList tr');
      rows.forEach(r => { r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'; });
    }

    function askCancel(id) {
      cancelBookingId = id;
      openModal('modal-cancel');
    }
    async function confirmCancel() {
      try {
        await API.put(`/api/lich-kham/${cancelBookingId}`, { TrangThai: 'Đã hủy' });

        closeModal('modal-cancel');
        showToast('Đã hủy lịch khám!', 'success');
        await renderCancelList();
        await updateQueueStatus();
      } catch (e) {
        console.error('confirmCancel error:', e);
        showToast('Có lỗi xảy ra khi hủy lịch: ' + e.message, 'error');
      }
    }


    // ==================== PROFILE ====================
    async function saveProfile() {
      try {
        const updates = {
          HoTen: document.getElementById('upd-name').value,
          NgaySinh: document.getElementById('upd-dob').value,
          GioiTinh: document.getElementById('upd-gender').value,
          SDT: document.getElementById('upd-phone').value,
          Email: document.getElementById('upd-email').value,
          DiaChi: document.getElementById('upd-address').value
        };

        await API.put(`/api/benh-nhan/${CURRENT_BN_ID}`, updates);

        // Update HoSoYTe if exists
        if (currentHoSo) {
          await API.put(`/api/ho-so-yte/${currentHoSo.MaHS}`, {
            NhomMau: document.getElementById('upd-blood').value,
            TienSuBenh: document.getElementById('upd-medical').value,
            GhiChu: document.getElementById('upd-note').value,
            NgayCapNhat: new Date().toISOString().split('T')[0]
          });
        }

        document.getElementById('profile-success').style.display = 'flex';
        showToast('Cập nhật hồ sơ thành công!', 'success');
        loadPatientData();
        setTimeout(() => document.getElementById('profile-success').style.display = 'none', 3000);
      } catch (e) {
        console.error('saveProfile error:', e);
        showToast('Có lỗi xảy ra khi cập nhật hồ sơ', 'error');
      }
    }

    async function resetProfile() {
      await loadPatientData();
      showToast('Đã đặt lại form', 'warning');
    }
    function resetDatabase() {
      showToast('Hệ thống đang dùng database thật. Chức năng khôi phục localStorage đã tắt.', 'warning');
    }


    // ==================== MODAL ====================
    function openModal(id) { document.getElementById(id).classList.add('open'); }
    function closeModal(id) { document.getElementById(id).classList.remove('open'); }
    document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); }));

    // ==================== TOAST ====================
    function showToast(msg, type) {
      const c = document.getElementById('toastContainer');
      const t = document.createElement('div');
      t.className = 'toast ' + (type || '');
      t.innerHTML = '<div>' + msg + '</div>';
      c.appendChild(t);
      setTimeout(() => t.classList.add('show'), 10);
      setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
    }
