import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import type { DataSource } from "typeorm";
import { createRegistration, RegistrationError } from "./registration";
import type { RegistrationMailer } from "./mail";
import {
  UserEntity,
  ArticleEntity,
  CommentEntity,
  type User,
} from "./entities";
declare module "express-session" {
  interface SessionData {
    userId?: string;
    csrf?: string;
  }
}
declare global {
  namespace Express {
    interface Request {
      account?: User;
    }
  }
}
const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z
    .string()
    .min(10)
    .max(72)
    .refine((s) => Buffer.byteLength(s, "utf8") <= 72, "密码不能超过 72 字节"),
});
const articleInput = z
  .object({
    title: z.string().trim().min(1).max(160),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(120),
    excerpt: z.string().trim().max(500),
    category: z.string().trim().min(1).max(40),
    content: z.string().trim().min(1).max(200000),
  })
  .strict();
const uuid = z.string().uuid();
const publicUser = (u: User) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  role: u.role,
});
export function createApp(
  db: DataSource,
  options: {
    secret: string;
    origin: string;
    production?: boolean;
    pool?: Pool;
    mailer?: RegistrationMailer;
    now?: () => Date;
  },
) {
  if (options.secret.length < 32)
    throw new Error("SESSION_SECRET 至少需要 32 个字符");
  const app = express();
  const registration = createRegistration(db, options.secret, options.mailer, options.now);
  const pool =
    options.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });
  const Store = connectPgSimple(session);
  const store = new Store({
    pool,
    tableName: "sessions",
    createTableIfMissing: false,
  });
  app.disable("x-powered-by");
  // API 只绑定回环地址，由 Next 同源转发；生产仅信任这一级受控代理。
  if (options.production) app.set("trust proxy", 1);
  app.use(helmet());
  app.use(express.json({ limit: "256kb" }));
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(
    session({
      name: "fieldnotes.sid",
      secret: options.secret,
      store,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: !!options.production,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      },
    }),
  );
  app.use("/api", async (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.get("origin") !== options.origin) {
        res.status(403).json({ message: "请求来源不被允许" });
        return;
      }
      const token = req.get("x-csrf-token") ?? "",
        expected = req.session.csrf ?? "";
      if (
        !expected ||
        Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
        !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
      ) {
        res.status(403).json({ message: "页面验证已过期，请刷新后重试" });
        return;
      }
    }
    if (req.session.userId)
      req.account =
        (await db
          .getRepository(UserEntity)
          .findOneBy({ id: req.session.userId })) ?? undefined;
    next();
  });
  const requireUser = (req: Request, res: Response, next: NextFunction) => {
    if (!req.account) {
      res.status(401).json({ message: "请先登录" });
      return;
    }
    next();
  };
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.account) {
      res.status(401).json({ message: "请先登录" });
      return;
    }
    if (req.account.role !== "admin") {
      res.status(403).json({ message: "仅管理员可管理文章" });
      return;
    }
    next();
  };
  const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "尝试过于频繁，请稍后重试" },
  });
  app.get("/api/health", async (_req, res) => {
    await db.query("SELECT 1");
    res.json({ ok: true });
  });
  app.get("/api/auth/session", (req, res) => {
    req.session.csrf ??= randomBytes(32).toString("hex");
    res.json({
      user: req.account ? publicUser(req.account) : null,
      csrf: req.session.csrf,
    });
  });
  async function loginSession(req: Request, user: User) {
    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((e) => (e ? reject(e) : resolve())),
    );
    req.session.userId = user.id;
    req.session.csrf = randomBytes(32).toString("hex");
    await new Promise<void>((resolve, reject) =>
      req.session.save((e) => (e ? reject(e) : resolve())),
    );
  }
  app.post("/api/auth/register/code", rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "验证码发送过于频繁，请稍后重试" },
  }), async (req, res) => {
    const { email } = credentials.pick({ email: true }).strict().parse(req.body);
    await registration.sendCode(email);
    res.json({ message: "若邮箱尚未注册，验证码将发送到该邮箱，5 分钟内有效；已有账号请直接登录。", retryAfter: 60 });
  });
  app.post("/api/auth/register", authLimit, async (req, res) => {
    const input = credentials
      .extend({
        username: z.string().trim().min(2).max(40),
        confirmPassword: z.string().min(10).max(72),
        verificationCode: z.string().regex(/^\d{6}$/, "请输入 6 位邮箱验证码"),
      })
      .strict()
      .refine((v) => v.password === v.confirmPassword, {
        message: "两次输入的密码不一致", path: ["confirmPassword"],
      })
      .parse(req.body);
    const user = await registration.register(input);
    await loginSession(req, user);
    res.status(201).json({ user: publicUser(user), csrf: req.session.csrf });
  });
  app.post("/api/auth/login", authLimit, async (req, res) => {
    const input = credentials.strict().parse(req.body);
    const user = await db
      .getRepository(UserEntity)
      .findOneBy({ email: input.email });
    const valid = await bcrypt.compare(
      input.password,
      user?.passwordHash ??
        "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxlS2MWV.y1WHJt9HmPj7G3ON1e",
    );
    if (!user || !valid) {
      res.status(401).json({ message: "邮箱或密码错误" });
      return;
    }
    await loginSession(req, user);
    res.json({ user: publicUser(user), csrf: req.session.csrf });
  });
  app.post("/api/auth/logout", (req, res, next) => {
    req.session.destroy((e) => {
      if (e) return next(e);
      res.clearCookie("fieldnotes.sid", {
        httpOnly: true,
        sameSite: "lax",
        secure: !!options.production,
        path: "/",
      });
      res.status(204).end();
    });
  });
  app.get("/api/articles", async (req, res) => {
    const input = z
      .object({
        q: z.string().max(100).default(""),
        category: z.string().max(40).default(""),
        page: z.coerce.number().int().min(1).default(1),
      })
      .parse(req.query);
    const qb = db.getRepository(ArticleEntity).createQueryBuilder("a");
    if (input.q)
      qb.andWhere(
        "(a.title ILIKE :q OR a.excerpt ILIKE :q OR a.content ILIKE :q)",
        { q: `%${input.q.replace(/[\\%_]/g, "\\$&")}%` },
      );
    if (input.category)
      qb.andWhere("a.category = :category", { category: input.category });
    qb.select([
      "a.id",
      "a.slug",
      "a.title",
      "a.excerpt",
      "a.category",
      "a.createdAt",
      "a.updatedAt",
      "a.version",
    ]);
    const [items, total] = await qb
      .orderBy("a.createdAt", "DESC")
      .addOrderBy("a.id", "ASC")
      .skip((input.page - 1) * 10)
      .take(10)
      .getManyAndCount();
    res.json({ items, total, page: input.page, pageSize: 10 });
  });
  app.get("/api/categories", async (_req, res) => {
    res.json(
      await db
        .getRepository(ArticleEntity)
        .createQueryBuilder("a")
        .select("a.category", "name")
        .addSelect("COUNT(*)::int", "count")
        .groupBy("a.category")
        .orderBy("a.category")
        .getRawMany(),
    );
  });
  app.get("/api/articles/:slug", async (req, res) => {
    const article = await db
      .getRepository(ArticleEntity)
      .findOneBy({ slug: String(req.params.slug) });
    if (!article) {
      res.status(404).json({ message: "文章不存在" });
      return;
    }
    res.json(article);
  });
  app.post("/api/articles", requireAdmin, async (req, res) => {
    const input = articleInput.parse(req.body);
    res.status(201).json(await db.getRepository(ArticleEntity).save(input));
  });
  app.put("/api/articles/:id", requireAdmin, async (req, res) => {
    const id = uuid.parse(req.params.id);
    const { version, ...input } = articleInput
      .extend({ version: z.number().int().positive() })
      .parse(req.body);
    const result = await db
      .getRepository(ArticleEntity)
      .createQueryBuilder()
      .update()
      .set({ ...input, version: () => "version + 1" })
      .where("id = :id AND version = :version", { id, version })
      .returning("*")
      .execute();
    if (!result.affected) {
      res.status(409).json({ message: "文章已被修改或删除，请重新加载后编辑" });
      return;
    }
    res.json(result.raw[0]);
  });
  app.delete("/api/articles/:id", requireAdmin, async (req, res) => {
    const result = await db
      .getRepository(ArticleEntity)
      .delete(uuid.parse(req.params.id));
    if (!result.affected) {
      res.status(404).json({ message: "文章不存在" });
      return;
    }
    res.status(204).end();
  });
  app.get("/api/articles/:id/comments", async (req, res) => {
    const id = uuid.parse(req.params.id);
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .default(1)
      .parse(req.query.page);
    const [items, total] = await db
      .getRepository(CommentEntity)
      .createQueryBuilder("c")
      .where("c.articleId = :id", { id })
      .orderBy("c.createdAt", "DESC")
      .skip((page - 1) * 30)
      .take(30)
      .getManyAndCount();
    const comments = await Promise.all(
      items.map(async (c) => ({
        ...c,
        username:
          (await db.getRepository(UserEntity).findOneBy({ id: c.userId }))
            ?.username ?? "已注销用户",
      })),
    );
    res.json({ items: comments, total, page, pageSize: 30 });
  });
  app.post(
    "/api/articles/:id/comments",
    requireUser,
    rateLimit({
      windowMs: 60000,
      limit: 10,
      message: { message: "评论过于频繁，请稍后重试" },
    }),
    async (req, res) => {
      const articleId = uuid.parse(req.params.id);
      const { content } = z
        .object({ content: z.string().trim().min(1).max(2000) })
        .strict()
        .parse(req.body);
      if (
        !(await db.getRepository(ArticleEntity).existsBy({ id: articleId }))
      ) {
        res.status(404).json({ message: "文章不存在" });
        return;
      }
      res
        .status(201)
        .json(
          await db
            .getRepository(CommentEntity)
            .save({ articleId, userId: req.account!.id, content }),
        );
    },
  );
  app.delete("/api/comments/:id", requireUser, async (req, res) => {
    const repo = db.getRepository(CommentEntity);
    const comment = await repo.findOneBy({ id: uuid.parse(req.params.id) });
    if (!comment) {
      res.status(404).json({ message: "评论不存在" });
      return;
    }
    if (req.account!.role !== "admin" && comment.userId !== req.account!.id) {
      res.status(403).json({ message: "只能删除自己的评论" });
      return;
    }
    await repo.delete(comment.id);
    res.status(204).end();
  });
  app.use((_req, res) => res.status(404).json({ message: "接口不存在" }));
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof RegistrationError) {
        res.status(error.status).json({ message: error.message });
        return;
      }
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({
            message: "输入不符合要求",
            details: error.issues.map(
              (i) => `${i.path.join(".")}: ${i.message}`,
            ),
          });
        return;
      }
      const e = error as { code?: string; status?: number };
      if (e.code === "23505") {
        res.status(409).json({ message: "邮箱或文章标识已存在" });
        return;
      }
      if (e.status === 400 || e.status === 413) {
        res.status(e.status).json({ message: "请求格式错误或内容过大" });
        return;
      }
      console.error("API request failed", e.code ?? "internal");
      res.status(500).json({ message: "服务暂时不可用，请稍后重试" });
    },
  );
  return {
    app,
    close: async () => {
      store.close();
      await pool.end();
    },
  };
}
