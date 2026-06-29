async function apiRequest(path, options = {}) {
  const response = await fetch(window.API_BASE + path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Lỗi API ${response.status}`;
    throw new Error(message);
  }

  return data;
}

const API = {
  get(path) {
    return apiRequest(path);
  },
  post(path, body) {
    return apiRequest(path, { method: "POST", body: JSON.stringify(body || {}) });
  },
  put(path, body) {
    return apiRequest(path, { method: "PUT", body: JSON.stringify(body || {}) });
  },
  delete(path) {
    return apiRequest(path, { method: "DELETE" });
  }
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[ch]));
}

function getSessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function logout() {
  sessionStorage.removeItem("user");
  window.location.href = "index.html";
}
