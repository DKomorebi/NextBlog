// Teaching model only: this is not a replacement for server/entities.ts.
export class InvalidArticle extends Error {}
export class DuplicateSlug extends Error {}
export type Article = Readonly<{ id: string; title: string; slug: string }>;
export function createArticle(id: string, title: string, slug: string): Article {
  const cleanTitle = title.trim();
  if (!id || !cleanTitle || cleanTitle.length > 160 ||
      slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new InvalidArticle("Invalid article");
  }
  return Object.freeze({ id, title: cleanTitle, slug });
}
export interface ArticleRepository {
  // Must enforce uniqueness atomically, including concurrent requests.
  insert(article: Article): Promise<void>;
}
