# Private Bookmark - Chrome MV3 扩展

[English](README.md) | 简体中文

概览
-------

Private Bookmark 将书签和私密访问历史存储在扩展内部的嵌入式 SQLite 数据库（WASM）中，由后台 Service Worker 管理。扩展优先使用本地存储保存书签，并仅对用户选择的域名进行有限的访问历史监控。

结构
-------

- Popup：快速添加界面和快捷方式（添加当前标签页、打开查看页或选项页）。
- 查看页：受密码保护的书签查看器、编辑器和分页列表（`view.html` / `view.js`）。
- 选项页：设置、文件夹、导入/导出、备份/恢复以及监控域名（`options.html` / `options.js`）。
- 历史页：受密码保护的私密访问历史（`history.html` / `history.js`）。
- SQL 控制台：只读查询和经确认的写入语句（`sql.html` / `sql.js`）。
- 后台 Service Worker：SQLite 所有权和访问历史监控（`background.js`）。
- `db.js`：页面端消息客户端，暴露 `globalThis.db`。
- `shared.js`：转义、URL 安全、密码哈希/验证和解锁辅助函数。
- `i18n.js`：英语、日语和简体中文 UI 目录，浏览器语言检测以及选项页的语言覆盖。
- `modal.js`：异步 `_modal.showConfirm` / `showTextPrompt` 对话框。
- `_locales/`：Chrome 清单本地化，用于扩展名称、描述和操作标题。

主要功能
-----------

- 私密书签存储在 SQLite `bookmarks` 表中，字段为：`{ id, title, url, folderId, added }`。
- 支持文件夹，用于组织书签并在文件夹之间移动书签。
- 从 Chrome 书签导入，并导出为 Netscape HTML。
- 受密码保护的查看器。密码使用带盐 PBKDF2-SHA-256（`210000` 次迭代），存储在 `settings.passwordHash` 中；旧版 SHA-256 哈希在登录成功时升级。
- 私密访问历史存储在 `visit_history` 表中：`{ id, url, title, domain, timestamp }`。
- 监控域名：完成的导航会被记录，匹配的 URL 将从 Chrome 原生历史记录中移除。
- 所有表的 JSON 备份/恢复。恢复需要确认，验证备份结构，并在事务中执行。
- 由 Parcel 打包的本地 Bootstrap 5 和 Noto Sans JP 资源；页面不发起 CDN 请求。
- 英语、日语和简体中文 UI，带浏览器语言检测和选项页覆盖。偏好设置存储在扩展 `localStorage` 中。
- 非阻塞模态辅助函数替代阻塞式提示。

权限
-------

- `storage` - 旧版 `chrome.storage.local` 迁移；当前数据存储在 SQLite 中。
- `tabs` - 读取当前标签页 URL/标题，用于快速添加和监控辅助功能。
- `bookmarks` - 从 Chrome 的书签树导入。
- `history` - 读取原生历史记录标题，并在记录私密访问时移除访问的 URL。
- `webNavigation` - 检测完成的导航以进行历史监控。

安全注意事项
----------------

- 密码哈希使用带盐 PBKDF2-SHA-256。没有恢复主密码；清除密码需要当前密码或重置本地数据。
- 密码保护查看器 UI。它不加密 SQLite 数据库静止状态。
- 扩展在访问监控域名时会读取并删除 Chrome 历史记录中的条目。用户在启用监控前应了解此行为。
- 书签、历史记录和设置保留在扩展来源本地。在分发修改版本之前请先审查代码。

访问历史监控的工作原理
--------------------------------

- 用户在选项页的监控域名列表中添加域名。
- 后台工作器通过 `webNavigation` 监听完成的导航，并有 `tabs.onUpdated` 后备机制。
- 对于监控域名，工作器会：
  - 查找 URL 的原生历史记录标题，回退到活动标签页标题。
  - 保存一个私密 `visit_history` 条目。
  - 通过 `chrome.history.deleteUrl` 从 Chrome 原生历史记录中删除该 URL。
- 对同一 URL 的重复访问按 URL 每 5 秒进行去抖动。

UI/用法
--------

- Popup：
  - 添加书签或添加当前标签页。
  - 监控当前域名。
  - 打开书签查看器、历史查看器或选项。
- 查看页：
  - 每次解锁时都需要密码。
  - 显示带有编辑、删除和移动到文件夹控件的分页书签列表。
- 选项页：
  - 管理密码、文件夹和监控域名。
  - 选择 UI 语言（系统默认、英语、日语或简体中文）。
  - 从 Chrome 导入书签，将书签导出为 HTML，并将所有表备份/恢复为 JSON。
  - 导出或清除私密访问历史。
- 历史页：
  - 按最新优先列出访问，带有刷新、删除和分页。
- SQL 控制台：
  - 运行查询，在多条语句或破坏性 SQL 前发出警告，并将最后结果导出为 JSON。

开发
----------

- 安装依赖：`npm install`
- 监视构建：`npm start`
- 生产构建：`npm run build`（删除 `dist/`，打包显式入口，然后复制 `manifest.json`、`icons/*` 和 `_locales/**/*`）
- 通过 `chrome://extensions` -> 开发者模式 -> 加载未打包的扩展 加载 `dist/`。
- 测试：`npm test`（针对共享辅助函数的 `node:test` 覆盖）。
- 代码检查：`npm run lint`（ESLint）。
- 格式化：`npm run format` 或使用 `npm run format:check`（Prettier）。
- CI 在推送和拉取请求上运行测试、代码检查和生产构建。
- 模式更改通过 `background.js` 中的 `PRAGMA user_version` 和 `SCHEMA_VERSION` 进行版本控制。

测试清单
----------

1. 运行 `npm run build`，并在 `chrome://extensions` 中加载未打包的 `dist/`。
2. 确认权限包括 `storage`、`tabs`、`bookmarks`、`history` 和 `webNavigation`。
3. 在选项页中向监控域名添加一个域名。
4. 访问该域名上的页面，等待其加载，并确认条目出现在私密访问历史中，且 URL 从原生历史记录中被移除。
5. 解锁历史页并验证刷新、删除和分页。
6. 测试书签添加/编辑/删除、文件夹移动和空列表分页。
7. 测试 Chrome 书签导入、HTML 导出、JSON 备份和恢复。
8. 测试密码设置/更改/清除，并确认旧版哈希在登录时升级。
9. 打开 SQL 控制台并验证破坏性语句需要确认。

贡献
------------

欢迎拉取请求。如有可用，请包含测试，或针对 UI 更改提供一个小型手动测试计划。

许可证
-------

MIT
