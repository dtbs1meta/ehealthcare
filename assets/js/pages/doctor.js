// eHealthCare - JS tách từ doctor.html

// ==================== DATABASE CONFIG ====================
    const API_BASE = 'http://localhost:3000';

    // Tài khoản bác sĩ được lưu từ index.html sau khi đăng nhập.
    const doctorUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!doctorUser || doctorUser.role !== 'doctor' || !doctorUser.maBS) {
      window.location.href = 'index.html';
    }

    const CURRENT_DOCTOR_ID = doctorUser.maBS;
    const DEFAULT_DOCTOR_ID = CURRENT_DOCTOR_ID;

    function logoutDoctor() {
      sessionStorage.removeItem('user');
      window.location.href = 'index.html';
    }

    function getDoctorInitials(name) {
      if (!name) return 'BS';
      const clean = String(name).replace(/^\s*(TS\.|ThS\.|GS\.|BS\s*CKI|BS\.|BS)\s*/i, '').trim();
      const parts = clean.split(/\s+/).filter(Boolean);
      return (parts.at(-1) || 'BS').charAt(0).toUpperCase();
    }

    let patients = [];
    let allPatients = [];
    let rxHistory = [];
    let currentPatient = null;
    let transferLog = [];
    let medicines = [];
    let refreshTimer = null;

    // ==================== HELPERS ====================
    function escapeHTML(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function normalizeText(value) {
      return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    }

    function calcAge(dateValue) {
      if (!dateValue) return '';
      const birth = new Date(dateValue);
      if (Number.isNaN(birth.getTime())) return '';
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
      return age;
    }

    function getBirthYear(dateValue) {
      if (!dateValue) return '';
      const birth = new Date(dateValue);
      return Number.isNaN(birth.getTime()) ? '' : birth.getFullYear();
    }

    function normalizeStatus(row) {
      const raw = String(row.TrangThaiThe || row.TrangThai || row.status || '').toUpperCase();
      if (raw.includes('CALLED') || raw.includes('CALLING') || raw.includes('IN_PROGRESS') || raw.includes('ĐANG')) return 'serving';
      if (raw.includes('DONE') || raw.includes('HOÀN') || raw.includes('DA KHAM') || raw.includes('ĐÃ KHÁM')) return 'done';
      if (raw.includes('SKIPPED')) return 'skipped';
      if (raw.includes('CANCELLED') || raw.includes('HUY') || raw.includes('HỦY')) return 'cancelled';
      return 'waiting';
    }

    function normalizePatient(row) {
      const queueNumber = row.SoThuTu || row.STT || row.ThuTu || '';
      return {
        id: row.MaBN || row.id || row.ID,
        MaBN: row.MaBN || row.id || row.ID,
        MaHS: row.MaHS || row.maHS || null,
        MaThe: row.MaThe || row.maThe || null,
        stt: queueNumber ? `A${String(queueNumber).padStart(3, '0')}` : (row.stt || row.MaBN || ''),
        queueNumber,
        name: row.HoTen || row.TenBenhNhan || row.name || 'Chưa rõ tên',
        yob: row.yob || getBirthYear(row.NgaySinh),
        age: row.age || calcAge(row.NgaySinh),
        gender: row.GioiTinh || row.gender || '',
        phone: row.SDT || row.phone || '',
        status: normalizeStatus(row),
        symptom: row.TrieuChung || row.TrieuChungHienTai || row.LyDoKham || row.GhiChu || row.symptom || '',
        history: row.TienSuBenh || row.history || '',
        allergy: row.DiUng || row.allergy || 'Không',
        underlying: row.BenhNen || row.underlying || '',
        blood: [row.NhomMau, row.Rh].filter(Boolean).join('') || '',
        priority: row.LoaiUuTien || row.priority || 'Bình thường',
        weight: row.CanNang || row.weight || '',
        height: row.ChieuCao || row.height || '',
        raw: row
      };
    }

    async function fetchJson(path, options = {}) {
      const res = await fetch(API_BASE + path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });

      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const data = await res.json();
          message = data.message || data.error || message;
        } catch (_) {
          message = await res.text();
        }
        throw new Error(message);
      }

      return res.json();
    }

    function getEl(id) {
      return document.getElementById(id);
    }

    function safeSetText(id, value) {
      const el = getEl(id);
      if (el) el.textContent = value ?? '';
    }

    // ==================== INIT ====================
    document.addEventListener('DOMContentLoaded', async () => {
      safeSetText('doctorNameHeader', doctorUser.hoTen || CURRENT_DOCTOR_ID);
      safeSetText('doctorAvatarHeader', getDoctorInitials(doctorUser.hoTen));
      getEl('cd-taikham').value = new Date(Date.now() + 14 * 864e5).toISOString().split('T')[0];
      addRxRow();
      await loadInitialData();
      refreshTimer = setInterval(loadDoctorQueue, 15000);
    });

    window.addEventListener('beforeunload', () => {
      if (refreshTimer) clearInterval(refreshTimer);
    });

    async function loadInitialData() {
      await Promise.allSettled([
        loadDoctorQueue(),
        loadAllPatients(),
        loadMedicines()
      ]);
      renderRxHistory();
    }

    // ==================== DATABASE LOADERS ====================
    async function loadDoctorQueue() {
      try {
        const rows = await fetchJson('/api/doctor/my-queue?maBS=' + encodeURIComponent(CURRENT_DOCTOR_ID));
        patients = rows.map(normalizePatient);
        updateDash();
        renderBNList();
        renderKBPatients();
        renderTransferLog();
      } catch (err) {
        console.error(err);
        showToast('Không tải được hàng chờ từ database: ' + err.message, 'error');
      }
    }

    async function loadAllPatients() {
      try {
        const rows = await fetchJson('/api/benhnhan');
        allPatients = rows.map(normalizePatient);
        renderHSList();
      } catch (err) {
        console.warn('Không tải được toàn bộ bệnh nhân:', err.message);
        allPatients = [...patients];
        renderHSList();
      }
    }

    async function loadMedicines() {
      try {
        medicines = await fetchJson('/api/thuoc');
        ensureMedicineDatalist();
        renderDoseCalculator();
      } catch (err) {
        console.warn('Không tải được danh sách thuốc:', err.message);
        medicines = [];
        ensureMedicineDatalist();
        renderDoseCalculator();
      }
    }

    function ensureMedicineDatalist() {
      let datalist = getEl('medicineOptions');
      if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'medicineOptions';
        document.body.appendChild(datalist);
      }

      datalist.innerHTML = medicines.map(m => `<option value="${escapeHTML(m.TenThuoc)}"></option>`).join('');
    }

    function getDoseMeta(medicine) {
      const name = normalizeText(medicine?.TenThuoc || '');
      const description = String(medicine?.MoTa || '');
      const text = normalizeText(`${medicine?.TenThuoc || ''} ${description}`);

      const defaults = [
        { keys: ['paracetamol', 'acetaminophen'], dose: 12.5, doseText: '10-15 mg/kg', frequency: '3-4 lần/ngày', note: 'Tính theo cân nặng; không vượt liều tối đa/ngày.' },
        { keys: ['amoxicillin'], dose: 25, doseText: '25-50 mg/kg', frequency: '2-3 lần/ngày', note: 'Chia đều các lần dùng trong ngày.' },
        { keys: ['ibuprofen'], dose: 7.5, doseText: '5-10 mg/kg', frequency: '3-4 lần/ngày', note: 'Uống sau ăn.' },
        { keys: ['cefixime'], dose: 8, doseText: '8 mg/kg', frequency: '1-2 lần/ngày', note: 'Tham khảo liều tối đa theo hướng dẫn thuốc.' },
        { keys: ['metronidazole'], dose: 7.5, doseText: '7.5 mg/kg', frequency: '3 lần/ngày', note: 'Chia đều các lần dùng trong ngày.' },
        { keys: ['cephalexin', 'cefalexin'], dose: 25, doseText: '25-50 mg/kg', frequency: '2-4 lần/ngày', note: 'Tham khảo theo chẩn đoán và mức độ nhiễm khuẩn.' },
        { keys: ['azithromycin'], dose: 10, doseText: '10 mg/kg', frequency: '1 lần/ngày', note: 'Thường dùng ngắn ngày theo chỉ định.' },
        { keys: ['cetirizine'], dose: 0.25, doseText: '0.25 mg/kg', frequency: '1 lần/ngày', note: 'Thuốc kháng dị ứng; cân nhắc tuổi bệnh nhân.' },
        { keys: ['loratadine'], dose: 0.2, doseText: '0.2 mg/kg', frequency: '1 lần/ngày', note: 'Thuốc kháng dị ứng; cân nhắc tuổi bệnh nhân.' }
      ];

      const found = defaults.find(item => item.keys.some(key => text.includes(key)));
      if (found) return found;

      const match = description.match(/(\d+(?:[.,]\d+)?)\s*(?:-\s*(\d+(?:[.,]\d+)?))?\s*mg\s*\/\s*kg/i);
      if (match) {
        const min = parseFloat(match[1].replace(',', '.'));
        const max = match[2] ? parseFloat(match[2].replace(',', '.')) : min;
        const avg = (min + max) / 2;
        return {
          dose: avg,
          doseText: match[2] ? `${min}-${max} mg/kg` : `${min} mg/kg`,
          frequency: 'Theo chỉ định',
          note: description || 'Lấy từ mô tả thuốc trong database.'
        };
      }

      return {
        dose: '',
        doseText: 'Chưa có dữ liệu mg/kg',
        frequency: 'Theo chỉ định',
        note: medicine?.MoTa || medicine?.DonViTinh || 'Database hiện chưa có cột liều chuẩn.'
      };
    }

    function renderDoseCalculator() {
      const drugSelect = getEl('dc-drug');
      const doseBody = getEl('doseRefBody');

      if (drugSelect) {
        if (!medicines.length) {
          drugSelect.innerHTML = '<option value="">Không có thuốc từ database</option>';
        } else {
          drugSelect.innerHTML = '<option value="">-- Chọn thuốc từ database --</option>' + medicines.map(m => {
            const meta = getDoseMeta(m);
            return `<option value="${escapeHTML(m.MaThuoc || m.TenThuoc)}" data-dose="${escapeHTML(meta.dose)}" data-name="${escapeHTML(m.TenThuoc)}" data-unit="${escapeHTML(m.DonViTinh || '')}" data-note="${escapeHTML(meta.note)}">${escapeHTML(m.TenThuoc)}${m.DonViTinh ? ' - ' + escapeHTML(m.DonViTinh) : ''}</option>`;
          }).join('');
        }
      }

      if (doseBody) {
        if (!medicines.length) {
          doseBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Chưa có dữ liệu thuốc từ database</td></tr>';
        } else {
          doseBody.innerHTML = medicines.map(m => {
            const meta = getDoseMeta(m);
            return `<tr><td>${escapeHTML(m.TenThuoc)}</td><td>${escapeHTML(meta.doseText)}</td><td>${escapeHTML(meta.frequency)}</td><td>${escapeHTML(meta.note)}</td></tr>`;
          }).join('');
        }
      }
    }

    // ==================== NAV ====================
    function showPage(pageId, btn) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      getEl('page-' + pageId)?.classList.add('active');
      if (btn) {
        document.querySelectorAll('.sidebar-link').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    }

    function switchTab(btn, tabId) {
      btn.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      getEl(tabId).classList.add('active');
    }

    // ==================== DASHBOARD ====================
    function updateDash() {
      const waiting = patients.filter(p => p.status === 'waiting').length;
      const serving = patients.filter(p => p.status === 'serving').length;
      safeSetText('dash-wait', waiting);
      safeSetText('dash-serving', serving);
      safeSetText('dash-done', patients.filter(p => p.status === 'done').length);
      safeSetText('dash-rx', rxHistory.length);
      safeSetText('bnCount', waiting);

      const c = getEl('dashQueue');
      if (!c) return;
      const queue = patients.filter(p => p.status === 'waiting' || p.status === 'serving');
      c.innerHTML = queue.length ? queue.map(p => `
    <div class="patient-queue-item ${p.status === 'serving' ? 'active' : ''}" onclick="selectPatient('${escapeHTML(p.MaBN)}')">
      <div class="pq-num">${escapeHTML(p.queueNumber || p.stt.replace('A', ''))}</div>
      <div class="pq-info"><div class="pq-name">${escapeHTML(p.name)}</div><div class="pq-meta">${escapeHTML(p.yob || '')} · ${escapeHTML(p.symptom || p.priority)}</div></div>
      <span class="pq-badge ${p.status}">${p.status === 'serving' ? 'Đang khám' : 'Chờ'}</span>
    </div>`).join('') : '<div class="empty-state">Không có bệnh nhân trong hàng chờ</div>';
    }

    async function nextBN() {
      try {
        const data = await fetchJson('/api/doctor/my-next', { method: 'PUT', body: JSON.stringify({ MaBS: CURRENT_DOCTOR_ID }) });
        showToast(data.message || 'Đã gọi bệnh nhân tiếp theo', 'success');
        await loadDoctorQueue();
        const maBN = data.patient?.MaBN;
        if (maBN) await selectPatient(maBN);
      } catch (err) {
        showToast(err.message || 'Không gọi được bệnh nhân tiếp theo', 'warning');
      }
    }

    // ==================== BN LIST ====================
    function renderBNList() {
      const search = normalizeText(getEl('bnSearch')?.value || '');
      const filter = getEl('bnStatusFilter')?.value || 'all';
      let data = [...patients];

      if (filter !== 'all') data = data.filter(p => p.status === filter);
      if (search) {
        data = data.filter(p =>
          normalizeText(p.name).includes(search) ||
          normalizeText(p.stt).includes(search) ||
          normalizeText(p.phone).includes(search) ||
          normalizeText(p.symptom).includes(search)
        );
      }

      const list = getEl('bnList');
      if (!list) return;
      list.innerHTML = data.length ? data.map(p => `
    <div class="patient-queue-item ${p.status === 'serving' ? 'active' : ''}" onclick="selectPatient('${escapeHTML(p.MaBN)}')" style="cursor:pointer;">
      <div class="pq-num">${escapeHTML(p.queueNumber || p.stt.replace('A', ''))}</div>
      <div class="pq-info"><div class="pq-name">${escapeHTML(p.name)} <span style="font-weight:400;color:var(--text-muted);">(${escapeHTML(p.age || '')}t)</span></div><div class="pq-meta">${escapeHTML(p.phone)} · ${escapeHTML(p.symptom || p.priority)}</div></div>
      <span class="pq-badge ${p.status}">${p.status === 'waiting' ? 'Chờ khám' : p.status === 'serving' ? 'Đang khám' : 'Hoàn tất'}</span>
    </div>`).join('') : '<div class="empty-state">Không có bệnh nhân phù hợp</div>';
    }

    // ==================== KHÁM BỆNH ====================
    function renderKBPatients() {
      const c = getEl('kbPatientList');
      if (!c) return;
      const data = patients.filter(p => p.status === 'waiting' || p.status === 'serving');
      c.innerHTML = data.length ? data.map(p => `
    <div class="patient-queue-item ${currentPatient && currentPatient.MaBN === p.MaBN ? 'active' : ''}" onclick="selectPatient('${escapeHTML(p.MaBN)}')">
      <div class="pq-num">${escapeHTML(p.queueNumber || p.stt.replace('A', ''))}</div>
      <div class="pq-info"><div class="pq-name">${escapeHTML(p.name)}</div><div class="pq-meta">${escapeHTML(p.symptom || p.priority)}</div></div>
    </div>`).join('') : '<div class="empty-state">Không có bệnh nhân chờ khám</div>';
    }

    async function selectPatient(maBN) {
      try {
        let detail;
        try {
          detail = await fetchJson('/api/doctor/patient/' + encodeURIComponent(maBN));
        } catch (_) {
          detail = patients.find(p => p.MaBN === maBN)?.raw || allPatients.find(p => p.MaBN === maBN)?.raw;
        }

        if (!detail) {
          showToast('Không tìm thấy thông tin bệnh nhân', 'error');
          return;
        }

        const fromQueue = patients.find(p => p.MaBN === maBN) || {};
        currentPatient = { ...fromQueue, ...normalizePatient({ ...fromQueue.raw, ...detail, TrangThaiThe: fromQueue.raw?.TrangThaiThe || detail.TrangThaiThe }) };

        getEl('kb-patientName').innerHTML = `${escapeHTML(currentPatient.name)} <span style="font-weight:400;font-size:13px;color:var(--text-sub);">(${escapeHTML(currentPatient.age || '')}t - ${escapeHTML(currentPatient.gender)})</span>`;
        getEl('kb-cannang').value = currentPatient.weight || '';
        getEl('kb-chieucao').value = currentPatient.height || '';
        getEl('kb-lydo').value = currentPatient.symptom || '';
        getEl('kb-tomtat').value = [
          currentPatient.history ? `Tiền sử: ${currentPatient.history}` : '',
          currentPatient.underlying ? `Bệnh nền: ${currentPatient.underlying}` : '',
          currentPatient.allergy ? `Dị ứng: ${currentPatient.allergy}` : ''
        ].filter(Boolean).join('\n');

        renderKBPatients();
        showPage('khambenh', document.querySelectorAll('.sidebar-link')[2]);
      } catch (err) {
        showToast('Lỗi chọn bệnh nhân: ' + err.message, 'error');
      }
    }

    function addRxRow() {
      const tbody = getEl('rxBody');
      if (!tbody) return;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><input type="text" placeholder="Tên thuốc" class="rx-name" list="medicineOptions" oninput="checkDrugAllergy(this)"></td>
    <td><input type="text" placeholder="1 viên" class="rx-dose" style="width:80px;"></td>
    <td><input type="text" placeholder="viên" class="rx-unit" style="width:60px;"></td>
    <td><input type="number" placeholder="10" class="rx-qty" style="width:60px;" min="1"></td>
    <td><input type="text" placeholder="Ngày 2 lần" class="rx-usage"></td>
    <td><button class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()">✕</button></td>`;
      tbody.appendChild(tr);
    }

    function findMedicineByName(name) {
      const q = normalizeText(name);
      if (!q) return null;
      return medicines.find(m => normalizeText(m.TenThuoc) === q)
        || medicines.find(m => normalizeText(m.TenThuoc).includes(q) || q.includes(normalizeText(m.TenThuoc)));
    }

    function checkDrugAllergy(input) {
      if (!currentPatient || !input.value.trim()) return;
      const allergy = normalizeText(currentPatient.allergy);
      if (!allergy || allergy === 'khong' || allergy === 'khong co') return;

      const drugName = normalizeText(input.value);
      const med = findMedicineByName(input.value);
      const medText = normalizeText([input.value, med?.TenThuoc, med?.MoTa].filter(Boolean).join(' '));

      const allergyMap = {
        penicillin: ['penicillin', 'amoxicillin', 'ampicillin', 'augmentin'],
        aspirin: ['aspirin'],
        ibuprofen: ['ibuprofen'],
        paracetamol: ['paracetamol', 'acetaminophen'],
        cephalosporin: ['cefixime', 'cephalexin', 'cefuroxime']
      };

      let risk = medText.includes(allergy) || allergy.includes(drugName);
      Object.entries(allergyMap).forEach(([key, values]) => {
        if (allergy.includes(key) && values.some(v => medText.includes(v))) risk = true;
      });

      if (risk) {
        showToast(`Cảnh báo dị ứng: bệnh nhân có tiền sử ${currentPatient.allergy}`, 'warning');
        input.style.borderColor = 'var(--warning)';
      } else {
        input.style.borderColor = '';
      }
    }

    function collectPrescription() {
      const prescription = [];
      const invalid = [];

      document.querySelectorAll('#rxBody tr').forEach(tr => {
        const name = tr.querySelector('.rx-name')?.value.trim();
        if (!name) return;

        const med = findMedicineByName(name);
        if (!med && medicines.length) {
          invalid.push(name);
          return;
        }

        prescription.push({
          MaThuoc: med?.MaThuoc || name,
          TenThuoc: med?.TenThuoc || name,
          SoLuong: Number(tr.querySelector('.rx-qty')?.value || 1),
          LieuLuong: tr.querySelector('.rx-dose')?.value || '',
          CachDung: tr.querySelector('.rx-usage')?.value || '',
          ThoiGianDung: tr.querySelector('.rx-unit')?.value || ''
        });
      });

      return { prescription, invalid };
    }

    function buildExamSummary() {
      return [
        getEl('kb-mach').value ? `Mạch: ${getEl('kb-mach').value} lần/phút` : '',
        getEl('kb-nhietdo').value ? `Nhiệt độ: ${getEl('kb-nhietdo').value}°C` : '',
        getEl('kb-huyetap').value ? `Huyết áp: ${getEl('kb-huyetap').value}` : '',
        getEl('kb-nhiptho').value ? `Nhịp thở: ${getEl('kb-nhiptho').value} lần/phút` : '',
        getEl('kb-tomtat').value ? `Tóm tắt: ${getEl('kb-tomtat').value}` : '',
        getEl('cd-huong').value ? `Hướng điều trị: ${getEl('cd-huong').value}` : '',
        getEl('cd-loikhuyen').value ? `Lời khuyên: ${getEl('cd-loikhuyen').value}` : ''
      ].filter(Boolean).join('\n');
    }

    async function saveKB() {
      if (!currentPatient) {
        showToast('Vui lòng chọn bệnh nhân!', 'error');
        return;
      }

      const diagnosis = getEl('cd-icd').value.trim() || getEl('cd-chitiet').value.trim();
      if (!diagnosis) {
        showToast('Vui lòng nhập chuẩn đoán trước khi lưu!', 'error');
        return;
      }

      if (!currentPatient.MaHS) {
        showToast('Bệnh nhân chưa có mã hồ sơ y tế MaHS, không thể lưu phiếu khám!', 'error');
        return;
      }

      const { prescription, invalid } = collectPrescription();
      if (invalid.length) {
        showToast('Thuốc chưa có trong database: ' + invalid.join(', '), 'error');
        return;
      }

      try {
        const payload = {
          MaBN: currentPatient.MaBN,
          MaHS: currentPatient.MaHS,
          MaBS: DEFAULT_DOCTOR_ID,
          TrieuChung: getEl('kb-lydo').value || currentPatient.symptom || '',
          KetQuaThamKham: buildExamSummary(),
          ChuanDoan: diagnosis,
          ChiPhi: 200000,
          prescription
        };

        const result = await fetchJson('/api/doctor/exam', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (prescription.length) {
          rxHistory.unshift({
            id: result.MaPK || Date.now(),
            date: new Date().toLocaleDateString('vi-VN'),
            patient: currentPatient.name,
            doctor: doctorUser.hoTen || CURRENT_DOCTOR_ID,
            drugs: prescription.map(p => ({ name: p.TenThuoc, dose: p.LieuLuong, qty: p.SoLuong, usage: p.CachDung })),
            diagnosis
          });
        }

        getEl('kb-success').style.display = 'flex';
        showToast(result.message || 'Đã lưu hồ sơ khám vào database!', 'success');
        await loadDoctorQueue();
        renderRxHistory();
        setTimeout(() => {
          getEl('kb-success').style.display = 'none';
          resetKB();
        }, 1600);
      } catch (err) {
        showToast('Lỗi lưu phiếu khám: ' + err.message, 'error');
      }
    }

    function resetKB() {
      ['kb-mach', 'kb-nhietdo', 'kb-huyetap', 'kb-nhiptho', 'kb-cannang', 'kb-chieucao', 'kb-lydo', 'kb-tomtat', 'cd-icd', 'cd-chitiet', 'cd-huong', 'cd-loikhuyen'].forEach(id => {
        const el = getEl(id);
        if (el) el.value = '';
      });
      getEl('rxBody').innerHTML = '';
      addRxRow();
      currentPatient = null;
      getEl('kb-patientName').textContent = 'Vui lòng chọn bệnh nhân';
      renderKBPatients();
    }

    // ==================== PRINT ====================
    function printRx() {
      if (!currentPatient) {
        showToast('Vui lòng chọn bệnh nhân!', 'error');
        return;
      }

      safeSetText('print-room', 'P101 - Nội tổng quát');
      safeSetText('print-name', currentPatient.name);
      safeSetText('print-age', currentPatient.age || '');
      safeSetText('print-icd', getEl('cd-icd').value || getEl('cd-chitiet').value || '---');
      safeSetText('print-advice', getEl('cd-loikhuyen').value || '---');
      safeSetText('print-date', new Date().toLocaleDateString('vi-VN'));

      let rxHtml = '<ol style="font-size:13px;line-height:2;">';
      document.querySelectorAll('#rxBody tr').forEach(tr => {
        const name = tr.querySelector('.rx-name')?.value;
        if (name) {
          rxHtml += `<li><strong>${escapeHTML(name)}</strong> - ${escapeHTML(tr.querySelector('.rx-dose')?.value || '')} x ${escapeHTML(tr.querySelector('.rx-qty')?.value || 0)} ${escapeHTML(tr.querySelector('.rx-unit')?.value || '')} (${escapeHTML(tr.querySelector('.rx-usage')?.value || '')})</li>`;
        }
      });
      rxHtml += '</ol>';
      getEl('print-rxlist').innerHTML = rxHtml;

      getEl('printArea').style.display = 'block';
      window.print();
      getEl('printArea').style.display = 'none';
    }

    // ==================== RX HISTORY ====================
    function renderRxHistory() {
      const search = normalizeText(getEl('rxSearch')?.value || '');
      const filter = getEl('rxFilter')?.value || 'all';
      let data = [...rxHistory];

      if (filter === 'today') data = data.filter(r => r.date === new Date().toLocaleDateString('vi-VN'));
      if (search) data = data.filter(r => normalizeText(r.patient).includes(search) || r.drugs.some(d => normalizeText(d.name).includes(search)));

      const list = getEl('rxHistoryList');
      if (!list) return;
      list.innerHTML = data.length ? data.map(r => `
    <div class="card" style="margin-bottom:10px;">
      <div class="card-header" style="padding:12px 16px;">
        <div><div style="font-weight:600;font-size:14px;">${escapeHTML(r.patient)}</div><div style="font-size:12px;color:var(--text-sub);">${escapeHTML(r.date)} · ${escapeHTML(r.doctor)}</div></div>
        <span class="pq-badge serving">${escapeHTML(r.diagnosis || 'Đã kê đơn')}</span>
      </div>
      <div class="card-body" style="padding:12px 16px;">
        <div style="font-size:12px;font-weight:600;color:var(--text-sub);margin-bottom:8px;">Đơn thuốc:</div>
        ${r.drugs.map(d => `<div style="font-size:13px;padding:4px 0;border-bottom:1px solid var(--border);"><strong>${escapeHTML(d.name)}</strong> - ${escapeHTML(d.dose)} x ${escapeHTML(d.qty)} (${escapeHTML(d.usage)})</div>`).join('')}
      </div>
    </div>`).join('') : '<div class="empty-state">Chưa có đơn thuốc mới trong phiên làm việc này</div>';
    }

    // ==================== HỒ SƠ BN ====================
    function renderHSList() {
      const search = normalizeText(getEl('hsSearch')?.value || '');
      let data = allPatients.length ? [...allPatients] : [...patients];
      if (search) data = data.filter(p => normalizeText(p.name).includes(search) || normalizeText(p.phone).includes(search) || normalizeText(p.MaBN).includes(search));

      const list = getEl('hsList');
      if (!list) return;
      list.innerHTML = data.length ? data.map(p => `
    <div class="card" style="margin-bottom:10px;">
      <div class="card-header" style="cursor:pointer;" onclick="viewHoso('${escapeHTML(p.MaBN)}')">
        <div class="card-header-left">
          <div class="card-icon">👤</div>
          <div><div class="card-title">${escapeHTML(p.name)} <span style="font-weight:400;color:var(--text-muted);">${escapeHTML(p.MaBN)}</span></div><div class="card-desc">${escapeHTML(p.phone)} · ${escapeHTML(p.age || '')} tuổi · ${escapeHTML(p.gender)}</div></div>
        </div>
        <button class="btn btn-outline btn-sm">👁️ Xem</button>
      </div>
    </div>`).join('') : '<div class="empty-state">Không tìm thấy hồ sơ bệnh nhân</div>';
    }

    async function viewHoso(maBN) {
      try {
        const detail = await fetchJson('/api/doctor/patient/' + encodeURIComponent(maBN));
        const p = normalizePatient(detail);
        getEl('hosoContent').innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
        <div style="width:60px;height:60px;border-radius:14px;background:var(--primary);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:700;">${escapeHTML(p.name.split(' ').pop()?.[0] || 'B')}</div>
        <div><div style="font-size:18px;font-weight:700;">${escapeHTML(p.name)}</div><div style="font-size:13px;color:var(--text-sub);">${escapeHTML(p.MaBN)} · ${escapeHTML(p.yob)} · ${escapeHTML(p.gender)}</div></div>
      </div>
      <div class="record-grid">
        <div class="record-item"><div class="record-label">Số điện thoại</div><div class="record-value">${escapeHTML(p.phone)}</div></div>
        <div class="record-item"><div class="record-label">Nhóm máu</div><div class="record-value">${escapeHTML(p.blood || '---')}</div></div>
        <div class="record-item"><div class="record-label">Loại ưu tiên</div><div class="record-value">${escapeHTML(p.priority)}</div></div>
        <div class="record-item"><div class="record-label">Mã hồ sơ</div><div class="record-value">${escapeHTML(p.MaHS || '---')}</div></div>
        <div class="record-item" style="grid-column:1/-1;"><div class="record-label">Tiền sử bệnh</div><div class="record-value">${escapeHTML(p.history || 'Không có')}</div></div>
        <div class="record-item" style="grid-column:1/-1;"><div class="record-label">Bệnh nền</div><div class="record-value">${escapeHTML(p.underlying || 'Không có')}</div></div>
        <div class="record-item" style="grid-column:1/-1;"><div class="record-label">Dị ứng</div><div class="record-value">${escapeHTML(p.allergy || 'Không có')}</div></div>
      </div>`;
        openModal('modal-hoso');
      } catch (err) {
        showToast('Không xem được hồ sơ: ' + err.message, 'error');
      }
    }

    // ==================== XỬ LÝ ====================
    function xulyBN() {
      const patientName = getEl('xl-patient').value;
      const doctor = getEl('xl-doctor').value;
      const action = getEl('xl-action').value;
      const reason = getEl('xl-reason').value;
      if (!patientName || !reason) {
        showToast('Vui lòng nhập đầy đủ!', 'error');
        return;
      }

      transferLog.unshift({ time: new Date().toLocaleString('vi-VN'), patient: patientName, doctor, action: action === 'transfer' ? 'Chuyển' : action === 'hold' ? 'Treo' : 'Next hồ sơ', reason });
      showToast(`Đã ghi nhận xử lý ${patientName}`, 'success');
      renderTransferLog();
      getEl('xl-reason').value = '';
    }

    function renderTransferLog() {
      const c = getEl('transferLog');
      const sel = getEl('xl-patient');
      if (sel) sel.innerHTML = patients.map(p => `<option>${escapeHTML(p.name)}</option>`).join('');
      if (!c) return;
      if (!transferLog.length) {
        c.innerHTML = '<div class="empty-state">Chưa có bản ghi chuyển/treo</div>';
        return;
      }
      c.innerHTML = transferLog.map(t => `
    <div class="patient-queue-item">
      <div class="pq-info"><div class="pq-name">${escapeHTML(t.patient)}</div><div class="pq-meta">${escapeHTML(t.time)} · ${escapeHTML(t.action)} → ${escapeHTML(t.doctor)}</div></div>
      <span class="pq-badge waiting">${escapeHTML(t.action)}</span>
    </div>`).join('');
    }

    // ==================== DOSE CALC ====================
    function autoFillDose() {
      const sel = getEl('dc-drug');
      const opt = sel?.options?.[sel.selectedIndex];
      if (!opt) return;
      getEl('dc-dose').value = opt.dataset.dose || '';
      if (opt.dataset.note) {
        safeSetText('doseDetail', `Gợi ý từ database: ${opt.dataset.name || opt.textContent}. ${opt.dataset.note}`);
        getEl('doseResult').style.display = 'block';
        safeSetText('doseValue', opt.dataset.dose ? `${opt.dataset.dose} mg/kg` : 'Chưa có liều mg/kg');
      }
    }

    function calcDose() {
      const dose = parseFloat(getEl('dc-dose').value);
      const weight = parseFloat(getEl('dc-weight').value);
      const times = parseInt(getEl('dc-times').value);
      const sel = getEl('dc-drug');
      const drug = sel.value;
      const opt = sel.options[sel.selectedIndex];
      if (!drug) {
        showToast('Vui lòng chọn thuốc!', 'error');
        return;
      }
      if (!dose) {
        showToast('Thuốc này chưa có liều chuẩn mg/kg. Hãy nhập liều chuẩn thủ công.', 'warning');
        getEl('dc-dose').focus();
        return;
      }
      if (!weight || !times) {
        showToast('Vui lòng nhập cân nặng và số lần/ngày!', 'error');
        return;
      }
      const totalMg = dose * weight;
      const perDose = totalMg / times;
      getEl('doseResult').style.display = 'block';
      safeSetText('doseValue', perDose.toFixed(1) + ' mg / lần');
      safeSetText('doseDetail', `${opt?.dataset?.name || opt?.textContent || 'Thuốc'}: tổng liều ngày ${totalMg.toFixed(1)} mg, chia ${times} lần`);
    }

    // ==================== GLOBAL SEARCH ====================
    function globalSearch() {
      const q = normalizeText(getEl('globalSearch').value);
      if (!q) return;
      const found = [...patients, ...allPatients].find(p => normalizeText(p.name).includes(q) || normalizeText(p.MaBN).includes(q));
      if (found) {
        showPage('benhnhan', document.querySelectorAll('.sidebar-link')[1]);
        getEl('bnSearch').value = getEl('globalSearch').value;
        renderBNList();
      }
    }

    // ==================== MODAL ====================
    function openModal(id) { getEl(id)?.classList.add('open'); }
    function closeModal(id) { getEl(id)?.classList.remove('open'); }
    document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); }));

    // ==================== TOAST ====================
    function showToast(msg, type) {
      const c = getEl('toastContainer');
      if (!c) return alert(msg);
      const t = document.createElement('div');
      t.className = 'toast ' + (type || '');
      t.innerHTML = '<div>' + escapeHTML(msg) + '</div>';
      c.appendChild(t);
      setTimeout(() => t.classList.add('show'), 10);
      setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
    }
