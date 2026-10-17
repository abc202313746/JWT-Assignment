let session = { accessToken: "", user: null };
export const getSession = () => session;
export function clearSession() {
  session = { accessToken: "", user: null };
}
function authorizationHeaders() {
  return session.accessToken
    ? { Authorization: `Bearer ${session.accessToken}` }
    : {};
}
export async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authorizationHeaders(),
      ...options.headers,
    },
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    if (response.status === 401) clearSession();
    const messages = {
      INVALID_CREDENTIALS: "이메일 또는 비밀번호를 확인하세요.",
      TOKEN_REQUIRED: "로그인이 필요합니다. 로그인 후 다시 시도하세요.",
      INVALID_TOKEN: "로그인 정보가 유효하지 않습니다. 다시 로그인하세요.",
      TOKEN_EXPIRED: "로그인 시간이 만료되었습니다. 다시 로그인하세요.",
      FORBIDDEN: "본인이 작성한 기록만 수정하거나 삭제할 수 있습니다.",
      NOT_FOUND: "해당 기록을 찾을 수 없습니다. 목록을 다시 확인하세요.",
    };
    const error = new Error(messages[data.code] || data.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
}
export async function login(email, password) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  session = { accessToken: data.accessToken, user: data.user };
  return data.user;
}
export function canEdit(post) {
  return Boolean(session.user && post && session.user.id === post.authorId);
}
export const api = {
  list: () => request("/posts"),
  detail: (id) => request(`/posts/${id}`),
  create: (input) =>
    request("/posts", { method: "POST", body: JSON.stringify(input) }),
  update: (id, input) =>
    request(`/posts/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (id) => request(`/posts/${id}`, { method: "DELETE" }),
  me: () => request("/me"),
};
