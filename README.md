# 拾页 Fieldnotes · 全栈博客

Next.js + Express + TypeScript + Tailwind CSS + DaisyUI + PostgreSQL + TypeORM。样式参考 dink 的宣纸与墨青风格，业务参考 SSM_demo 的登录态和评论权限。

项目仓库：[DKomorebi/NextBlog](https://github.com/DKomorebi/NextBlog)。

## 已完成

- DaisyUI 文章卡片、Lucide 图标、可持久化的深浅主题与圆形展开过渡。
- Markdown 阅读器、代码高亮、表格、图片、Markdown 文件导入与编辑预览。
- 真实数据库文章增删改查、正文搜索、分类与分页。
- 注册、登录、退出，PostgreSQL 持久化 Session。
- 只有管理员可以新增、修改、删除文章；普通用户注册无法选择管理员角色。
- 登录后评论，作者可删除自己的评论，管理员可删除任意评论。
- HttpOnly / SameSite Cookie、生产 Secure Cookie、CSRF 校验、密码哈希、请求限流与输入校验。
- 数据库迁移、示例导入、管理员授权、并发编辑版本检查。

## 本机启动

本机独立数据库 fieldnotes 已创建，迁移已执行并导入六篇文章。连接配置在被 Git 忽略的 `.env` 中。

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

访问 http://localhost:3000 。Express 监听 127.0.0.1:4000，通过 Next.js 同源代理访问。若 3000 已被之前的开发服务占用，先关闭自己启动的旧服务再运行。

首次在其他电脑配置时，先参考 `.env.example` 创建 `.env` 和数据库，再运行：

```powershell
pnpm db:migrate
pnpm db:seed
```

## 成为管理员

先在网页注册自己的账号，然后在项目终端执行：

```powershell
pnpm admin 你的注册邮箱
```

刷新页面，进入“管理”。没有默认管理员账号或公开的管理员密码。

## 检查与生产构建

```powershell
pnpm typecheck
pnpm test:api
pnpm build
```

接口测试使用随机命名的独立测试数据库，运行账号需有创建数据库权限。生产构建目录为 `.next-fullstack`。生产启动用 `pnpm start`，需要 HTTPS 和正确的反向代理配置，详见下方文档。本地 HTTP 学习使用 `pnpm dev`。

## 文档

- [Express + TypeScript + DDD 教学与构建文档](docs/ddd/00-guide.md)：原模板、TypeORM 分层迁移及 node_modules 解释。

- [从零搭建的思路与具体步骤](docs/study-2026-11/2026-11-23-nextblog-build-roadmap.md)。

- [四组十二篇深入教学报告](docs/reports/00-guide.md)：React 与 Next.js、Express 与 TypeScript、TypeORM、数据库连接；含具体代码和练习答案。

- [全栈博客使用与教学](docs/05-全栈博客使用与教学.md)：文件说明、Cookie/Session、CSRF、权限矩阵、接口与部署。
- [浅色截图](docs/theme-light.png) / [深色截图](docs/theme-dark.png) / [手机截图](docs/theme-mobile-dark.png)。
- [完整系列教程与源码归档](https://github.com/DKomorebi/DKomorebi.github.io/tree/main/_posts)：全系列 15 篇均对应当前全栈版本，第十五篇提供项目结构与完整源码汇总。
- [全栈入门教学](docs/01-教学说明.md) / [后端业务](docs/02-后端接入路线.md) / [验收与排错](docs/03-验收与练习.md) / [项目结构与源码索引](docs/06-项目结构与源码索引.md)。

当前不包含邮件验证、密码找回、图片上传和嵌套回复。数据保存在 PostgreSQL 中，旧 out 目录不再是可部署的当前版本。
