let selectedRole = "patient";

function selectRole(role, element) {
  selectedRole = role;
  document.querySelectorAll(".role-card").forEach(card => card.classList.remove("selected"));
  element.classList.add("selected");
}

async function loginUser() {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const btnLogin = document.getElementById("btnLogin");

  const username = usernameInput?.value.trim();
  const password = passwordInput?.value.trim();

  if (!username || !password) {
    showToast("Vui lòng nhập tài khoản và mật khẩu!", "error");
    return;
  }

  try {
    btnLogin.disabled = true;
    btnLogin.textContent = "Đang đăng nhập...";

    const data = await API.post("/api/auth/login", { username, password, role: selectedRole });
    sessionStorage.setItem("user", JSON.stringify(data.user));

    const role = data.user?.role || selectedRole;
    if (role === "patient") window.location.href = "patient.html";
    else if (role === "doctor") window.location.href = "doctor.html";
    else if (role === "receptionist") window.location.href = "receptionist.html";
    else showToast("Tài khoản chưa có quyền truy cập phù hợp!", "error");
  } catch (err) {
    console.error(err);
    showToast(err.message || "Không kết nối được backend!", "error");
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = "Đăng nhập";
  }
}

function showToast(msg, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

document.addEventListener("keydown", event => {
  if (event.key === "Enter") loginUser();
});
