export const metadata = { title: "关于拾页" };
export default function About() {
  return (
    <div className="reading">
      <section className="intro">
        <h1>让想法，慢慢生长。</h1>
        <p>拾页，是一个安放文字的小地方。</p>
      </section>
      <div className="markdown">
        <p>
          在这里记录技术探索，也记录日常里微小而真实的发现。写作是整理思绪的过程，阅读是与另一种经验相遇。
        </p>
        <h2>关于这个小站</h2>
        <p>
          用 Markdown
          写作，分享值得记录的想法。欢迎注册账号，在文章下留下你的思考。
        </p>
        <h2>留言约定</h2>
        <p>
          尊重不同的观点，讨论具体的问题。请勿发布他人的隐私或无关广告。你可以删除自己的留言，管理员可以维护讨论秩序。
        </p>
      </div>
    </div>
  );
}
