import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Client, Pool } from "pg";
import request from "supertest";
import { createDatabase } from "./db";
import { createApp } from "./app";
import { createRegistration, RegistrationError } from "./registration";
import { UserEntity } from "./entities";

test("registration: email ownership, expiry, replay, limits, concurrency and SMTP failure", async () => {
  const base = new URL(process.env.DATABASE_URL!);
  const database = "registration_test_" + randomBytes(6).toString("hex");
  const adminUrl = new URL(base);
  adminUrl.pathname = "/postgres";
  const controller = new Client({ connectionString: adminUrl.toString() });
  await controller.connect();
  await controller.query(`CREATE DATABASE "${database}"`);
  base.pathname = "/" + database;
  const db = await createDatabase(base.toString()).initialize();
  await db.runMigrations();
  let at = Date.now();
  const now = () => new Date(at);
  const codes = new Map<string, string>();
  let failMail = false;
  let sends = 0;
  const mailer = async (email: string, code: string) => {
    if (failMail) throw new Error("sensitive SMTP diagnostic");
    sends++;
    codes.set(email, code);
  };
  const secret = randomBytes(48).toString("hex");
  const origin = "http://localhost:3000";
  const service = createApp(db, { secret, origin, now, mailer, pool: new Pool({ connectionString: base.toString() }) });
  const registration = createRegistration(db, secret, mailer, now);
  try {
    const agent = request.agent(service.app);
    let csrf = (await agent.get("/api/auth/session")).body.csrf;
    const post = (path: string, body: object) => agent.post("/api/auth/" + path)
      .set("Origin", origin).set("X-CSRF-Token", csrf).send(body);
    const payload = (email: string, code = codes.get(email) ?? "000000") => ({
      email, username: "注册读者", password: "Testing-password-123",
      confirmPassword: "Testing-password-123", verificationCode: code,
    });
    await agent.post("/api/auth/register/code").send({ email: "reader@example.com" }).expect(403);
    await post("register/code", { email: "not-an-email" }).expect(400);
    await post("register", payload("reader@example.com")).expect(400);
    const sent = await post("register/code", { email: " Reader@Example.com " }).expect(200);
    assert.equal(sent.body.retryAfter, 60);
    assert.equal(sent.body.code, undefined);
    assert.equal(sent.body.verificationCode, undefined);
    const code = codes.get("reader@example.com")!;
    assert.match(code, /^\d{6}$/);
    const [record] = await db.query("SELECT * FROM registration_codes WHERE email = $1", ["reader@example.com"]);
    assert.equal(record.digest.length, 64);
    assert.notEqual(record.digest, code);
    await post("register/code", { email: "READER@example.com" }).expect(429);
    await post("register", { ...payload("reader@example.com"), confirmPassword: "different-password" }).expect(400);
    await post("register", { ...payload("reader@example.com"), confirmPassword: undefined }).expect(400);
    await post("register", { ...payload("reader@example.com"), verificationCode: undefined }).expect(400);
    await post("register", { ...payload("reader@example.com"), role: "admin" }).expect(400);
    await post("register", payload("different@example.com", code)).expect(400);
    assert.equal(await db.getRepository(UserEntity).count(), 0);
    const result = await post("register", payload("READER@EXAMPLE.COM", code)).expect(201);
    assert.equal(result.body.user.role, "user");
    assert.equal(result.body.user.passwordHash, undefined);
    csrf = result.body.csrf;
    await post("register", payload("reader@example.com", code)).expect(400);
    assert.equal((await agent.get("/api/auth/session")).body.user.email, "reader@example.com");

    // 5 次错误即失效；不能用第 6 次正确输入绕过。
    await registration.sendCode("locked@example.com");
    const wrong = codes.get("locked@example.com") === "000000" ? "000001" : "000000";
    for (let i = 0; i < 5; i++) await post("register", payload("locked@example.com", wrong)).expect(400);
    await post("register", payload("locked@example.com")).expect(400);
    assert.equal((await db.query("SELECT attempts FROM registration_codes WHERE email=$1", ["locked@example.com"]))[0].attempts, 5);

    await registration.sendCode("expired@example.com");
    at += 5 * 60 * 1000;
    await post("register", payload("expired@example.com")).expect(400);

    // 重发使之前的 nonce 失效；极小概率生成相同数字时重新发送，避免随机性造成假失败。
    await registration.sendCode("resend@example.com");
    const oldCode = codes.get("resend@example.com")!;
    do { at += 61000; await registration.sendCode("resend@example.com"); }
    while (codes.get("resend@example.com") === oldCode);
    await post("register", payload("resend@example.com", oldCode)).expect(400);
    const freshService = createRegistration(db, secret, mailer, now);
    await freshService.register(payload("resend@example.com")); // 重建服务仍可使用数据库里的验证码。

    // 同邮箱只能有一个并发发送成功。
    const concurrent = await Promise.allSettled([
      registration.sendCode("parallel@example.com"), registration.sendCode("parallel@example.com"),
    ]);
    assert.equal(concurrent.filter((v) => v.status === "fulfilled").length, 1);
    const signups = await Promise.allSettled([
      registration.register(payload("parallel@example.com")), registration.register(payload("parallel@example.com")),
    ]);
    assert.equal(signups.filter((v) => v.status === "fulfilled").length, 1);

    for (let i = 0; i < 5; i++) { await registration.sendCode("quota@example.com"); at += 61000; }
    await assert.rejects(registration.sendCode("quota@example.com"), (e) => e instanceof RegistrationError && e.status === 429);
    at += 3600000;
    await registration.sendCode("quota@example.com");
    const before = sends;
    await post("register/code", { email: "reader@example.com" }).expect(200);
    assert.equal(sends, before); // 已注册邮箱不发新验证码。

    failMail = true;
    const failed = await post("register/code", { email: "failed@example.com" }).expect(503);
    assert.ok(!JSON.stringify(failed.body).includes("sensitive"));
    assert.equal((await db.query("SELECT digest FROM registration_codes WHERE email=$1", ["failed@example.com"]))[0].digest, null);
    await post("register", payload("failed@example.com")).expect(400);
    await assert.rejects(createRegistration(db, secret).sendCode("no-config@example.com"), (e) => e instanceof RegistrationError && e.status === 503);
    // IP 级限流不可被轮换邮箱绕过（每次失败也计入）。
    for (let i = 0; i < 11; i++) await post("register/code", { email: `limit${i}@example.com` });
    await post("register/code", { email: "last@example.com" }).expect(429);
    assert.equal(await db.getRepository(UserEntity).count(), 3);
  } finally {
    await service.close();
    await db.destroy();
    await controller.query(`DROP DATABASE "${database}"`);
    await controller.end();
  }
});
