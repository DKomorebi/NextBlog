"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
  type FormEvent,
} from "react";
import Link from "next/link";
import { HomeHero } from "./home-hero";
import { ThemeToggle } from "./theme-toggle";
import {
  BookOpen,
  Archive,
  UserRound,
  Settings2,
  LogOut,
  Search,
  Folder,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  MessageCircle,
  Send,
  Save,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
type User = {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
};
type Session = { user: User | null; csrf: string };
type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  createdAt: string;
  version: number;
};
type Comment = {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
};
async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  csrf?: string,
): Promise<T> {
  const r = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (r.status === 204) return undefined as T;
  const data = await r.json().catch(() => ({ message: "服务响应异常" }));
  if (!r.ok)
    throw new Error(data.details?.join("；") || data.message || "请求失败");
  return data;
}
const Context = createContext<{
  session: Session;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  setSession: (s: Session) => void;
}>({
  session: { user: null, csrf: "" },
  loading: true,
  error: "",
  refresh: async () => {},
  setSession: () => {},
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, csrf: "" }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  async function refresh() {
    try {
      setSession(await api<Session>("/auth/session"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <Context.Provider value={{ session, loading, error, refresh, setSession }}>
      {children}
    </Context.Provider>
  );
}
const date = (s: string) =>
  new Date(s).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p className="alert alert-error" role="alert">
      {message}
    </p>
  ) : null;
}
export function Header() {
  const { session, loading, refresh } = useContext(Context);
  const [error, setError] = useState("");
  async function logout() {
    try {
      await api("/auth/logout", "POST", undefined, session.csrf);
      await refresh();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <header className="site-header">
      <div className="navbar header-inner">
        <Link className="brand" href="/">
          拾页
        </Link>
        <nav aria-label="主导航">
          <Link href="/" className="nav-item">
            <BookOpen size={16} aria-hidden="true" />
            文章
          </Link>
          <Link href="/archive" className="nav-item">
            <Archive size={16} aria-hidden="true" />
            归档
          </Link>
          <Link href="/about" className="nav-item">
            <UserRound size={16} aria-hidden="true" />
            关于
          </Link>
          {session.user?.role === "admin" && (
            <Link href="/admin" className="nav-item">
              <Settings2 size={16} aria-hidden="true" />
              管理
            </Link>
          )}
          {loading ? (
            <span>加载中</span>
          ) : session.user ? (
            <>
              <span className="username">{session.user.username}</span>
              <button className="btn btn-ghost btn-sm" onClick={logout}>
                <LogOut size={16} aria-hidden="true" />
                退出
              </button>
            </>
          ) : (
            <Link className="btn btn-ghost btn-sm nav-login" href="/login">
              <UserRound size={16} aria-hidden="true" />
              登录 / 注册
            </Link>
          )}
          <ThemeToggle />
        </nav>
      </div>
      <ErrorMessage message={error} />
    </header>
  );
}
export function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        skipHtml
        components={{
          a: ({ children, href }) => (
            <a href={href} rel="nofollow noopener noreferrer">
              {children}
            </a>
          ),
          img: ({ src, alt }) =>
            typeof src === "string" && /^(https?:\/\/|\/(?!\/))/.test(src) ? (
              <img
                src={src}
                alt={alt || ""}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>[图片地址不支持]</span>
            ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
export function ArticleList({
  archive = false,
  manage = false,
}: {
  archive?: boolean;
  manage?: boolean;
}) {
  const { session, loading } = useContext(Context);
  const [items, setItems] = useState<Article[]>([]),
    [q, setQ] = useState(""),
    [category, setCategory] = useState(""),
    [categories, setCategories] = useState<{ name: string }[]>([]),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      setBusy(true);
      api<{ items: Article[]; total: number }>(
        `/articles?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&page=${page}`,
      )
        .then((r) => {
          if (alive) {
            setItems(r.items);
            setTotal(r.total);
            setError("");
          }
        })
        .catch((e) => {
          if (alive) setError(e.message);
        })
        .finally(() => {
          if (alive) setBusy(false);
        });
    }, 200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q, category, page, revision]);
  useEffect(() => {
    api<{ name: string }[]>("/categories")
      .then(setCategories)
      .catch(() => {});
  }, [revision]);
  async function remove(a: Article) {
    if (!confirm(`确定删除「${a.title}」及其评论？`)) return;
    try {
      await api("/articles/" + a.id, "DELETE", undefined, session.csrf);
      setPage(1);
      setRevision((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (manage && loading) return <p>正在验证身份…</p>;
  if (manage && session.user?.role !== "admin")
    return (
      <section className="card panel">
        <h1>仅管理员可管理文章</h1>
        <Link href="/login">登录账号</Link>
      </section>
    );
  return (
    <>
      {!manage && !archive ? (
        <HomeHero />
      ) : (
        <section className="intro">
          <h1>{manage ? "文章管理" : "文章归档"}</h1>
          {manage && (
            <Link className="btn btn-primary" href="/admin/new">
              <Plus size={17} aria-hidden="true" />
              写一篇文章
            </Link>
          )}
        </section>
      )}
      <div id="articles" className="section-heading">
        <h2>{manage ? "所有文章" : archive ? "全部文章" : "最新文章"}</h2>
      </div>
      <div className="list-toolbar">
        <label className="search">
          <Search className="search-icon" size={18} aria-hidden="true" />
          <span className="sr-only">搜索文章</span>
          <input
            className="input"
            placeholder="搜索文章或正文…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          <span className="sr-only">分类</span>
          <select
            className="select"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部分类</option>
            {categories.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>
      <ErrorMessage message={error} />
      {error && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setRevision((n) => n + 1)}
        >
          重新加载
        </button>
      )}
      <p className="sr-only" aria-live="polite">
        {busy ? "正在翻开书页…" : `${total} 篇文章`}
      </p>
      {!busy && !error && !items.length && (
        <div className="empty">
          <h2>这里还没有文章</h2>
          <p>试试其他关键词，或等待下一次更新。</p>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setQ("");
              setCategory("");
              setPage(1);
            }}
          >
            清空筛选
          </button>
        </div>
      )}
      <div className={archive ? "archive-list" : "article-list"}>
        {!error &&
          items.map((a) => (
            <article className="card article-card" key={a.id}>
              <div className="meta">
                <span className="badge badge-soft badge-primary">
                  <Folder size={13} aria-hidden="true" />
                  {a.category}
                </span>
                <time>
                  <CalendarDays size={13} aria-hidden="true" />
                  {date(a.createdAt)}
                </time>
              </div>
              <h2>
                <Link href={"/posts/" + a.slug}>{a.title}</Link>
              </h2>
              {!archive && <p>{a.excerpt}</p>}
              {manage && (
                <div className="card-foot">
                  {manage && (
                    <div className="actions">
                      <Link
                        href={`/admin/${a.id}?slug=${encodeURIComponent(a.slug)}`}
                      >
                        <Pencil size={15} aria-hidden="true" />
                        编辑
                      </Link>
                      <button
                        className="btn btn-ghost btn-sm text-error"
                        onClick={() => remove(a)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        删除
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
      </div>
      {total > 10 && (
        <div className="pagination">
          <button
            className="btn btn-ghost btn-sm"
            disabled={busy || page === 1}
            onClick={() => setPage((n) => n - 1)}
          >
            上一页
          </button>
          <span>
            第 {page} / {Math.max(1, Math.ceil(total / 10))} 页
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={busy || page * 10 >= total}
            onClick={() => setPage((n) => n + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </>
  );
}
export function AuthForm({ register = false }: { register?: boolean }) {
  const {
    session,
    setSession,
    loading,
    error: connection,
    refresh,
  } = useContext(Context);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      setSession(
        await api<Session>(
          "/auth/" + (register ? "register" : "login"),
          "POST",
          {
            email: f.get("email"),
            password: f.get("password"),
            ...(register ? { username: f.get("username") } : {}),
          },
          session.csrf,
        ),
      );
      router.push("/");
    } catch (e) {
      setError((e as Error).message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card panel auth">
      <h1>{register ? "初次见面，欢迎你" : "欢迎回来"}</h1>
      <ErrorMessage message={error || connection} />
      {connection && (
        <button className="btn btn-ghost btn-sm" onClick={refresh}>
          重新连接
        </button>
      )}
      {session.user ? (
        <p>
          你已登录为 {session.user.username}。<Link href="/">返回首页</Link>
        </p>
      ) : (
        <form onSubmit={submit}>
          {register && (
            <label>
              昵称
              <input
                className="input"
                name="username"
                minLength={2}
                maxLength={40}
                autoComplete="nickname"
                required
              />
            </label>
          )}
          <label>
            邮箱
            <input
              className="input"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={255}
              required
            />
          </label>
          <label>
            密码
            <input
              className="input"
              name="password"
              type="password"
              minLength={10}
              maxLength={72}
              autoComplete={register ? "new-password" : "current-password"}
              required
            />
          </label>
          <p className="muted">至少 10 个字符，最多 72 字节。</p>
          <button
            className="btn btn-primary"
            disabled={busy || loading || !session.csrf}
          >
            {busy ? "请稍候…" : register ? "注册并登录" : "登录"}
          </button>
          <p>
            {register ? "已有账号？" : "还没有账号？"}{" "}
            <Link href={register ? "/login" : "/register"}>
              {register ? "去登录" : "创建账号"}
            </Link>
          </p>
        </form>
      )}
    </section>
  );
}
export function ArticleReader({ slug }: { slug: string }) {
  const [article, setArticle] = useState<Article | null>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    setArticle(null);
    api<Article>("/articles/" + encodeURIComponent(slug))
      .then((a) => {
        if (alive) {
          setArticle(a);
          setError("");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [slug, revision]);
  return (
    <div className="reading">
      <Link href="/">返回文章列表</Link>
      <ErrorMessage message={error} />
      {error && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setRevision((n) => n + 1)}
        >
          重试
        </button>
      )}
      {!article && !error && <p>正在打开文章…</p>}
      {article && (
        <>
          <article>
            <header className="article-head">
              <div className="meta">
                <span>{article.category}</span>
                <time>{date(article.createdAt)}</time>
              </div>
              <h1>{article.title}</h1>
              <p>{article.excerpt}</p>
            </header>
            <Markdown content={article.content} />
          </article>
          <Comments articleId={article.id} />
        </>
      )}
    </div>
  );
}
function Comments({ articleId }: { articleId: string }) {
  const { session } = useContext(Context);
  const [items, setItems] = useState<Comment[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [content, setContent] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    api<{ items: Comment[]; total: number }>(
      `/articles/${articleId}/comments?page=${page}`,
    )
      .then((r) => {
        if (alive) {
          setItems(r.items);
          setTotal(r.total);
          setError("");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [articleId, page, revision]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(
        `/articles/${articleId}/comments`,
        "POST",
        { content },
        session.csrf,
      );
      setContent("");
      setPage(1);
      setRevision((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!confirm("确定删除这条评论？")) return;
    try {
      await api("/comments/" + id, "DELETE", undefined, session.csrf);
      setPage(1);
      setRevision((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="comments">
      <h2>
        <MessageCircle size={21} aria-hidden="true" />
        页边留言 <span className="muted">{total}</span>
      </h2>
      <ErrorMessage message={error} />
      {session.user ? (
        <form onSubmit={submit}>
          <label htmlFor="comment">以 {session.user.username} 的身份留言</label>
          <textarea
            className="textarea"
            id="comment"
            required
            maxLength={2000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的想法…"
          />
          <button
            className="btn btn-primary"
            disabled={busy || !content.trim()}
          >
            <Send size={16} aria-hidden="true" />
            {busy ? "正在发表…" : "发表留言"}
          </button>
        </form>
      ) : (
        <p className="alert">
          <Link href="/login">登录</Link> 后参与讨论，也可以{" "}
          <Link href="/register">注册账号</Link>。
        </p>
      )}
      {items.map((c) => (
        <article key={c.id} className="comment">
          <div className="meta">
            <strong>{c.username}</strong>
            <time>{date(c.createdAt)}</time>
            {(session.user?.id === c.userId ||
              session.user?.role === "admin") && (
              <button
                className="btn btn-ghost btn-sm text-error"
                onClick={() => remove(c.id)}
              >
                <Trash2 size={15} aria-hidden="true" />
                删除
              </button>
            )}
          </div>
          <p className="whitespace-pre-wrap">{c.content}</p>
        </article>
      ))}
      {!items.length && !error && (
        <p className="muted">还没有留言，来写下第一句吧。</p>
      )}
      {total > 30 && (
        <div className="pagination">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page === 1}
            onClick={() => setPage((n) => n - 1)}
          >
            上一页
          </button>
          <span>
            {page} / {Math.max(1, Math.ceil(total / 30))}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page * 30 >= total}
            onClick={() => setPage((n) => n + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </section>
  );
}
const blank = {
  title: "",
  slug: "",
  excerpt: "",
  category: "随笔",
  content: "",
};
export function Editor({ id }: { id?: string }) {
  const { session, loading } = useContext(Context);
  const slug = useSearchParams().get("slug");
  const router = useRouter();
  const [form, setForm] = useState(blank),
    [version, setVersion] = useState(1),
    [ready, setReady] = useState(!id),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const dirty = useRef(false);
  useEffect(() => {
    let alive = true;
    if (!id) return;
    if (!slug) {
      setError("请从管理列表进入编辑");
      return;
    }
    api<Article>("/articles/" + encodeURIComponent(slug))
      .then((a) => {
        if (a.id !== id) throw new Error("文章地址不匹配");
        if (alive) {
          setForm({
            title: a.title,
            slug: a.slug,
            excerpt: a.excerpt,
            category: a.category,
            content: a.content,
          });
          setVersion(a.version);
          setReady(true);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [id, slug]);
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, []);
  function change(key: keyof typeof blank, value: string) {
    dirty.current = true;
    setForm((f) => ({ ...f, [key]: value }));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const a = await api<Article>(
        id ? "/articles/" + id : "/articles",
        id ? "PUT" : "POST",
        { ...form, ...(id ? { version } : {}) },
        session.csrf,
      );
      dirty.current = false;
      router.push("/posts/" + a.slug);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p>正在验证身份…</p>;
  if (session.user?.role !== "admin")
    return (
      <section className="card panel">
        <h1>仅管理员可编辑文章</h1>
        <Link href="/login">登录账号</Link>
      </section>
    );
  return (
    <>
      <Link href="/admin">返回管理列表</Link>
      <h1 className="page-title">{id ? "编辑文章" : "写一篇文章"}</h1>
      <ErrorMessage message={error} />
      {ready && (
        <form className="editor" onSubmit={save}>
          <div className="editor-fields">
            <label>
              文章标题
              <input
                className="input"
                value={form.title}
                required
                maxLength={160}
                onChange={(e) => change("title", e.target.value)}
              />
            </label>
            <label>
              地址标识（小写英文、数字、连字符）
              <input
                className="input"
                value={form.slug}
                required
                maxLength={120}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                onChange={(e) => change("slug", e.target.value)}
              />
            </label>
            <label>
              分类
              <input
                className="input"
                value={form.category}
                required
                maxLength={40}
                onChange={(e) => change("category", e.target.value)}
              />
            </label>
            <label>
              摘要
              <textarea
                className="textarea"
                value={form.excerpt}
                maxLength={500}
                onChange={(e) => change("excerpt", e.target.value)}
              />
            </label>
          </div>
          <label className="file-import">
            导入 Markdown 文件
            <input
              className="file-input"
              type="file"
              accept=".md,.markdown,text/markdown,text/plain"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 200000) {
                  setError("文件不能超过 200KB");
                  return;
                }
                change("content", await file.text());
                e.target.value = "";
              }}
            />
          </label>
          <div className="editor-columns">
            <label>
              Markdown 正文
              <textarea
                className="textarea code-editor"
                value={form.content}
                required
                maxLength={200000}
                onChange={(e) => change("content", e.target.value)}
                placeholder={"## 从这里开始\n\n记录值得分享的想法。"}
              />
            </label>
            <section className="preview">
              <h2>阅读预览</h2>
              <Markdown content={form.content || "正文预览将显示在这里。"} />
            </section>
          </div>
          <button className="btn btn-primary" disabled={busy || !session.csrf}>
            <Save size={16} aria-hidden="true" />
            {busy ? "正在保存…" : id ? "保存修改" : "发布文章"}
          </button>
          <p className="muted">离开前请保存。原始 HTML 不会执行。</p>
        </form>
      )}
    </>
  );
}
