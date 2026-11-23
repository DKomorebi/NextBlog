import test from "node:test";
import assert from "node:assert/strict";
import { CreateArticle, Forbidden } from "./application";
import { DuplicateSlug, InvalidArticle } from "./domain";
import { MemoryArticleRepository } from "./memory";
const admin = { id: "admin-id", role: "admin" as const };
test("verified admin creates a normalized article", async () => {
  const repo = new MemoryArticleRepository();
  const useCase = new CreateArticle(repo, () => "article-id");
  const result = await useCase.execute(admin, { title: " Hello ", slug: "hello" });
  assert.equal(result.title, "Hello"); assert.equal(result.id, "article-id");
  assert.equal(repo.count, 1); assert.ok(Object.isFrozen(result));
});
test("guest and ordinary user cannot write", async () => {
  const repo = new MemoryArticleRepository();
  const useCase = new CreateArticle(repo, () => "id");
  for (const actor of [null, { id: "u", role: "user" as const }]) {
    await assert.rejects(useCase.execute(actor, { title: "T", slug: "t" }), Forbidden);
  }
  assert.equal(repo.count, 0);
});
test("invalid domain values never reach storage", async () => {
  const repo = new MemoryArticleRepository();
  const useCase = new CreateArticle(repo, () => "id");
  for (const input of [{ title: " ", slug: "ok" }, { title: "T", slug: "Bad Slug" }]) {
    await assert.rejects(useCase.execute(admin, input), InvalidArticle);
  }
  assert.equal(repo.count, 0);
});
test("duplicate slug is rejected; exactly one concurrent attempt succeeds", async () => {
  const repo = new MemoryArticleRepository();
  const useCase = new CreateArticle(repo, () => "id");
  const results = await Promise.allSettled([
    useCase.execute(admin, { title: "A", slug: "same" }),
    useCase.execute(admin, { title: "B", slug: "same" }),
  ]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  const failure = results.find(r => r.status === "rejected");
  assert.ok(failure && failure.status === "rejected" && failure.reason instanceof DuplicateSlug);
  assert.equal(repo.count, 1);
});
