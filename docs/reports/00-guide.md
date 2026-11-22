# NextBlog 专题报告导读：四组十二篇学习路线

这组报告专门解决“代码能运行，但不知道每一层为什么这样写”的问题。共四组、十二篇，每组按概念、源码和业务链路递进。建议每次读一篇，同时打开文中具体文件，用自己的话回答文末自测，再继续下一篇。

原来的十五篇仍是完整项目教程与源码归档，本专题补充更细的解释，不改变已有实现。下面的代码节选均从当前项目文件提取；说明性 SQL 和未来改进建议不会作为新功能写入项目。

| 学习组 | 报告 | 读完应该能说明 |
| --- | --- | --- |
| A：React 与 Next.js | 01–03 | 组件与路由的区别，渲染位置，一次阅读请求的路径 |
| B：Express 与 TypeScript | 04–06 | .ts/.tsx/tsx 的区别，类型与运行时校验，服务启动顺序 |
| C：TypeORM | 07–09 | 实体与迁移、Repository CRUD、并发更新与查询 |
| D：数据库连接 | 10–12 | 连接串、两个连接池、Session、迁移与排错 |

最直接回答当前疑问的顺序是 **01 → 04 → 07 → 10**，然后按每组顺序深入。学习数据库时先读配置，不需要展示或复制真实密码；代码中的环境变量示例只使用占位值。

## 报告目录

1. [React 与 Next.js（一）：它们各自解决什么问题](01-react-next.md)
2. [React 与 Next.js（二）：服务端组件、客户端组件与页面渲染](02-rendering.md)
3. [React 与 Next.js（三）：从文章地址追踪一次完整请求](03-request-path.md)
4. [Express 与 TypeScript（一）：为什么 server 里都是 .ts](04-ts-files.md)
5. [Express 与 TypeScript（二）：req、res、next 与类型扩展](05-typed-express.md)
6. [Express 与 TypeScript（三）：启动、中间件顺序与异步错误](06-express-lifecycle.md)
7. [TypeORM（一）：实体、类型、表与迁移到底是什么](07-orm-model.md)
8. [TypeORM（二）：Repository 怎样完成文章增删改查](08-orm-crud.md)
9. [TypeORM（三）：搜索、并发编辑、迁移与事务思维](09-query-migration.md)
10. [数据库连接（一）：从 .env 到 PostgreSQL 的每一步](10-database-config.md)
11. [数据库连接（二）：连接池、Session 存储与登录持久化](11-pools-session.md)
12. [数据库连接（三）：迁移、初始化、健康检查与故障定位](12-database-operations.md)
