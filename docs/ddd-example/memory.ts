import { Article, ArticleRepository, DuplicateSlug } from "./domain";
export class MemoryArticleRepository implements ArticleRepository {
  private readonly bySlug = new Map<string, Article>();
  async insert(article: Article): Promise<void> {
    // No await between check and set in this single-process teaching adapter.
    if (this.bySlug.has(article.slug)) throw new DuplicateSlug("Slug exists");
    this.bySlug.set(article.slug, article);
  }
  get count() { return this.bySlug.size; }
}
