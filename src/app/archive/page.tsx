import { ArticleList } from "@/components/full-blog";
export const metadata = { title: "文章归档" };
export default function Archive() {
  return <ArticleList archive />;
}
