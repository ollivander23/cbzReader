# CBZ Reader

一个面向海外用户的极简 CBZ 在线阅读器：打开网页、选中或拖入 `.cbz` 文件即可开始阅读，文件不上传、不需要账号。本仓库是「冷门格式阅读器工具站」的第一个站点，DJVU 站不在本期范围。

当前状态：**MVP 可本地运行**。已完成文件选择、ZIP 按需解压、单页/双页阅读、缩放平移、RTL、内存控制、续读指纹，以及构建时预渲染的英文落地页。尚未实现 CBR/CB7、纵向连续滚动、书签和多语言。

---

## 1. 需求说明

### 1.1 产品定位

- 面向海内外用户、**以海外英文用户为主**的极简 CBZ 在线阅读器。
- 纯前端、纯静态：没有服务端、没有上传、没有转换任务、没有账号体系。
- 一个页面解决一件事：选中本地 CBZ → 立即阅读 → 关闭页面即结束，不留副本。

### 1.2 目标用户与典型场景

- 手上已有 CBZ 漫画，只想快速翻几页，不想安装桌面软件或手机 App 的用户。
- 在 iPad / 平板上阅读下载好的漫画，希望支持双页跨页和从右到左（日漫）阅读。
- 需要临时查看某个 CBZ 内容（确认页码、检查文件是否完整）的用户。
- 对隐私敏感、不愿把整包漫画上传到在线转换站的用户。

### 1.3 本期范围

- 支持 `.cbz` 与 `.zip`（CBZ 本质是 ZIP）。
- 支持 JPG / PNG / WebP / GIF / AVIF / BMP 页面图片。
- 单页与双页阅读、封面单独成页、双页跨页配对。
- 缩放、平移、滑动翻页、点击分区翻页、键盘快捷键、全屏。
- 从右到左（RTL）漫画模式，可手动切换，也会读取 `ComicInfo.xml` 的 `Manga` 标记。
- 本地阅读进度：重新导入同一文件时提示恢复上次页码。
- 英文落地页与 SEO 元信息，构建时输出真实 HTML。

### 1.4 明确不做

- 不做登录、注册、云书架、跨设备同步。
- 不上传文件到服务端，不做服务端解压或转码。
- 不做格式转换（CBZ → PDF 等），不提供下载产物。
- 本期不支持 DJVU；CBR（RAR）与 CB7（7z）也不支持。
- 不做 DRM 破解、不做付费内容分发。

---

## 2. 技术栈与关键决策

| 领域 | 选择 | 说明 |
| --- | --- | --- |
| 框架 | Vue 3 + TypeScript | 与开发者的 Java + Vue 背景一致，组件化实现阅读器交互 |
| 构建 | Vite 6 | 开发启动快，静态产物简单，适合 Cloudflare Pages |
| 页面形态 | Vite MPA + **构建时预渲染** | 每条路由在构建时输出真 HTML，不依赖爬虫执行 JS |
| 状态管理 | Vue Composition API | 单页应用状态简单，不引入 Pinia |
| 路由 | 无运行时路由 | 每条内容页是独立静态 HTML，阅读器按需挂载 |
| ZIP 解析 | `@zip.js/zip.js` | 读取中央目录，按条目按需解压单页，支持 Blob 输入 |
| 本地存储 | `idb-keyval`（IndexedDB） | 保存阅读进度；失败时静默降级，不阻塞阅读 |
| 部署 | Cloudflare Pages | 静态托管、免费额度、自带 HTTPS 与边缘缓存 |
| 预渲染 | `@vue/server-renderer` + 自定义脚本 | 复用 Vue 组件生成 HTML 字符串，不引入 Nuxt |

### 2.1 为什么用构建时预渲染，而不是纯 SPA

- 纯 SPA 的首屏 HTML 只有空壳，标题、正文、FAQ 都依赖 Googlebot / Bingbot 执行 JavaScript。Google 的渲染队列存在延迟，Bing 的 JS 渲染更不稳定，新站收录速度和确定性都吃亏。
- 这个站的 SEO 价值主要在**落地页文案、标题、描述、FAQ 与结构化数据**，这些内容不需要任何客户端 JS 就能完整呈现。
- 因此选择在构建时用 Vue SSR 把每个路由渲染成静态 HTML，部署后爬虫拿到的是完整页面；阅读器仍然是独立的懒加载入口，首屏不加载 zip.js。
- 代价是构建链路多一步 SSR 构建（`vite build --ssr`），以及内容数据必须能在 Node 环境执行、不能访问 `window`。这一点在内容层已经遵守。
- 不选 Nuxt/Next：为 6 个静态页引入完整框架的路由、运行时和数据层，收益低、复杂度高。也不选运行时预渲染插件：构建期确定性更好，产物就是纯静态文件。

---

## 3. 开发进度

状态说明：✅ 已实现并通过本地验证；🟡 已实现但只在桌面无头浏览器验证过，真机待确认；⬜ 未实现。

### 3.1 已完成

| 功能 | 状态 | 实际实现 |
| --- | --- | --- |
| 文件选择 | ✅ | 首屏只有一个主按钮；选中文件后挂载阅读器 |
| 拖拽打开 | ✅ | 空状态与阅读中均可拖入文件；阻止浏览器默认打开行为 |
| iOS 文件选择放宽 | ✅ | iOS 上把 `accept` 放宽为 `*/*`，避免 `.cbz` 被系统置灰 |
| ZIP 中央目录读取 | ✅ | 用 zip.js 读取条目列表，不整包解压 |
| 按需单页解压 | ✅ | 只为当前可见页生成 Blob 与 objectURL，翻页时按需取下一页 |
| 自然排序 | ✅ | `2.jpg` 排在 `10.jpg` 之前；同名数字回退到完整路径比较 |
| ComicInfo.xml | ✅ | 解析 `Manga`、`Series`、`Number`，用于 RTL 与标题 |
| 单页阅读 | ✅ | 适合手机竖屏与单页漫画 |
| 双页阅读 | ✅ | 桌面宽屏默认双页；封面单独成页，之后按 2-3、4-5 配对 |
| 缩放 | ✅ | 双击、双指捏合、滚轮 + Ctrl、键盘 `+` / `-`，范围 1x–5x |
| 平移 | ✅ | 指针拖拽平移，带边界约束；缩放 ≤1 时自动回中 |
| 翻页交互 | ✅ | 左右滑动、点击左右分区、底部滑块、键盘方向键/空格/PageUp/PageDown/Home/End |
| RTL 漫画模式 | ✅ | 工具栏切换；双页顺序与点击分区、键盘方向同步镜像 |
| 全屏 | ✅ | 支持时显示全屏按钮；iOS Safari 不支持元素全屏时自动隐藏 |
| 内存控制 | ✅ | 位图 LRU 预算 32MP、只保留当前页 ±1、超大图降采样、画布尺寸/面积上限、翻页后释放 objectURL |
| 续读指纹 | ✅ | 文件名 + 大小 + 修改时间 + 首尾 64KB 的 SHA-256；IndexedDB 保存页码、模式、RTL |
| 续读恢复 | ✅ | 重新导入同一文件时恢复到上次页码，并显示 9 秒恢复提示与「Start over」 |
| 预渲染落地页 | ✅ | 6 条静态路由：首页、`/read-cbz-online/`、`/manga-reader/`、`/how-to-open-cbz/`、`/cbz-vs-cbr/`、`/privacy/` |
| SEO 元信息 | ✅ | 每页独立 title/description、canonical、hreflang、OG/Twitter、JSON-LD（WebSite / WebApplication / Article / FAQPage / BreadcrumbList） |
| sitemap / robots | ✅ | 构建时按 `SITE_URL` 生成 `sitemap.xml` 与 `robots.txt` |
| 阅读器懒加载 | ✅ | 阅读器单独 chunk，首屏只加载落地页与样式 |
| 部署头 | ✅ | `public/_headers` 配置安全头与静态资源长缓存 |
| 端到端自测 | ✅ | `npm run test:e2e` 用本机 Edge/Chrome 打开 CBZ、验证解码与翻页 |

### 3.2 已实现但需要真机确认

- 🟡 移动端手势：捏合缩放、滑动翻页、点击分区翻页只在桌面无头 Chromium 中验证，尚未在真实 iPhone / Android 上验证手感与边界。
- 🟡 双页模式在窄屏下的默认值：宽度 ≥980px 默认双页，否则默认单页；移动端仍可手动切双页，但小屏双页可读性未评估。
- 🟡 大文件表现：内存策略已实现，但尚未用 300 页以上、单页 4K 的真实漫画包做压力测试。

---

## 4. 待实现功能

按建议顺序排列。预渲染落地页、SEO 元信息与双页模式已经提前完成，不再重复列入。

### P0：上线前

1. 真机验证 iOS Safari 与 Android Chrome 的文件导入、手势、内存表现。
2. 300 页以上真实 CBZ 的压力测试，确认翻页不累计内存。
3. 错误态文案与空包、损坏包、加密包的用户提示复核。
4. 自定义域名、`SITE_URL`、canonical/hreflang 一致性检查。

### P1：体验补强

1. 纵向连续滚动模式（与单页/双页并列的第三种阅读模式）。
2. 书签与「最近阅读」入口（仍只存本地，不做账号）。
3. 阅读设置持久化：默认单双页、背景色、是否自动识别宽页。
4. PWA：manifest + 应用外壳离线缓存（不缓存漫画内容）。
5. 轻量分析：Cloudflare Web Analytics（无 Cookie）。

### P2：格式与内容扩展

1. CBR（RAR）：通过惰性加载的 libarchive.wasm 实现，注意 UnRAR 许可与固实压缩无法随机访问。
2. CB7（7z）：同样走 libarchive.wasm。
3. 从 URL 打开 CBZ（需要显式处理跨域与隐私提示）。
4. 多语言：英文之外增加中文/日文页面与对应 hreflang。
5. 更多关键词落地页与内链，扩展长尾搜索入口。

---

## 5. 本地运行与部署

### 5.1 环境要求

- Node.js 20 或 22（Vite 6 要求 Node 18+，建议使用 LTS）。
- npm 10+。
- 本地端到端测试需要本机安装 Microsoft Edge 或 Google Chrome。

### 5.2 安装与开发

```bash
npm install
npm run dev
```

打开 `http://localhost:5173/`，拖入或选择一个 `.cbz` 文件即可阅读。

开发模式下没有预渲染产物，`src/main.ts` 会在客户端挂载落地页组件，路由按 `location.pathname` 匹配内容数据。生产构建则直接输出静态 HTML。

### 5.3 构建与预览

```bash
npm run build
npm run preview
```

`npm run build` 依次执行：

1. `vue-tsc --noEmit` 类型检查；
2. `vite build` 生成客户端产物到 `dist/`；
3. `vite build --ssr src/prerender/entry-server.ts --outDir dist-ssr` 生成 SSR 用的中间产物；
4. `node scripts/prerender.mjs` 把每条路由渲染成 `dist/<route>/index.html`，并生成 `sitemap.xml`、`robots.txt`。

`dist-ssr/` 只是构建中间产物，不需要部署。

### 5.4 Cloudflare Pages 配置

在 Cloudflare Dashboard → Workers & Pages → Create → Pages 中连接仓库：

| 配置项 | 值 |
| --- | --- |
| Framework preset | None（或 Vite，二者都可） |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 仓库根目录（即 `cbz-reader/`） |
| Node version | 建议设置环境变量 `NODE_VERSION=20`（或 22） |

环境变量：

- `SITE_URL`：生产域名，例如 `https://cbz.example.com`。构建时用于 canonical、hreflang、JSON-LD、sitemap 与 robots。**未设置时会回退到 `https://your-domain.com` 占位值，不能直接上线。**
- 修改 `SITE_URL` 后必须重新构建，它只影响构建产物，不是运行时变量。

`public/_headers` 会随构建复制到 `dist/_headers`，由 Cloudflare Pages 识别，用于安全头和 `/assets/*` 的长期缓存。

### 5.5 自定义域名上线检查

1. 在 Pages 项目 → Custom domains 绑定域名，按提示配置 DNS（域名已托管在 Cloudflare 时通常自动完成）。
2. 确认 `SITE_URL` 使用最终主域名（含或不含 `www` 只保留一个），然后重新构建。
3. 检查首页源码：`<link rel="canonical">`、`hreflang`、`og:url`、JSON-LD 中的 URL 都应是生产域名。
4. 访问 `/sitemap.xml` 与 `/robots.txt`，确认地址可访问且指向生产域名。
5. 提交 sitemap 到 Google Search Console / Bing Webmaster Tools。
6. 站点部署在域名根路径下，页面内链接使用绝对路径（`/how-to-open-cbz/`）；如果将来要部署到子路径，需要统一调整链接与 `base`。

### 5.6 本地端到端自测（可选）

```bash
# Windows 默认会查找 Edge/Chrome；也可显式指定
$env:EDGE_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$env:CBZ_SAMPLE="D:\path\to\your.cbz"
npm run test:e2e
```

脚本会启动开发服务器、用无头浏览器选中样例 CBZ、等待图片解码、点击 Next 验证页码变化，并输出截图到 `test/.cache/e2e-reader.png`。

---

## 6. 已知限制

- **iOS 文件导入**：iOS 不允许网站注册 `.cbz` 文件处理器，也没有 Web Share Target，因此必须先打开本站再选文件；iCloud 中未下载的文件需要先下载。iPad 上可拖拽，iPhone 上只能走文件选择器。
- **iOS 内存**：单标签页内存预算明显低于桌面，超大页面会被降采样；极大的包（数百 MB 以上、页面尺寸很高）仍可能触发页面重载。IndexedDB 在长期不访问时可能被系统清理，阅读进度不保证永久保留。
- **iOS 全屏**：Safari 不支持元素级 Fullscreen API，全屏按钮会自动隐藏。
- **格式**：当前只支持 CBZ/ZIP；CBR（RAR）与 CB7（7z）会提示不支持。加密 ZIP 无法读取。
- **续读指纹**：指纹包含文件名，重命名文件会被视为新文件；修改文件内容也会导致指纹变化。
- **双页配对**：默认封面单页，之后按 2-3、4-5 配对；暂不自动识别宽页（跨页大图）并单独展示。
- **语言**：落地页目前只有英文，尚未接入 i18n。
- **无服务端**：没有云端备份、没有跨设备同步，清理浏览器数据会丢失进度。
- **未做分析**：默认不加载任何第三方统计脚本。

---

## 7. 目录结构

```text
cbz-reader/
├─ index.html                  # 预渲染模板（含 <!--head--> / <!--app-html--> 占位）
├─ scripts/prerender.mjs       # 构建时预渲染、sitemap、robots
├─ public/                     # favicon、_headers
├─ src/
│  ├─ main.ts                  # 静态首屏入口：文件选择 / 拖拽 / 懒加载阅读器
│  ├─ dev/devLanding.ts        # 仅开发模式：客户端挂载落地页
│  ├─ components/LandingPage.vue
│  ├─ content/                 # 页面文案、站点常量（Node 与浏览器共用）
│  ├─ prerender/               # SSR 入口与 head/JSON-LD 生成
│  ├─ reader/
│  │  ├─ ReaderApp.vue         # 阅读器 UI 与交互
│  │  └─ core/                 # ZIP、图片、指纹、进度、排序
│  └─ styles/base.css          # 设计系统与落地页样式
└─ test/e2e.mjs                # 本地无头浏览器验证
```
