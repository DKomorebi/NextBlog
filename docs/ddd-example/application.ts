import { ArticleRepository, createArticle } from "./domain";
export class Forbidden extends Error {}
// Actor must come from a verified server-side session, never req.body.
export type Actor = { id: string; role: "user" | "admin" } | null;
export class CreateArticle {
  constructor(
    private readonly repository: ArticleRepository,
    private readonly nextId: () => string,
  ) {}
  async execute(actor: Actor, input: { title: string; slug: string }) {
    if (!actor || actor.role !== "admin") throw new Forbidden("Admin required");
    const article = createArticle(this.nextId(), input.title, input.slug);
    await this.repository.insert(article);
    return article;
  }
}
