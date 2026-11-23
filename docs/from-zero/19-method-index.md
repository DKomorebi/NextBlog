# 方法与结构索引（十九）：从文件、方法和事件反查教学章节

## 1. 目录结构就是职责地图

```text
NextBlog/
  src/app/                  Next路由、布局、全局CSS
  src/components/           共享业务组件、Hero和主题切换
  src/lib/                  主题常量与旧示例文章（seed来源）
  src/types/                种子文章类型
  server/index.ts           API启动和退出
  server/app.ts             HTTP中间件、路由和错误处理
  server/db.ts              TypeORM连接配置
  server/entities.ts        用户、文章、评论映射
  server/migration.ts       初始表结构
  server/registration-migration.ts  验证码表增量迁移
  server/registration.ts    验证码与注册事务
  server/mail.ts            SMTP适配
  server/manage.ts          迁移、种子和管理员命令
  server/*.test.ts          PostgreSQL集成测试
  docs/ddd-example/         独立教学模型，不是运行后端入口
  docs/from-zero/           本套详细教程与源码快照
  next.config.ts            同源API转发
  package.json              前后端共同的依赖和脚本
  pnpm-lock.yaml            确切依赖锁定
```

## 2. 怎样读下面的函数表

索引用TypeScript编译器AST从src和server提取，包括命名函数、箭头函数、类方法、Effect与JSX内联回调，避免只列导出组件而漏掉真正触发业务的代码。行号指本次源码快照；修改源码后应重新生成，不能认为固定行号永久不变。

“callback”不是缺失了函数，而是源码采用匿名回调。例如.then/.catch负责请求完成反馈，Promise构造器回调把Session旧式回调转成await，useEffect返回的函数是清理。表里给出所属作用域和对应解释章；完整代码在第二十、二十一篇。

React库函数setState不是本站定义的新方法，故不单独展开其内部源码；重点是本站如何调用它们。DDD教学模型的方法在第十六篇逐个解释和完整归档。

### server/app.test.ts

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 10 | `test callback` | test回调 | [第 18 篇](18-tests-build.md) |
| 24 | `test callback / mailer` | 函数调用 | [第 18 篇](18-tests-build.md) |

### server/app.ts

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 42 | `z .string() .min(10) .max(72) .refine callback` | z .string() .min(10) .max(72) .refine回调 | [第 05 篇](05-express-syntax.md) |
| 57 | `publicUser` | 函数调用 | [第 13 篇](13-auth-server.md) |
| 63 | `createApp` | 函数调用 | [第 05 篇](05-express-syntax.md) |
| 91 | `createApp / app.use callback` | app.use回调 | [第 05 篇](05-express-syntax.md) |
| 112 | `createApp / app.use /api callback` | HTTP请求 | [第 05 篇](05-express-syntax.md) |
| 136 | `createApp / requireUser` | 函数调用 | [第 05 篇](05-express-syntax.md) |
| 143 | `createApp / requireAdmin` | 函数调用 | [第 05 篇](05-express-syntax.md) |
| 161 | `createApp / app.get /api/health callback` | HTTP请求 | [第 05 篇](05-express-syntax.md) |
| 165 | `createApp / app.get /api/auth/session callback` | HTTP请求 | [第 13 篇](13-auth-server.md) |
| 172 | `createApp / loginSession` | 函数调用 | [第 13 篇](13-auth-server.md) |
| 173 | `createApp / loginSession / callback` | 闭包/Promise回调 | [第 13 篇](13-auth-server.md) |
| 174 | `createApp / loginSession / callback / req.session.regenerate callback` | req.session.regenerate回调 | [第 13 篇](13-auth-server.md) |
| 178 | `createApp / loginSession / callback` | 闭包/Promise回调 | [第 13 篇](13-auth-server.md) |
| 179 | `createApp / loginSession / callback / req.session.save callback` | req.session.save回调 | [第 13 篇](13-auth-server.md) |
| 188 | `createApp / app.post /api/auth/register/code callback` | HTTP请求 | [第 13 篇](13-auth-server.md) |
| 193 | `createApp / app.post /api/auth/register callback` | HTTP请求 | [第 13 篇](13-auth-server.md) |
| 201 | `createApp / app.post /api/auth/register callback / ….refine callback` | ….refine回调 | [第 13 篇](13-auth-server.md) |
| 209 | `createApp / app.post /api/auth/login callback` | HTTP请求 | [第 13 篇](13-auth-server.md) |
| 226 | `createApp / app.post /api/auth/logout callback` | HTTP请求 | [第 13 篇](13-auth-server.md) |
| 227 | `createApp / app.post /api/auth/logout callback / req.session.destroy callback` | req.session.destroy回调 | [第 13 篇](13-auth-server.md) |
| 238 | `createApp / app.get /api/articles callback` | HTTP请求 | [第 08 篇](08-typeorm-crud.md) |
| 272 | `createApp / app.get /api/categories callback` | HTTP请求 | [第 08 篇](08-typeorm-crud.md) |
| 284 | `createApp / app.get /api/articles/:slug callback` | HTTP请求 | [第 08 篇](08-typeorm-crud.md) |
| 294 | `createApp / app.post /api/articles callback` | HTTP请求 | [第 08 篇](08-typeorm-crud.md) |
| 298 | `createApp / app.put /api/articles/:id callback` | HTTP请求 | [第 08 篇](08-typeorm-crud.md) |
| 307 | `createApp / app.put /api/articles/:id callback / version` | 函数调用 | [第 08 篇](08-typeorm-crud.md) |
| 317 | `createApp / app.delete /api/articles/:id callback` | HTTP请求 | [第 08 篇](08-typeorm-crud.md) |
| 327 | `createApp / app.get /api/articles/:id/comments callback` | HTTP请求 | [第 08 篇](08-typeorm-crud.md) |
| 344 | `createApp / app.get /api/articles/:id/comments callback / items.map callback` | items.map回调 | [第 08 篇](08-typeorm-crud.md) |
| 361 | `createApp / app.post /api/articles/:id/comments callback` | HTTP请求 | [第 08 篇](08-typeorm-crud.md) |
| 382 | `createApp / app.delete /api/comments/:id callback` | HTTP请求 | [第 08 篇](08-typeorm-crud.md) |
| 396 | `createApp / app.use callback` | app.use回调 | [第 05 篇](05-express-syntax.md) |
| 398 | `createApp / app.use callback` | app.use回调 | [第 05 篇](05-express-syntax.md) |
| 409 | `createApp / app.use callback / error.issues.map callback` | error.issues.map回调 | [第 05 篇](05-express-syntax.md) |
| 429 | `createApp / close` | 函数调用 | [第 05 篇](05-express-syntax.md) |

### server/db.ts

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 7 | `createDatabase` | 函数调用 | [第 06 篇](06-database-start.md) |

### server/index.ts

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 4 | `main` | 函数调用 | [第 06 篇](06-database-start.md) |
| 15 | `main / app.listen callback` | app.listen回调 | [第 06 篇](06-database-start.md) |
| 21 | `main / process.once callback` | process.once回调 | [第 06 篇](06-database-start.md) |
| 22 | `main / process.once callback / server.close callback` | server.close回调 | [第 06 篇](06-database-start.md) |
| 29 | `main().catch callback` | main().catch回调 | [第 06 篇](06-database-start.md) |

### server/mail.ts

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 6 | `createRegistrationMailer` | 函数调用 | [第 14 篇](14-email-transaction.md) |
| 26 | `createRegistrationMailer / callback` | 清理回调 | [第 14 篇](14-email-transaction.md) |

### server/manage.ts

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 4 | `main` | 函数调用 | [第 06 篇](06-database-start.md) |
| 31 | `main / p.sections .map callback` | p.sections .map回调 | [第 06 篇](06-database-start.md) |
| 43 | `main().catch callback` | main().catch回调 | [第 06 篇](06-database-start.md) |

### server/migration.ts

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 3 | `up` | 函数调用 | [第 07 篇](07-typeorm-model.md) |
| 11 | `down` | 函数调用 | [第 07 篇](07-typeorm-model.md) |

### server/registration-migration.ts

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 4 | `up` | 函数调用 | [第 07 篇](07-typeorm-model.md) |
| 17 | `down` | 函数调用 | [第 07 篇](07-typeorm-model.md) |

### server/registration.test.ts

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 11 | `test callback` | test回调 | [第 18 篇](18-tests-build.md) |
| 23 | `test callback / now` | 函数调用 | [第 18 篇](18-tests-build.md) |
| 27 | `test callback / mailer` | 函数调用 | [第 18 篇](18-tests-build.md) |
| 39 | `test callback / post` | 函数调用 | [第 18 篇](18-tests-build.md) |
| 41 | `test callback / payload` | 函数调用 | [第 18 篇](18-tests-build.md) |
| 95 | `test callback / concurrent.filter callback` | concurrent.filter回调 | [第 18 篇](18-tests-build.md) |
| 99 | `test callback / signups.filter callback` | signups.filter回调 | [第 18 篇](18-tests-build.md) |
| 102 | `test callback / assert.rejects callback` | assert.rejects回调 | [第 18 篇](18-tests-build.md) |
| 114 | `test callback / assert.rejects callback` | assert.rejects回调 | [第 18 篇](18-tests-build.md) |

### server/registration.ts

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 8 | `constructor` | 函数调用 | [第 14 篇](14-email-transaction.md) |
| 13 | `createRegistration` | 函数调用 | [第 14 篇](14-email-transaction.md) |
| 17 | `createRegistration / callback` | 闭包/Promise回调 | [第 14 篇](14-email-transaction.md) |
| 19 | `createRegistration / digest` | 函数调用 | [第 14 篇](14-email-transaction.md) |
| 25 | `createRegistration / sendCode` | 函数调用 | [第 14 篇](14-email-transaction.md) |
| 66 | `createRegistration / register` | 函数调用 | [第 14 篇](14-email-transaction.md) |
| 68 | `createRegistration / register / db.transaction callback` | db.transaction回调 | [第 14 篇](14-email-transaction.md) |

### src/app/about/page.tsx

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 2 | `About` | 函数调用 | [第 03 篇](03-next-routes.md) |

### src/app/admin/[id]/page.tsx

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 3 | `Page` | 函数调用 | [第 03 篇](03-next-routes.md) |

### src/app/admin/new/page.tsx

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 3 | `Page` | 函数调用 | [第 03 篇](03-next-routes.md) |

### src/app/admin/page.tsx

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 2 | `Page` | 函数调用 | [第 03 篇](03-next-routes.md) |

### src/app/archive/page.tsx

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 3 | `Archive` | 函数调用 | [第 03 篇](03-next-routes.md) |

### src/app/layout.tsx

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 9 | `RootLayout` | 函数调用 | [第 03 篇](03-next-routes.md) |

### src/app/login/page.tsx

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 3 | `Page` | 函数调用 | [第 03 篇](03-next-routes.md) |

### src/app/not-found.tsx

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 3 | `NotFound` | 函数调用 | [第 03 篇](03-next-routes.md) |

### src/app/page.tsx

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 2 | `Home` | 函数调用 | [第 03 篇](03-next-routes.md) |

### src/app/posts/[slug]/page.tsx

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 2 | `Page` | 函数调用 | [第 03 篇](03-next-routes.md) |

### src/app/register/page.tsx

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 3 | `Page` | 函数调用 | [第 03 篇](03-next-routes.md) |

### src/components/full-blog.tsx

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 58 | `api` | 函数调用 | [第 09 篇](09-session-ui.md) |
| 75 | `api / r.json().catch callback` | r.json().catch回调 | [第 09 篇](09-session-ui.md) |
| 90 | `refresh` | 函数调用 | [第 09 篇](09-session-ui.md) |
| 91 | `setSession` | 函数调用 | [第 09 篇](09-session-ui.md) |
| 93 | `SessionProvider` | 函数调用 | [第 09 篇](09-session-ui.md) |
| 97 | `SessionProvider / refresh` | 函数调用 | [第 09 篇](09-session-ui.md) |
| 107 | `SessionProvider / useEffect callback` | Effect建立或清理 | [第 09 篇](09-session-ui.md) |
| 116 | `date` | 函数调用 | [第 09 篇](09-session-ui.md) |
| 122 | `ErrorMessage` | 函数调用 | [第 09 篇](09-session-ui.md) |
| 129 | `Header` | 函数调用 | [第 09 篇](09-session-ui.md) |
| 132 | `Header / logout` | 函数调用 | [第 09 篇](09-session-ui.md) |
| 189 | `Markdown` | 函数调用 | [第 11 篇](11-reader-comments.md) |
| 197 | `Markdown / a` | 函数调用 | [第 11 篇](11-reader-comments.md) |
| 202 | `Markdown / img` | 函数调用 | [第 11 篇](11-reader-comments.md) |
| 220 | `ArticleList` | 函数调用 | [第 10 篇](10-list-pages.md) |
| 237 | `ArticleList / useEffect callback` | Effect建立或清理 | [第 10 篇](10-list-pages.md) |
| 239 | `ArticleList / useEffect callback / setTimeout callback` | setTimeout回调 | [第 10 篇](10-list-pages.md) |
| 244 | `ArticleList / useEffect callback / setTimeout callback / ….then callback` | ….then回调 | [第 10 篇](10-list-pages.md) |
| 251 | `ArticleList / useEffect callback / setTimeout callback / ….catch callback` | ….catch回调 | [第 10 篇](10-list-pages.md) |
| 254 | `ArticleList / useEffect callback / setTimeout callback / ….finally callback` | ….finally回调 | [第 10 篇](10-list-pages.md) |
| 258 | `ArticleList / useEffect callback / callback` | 清理回调 | [第 10 篇](10-list-pages.md) |
| 263 | `ArticleList / useEffect callback` | Effect建立或清理 | [第 10 篇](10-list-pages.md) |
| 266 | `ArticleList / useEffect callback / api<{ name: string }[]>("/categories") .then(setCategories) .catch callback` | api<{ name: string }[]>("/categories") .then(setCategories) .catch回调 | [第 10 篇](10-list-pages.md) |
| 268 | `ArticleList / remove` | 函数调用 | [第 10 篇](10-list-pages.md) |
| 273 | `ArticleList / remove / setRevision callback` | setRevision回调 | [第 10 篇](10-list-pages.md) |
| 312 | `ArticleList / onChange` | JSX onChange | [第 10 篇](10-list-pages.md) |
| 323 | `ArticleList / onChange` | JSX onChange | [第 10 篇](10-list-pages.md) |
| 329 | `ArticleList / categories.map callback` | categories.map回调 | [第 10 篇](10-list-pages.md) |
| 339 | `ArticleList / onClick` | JSX onClick | [第 10 篇](10-list-pages.md) |
| 339 | `ArticleList / onClick / setRevision callback` | setRevision回调 | [第 10 篇](10-list-pages.md) |
| 353 | `ArticleList / onClick` | JSX onClick | [第 10 篇](10-list-pages.md) |
| 365 | `ArticleList / items.map callback` | items.map回调 | [第 10 篇](10-list-pages.md) |
| 393 | `ArticleList / items.map callback / onClick` | JSX onClick | [第 10 篇](10-list-pages.md) |
| 410 | `ArticleList / onClick` | JSX onClick | [第 10 篇](10-list-pages.md) |
| 410 | `ArticleList / onClick / setPage callback` | setPage回调 | [第 10 篇](10-list-pages.md) |
| 420 | `ArticleList / onClick` | JSX onClick | [第 10 篇](10-list-pages.md) |
| 420 | `ArticleList / onClick / setPage callback` | setPage回调 | [第 10 篇](10-list-pages.md) |
| 429 | `AuthForm` | 函数调用 | [第 12 篇](12-auth-events.md) |
| 445 | `AuthForm / useEffect callback` | Effect建立或清理 | [第 12 篇](12-auth-events.md) |
| 447 | `AuthForm / useEffect callback / window.setInterval callback` | window.setInterval回调 | [第 12 篇](12-auth-events.md) |
| 450 | `AuthForm / useEffect callback / callback` | 清理回调 | [第 12 篇](12-auth-events.md) |
| 453 | `AuthForm / sendCode` | 函数调用 | [第 12 篇](12-auth-events.md) |
| 476 | `AuthForm / submit` | 函数调用 | [第 12 篇](12-auth-events.md) |
| 550 | `AuthForm / onChange` | JSX onChange | [第 12 篇](12-auth-events.md) |
| 635 | `ArticleReader` | 函数调用 | [第 11 篇](11-reader-comments.md) |
| 639 | `ArticleReader / useEffect callback` | Effect建立或清理 | [第 11 篇](11-reader-comments.md) |
| 643 | `ArticleReader / useEffect callback / api<Article>("/articles/" + encodeURIComponent(slug)) .then callback` | api<Article>("/articles/" + encodeURIComponent(slug)) .then回调 | [第 11 篇](11-reader-comments.md) |
| 649 | `ArticleReader / useEffect callback / ….catch callback` | ….catch回调 | [第 11 篇](11-reader-comments.md) |
| 652 | `ArticleReader / useEffect callback / callback` | 清理回调 | [第 11 篇](11-reader-comments.md) |
| 663 | `ArticleReader / onClick` | JSX onClick | [第 11 篇](11-reader-comments.md) |
| 663 | `ArticleReader / onClick / setRevision callback` | setRevision回调 | [第 11 篇](11-reader-comments.md) |
| 688 | `Comments` | 函数调用 | [第 11 篇](11-reader-comments.md) |
| 697 | `Comments / useEffect callback` | Effect建立或清理 | [第 11 篇](11-reader-comments.md) |
| 702 | `Comments / useEffect callback / ….then callback` | ….then回调 | [第 11 篇](11-reader-comments.md) |
| 709 | `Comments / useEffect callback / ….catch callback` | ….catch回调 | [第 11 篇](11-reader-comments.md) |
| 712 | `Comments / useEffect callback / callback` | 清理回调 | [第 11 篇](11-reader-comments.md) |
| 716 | `Comments / submit` | 函数调用 | [第 11 篇](11-reader-comments.md) |
| 728 | `Comments / submit / setRevision callback` | setRevision回调 | [第 11 篇](11-reader-comments.md) |
| 735 | `Comments / remove` | 函数调用 | [第 11 篇](11-reader-comments.md) |
| 740 | `Comments / remove / setRevision callback` | setRevision回调 | [第 11 篇](11-reader-comments.md) |
| 761 | `Comments / onChange` | JSX onChange | [第 11 篇](11-reader-comments.md) |
| 778 | `Comments / items.map callback` | items.map回调 | [第 11 篇](11-reader-comments.md) |
| 787 | `Comments / items.map callback / onClick` | JSX onClick | [第 11 篇](11-reader-comments.md) |
| 805 | `Comments / onClick` | JSX onClick | [第 11 篇](11-reader-comments.md) |
| 805 | `Comments / onClick / setPage callback` | setPage回调 | [第 11 篇](11-reader-comments.md) |
| 815 | `Comments / onClick` | JSX onClick | [第 11 篇](11-reader-comments.md) |
| 815 | `Comments / onClick / setPage callback` | setPage回调 | [第 11 篇](11-reader-comments.md) |
| 831 | `Editor` | 函数调用 | [第 15 篇](15-editor.md) |
| 841 | `Editor / useEffect callback` | Effect建立或清理 | [第 15 篇](15-editor.md) |
| 849 | `Editor / useEffect callback / api<Article>("/articles/" + encodeURIComponent(slug)) .then callback` | api<Article>("/articles/" + encodeURIComponent(slug)) .then回调 | [第 15 篇](15-editor.md) |
| 863 | `Editor / useEffect callback / ….catch callback` | ….catch回调 | [第 15 篇](15-editor.md) |
| 866 | `Editor / useEffect callback / callback` | 清理回调 | [第 15 篇](15-editor.md) |
| 870 | `Editor / useEffect callback` | Effect建立或清理 | [第 15 篇](15-editor.md) |
| 871 | `Editor / useEffect callback / listener` | 函数调用 | [第 15 篇](15-editor.md) |
| 875 | `Editor / useEffect callback / callback` | 清理回调 | [第 15 篇](15-editor.md) |
| 877 | `Editor / change` | 函数调用 | [第 15 篇](15-editor.md) |
| 879 | `Editor / change / setForm callback` | setForm回调 | [第 15 篇](15-editor.md) |
| 881 | `Editor / save` | 函数调用 | [第 15 篇](15-editor.md) |
| 922 | `Editor / onChange` | JSX onChange | [第 15 篇](15-editor.md) |
| 933 | `Editor / onChange` | JSX onChange | [第 15 篇](15-editor.md) |
| 943 | `Editor / onChange` | JSX onChange | [第 15 篇](15-editor.md) |
| 952 | `Editor / onChange` | JSX onChange | [第 15 篇](15-editor.md) |
| 962 | `Editor / onChange` | JSX onChange | [第 15 篇](15-editor.md) |
| 982 | `Editor / onChange` | JSX onChange | [第 15 篇](15-editor.md) |

### src/components/home-hero.tsx

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 2 | `HomeHero` | 函数调用 | [第 17 篇](17-theme.md) |

### src/components/theme-toggle.tsx

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 6 | `ThemeToggle` | 函数调用 | [第 17 篇](17-theme.md) |
| 10 | `ThemeToggle / useEffect callback` | Effect建立或清理 | [第 17 篇](17-theme.md) |
| 12 | `ThemeToggle / useEffect callback / apply` | 函数调用 | [第 17 篇](17-theme.md) |
| 16 | `ThemeToggle / useEffect callback / sync` | 函数调用 | [第 17 篇](17-theme.md) |
| 31 | `ThemeToggle / useEffect callback / storage` | 函数调用 | [第 17 篇](17-theme.md) |
| 35 | `ThemeToggle / useEffect callback / callback` | 清理回调 | [第 17 篇](17-theme.md) |
| 40 | `ThemeToggle / toggle` | 函数调用 | [第 17 篇](17-theme.md) |
| 44 | `ThemeToggle / toggle / apply` | 函数调用 | [第 17 篇](17-theme.md) |
| 70 | `ThemeToggle / toggle / transition.finished.catch callback` | transition.finished.catch回调 | [第 17 篇](17-theme.md) |

### src/lib/posts.ts

| 起始行 | 作用域 / 方法 | 触发方式 | 解释章节 |
| --- | --- | --- | --- |
| 209 | `getPost` | 函数调用 | [第 06 篇](06-database-start.md) |
| 210 | `getPost / posts.find callback` | posts.find回调 | [第 06 篇](06-database-start.md) |
| 213 | `formatDate` | 函数调用 | [第 06 篇](06-database-start.md) |

本次共识别 **176** 个函数、方法或回调。按前述章节阅读业务方法，再通过此表定位对应源码。

## 本系列导航

[总导航](00-guide.md) · [上一篇](18-tests-build.md) · [下一篇](20-source-frontend.md)
