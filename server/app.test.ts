import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Client, Pool } from "pg";
import request from "supertest";
import { createDatabase } from "./db";
import { createApp } from "./app";
import { UserEntity } from "./entities";

test("PostgreSQL integration: authentication, session, CSRF, RBAC, CRUD and comments", async () => {
  const base = new URL(process.env.DATABASE_URL!);
  const database = "fieldnotes_test_" + randomBytes(6).toString("hex");
  const adminUrl = new URL(base);
  adminUrl.pathname = "/postgres";
  const controller = new Client({ connectionString: adminUrl.toString() });
  await controller.connect();
  await controller.query(`CREATE DATABASE "${database}"`);
  base.pathname = "/" + database;
  const db = await createDatabase(base.toString()).initialize();
  await db.runMigrations();
  const origin = "http://localhost:3000";
  const secret = randomBytes(48).toString("hex");
  let service = createApp(db, {
    secret,
    origin,
    pool: new Pool({ connectionString: base.toString() }),
  });
  try {
    const anonymous = request.agent(service.app);
    let r = await anonymous.get("/api/auth/session").expect(200);
    const csrf = r.body.csrf;
    assert.match(r.headers["set-cookie"][0], /HttpOnly/);
    assert.match(r.headers["set-cookie"][0], /SameSite=Lax/);
    const payload = {
      title: "测试文章",
      slug: "integration-post",
      category: "测试",
      excerpt: "摘要",
      content: "## Markdown\n\n**hello**",
    };
    await anonymous
      .post("/api/articles")
      .set("Origin", origin)
      .set("X-CSRF-Token", csrf)
      .send(payload)
      .expect(401);
    await anonymous
      .post("/api/auth/register")
      .set("Origin", origin)
      .send({})
      .expect(403);
    await anonymous
      .post("/api/auth/register")
      .set("Origin", "https://evil.example")
      .set("X-CSRF-Token", csrf)
      .send({})
      .expect(403);
    await anonymous
      .post("/api/auth/register")
      .set("Origin", origin)
      .set("X-CSRF-Token", csrf)
      .send({
        email: "bad@example.com",
        username: "bad",
        password: "Testing-password-123",
        role: "admin",
      })
      .expect(400);
    const user = request.agent(service.app);
    r = await user.get("/api/auth/session");
    const before = r.headers["set-cookie"][0].split(";")[0];
    const init = r.body.csrf;
    r = await user
      .post("/api/auth/register")
      .set("Origin", origin)
      .set("X-CSRF-Token", init)
      .send({
        email: "reader@example.com",
        username: "读者",
        password: "Testing-password-123",
      })
      .expect(201);
    let token = r.body.csrf;
    assert.equal(r.body.user.role, "user");
    assert.notEqual(before, r.headers["set-cookie"][0].split(";")[0]);
    assert.equal(r.body.user.passwordHash, undefined);
    await user
      .post("/api/articles")
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .send(payload)
      .expect(403);
    await db
      .getRepository(UserEntity)
      .update({ email: "reader@example.com" }, { role: "admin" });
    r = await user
      .post("/api/articles")
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .send(payload)
      .expect(201);
    const article = r.body;
    assert.ok(article.id);
    await user
      .post("/api/articles")
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .send(payload)
      .expect(409);
    r = await anonymous.get("/api/articles?q=Markdown").expect(200);
    assert.equal(r.body.total, 1);
    assert.equal(r.body.items[0].content, undefined);
    await user
      .put("/api/articles/" + article.id)
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .send({ ...payload, title: "已修改", version: 1 })
      .expect(200);
    await user
      .put("/api/articles/" + article.id)
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .send({ ...payload, version: 1 })
      .expect(409);
    const other = request.agent(service.app);
    const otherCsrf = (await other.get("/api/auth/session")).body.csrf;
    r = await other
      .post("/api/auth/register")
      .set("Origin", origin)
      .set("X-CSRF-Token", otherCsrf)
      .send({
        email: "other@example.com",
        username: "另一位读者",
        password: "Testing-password-456",
      })
      .expect(201);
    const otherToken = r.body.csrf;
    await other
      .put("/api/articles/" + article.id)
      .set("Origin", origin)
      .set("X-CSRF-Token", otherToken)
      .send({ ...payload, version: 2 })
      .expect(403);
    await other
      .delete("/api/articles/" + article.id)
      .set("Origin", origin)
      .set("X-CSRF-Token", otherToken)
      .expect(403);
    r = await user
      .post(`/api/articles/${article.id}/comments`)
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .send({ content: "管理员留言" })
      .expect(201);
    const commentId = r.body.id;
    await other
      .delete("/api/comments/" + commentId)
      .set("Origin", origin)
      .set("X-CSRF-Token", otherToken)
      .expect(403);
    r = await other
      .post(`/api/articles/${article.id}/comments`)
      .set("Origin", origin)
      .set("X-CSRF-Token", otherToken)
      .send({ content: "普通用户留言" })
      .expect(201);
    await other
      .delete("/api/comments/" + r.body.id)
      .set("Origin", origin)
      .set("X-CSRF-Token", otherToken)
      .expect(204);
    r = await user.get("/api/auth/session");
    const savedCookie = r.headers["set-cookie"][0].split(";")[0];
    await service.close();
    service = createApp(db, {
      secret,
      origin,
      pool: new Pool({ connectionString: base.toString() }),
    });
    r = await request(service.app)
      .get("/api/auth/session")
      .set("Cookie", savedCookie)
      .expect(200);
    assert.equal(r.body.user.email, "reader@example.com");
    token = r.body.csrf;
    await request(service.app)
      .delete("/api/articles/" + article.id)
      .set("Cookie", savedCookie)
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .expect(204);
    assert.equal(
      (await request(service.app).get(`/api/articles/${article.id}/comments`))
        .body.total,
      0,
    );
    await request(service.app)
      .get("/api/articles/integration-post")
      .expect(404);
    await request(service.app)
      .post("/api/auth/logout")
      .set("Cookie", savedCookie)
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .expect(204);
    assert.equal(
      (
        await request(service.app)
          .get("/api/auth/session")
          .set("Cookie", savedCookie)
      ).body.user,
      null,
    );
    const login = request.agent(service.app);
    const loginCsrf = (await login.get("/api/auth/session")).body.csrf;
    await login
      .post("/api/auth/login")
      .set("Origin", origin)
      .set("X-CSRF-Token", loginCsrf)
      .send({ email: "reader@example.com", password: "wrong-password" })
      .expect(401);
    await login
      .post("/api/auth/login")
      .set("Origin", origin)
      .set("X-CSRF-Token", loginCsrf)
      .send({ email: "reader@example.com", password: "Testing-password-123" })
      .expect(200);
  } finally {
    await service.close();
    await db.destroy();
    await controller.query(`DROP DATABASE "${database}"`);
    await controller.end();
  }
});
