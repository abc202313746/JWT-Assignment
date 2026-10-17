import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, login, getSession, clearSession, canEdit } from "./api";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./style.css";

// ---------- 화면 표시 전용 도우미 (View Helper) ----------
// 저장되는 title·content, API 요청, 상태 관리 로직은 바꾸지 않고 보여주는 방식만 정한다.
const TEMPLATE =
  "[발생 환경]\n- OS/런타임:\n\n[증상 및 에러 로그]\n-\n\n[원인 분석]\n-\n\n[해결 방법]\n-";
const LABELS = "발생 환경|증상 및 에러 로그|장애 증상|원인 분석|해결 방법|해결 후 확인";
// "[발생 환경]" 형식과 이전 "발생 환경:" 형식을 모두 구역 제목으로 읽는다.
const SECTION_LINE = new RegExp(
  `^\\s*(?:\\[(${LABELS})\\]|(${LABELS})\\s*[:：])\\s?(.*)$`,
);
const isFence = (line) => line.trim().startsWith("```");
function parseContent(text) {
  const sections = [];
  let current = { label: null, lines: [] },
    inFence = false;
  for (const line of text.split("\n")) {
    const match = !inFence && line.match(SECTION_LINE);
    if (isFence(line)) inFence = !inFence;
    if (match) {
      if (current.label || current.lines.some((l) => l.trim()))
        sections.push(current);
      current = { label: match[1] || match[2], lines: match[3] ? [match[3]] : [] };
    } else current.lines.push(line);
  }
  sections.push(current);
  return {
    hasSections: sections.some((s) => s.label),
    hasCode: text.split("\n").some(isFence),
    sections: sections.map((s) => ({
      label: s.label,
      body: s.lines.join("\n").replace(/^\s*\n|\s+$/g, ""),
    })),
  };
}
function textBlocks(text) {
  const lines = text.split("\n"),
    blocks = [];
  let prose = [];
  for (let i = 0; i < lines.length; i++) {
    const end = isFence(lines[i])
      ? lines.findIndex((l, j) => j > i && l.trim() === "```")
      : -1;
    if (end === -1) {
      prose.push(lines[i]);
      continue;
    }
    if (prose.join("").trim()) blocks.push({ code: false, text: prose.join("\n") });
    blocks.push({ code: true, text: lines.slice(i + 1, end).join("\n") });
    prose = [];
    i = end;
  }
  if (prose.join("").trim()) blocks.push({ code: false, text: prose.join("\n") });
  return blocks;
}
function RichText({ text }) {
  return textBlocks(text).map((b, i) =>
    b.code ? (
      <pre key={i} className="code">
        <code>{b.text}</code>
      </pre>
    ) : (
      <p key={i} className="prose">
        {b.text.replace(/^\n+|\n+$/g, "")}
      </p>
    ),
  );
}
const bareLabel = (line) => {
  const match = line.match(SECTION_LINE);
  return Boolean(match) && !match[3].trim();
};
// 본문 첫 줄 미리보기: 빈 구역 제목·코드 울타리·"-" 자리표시는 건너뛴다.
const firstLine = (text) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && l !== "-" && !isFence(l) && !bareLabel(l)) || "";
const formatIncidentId = (id) => `INC-${String(id).padStart(3, "0")}`;
// 제목에 작성자가 직접 적은 표기로만 배지를 고른다. DB의 title은 그대로다.
function incidentStatus(title) {
  if (/\[(해결|완료)\]|\bresolved\b/i.test(title))
    return { key: "resolved", label: "Resolved" };
  if (/\[(장애|긴급)\]|\b(error|critical)\b/i.test(title))
    return { key: "critical", label: "Critical" };
  return { key: "log", label: "Log" };
}
// 표시 형식만 바꾼다: 로컬 시각을 2026-10-15 20:02 형태로 보여준다.
const pad = (n) => String(n).padStart(2, "0");
function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const length = (value) => [...value].length;

function App() {
  const [posts, setPosts] = useState([]),
    [selected, setSelected] = useState(null);
  const [title, setTitle] = useState(""),
    [content, setContent] = useState(""),
    [editing, setEditing] = useState(null);
  const [email, setEmail] = useState("alice@class.test"),
    [password, setPassword] = useState("Classroom!2026");
  const [user, setUser] = useState(null),
    [profile, setProfile] = useState(null),
    [busy, setBusy] = useState(false);
  const [notification, setNotification] = useState({
    tone: "info",
    code: "INFO",
    message: "게시판을 불러오는 중입니다.",
  });
  const [query, setQuery] = useState(""),
    [loaded, setLoaded] = useState(false);
  const { message, tone, code } = notification;
  const refresh = async () => setPosts(await api.list());
  async function run(action, success) {
    setBusy(true);
    try {
      await action();
      setNotification({ tone: "ok", code: "OK", message: success });
    } catch (e) {
      setNotification({
        tone: e.status && e.status < 500 ? "warn" : "error",
        code: [e.status, e.code].filter(Boolean).join(" ") || "ERROR",
        message: e.message,
      });
      if (e.status === 404) {
        setSelected(null);
        reset();
        await refresh().catch(() => {});
      }
    } finally {
      const currentUser = getSession().user;
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setEditing(null);
      }
      setBusy(false);
    }
  }
  useEffect(() => {
    run(refresh, "게시판이 준비되었습니다.").finally(() => setLoaded(true));
  }, []);
  function reset() {
    setTitle("");
    setContent("");
    setEditing(null);
  }
  async function save(e) {
    e.preventDefault();
    if (!getSession().user) {
      setNotification({
        tone: "warn",
        code: "AUTH",
        message: "로그인한 후 장애 기록을 작성하세요.",
      });
      return;
    }
    await run(async () => {
      const p = editing
        ? await api.update(editing, { title, content })
        : await api.create({ title, content });
      setSelected(p);
      reset();
      await refresh();
    }, "게시글을 저장했습니다.");
  }
  async function copySolution(text) {
    try {
      await navigator.clipboard.writeText(text);
      setNotification({
        tone: "ok",
        code: "OK",
        message: "해결 방법을 복사했습니다.",
      });
    } catch {
      setNotification({
        tone: "warn",
        code: "ERROR",
        message: "복사하지 못했습니다. 내용을 직접 선택해 복사하세요.",
      });
    }
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? posts.filter((p) =>
        [p.title, p.content, p.authorName].some((v) =>
          String(v).toLowerCase().includes(q),
        ),
      )
    : posts;
  const doc = selected && parseContent(selected.content);
  const status = selected && incidentStatus(selected.title);

  return (
    <div className="app">
      {/* ---------- Global top utility bar (48px) ---------- */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="sys-dot" aria-hidden="true" />
          <h1 className="app-title">Incident &amp; Troubleshooting Log</h1>
          <span className="sys-badge mono">v1.0.0 · SQLite</span>
        </div>
        <div className="topbar-right">
          {user ? (
            <div className="who">
              <p className="account-state is-on">{`${user.name}님 로그인 중`}</p>
              <span className="who-email mono">{user.email}</span>
            </div>
          ) : (
            <form
              className="auth-bar"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  await login(email, password);
                  setProfile(null);
                  reset();
                }, "로그인했습니다.");
              }}
            >
              <p className="account-state">로그아웃 상태</p>
              <label className="sr-only" htmlFor="login-email">
                이메일
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label className="sr-only" htmlFor="login-password">
                비밀번호
              </label>
              <input
                id="login-password"
                type="password"
                placeholder="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button className="primary" disabled={busy}>
                로그인
              </button>
            </form>
          )}
          <button
            className="ghost"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const me = await api.me();
                setProfile(me);
              }, "내 정보 조회를 완료했습니다.")
            }
          >
            내 정보 조회
          </button>
          {user && (
            <>
              <button
                type="button"
                className="ghost"
                disabled={!user || busy}
                onClick={() => {
                  clearSession();
                  setUser(null);
                  setProfile(null);
                  reset();
                  setNotification({
                    tone: "info",
                    code: "INFO",
                    message: "이 탭의 로그인 상태를 해제했습니다.",
                  });
                }}
              >
                로그아웃
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  // 화면 전환만: 수정 중이면 기존 reset()으로 작성 모드로 돌리고 제목 칸에 포커스
                  if (editing) reset();
                  setTimeout(() => document.getElementById("post-title")?.focus(), 0);
                }}
              >
                + New Incident
              </button>
            </>
          )}
        </div>
        <div className={`progress${busy ? " is-active" : ""}`} aria-hidden="true" />
      </header>

      {/* ---------- System alert / status line (36px) ---------- */}
      <div role="status" className={`message tone-${tone}`}>
        <span className="message-code mono">[{code}]</span>
        <span className="message-text">{message}</span>
      </div>
      {profile && (
        <dl className="account-info mono">
          <dt>GET /api/me</dt>
          <dd>
            <span>사용자 ID {profile.id}</span>
            <span>이름 {profile.name}</span>
            <span>이메일 {profile.email}</span>
          </dd>
        </dl>
      )}

      {/* ---------- 2-pane master–detail workspace ---------- */}
      <main className="workspace">
        <section className="list-pane" aria-labelledby="list-heading">
          <div className="list-head">
            <h2 id="list-heading">
              Total <span className="mono">{posts.length}</span> incidents
            </h2>
            <span className="list-hint">
              {q ? `${visible.length}건 일치` : "최신순"}
            </span>
          </div>
          <div className="list-search">
            <input
              type="search"
              aria-label="기록 검색"
              placeholder="제목, 내용, 작성자로 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <p className="list-note">
            읽기 누구나 · 작성 로그인 사용자 · 수정·삭제 작성자 본인
          </p>
          {!loaded ? (
            <ul className="skeleton" aria-hidden="true">
              <li />
              <li />
              <li />
            </ul>
          ) : posts.length === 0 ? (
            <div className="list-empty">
              <p className="empty-title">첫 번째 기록을 남겨 보세요.</p>
              <p className="empty-text">로그인한 뒤 + New Incident로 장애 기록을 등록합니다.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="list-empty">
              <p className="empty-title">‘{query.trim()}’와 일치하는 기록이 없습니다.</p>
              <p className="empty-text">다른 오류 메시지나 키워드로 다시 검색해 보세요.</p>
            </div>
          ) : (
            <ol className="post-list">
              {visible.map((p) => {
                const st = incidentStatus(p.title);
                const preview = firstLine(p.content);
                return (
                  <li
                    className={`post${selected?.id === p.id ? " is-selected" : ""}`}
                    key={p.id}
                  >
                    <div className="post-line1">
                      <span className="post-id mono">#{formatIncidentId(p.id)}</span>
                      <span className={`status-dot is-${st.key}`} aria-hidden="true" />
                      <button
                        className="post-title"
                        disabled={busy}
                        onClick={() =>
                          run(
                            async () => setSelected(await api.detail(p.id)),
                            "게시글을 불러왔습니다.",
                          )
                        }
                      >
                        {p.title}
                      </button>
                      <span className={`badge is-${st.key}`}>{st.label}</span>
                    </div>
                    {preview && <p className="post-preview">{preview}</p>}
                    <p className="post-meta">
                      <span className="post-author">{p.authorName}</span>
                      <time className="mono" dateTime={p.createdAt}>
                        {formatDate(p.createdAt)}
                      </time>
                      {p.updatedAt !== p.createdAt && <span className="mono">수정됨</span>}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="detail-pane" aria-labelledby="detail-heading">
          <h2 id="detail-heading" className="sr-only">
            게시글 상세
          </h2>
          <div className="detail-wrap">
            {selected ? (
              <article className="detail">
                <div className="detail-meta">
                  <span className="id-badge mono">#{formatIncidentId(selected.id)}</span>
                  <span className="detail-author">{selected.authorName}</span>
                  <time className="mono" dateTime={selected.createdAt}>
                    {formatDate(selected.createdAt)}
                  </time>
                  {selected.updatedAt !== selected.createdAt && (
                    <span className="mono">수정 {formatDate(selected.updatedAt)}</span>
                  )}
                  {canEdit(selected) && (
                    <div className="actions">
                      <button
                        className="secondary small"
                        disabled={busy}
                        onClick={() => {
                          setEditing(selected.id);
                          setTitle(selected.title);
                          setContent(selected.content);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="danger small"
                        disabled={busy}
                        onClick={() => {
                          if (confirm("게시글을 삭제할까요?"))
                            run(async () => {
                              await api.remove(selected.id);
                              setSelected(null);
                              reset();
                              await refresh();
                            }, "게시글을 삭제했습니다.");
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <div className="detail-title">
                  <h3>{selected.title}</h3>
                  <span className={`badge is-${status.key}`}>{status.label}</span>
                </div>
                {doc.hasSections ? (
                  <div className="doc">
                    {doc.sections.map((s, i) =>
                      s.label ? (
                        <details
                          key={`${selected.id}-${i}`}
                          className={`doc-section${s.label === "해결 방법" ? " is-solution" : ""}`}
                          open
                        >
                          <summary>
                            <span>[{s.label}]</span>
                          </summary>
                          {s.label === "해결 방법" && s.body && (
                            <button
                              type="button"
                              className="ghost small copy"
                              onClick={() => copySolution(s.body)}
                            >
                              해결 방법 복사
                            </button>
                          )}
                          <div className="section-body">
                            {s.body ? (
                              <RichText text={s.body} />
                            ) : (
                              <p className="prose is-empty">작성하지 않음</p>
                            )}
                          </div>
                        </details>
                      ) : (
                        <div key={`${selected.id}-${i}`} className="doc-section">
                          <RichText text={s.body} />
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="doc content">
                    {doc.hasCode ? <RichText text={selected.content} /> : selected.content}
                  </div>
                )}
              </article>
            ) : (
              <div className="detail-empty">
                <p className="empty-title">선택된 장애 기록이 없습니다</p>
                <p className="empty-text">목록에서 제목을 선택하세요.</p>
                <p className="banner">
                  누구나 기록을 읽을 수 있습니다. 로그인하면 기록을 작성하고, 본인의 기록을
                  수정하거나 삭제할 수 있습니다.
                </p>
                <p className="guide-title">IT 시스템 장애·트러블슈팅 기록 게시판 · 리포트 형식</p>
                <dl className="format-guide">
                  <div>
                    <dt>[발생 환경]</dt>
                    <dd>OS, 런타임, 프레임워크 버전, 배포 단계</dd>
                  </div>
                  <div>
                    <dt>[증상 및 에러 로그]</dt>
                    <dd>에러 메시지, 로그, 재현 조건</dd>
                  </div>
                  <div>
                    <dt>[원인 분석]</dt>
                    <dd>확인한 근거와 원인</dd>
                  </div>
                  <div>
                    <dt>[해결 방법]</dt>
                    <dd>조치 명령, 설정 변경 (상세 화면에서 강조 표시)</dd>
                  </div>
                </dl>
              </div>
            )}

            {/* ---------- Incident report editor (기존 작성·수정 폼) ---------- */}
            <section
              id="incident-editor"
              className={`editor${editing ? " is-editing" : ""}`}
              aria-labelledby="composer-heading"
            >
              <div className="editor-head">
                <h2 id="composer-heading">Incident Report Editor</h2>
                <span className="editor-mode mono">
                  {editing ? `#${formatIncidentId(editing)} 수정 중` : "새 글 작성"}
                </span>
              </div>
              <div className="editor-body">
                {!user && (
                  <p className="notice">장애 리포트를 작성하려면 상단에서 로그인하세요</p>
                )}
                <form onSubmit={save}>
                  <fieldset disabled={!user || busy}>
                    <div className="field">
                      <div className="field-head">
                        <label htmlFor="post-title">제목</label>
                        <span className="counter mono">{length(title)}/100</span>
                      </div>
                      <input
                        id="post-title"
                        maxLength={100}
                        placeholder="예: [해결] Spring Boot 시작 시 8000 포트 충돌"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field">
                      <div className="field-head">
                        <label htmlFor="post-content">내용</label>
                        <span className="counter mono">{length(content)}/5000</span>
                      </div>
                      <textarea
                        id="post-content"
                        maxLength={5000}
                        placeholder={TEMPLATE}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field-tools">
                      <button
                        type="button"
                        className="ghost small"
                        disabled={Boolean(content.trim())}
                        onClick={() => setContent(TEMPLATE)}
                      >
                        양식 넣기
                      </button>
                      <details className="disclosure">
                        <summary>작성 형식 안내</summary>
                        <p className="hint">
                          [발생 환경], [해결 방법]처럼 대괄호 제목으로 시작하면 상세 화면에서
                          구역별로 표시됩니다. 제목에 [해결]·[장애]를 붙이면 상태 배지가
                          달라집니다. 로그·명령어는 ``` 줄로 감싸세요.
                        </p>
                      </details>
                    </div>
                    <div className="actions">
                      <button className="primary" disabled={busy}>
                        {editing ? "수정 저장" : "등록"}
                      </button>
                      <button type="button" className="secondary" onClick={reset}>
                        입력 초기화
                      </button>
                    </div>
                  </fieldset>
                </form>
                <div className="editor-foot">
                  <p className="hint">
                    새로고침하면 로그인 상태가 해제됩니다. 저장한 기록은 유지됩니다.
                  </p>
                  <details className="disclosure">
                    <summary>테스트 계정 보기</summary>
                    <p className="test-accounts mono">
                      테스트 계정: alice@class.test / bob@class.test
                      <br />
                      공통 비밀번호: Classroom!2026
                    </p>
                  </details>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
