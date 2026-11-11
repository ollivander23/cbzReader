# CBZ Reader

一个面向海外用户的 CBZ 工具箱：打开网页即可读取 `.cbz`（选中或拖入文件），也可以把同一个归档转成 PDF。两条路径都在浏览器里完成，文件不上传、不需要账号。站点名仍是 `CBZ Reader`。本仓库是「冷门格式阅读器工具站」的第一个站点，DJVU 站不在本期范围。

当前状态：**MVP 已上线**，线上地址 <https://cbzreader.mavi.help/>。已完成文件选择、ZIP 按需解压、单页/双页/纵向连续三种阅读模式、沉浸式阅读层与浮动工具栏、缩放平移、RTL、内存控制、续读指纹、书签、深浅色主题、PWA 离线外壳、本地 CBZ → PDF 转换，以及构建时预渲染的英文落地页。尚未实现 CBR/CB7 与多语言。

---

## 1. 需求说明

### 1.1 产品定位

- 面向海内外用户、**以海外英文用户为主**的 CBZ 工具箱：读取与转换是并列的两个入口，站点名保持 `CBZ Reader` 不变。
- 纯前端、纯静态：没有服务端、没有上传、没有账号体系。CBZ → PDF 转换同样在浏览器标签页里完成，没有服务端任务、没有上传队列。
- 一个页面解决一件事：选中本地 CBZ → 立即阅读 → 关闭页面即结束，不留副本。

### 1.2 目标用户与典型场景

- 手上已有 CBZ 漫画，只想快速翻几页，不想安装桌面软件或手机 App 的用户。
- 在 iPad / 平板上阅读下载好的漫画，希望支持双页跨页和从右到左（日漫）阅读。
- 需要临时查看某个 CBZ 内容（确认页码、检查文件是否完整）的用户。
- 对隐私敏感、不愿把整包漫画上传到在线转换站的用户。

### 1.3 本期范围

- 支持 `.cbz` 与 `.zip`（CBZ 本质是 ZIP）。
- 支持 JPG / PNG / WebP / GIF / AVIF / BMP 页面图片。
- 单页、双页与纵向连续三种阅读模式；双页封面单独成页，之后按 2-3、4-5 配对。
- 缩放、平移、滑动翻页、点击分区翻页、键盘快捷键。
- 沉浸式阅读：打开文件后阅读器用 `position: fixed; inset: 0` 接管整个视口，站点页头、正文与页脚被覆盖；工具栏与底栏浮在画面之上、不占布局高度，点空白处或下滑隐藏、纵向滚动时淡出。`Fullscreen` 只表示「隐藏浏览器自身的界面」，不是「阅读器占满页面」。
- 从右到左（RTL）漫画模式，可手动切换，也会读取 `ComicInfo.xml` 的 `Manga` 标记。
- 本地阅读进度：重新导入同一文件时提示恢复上次页码。
- 深色 / 浅色主题：页头右上角是二态的太阳/月亮按钮，点一次直接切换；阅读器 `⋮` 菜单里是同一个状态的 `Dark mode` 开关。`auto` 的判定与存储值仍保留并跟随系统，但不再有 UI 入口；选择保存在本地，首帧不闪白。
- PWA 与离线：`manifest.webmanifest` + 生产环境 Service Worker；首次访问后应用外壳可离线打开，本地的 CBZ 断网也能正常翻页；可添加到主屏。
- CBZ → PDF 转换：`/cbz-to-pdf/` 页内解压 CBZ，把图片页合成为 PDF 后直接下载。页面尺寸可选「原图尺寸」（默认，1 像素 = 1pt，不缩放）与「A4 适配」（等比不裁剪）；JPEG 页直接嵌入原始数据不重编码，PNG 无损嵌入，WebP/GIF/AVIF/BMP 转一次 JPEG(q=0.92)。转换显示逐页进度、可取消，失败按原因给出具体提示。
- 英文落地页与 SEO 元信息，构建时输出真实 HTML。
- 工具站叙事：首页首屏只保留 H1、一句短导语、「读取 / 转换」并列双入口（同一套卡片样式，无主次）、一条信任语与示例漫画入口，长正文不再放到首页；主体是 *More CBZ tools* 分发区（转换页 + 10 篇指南 + 示例入口，共 12 张，1280px 下三行各 4 张），FAQ 只留 3 条；顶栏 `Reader` 与 `CBZ to PDF` 同级且移动端同时可见；转换页底部有回到阅读器的引导，各指南页的 *Keep reading* 都包含转换页链接。

### 1.4 明确不做

- 不做登录、注册、云书架、跨设备同步。
- 不上传文件到服务端，不做服务端解压或转码。
- 不做 PDF 或图片转回 CBZ，不做批量转换，不做把转换结果存到服务端或以链接分享。
- 转换只接受 CBZ/ZIP 输入：CBR（RAR）、CB7（7z）与加密包会明确提示不支持，非图片条目会被跳过。
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
| PDF 生成 | `pdf-lib`（懒加载） | 只在 `/cbz-to-pdf/` 用到；`embedJpg` 把 JPEG 原始数据直接写进 PDF，`embedPng` 无损嵌入，避免无必要重编码 |
| 本地存储 | `idb-keyval`（IndexedDB） | 保存阅读进度；失败时静默降级，不阻塞阅读 |
| 部署 | Cloudflare Pages | 静态托管、免费额度、自带 HTTPS 与边缘缓存 |
| 预渲染 | `@vue/server-renderer` + 自定义脚本 | 复用 Vue 组件生成 HTML 字符串，不引入 Nuxt |

### 2.1 为什么用构建时预渲染，而不是纯 SPA

- 纯 SPA 的首屏 HTML 只有空壳，标题、正文、FAQ 都依赖 Googlebot / Bingbot 执行 JavaScript。Google 的渲染队列存在延迟，Bing 的 JS 渲染更不稳定，新站收录速度和确定性都吃亏。
- 这个站的 SEO 价值主要在**落地页文案、标题、描述、FAQ 与结构化数据**，这些内容不需要任何客户端 JS 就能完整呈现。
- 因此选择在构建时用 Vue SSR 把每个路由渲染成静态 HTML，部署后爬虫拿到的是完整页面；阅读器仍然是独立的懒加载入口，首屏不加载 zip.js。
- 代价是构建链路多一步 SSR 构建（`vite build --ssr`），以及内容数据必须能在 Node 环境执行、不能访问 `window`。这一点在内容层已经遵守。
- 不选 Nuxt/Next：为少量静态页引入完整框架的路由、运行时和数据层，收益低、复杂度高。也不选运行时预渲染插件：构建期确定性更好，产物就是纯静态文件。

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
| 自然排序 | ✅ | `2.jpg` 排在 `10.jpg` 之前；多目录包先按目录、再按文件名自然排序，同目录同名回退到完整路径比较。单层包（全部图片在根目录或单一文件夹）的页序与旧版一致 |
| ComicInfo.xml | ✅ | 解析 `Manga`（`yesandrighttoleft` → 初始 RTL）、`Title`、`Series`、`Number`、`Summary`；缺字段留空，不使用占位符。页数仍以归档内的图片条目数为准，仅在没有图片条目时回退 `PageCount`。工具栏标题优先级为 `Title` → `Series #Number` → 原始文件名（文件名仍是兜底）。系列/卷号与简介放在 `⋮` 菜单底部的 `Comic info` 分组：系列一行加粗，简介限高（约 6 行）且可滚动，不进入工具栏，375px 下工具栏布局不变 |
| 单页阅读 | ✅ | 适合手机竖屏与单页漫画 |
| 双页阅读 | ✅ | 桌面宽屏默认双页；封面单独成页，之后按 2-3、4-5 配对 |
| 纵向连续阅读 | ✅ | 第三种模式，滚动连读；窗口化渲染最多 12 页，滚动靠近边缘时滑动窗口并补偿滚动位置 |
| 模式切换保留位置 | ✅ | 单页/双页/纵向之间切换时停留在当前页；纵向进入时把当前页滚到顶部 |
| 纵向连续缩放 | ✅ | 双指捏合 1x–4x，以两指中点为锚点；放大后双指拖动平移，低于 1x 自动回弹；双击或点工具栏读数回到适应宽度；桌面支持 Ctrl/Cmd + 滚轮与触控板捏合，键盘 `+` / `-` / `0` |
| 缩放 | ✅ | 单页/双页下支持双击、双指捏合、滚轮 + Ctrl、键盘 `+` / `-`，范围 1x–5x |
| 平移 | ✅ | 指针拖拽平移，带边界约束；缩放 ≤1 时自动回中 |
| 翻页交互 | ✅ | 左右滑动、点击左右分区、底部滑块、键盘方向键/空格/PageUp/PageDown/Home/End；纵向模式下方向键与空格按视口滚动 |
| RTL 漫画模式 | ✅ | 收进工具栏 `⋮` 菜单（`Right-to-left reading`，右侧显示 On/Off）；双页顺序与点击分区、键盘方向同步镜像 |
| 全屏 | ✅ | 语义是「隐藏浏览器自身的界面」，不是「阅读器占满页面」：只在 `document.fullscreenEnabled === true` 且非 iOS 时出现在 `⋮` 菜单，文案为 `Hide browser interface (F)` / `Show browser interface (F)`，`F` 键等效；API 不可用（iOS Safari）时菜单项与快捷键一起消失 |
| 沉浸式阅读层 | ✅ | 打开文件后根节点加 `reader--open`：`position: fixed; inset: 0`、`height: 100vh; height: 100svh`（不支持 `svh` 回退 `100vh`）、`z-index: 60`。站点页头、正文与页脚被完整覆盖，不参与阅读布局；图片区域从视口顶端开始。关闭时移除该层并 `scrollTo` 回到打开前的偏移。刷新不会恢复阅读层，落地页与内容页仍是预渲染的完整静态 HTML，无 JS 也能读 |
| 浮动工具栏 | ✅ | 工具栏与底栏 `position: absolute` 浮在画面上，不占高度；外层 `pointer-events: none`、只有控件可点，两侧留出的翻页热区不被遮挡。点击画面中部切换显隐，向下滑（>56px 且纵向占优）直接隐藏，纵向滚动超过 4px 自动淡出；纵向模式单击同样切换，双击仍按缩放处理（单击定时器在双击时取消） |
| 安全区适配 | ✅ | 工具栏、底栏、纵向滚动列与恢复提示的内边距统一写成 `calc(基准 + env(safe-area-inset-*))`，无条件生效，刘海与 Home 指示条不会压住控件 |
| 安卓返回键关闭 | ✅ | 打开文件时 `history.pushState({ cbzReader: true })`，`popstate` 关闭阅读器并恢复滚动位置，返回手势不再直接离开站点；关闭按钮只回退自己压入的那条记录，不会多退一页 |
| iOS 全屏替代提示 | ✅ | 首次进入阅读时显示可关闭的 `Add to Home Screen to read without Safari's bars.`，记在 `localStorage['cbz-ios-fullscreen-hint']`，只出现一次，顶部居中胶囊，不挡画面中心 |
| 工具栏布局 | ✅ | 外部只留模式切换、缩放读数、打开文件；模式/打开/更多为图标按钮（保留 `aria-label` 与 title），`100%` 保留数字；文件名按可用宽度做中间省略（保留头尾与扩展名），按钮 `flex-shrink: 0`，320px/375px 下不折行、不溢出；`⋮` 菜单支持点外部关闭与键盘操作 |
| 内存控制 | ✅ | 位图 LRU 预算 32MP、单页/双页只保留当前页 ±1、纵向模式保留窗口内页面、超大图降采样、统一解码上限（单边 4096px / 12MP，不按平台分支）、翻页后释放 objectURL |
| 续读指纹 | ✅ | 文件名 + 大小 + 修改时间 + 首尾 64KB 的 SHA-256；IndexedDB 保存页码、模式、RTL |
| 续读恢复 | ✅ | 重新导入同一文件时恢复到上次页码（含纵向模式），并显示 9 秒恢复提示与「Start over」 |
| 最近阅读 | ✅ | 首页「Recently opened」列出文件名、总页数、当前页、模式、更新时间与 168px JPEG 封面（约 7–15KB/条）；点条目续读，支持删除单条与 Clear all |
| 续读策略 | ✅ | ≤32MB 的包在 IndexedDB 存副本（最多保留最近 3 个），点条目直接续读；超限或副本已被淘汰时只留指纹，点条目打开文件选择器并提示重新选同一文件 |
| 书签 | ✅ | `⋮` 菜单可给当前页加/取消书签，菜单内按页序列出、点击跳转、× 删除；按文件指纹存 IndexedDB，与续读进度互不覆盖 |
| 页面缩略图 | ✅ | 底栏网格按钮（`aria-label="Page thumbnails"`）打开下半屏面板；列数自适应（桌面 6–8、手机竖屏 3、横屏 5–6），当前页高亮、书签页带角标。打开文件时不预生成；面板打开后只对视口内的瓦片排队，滚出视口即取消，且一次只解码一张。瓦片按显示宽度 × DPR 生成并限制在 240×320；优先复用阅读器已解码的页面，未缓存的页走同一个 `ZipPageSource` 按需解压。缩略图使用独立的 60 张 LRU 与独立的 objectURL，不占用阅读器的位图预算（32MP），被淘汰的滚回去再重建。面板打开期间工具栏不自动淡出；Esc / 点遮罩 / 再点按钮关闭，关闭后焦点回到按钮。单页、双页、纵向三种模式均可用 |
| 目录跳转 | ✅ | 仅在两种情况下出现，都没有时面板里完全不渲染目录：归档内图片条目分布在两个及以上目录（含根目录）；或 `ComicInfo.xml` 的 `PageList` 含同时带 `Bookmark` 与 `Image` 属性的 `<Page>` 条目，且页码落在有效范围内。入口复用缩略图面板：`Pages` 标题下多一条 `Contents` 横向列表，可左右滚动，不新增工具栏按钮。分组依据：`PageList` 书签优先（`Image` 为 0 起始索引，映射到当前页序）；没有书签时按图片所在目录分组，目录项跳到该目录第一页，根目录组名为 `Top level`。点击目录项复用缩略图跳页逻辑（关闭面板、`goToPage`、记录 `thumb_jump`）。单层包（全部图片在根目录或同一目录）不触发目录，页序也不变；只有多目录包改为按目录连续排列 |
| 深色 / 浅色主题 | ✅ | 页头右上角的太阳/月亮按钮是二态直切（16 条路由与 404 都有）：点一次就在 light / dark 之间切换，图标随 `data-theme` 同步，按钮带 `aria-pressed` 与随状态变化的 `aria-label`（`Switch to dark theme` / `Switch to light theme`），鼠标悬停有同样的 `title`。阅读器 `⋮` 菜单的 `Theme` 分组是一个 `menuitemcheckbox` 的 `Dark mode` 开关（右侧显示 On / Off），与页头共用 `resolvedTheme`，任一处改动另一处立即同步。存储仍是 `localStorage['cbz-theme']`；`auto` 继续是合法值并随系统实时切换，但 UI 不再提供入口，首次点击时按当前屏幕外观取反（系统浅色→dark，系统深色→light），之后写入明确的 light/dark。`src/prerender/head.ts` 在样式表之前输出阻塞内联脚本，先给 `<html>` 打 `data-theme` 再绘制，因此不会先白后黑。页头按钮的静态标记随预渲染 HTML 一起输出，`src/lib/themeSwitch.ts` 只负责增强（用 `watch(resolvedTheme)` 同步 ARIA 与点击切换），JS 未执行时页面仍按 head 脚本的主题正常显示，只是按钮不可点。图标显隐由 `:root[data-theme='dark']` 控制，不依赖 JS。颜色统一收敛为 `base.css` 的 `--token`（`:root` 浅色 + `:root[data-theme='dark']` 覆盖），覆盖落地页正文/列表/CTA/相关内链/页脚、书架卡片、404、`color-scheme` 滚动条、选中色与焦点环。漫画页面本身不做反色或背景替换 |
| PWA 清单与图标 | ✅ | `public/manifest.webmanifest` 声明 `display: standalone`、`start_url` / `scope`、`lang`、192/512 与 maskable 图标；深浅色各一份 manifest，用 `<link rel="manifest" media="(prefers-color-scheme: …)">` 区分 `theme_color` / `background_color`（不支持 `media` 的浏览器会回退到先出现的浅色那份）。`renderHead()` 同时输出 manifest 与 `apple-touch-icon` 链接，随预渲染 HTML 一起落地。图标由 `npm run icons` 从 `favicon.svg` 渲染 |
| 离线可用 | ✅ | `scripts/sw-template.js` 由 `scripts/prerender.mjs` 注入版本号与预缓存清单后写成 `dist/sw.js`（版本取自带 hash 的资源名，旧缓存自动清理）。导航请求 network-first + 缓存兜底，`/assets/*` cache-first，同源其它资源 stale-while-revalidate；只预缓存首页外壳与静态资源，未访问过的内容页不进缓存。新版本 install 后停在 waiting，由下一次导航的页面发 `SKIP_WAITING` 接管，不在阅读中途刷新；dev 环境不注册 |
| 站点标识 | ✅ | 页头 chip 与 favicon 统一为 `CBZ` 字标（此前页头 chip 是 `CB`，favicon 是书本图形）。`public/favicon.svg` 保持原有深底 `#0d0d12` + 米白 `#f7f5f0` + 橙红 `#c2410c` 配色：深色圆角方块内是压紧字距的 `CBZ`，下方一条橙红短线；字标用 `textLength` 锁定宽度，避免不同系统字体把三字母撑出方块。`npm run icons` 从同一个 SVG 渲染 192/512/maskable 与 Apple 图标，maskable 用 56% 内缩，字标整体落在 80% 安全圆内 |
| 安装到主屏 | ✅ | 可添加到主屏（Chrome 安装入口、iOS Safari 分享→添加到主屏）；安卓与 iPhone 真机均已确认可添加成功。独立窗口、启动画面与 maskable 遮罩的实际观感尚未截图记录 |
| CBZ → PDF 转换 | ✅ | `/cbz-to-pdf/` 用 zip.js 在标签页内解压，再用 pdf-lib（懒加载，约 440KB）逐页合成 PDF。JPEG 页走 `embedJpg` 直接写入原始 JPEG 数据，PNG 走 `embedPng` 无损嵌入；WebP/GIF/AVIF/BMP 转一次 JPEG(q=0.92)。下载由页面内的 blob 链接触发，文件名为原文件名换 `.pdf` |
| 转换页面尺寸 | ✅ | 默认「Original size」：页面等于图片像素，1 像素 = 1pt，不重采样；「Fit to A4」：等比缩放到 595.28×841.89pt 内并居中，不裁剪 |
| 转换进度与错误 | ✅ | 逐页进度条（`role="progressbar"` + `aria-valuetext`）与取消（AbortSignal，逐页与收尾各检查一次）；错误按原因区分：非 ZIP、加密包、无图片条目（带条目总数）、内存不足、单页读取/嵌入失败（带页码），CBR/CB7 给出具体处理建议而不是笼统报错 |
| 转换不上传 | ✅ | 转换链路只读本地文件与本地 blob，全程不发起携带文件内容或页面图像的请求（转换期间只有一次不含文件数据的统计事件）；`npm run test:convert` 拦截页面上所有非 GET/HEAD/OPTIONS 请求并断言为 0 |
| 转换页可自行验证 | ✅ | `/cbz-to-pdf/` 的 *How the conversion works in this tab* 一节内嵌一块 *Verify it yourself*（桌面 DevTools → Network、手机飞行模式两条可执行步骤），FAQ 增加对应问答。文案严格限定在转换功能上（`this converter` / `the conversion runs entirely in this tab`），不写成全站承诺，也不使用「没有任何网络请求」这类与统计脚本矛盾的表述。**这段话与实现绑定：若转换功能的实现方式变化（例如引入服务端转换），必须同步修改这一块与对应 FAQ。** |
| 转换测试 | ✅ | `npm run test:convert` 覆盖：30 页 PNG 包的原图尺寸与页数、A4 页盒、JPEG 包的直通（PDF ≥ 原 JPEG 字节 95%）、CBR 文案、20 页 3000×4500 压力包，以及全程零上传 |
| 预渲染落地页 | ✅ | 16 条静态路由：首页、`/cbz-to-pdf/`、`/read-cbz-online/`、`/manga-reader/`、`/how-to-open-cbz/`、`/cbz-vs-cbr/`、`/what-is-a-cbz-file/`、`/cbz-file-format/`、`/read-cbz-on-iphone/`、`/read-cbz-on-android/`、`/how-to-make-a-cbz-file/`、`/cbz-file-wont-open/`、`/privacy/`、`/terms/`、`/disclaimer/`、`/demo/`（其中 `/demo/` 为 `noindex` 且不进 sitemap，sitemap 为 15 条） |
| 条款与免责页 | ✅ | `/terms/` 与 `/disclaimer/` 复用落地页版式：Terms 覆盖 as-is 提供、不存储文件、合法使用权、禁止侵权/违法用途、责任限制、条款变更与联系方式；Disclaimer 声明与出版商/发行商/平台无关联、商标归权利人、不托管或分发漫画内容（唯一例外是内置的公有领域样例，页面已标注作品、作者、许可与来源）、仅本地处理、第三方链接免责。适用法律写「运营者营业地适用法律」，不写死国家，也不编造主体名称/地址/VAT。页脚与隐私页互链，JSON-LD 只保留 BreadcrumbList |
| 样例漫画入口 | ✅ | `/demo/` 打开后自动加载 12 页公有领域漫画《Little Nemo in Slumberland》（Winsor McCay，1908 年《New York Herald》周日版，Commons 许可模板 `{{PD-US}}`），无需选择文件；页面标注作品、作者、许可与来源链接。`/demo/?size=large` 仍加载 20 页 3000×4500 大图包，仅供内部测试，界面不暴露。页面不出现落地页导航与页脚，`noindex,nofollow`、不进 sitemap；首页在阅读/转换两张卡片下方提供次级入口「Try with a sample comic」。样例包位于 `public/samples/`，不进入 Service Worker 预缓存 |
| 工具站信息架构 | ✅ | 首页收起长篇正文：首屏只有 H1、两行内导语、双入口卡片、一条信任语与示例漫画入口；*More CBZ tools* 共 12 张卡（4 列三行补满，含 `Sample` 类型的示例入口），每张描述在 1280px 与 375px 下都只占一行；FAQ 收敛为 3 条。双入口、12 张卡与示例入口全部是预渲染的静态 HTML，无 JS 也可见；首页不再渲染 *Keep reading*，避免同页重复链接。首页 title 55 字符、description 153 字符，仍以 `Read CBZ comics in your browser` 为主关键词意图；JSON-LD 的 `featureList` 增加转换能力，`WebSite.description` 同步为「读取 + 转换」 |
| SEO 元信息 | ✅ | 每页独立 title/description、canonical、hreflang、OG/Twitter、JSON-LD（WebSite / WebApplication / Article / FAQPage / BreadcrumbList；法律页只有 BreadcrumbList）；站内链接全部指向已预渲染的 16 条路由（`/demo/` 为 noindex，不参与收录），构建后检查无断链 |
| 社交分享图 | ✅ | `public/og-image.png` 1200×630；`og:image` 含 width/height/alt，`twitter:image`，卡片类型为 `summary_large_image` |
| 404 与静态资源 | ✅ | `public/404.html`；未知路径与缺失的 `/assets/*` 由 Cloudflare Pages 返回 404，而不是回退首页 200 |
| sitemap / robots | ✅ | 构建时按 `SITE_URL` 生成 `sitemap.xml` 与 `robots.txt` |
| IndexNow key | ✅ | `public/9e8924757260408b8cc99fc55a8da5f7.txt` 是 IndexNow 的 key 文件（内容即 key 本身），部署后可从站点根路径访问；Bing / Yandex 用它校验后即可通过 `POST https://api.indexnow.org/indexnow` 主动推送新页或改动页，不必等抓取 |
| 访问统计 | ✅ | Cloudflare Web Analytics（无 cookie）+ Umami；事件只带粗粒度属性，口径见 5.8 |
| 阅读器懒加载 | ✅ | 阅读器单独 chunk，首屏只加载落地页与样式 |
| 部署头 | ✅ | `public/_headers` 配置安全头、HSTS 与静态资源长缓存 |
| 端到端自测 | ✅ | `npm run test:e2e` 用本机 Edge/Chrome 打开 CBZ，验证解码、翻页、纵向窗口滑动与模式切换保位，断言阅读层覆盖视口、工具栏隐藏/恢复、关闭回原滚动位置、`popstate` 关闭阅读器、`F` 全屏与 `fullscreenEnabled` 为假时的降级，并断言 dev 环境不注册 Service Worker；缩略图面板断言打开、当前页高亮、点击跳页、Esc 关闭并回焦，以及 375px 下底栏不溢出、网格为 3 列 |
| 离线验收测试 | ✅ | `npm run test:offline` 针对生产构建断言：外壳预缓存不含内容页、断网刷新首页完整显示、断网打开本地 CBZ 并成功翻页、改动后的文档在下一次导航可见 |
| 格式错误文案 | ✅ | CBR/RAR 与 CB7/7z 会明确提示容器不支持，并给出「解包后重新打包成 .cbz」的建议，而不是笼统的 `not a valid CBZ or ZIP` |
| 测试样例脚本 | ✅ | `npm run samples` 用无头浏览器渲染图片并打包 CBZ，一次生成 6 个样例到 `D:\edgeDown\testData\archive`（页数/尺寸/文件名可按参数改，输出不进仓库）；`npm run samples:demo` 只生成 `/demo/?size=large` 用的 20 页大图包；`npm run demo:comic` 从 Wikimedia Commons 拉取连续的公有领域周日版页面，逐页核验许可后生成 `/demo/` 样例（来源与参数见 5.9） |

### 3.2 真机验证记录

| 场景 | 样例 | 结果 |
| --- | --- | --- |
| 30 页普通尺寸包的纵向滚动与页码连续性 | `demo-30pages.cbz`（30 页，1200×1800） | ✅ 安卓真机通过：滚动无白屏、无跳页，页码连续 |
| 大图包解码、降采样与内存 | `large-pages-20.cbz`（20 页，3000×4500，54.5MB） | 🟡 待重测（12MP 档）：上一轮 8MP 档安卓通过，改档后需重新验证 |
| 大图包在 iOS 上的解码与画布 | `/demo/?size=large`（20 页，3000×4500，约 6.5MB） | ✅ iOS 18 真机（pCloudy，iPhone 16e / Safari 18）通过：自动加载完整 20 页，无白屏、无重载。该结果只覆盖「20 页 3000×4500」这一档，不等于任意页数或更大源图已验证；页数继续增大时仍走同一套 LRU 与解码预算，属于未压测范围 |
| 长包滚动与窗口滑动 | `long-120pages.cbz`（120 页） | ✅ 安卓真机通过 |
| 自然排序 | `messy-order.cbz`（乱序命名） | ✅ 安卓真机通过：页序正确 |
| 超长文件名省略 | `long-name_Herman-Melville-Moby-Dick-Chapter-037-Complete-Scan.cbz` | ✅ 安卓真机通过：顶栏省略正常 |
| 暗色主题 | 首页 + 阅读器 | ✅ 安卓与 iPhone 真机确认：深色下正文、菜单与页头图标正常 |
| 离线（飞行模式） | 已访问过一次的站点 + 本地 `demo-30pages.cbz` | ✅ 安卓与 iPhone 真机确认：飞行模式下刷新首页可打开，本地 CBZ 可导入并翻页 |
| 添加到主屏 | 站点首页 | ✅ 安卓与 iPhone 真机确认可添加成功 |
| 沉浸式阅读层与浮动工具栏 | `demo-30pages.cbz` | 🟡 桌面无头 Edge 通过：阅读层四角覆盖、关闭回原滚动位置、`popstate` 关闭、`F` 进入/退出全屏、`fullscreenEnabled` 为假时菜单无该项且 `F` 无效；安全区与下滑隐藏待真机 |
| 离线转换（飞行模式） | 本地 CBZ | ✅ iOS 真机通过：先联网打开 `/cbz-to-pdf/`，开飞行模式，选择本地 CBZ，进度走完并成功下载 PDF。桌面侧另有生产构建 + 浏览器离线模式的记录（30 页包，16.6MB PDF），两端结果一致 |
| 缩略图网格 | `long-120pages.cbz`（120 页，1200×1800） | 🟡 桌面无头 Edge（1280×900）：首屏 24 张约 0.19–0.24s，滚动 89 帧平均 16.7ms、最大 16.8ms（无 >50ms 帧），JS 堆 2.6→7.2MB，滚动回收后回到 5–6MB；缓存最多 60 张，淘汰后滚回可重建。真机滚动与触控待验证 |

### 3.3 仍需真机确认（含 iOS 盲区）

以下项目**尚未**验证。iOS 侧仍需在 pCloudy 设备云上按第 5 节清单跑一遍；安卓通过不代表 iOS 通过。

- 🟡 **沉浸式在真机上的行为未验证**：安全区内边距（刘海/圆角/Home 指示条）、下滑隐藏工具栏、纵向滚动淡出的手感、安卓返回手势关闭阅读器、iOS 首次进入的「添加到主屏」提示条，目前只有桌面无头 Edge 的逻辑断言，没有真机截图。
- 🟡 **iOS 大规模场景未验证**：文件导入链路（含 `accept` 放宽、从「文件」App 分享进来）、捏合阻止页面整体缩放、安全区（刘海/圆角/Home 指示条）、触控热区、惯性滚动、Safari 全屏缺失时的菜单行为。
- 🟡 **12MP 档下的大图包待重测**：`large-pages-20.cbz` 与 `extreme-6pages-5000x7500.cbz` 在 8MP 档曾有安卓通过记录，本轮把上限提到 12MP 后需要在安卓上重新跑一遍解码、翻页与连续多页后的内存表现。
- 🟡 **iOS 画布上限只覆盖了 3000×4500 档**：`/demo/?size=large`（20 页 3000×4500，约 6.5MB）已在 iOS 18 真机（iPhone 16e / Safari 18）完整加载，无白屏、无重载，说明该档位在当前钳制策略下可用。`extreme-6pages-5000x7500.cbz`（5000×7500，37.5MP）仍没有 iOS 实测；页数继续增大时依赖同一套 LRU 预算，也属于未压测范围。
- 🟡 **离线的长期行为未验证**：安卓与 iPhone 真机已确认飞行模式下刷新首页、打开本地 CBZ 与翻页；iOS 长期不访问后系统清理缓存、新版本 SW 在真机上的接管时机仍未记录（`npm run test:offline` 覆盖的是桌面流程）。
- 🟡 **添加到主屏的视觉细节未验证**：两端真机确认可添加；独立窗口、启动画面、maskable 图标的实际遮罩效果、以及深色系统下启动时的主题色都还没有真机截图。
- 🟡 2x–3x 缩放后的拖动与滚动：桌面已用 Ctrl + 滚轮模拟（锚点不跑位、窗口仍 12 页、复位正常）；真机上放大后的双指拖动、跨窗口滚动与惯性未实测。
- 🟡 移动端其它手势：滑动翻页、点击分区翻页、双击复位只在桌面无头 Chromium 中验证。
- 🟡 双页模式在窄屏下的默认值：宽度 ≥980px 默认双页，否则默认单页；小屏双页可读性未评估。
- 🟡 **暗色的边缘行为未验证**：安卓与 iPhone 真机已确认暗色显示；对比度仍是桌面测量（正文 13.1:1、次要文字 7.8:1、主按钮 6.9:1、⋮ 菜单 14:1、页头主题按钮图标 16.4:1），系统主题实时切换、强制深色（forced dark）、`color-scheme` 滚动条、选中色与焦点环只有桌面记录。
- 🟡 CBZ → PDF 转换的大包内存未验证：iOS 真机已在飞行模式下跑通一次本地 CBZ 转换（先联网打开 `/cbz-to-pdf/`，断网后转换并下载 PDF），桌面侧另有页数、页面尺寸、JPEG 直通与零上传的测试覆盖；但 30 页 3000×4500 这类大包在 iOS Safari 上的内存上限仍是明确盲区。
- 🟡 超大包压力测试：尚未用 300 页以上、单页 4K 的真实漫画包做压测。

### 3.4 续读策略与统一解码上限

**为什么要做选择**：浏览器出于安全不允许网页自动重新打开用户上次选择的本地文件（File System Access API 之外没有持久句柄），所以「点一下继续读」只能靠提前存一份数据。

采用按体积分级，而不是一律存副本：

- **≤32MB**：把原始 CBZ 作为 Blob 存进 IndexedDB，点「最近阅读」条目直接用这份副本打开，指纹与上次一致，自动回到上次页码。最多保留最近 3 个副本，第 4 个进来时淘汰最旧的副本（条目本身保留）。
- **>32MB 或副本被淘汰**：只保留指纹、页码、模式与封面。点条目会打开文件选择器并提示「再次选择同一个文件即可回到第 N 页」，选中后由现有指纹逻辑恢复。这样做是为了不把几十 MB 的压缩包塞进用户设备的存储配额，安卓/iOS 的配额上限差异也很大。
- 写副本失败（隐私模式、配额不足）时静默降级为只记指纹，阅读本身不受影响。

**统一解码上限**：`loadPageAsset` 不按 UA 分支，所有平台共用 `MAX_DECODE_DIM = 4096`、`MAX_DECODE_PIXELS = 12_000_000`。页面本身已在这两个限制内时直接使用原始数据；否则按 `min(目标宽度/原宽, 4096/原宽, 4096/原高, √(12MP/原像素))` 等比降采样后重新编码为 JPEG(q=0.92)。

**12MP 档的实际收敛结果**（目标宽度：常规 2400px，纵向高倍缩放最多 3200px）：

| 原图 | 常规 / 手机缩放 | 宽屏高倍（目标 3200） |
| --- | --- | --- |
| 3000×4500（13.5MP） | 2400×3600（8.64MP） | 2731×4096（11.19MP） |
| 5000×7500（37.5MP） | 2400×3600（8.64MP） | 2731×4096（11.19MP） |

对照上一版 8MP 档，两者在常规档都是 2309×3464（8.0MP）。也就是说 12MP 档在手机上只多出约 4% 的线性分辨率，原因是**目标宽度 2400px 先于像素上限生效**；真正吃到 12MP 的是宽屏 + 高倍缩放（目标 3200px）场景，那里从 2309 宽提升到 2731 宽，约 +18%。

**2x / 3x 的观感**：手机 390px 视口、DPR 3，页面显示宽度约 366 CSS px。1x 需要约 1098 设备像素，2x 约 2196，3x 约 3294。源宽 2400 在 2x 仍然富余，肉眼无差别；3x 需要 3294 而只有 2400，浏览器做约 1.37x 插值放大（旧档 1.43x），线条略软但没有色块或锯齿。若要在手机 3x 下真正 1:1，需要把解码目标按 devicePixelRatio 提到约 3300px，那是另一次内存与解码耗时决策，本轮没有做。

**LRU 实测（本轮重点）**：LRU 预算仍为 `MAX_TOTAL_PIXELS = 32MP`。纵向窗口固定 12 页，而 12 × 8.64MP = 104MP（宽屏高倍下 12 × 11.19MP = 134MP），远超预算，所以窗口每滑动一页就会有 1 页被淘汰并在进入窗口时重新解码——这在 8MP 档就已经存在，12MP 只是把单页解码成本抬高了约 8%（手机）/ 40%（宽屏高倍，因页更大）。

在无头 Edge（`large-pages-20.cbz`，390×844、DPR 3）上以约 15 页/秒的极端速度来回滚动实测：

| 档位 | 前进 10 步 | 后退 10 步 |
| --- | --- | --- |
| 8MP，预算 32MP | 4 次解码 / 32MP / p95 100ms | 10 次 / 80MP / p95 133ms |
| 12MP，预算 32MP | 4 次解码 / 34.6MP / p95 83ms | 8 次 / 69MP / p95 117ms |
| 12MP，预算 48MP | 5 次解码 / 43.2MP / p95 83ms | 7 次 / 60.5MP / p95 133ms |

结论与取舍：

- 高倍缩放本身不触发重解码（已在窗口内的页面沿用原图），2.77x 下滚动 p95 为 17ms，不抖动；抖动只出现在窗口滑动 + 快速来回滚动时。
- **不建议再提高预算**：把预算提到 48MP（解码位图上界约 192MB）只减少约 1–2 次解码，提到 64MP（约 256MB）也仍装不下 12 页，安卓中低端机有大面积 OOM 风险，收益不成比例。
- 若后续真机反馈快速滑动明显卡顿，更划算的方案是**按页大小自适应窗口**（例如 32MP 预算下把纵向窗口从 12 页降到 6–8 页），而不是继续抬预算；这需要单独一轮改动与真机验证。
- 常规阅读（每几秒翻一页）只会触发一次后台解码（300–500ms），页面用占位符过渡，不会白屏。

---

## 4. 待实现功能

按建议顺序排列。预渲染落地页、SEO 元信息、双页与纵向连续模式已经完成，不再重复列入。

### P0：上线后观察

1. 真机验证 iOS Safari 与 Android Chrome 的文件导入、手势、内存表现。
2. 300 页以上真实 CBZ 的压力测试，确认翻页与纵向滚动不累计内存（可用 `npm run samples` 生成的 `long-120pages.cbz` 先做一半规模的预演）。
3. 错误态文案与空包、损坏包、加密包的用户提示复核。
4. 线上域名检查：`SITE_URL`、canonical/hreflang、`sitemap.xml` 与实际域名一致。

### P1：体验补强

1. 阅读设置持久化：默认模式、背景色、是否自动识别宽页。
2. 离线补强：为常访问的内容页做显式预缓存、更新可用时的非打断提示。
3. 安装引导：在合适的位置提示「可添加到主屏」，而不是依赖浏览器菜单。

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
4. `node scripts/prerender.mjs` 把每条路由渲染成 `dist/<route>/index.html`，生成 `sitemap.xml`、`robots.txt`，最后写入带版本号与预缓存清单的 `dist/sw.js`。

`public/404.html` 会随构建复制到 `dist/404.html`。Cloudflare Pages 用它作为未匹配路径的响应：状态码为 404，而不是把 `index.html` 以 200 返回。`dist-ssr/` 只是构建中间产物，不需要部署。

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

- `SITE_URL`：生产域名。当前线上为 `https://cbzreader.mavi.help/`，构建时用于 canonical、hreflang、JSON-LD、sitemap 与 robots。**未设置时会回退到 `https://your-domain.com` 占位值，不能直接上线。**
- 修改 `SITE_URL` 后必须重新构建，它只影响构建产物，不是运行时变量。

`public/_headers` 会随构建复制到 `dist/_headers`，由 Cloudflare Pages 识别，用于安全头、HSTS 和 `/assets/*` 的长期缓存。

**HSTS 的选择**：写在 `_headers` 里，而不是只依赖 Cloudflare 面板开关。这样配置跟代码一起版本化、随部署生效，取值 `max-age=31536000`（1 年），**不加 `includeSubDomains`、不提交 `preload`**：

- 不加 `includeSubDomains`：当前只有 `cbzreader.mavi.help` 这一个主机需要强制 HTTPS；加上会把策略扩散到它的所有子域，未来若新增 `api.`、`staging.` 等子域，必须立刻具备有效 HTTPS，否则会被浏览器直接拦截。
- 不提交 `preload`：预加载列表是单向的，移除需要数月且依赖浏览器更新；对一个刚上线的工具站没有必要承担这个不可逆成本。
- 副作用：浏览器会在 1 年内拒绝该主机的 HTTP 访问和无效证书。如果将来确实需要回退到 HTTP，只能先通过 HTTPS 下发 `max-age=0` 清除，而用户必须先成功访问一次 HTTPS。

### 5.5 自定义域名上线检查

1. 在 Pages 项目 → Custom domains 绑定域名，按提示配置 DNS（域名已托管在 Cloudflare 时通常自动完成）。
2. 确认 `SITE_URL` 使用最终主域名（含或不含 `www` 只保留一个），然后重新构建。
3. 检查首页源码：`<link rel="canonical">`、`hreflang`、`og:url`、JSON-LD 中的 URL 都应是生产域名。
4. 访问 `/sitemap.xml` 与 `/robots.txt`，确认地址可访问且指向生产域名。
5. 提交 sitemap 到 Google Search Console / Bing Webmaster Tools。
6. 站点部署在域名根路径下，页面内链接使用绝对路径（`/how-to-open-cbz/`）；如果将来要部署到子路径，需要统一调整链接与 `base`。

#### 可选：让 `www.cbzreader.mavi.help` 可访问并 301 到裸主机

这件事需要你在 Cloudflare 面板操作，仓库里没有可改的代码。建议做：成本低，能接住手输 `www` 的访问，且不会产生重复内容。步骤：

1. 在 Cloudflare 控制台选择 `mavi.help` 这个 Zone → DNS → Records → Add record：Type `CNAME`，Name 填 `www.cbzreader`，Target 填 `cbzreader.mavi.help`，代理状态保持 Proxied（橙色云）。
2. 回到 Pages 项目 → Custom domains → Set up a custom domain，添加 `www.cbzreader.mavi.help`，让 Pages 也认可这个主机名（DNS 记录已存在时通常直接通过验证）。
3. 在同一 Zone → Rules → Redirect Rules → Create rule：匹配条件用 `Hostname equals www.cbzreader.mavi.help`（或自定义筛选表达式 `http.host eq "www.cbzreader.mavi.help"`），动作为 Static redirect 到 `https://cbzreader.mavi.help`，状态码 **301**，勾选保留查询字符串。
4. 验证：`curl -I https://www.cbzreader.mavi.help/` 应返回 `301` 且 `Location: https://cbzreader.mavi.help/`；`https://cbzreader.mavi.help/` 保持 200。canonical 仍然只指向裸主机，不需要修改 `SITE_URL`。

注意：**不要只把 `www` 加成第二个 Pages 自定义域名而不做 301**，否则同一内容会在两个主机名上返回 200，形成重复内容；如果不想做重定向，就不要绑定 `www`。

### 5.6 本地端到端自测（可选）

```bash
# Windows 默认会查找 Edge/Chrome；也可显式指定
$env:EDGE_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$env:CBZ_SAMPLE="D:\path\to\your.cbz"
npm run test:e2e
```

脚本会启动开发服务器、用无头浏览器选中样例 CBZ，等待图片解码，然后依次断言：阅读层是 `position: fixed` 且四角覆盖视口（站点页头/页脚被压住）、点画面中部隐藏工具栏与底栏再点恢复、`F` 进入并退出浏览器全屏；接着翻页、切到纵向模式验证窗口化渲染与滚动保位，用 Ctrl + 滚轮把纵向模式放大到约 2.5x，断言页面宽度增长、出现横向滚动、窗口仍为 12 页、捏合中心下的内容不跑位，再滚到最后一页验证高倍下的窗口滑动，点工具栏读数复位到 100%，切回单页确认位置不变；最后关闭阅读器断言回到打开前的滚动位置、`history.back()` 只关闭阅读器不离开站点、以及伪造 `fullscreenEnabled === false` 时菜单不出现全屏项且 `F` 无效。滚动会自动隐藏工具栏，所以脚本在需要点工具栏按钮前会先点一下画面中部把它唤回。截图输出到 `test/.cache/e2e-reader.png`、`test/.cache/e2e-scroll.png` 与 `test/.cache/e2e-scroll-zoom.png`。

#### 离线验收（`npm run test:offline`）

这条需要生产构建，测试直接托管 `dist/`：

```powershell
$env:SITE_URL="https://cbzreader.mavi.help"
npm run build
$env:CBZ_SAMPLE="D:\path\to\your.cbz"
npm run test:offline
```

脚本用一个临时静态服务器托管 `dist/`（端口取 `OFFLINE_PORT`，默认 4189），用无头 Edge 断言四件事：外壳缓存只含首页与静态资源、断网刷新首页内容完整、断网打开本地 CBZ 且能翻页、改动后的文档在下一次导航可见（说明 HTML 走 network-first，不会被旧缓存卡住）。

#### CBZ → PDF 验收（`npm run test:convert`）

```powershell
$env:CBZ_SAMPLE="D:\edgeDown\testData\archive\demo-30pages.cbz"
$env:CBZ_JPEG="D:\edgeDown\testData\archive\hermano_lobo_1972_001 .cbz"   # 可选，JPEG 直通样例
$env:CBZ_STRESS="D:\edgeDown\testData\archive\large-pages-20.cbz"        # 可选，压力包
npm run test:convert
```

脚本在开发服务器（端口取 `CONVERT_PORT`，默认 5201）上打开 `/cbz-to-pdf/`，依次转换：

1. 默认「Original size」：用 `PDFDocument.load()` 读回产物，断言页数等于 ZIP 内图片条目数、首页页面尺寸与源 PNG 的像素尺寸完全一致（1 像素 = 1pt）。
2. 「Fit to A4」：断言所有页的页面盒为 595.28×841.89pt。
3. JPEG 包：断言 PDF 体积 ≥ 源 JPEG 字节总和的 95%，证明页面走的是原始 JPEG 直通而不是重编码。
4. `.cbr` 输入：断言错误文案点名 `CBR (RAR) archives are not supported` 并给出建议。
5. 压力包（20 页 3000×4500）：断言页数与首页尺寸，记录耗时。
6. 全程拦截页面请求，断言没有任何带 body 的请求（`POST` / `PUT` / `PATCH` 等），即文件内容没有离开标签页。

Chrome 对同一站点的第二次自动下载会要求用户手势，因此第一轮校验真实落在下载目录里的文件，后续轮次直接从 `[data-convert-download]` 指向的 blob 读取字节，并校验 `download` 属性等于「原文件名 + `.pdf`」。

### 5.7 生成真机测试样例

真机压测需要页数多、尺寸大或文件名极端的包，可以本地生成（图片由无头 Edge/Chrome 渲染，不依赖外部素材）：

```bash
npm run samples                     # 全部生成到 D:\edgeDown\testData\archive
npm run samples -- --out D:\somewhere\archive
npm run samples -- --only=long      # 只生成文件名含 long 的样例
npm run samples:demo                # 只生成 /demo/ 用的两个包，写入 public/samples/
```

每个页面都印有超大页码、`PAGE n OF N` 与文件名，并逐页换底色，方便肉眼判断页序、跳页和重复页。默认样例：

| 文件 | 页数 | 单页尺寸 | 用途 |
| --- | --- | --- | --- |
| `demo-30pages.cbz` | 30 | 1200×1800 | 虚拟滚动窗口、页码连续 |
| `long-120pages.cbz` | 120 | 900×1350 | 长包滚动与窗口滑动 |
| `large-pages-20.cbz` | 20 | 3000×4500 | 内存预算、降采样、大图解码 |
| `long-name_Herman-Melville-Moby-Dick-Chapter-037-Complete-Scan.cbz` | 15 | 1200×1800 | 工具栏文件名省略 |
| `messy-order.cbz` | 12 | 1200×1800 | 自然排序（ZIP 内顺序为 1、10、2、11…） |
| `extreme-6pages-5000x7500.cbz` | 6 | 5000×7500 | canvas 尺寸/面积钳制 |

输出目录在仓库外，不会被提交；重新运行会直接覆盖同名文件。

`/demo/` 用的两个包是例外，它们随站点部署，所以写进 `public/samples/` 并提交：

| 文件 | URL | 页数 | 单页尺寸 | 体积 | 用途 |
| --- | --- | --- | --- | --- | --- |
| `little-nemo-1908.cbz` | `/demo/` | 12 | 780×约 1010（逐页 999–1027） | 约 1.83 MB | 面向用户的公版漫画样例：打开、翻页、缩略图、纵向 |
| `sample-large-20-pages.cbz` | `/demo/?size=large` | 20 | 3000×4500 | 约 6.5 MB | 内存、降采样与画布钳制（仅内部） |

`little-nemo-1908.cbz` 是真实公版漫画，来源、许可与处理参数见 5.9；`sample-large-20-pages.cbz` 仍是合成图，只用于内存测试。`/demo/` 是样例入口而不是设备测试页：打开即自动加载，不需要选择文件；页面 `noindex,nofollow`、不进 `sitemap.xml`、不进顶栏导航，样例也不在 Service Worker 预缓存里（只有外壳与 `/assets/*` 预缓存）。首页在阅读/转换两张卡片下方提供一条次级入口「Try with a sample comic」；`?size=large` 只保留给内部测试，界面不出现。

### 5.8 事件字典（Umami）

统计脚本写在 `src/prerender/head.ts` 的 `renderHead()` 里，随预渲染输出到每个静态页；本地开发没有这段脚本，`src/lib/track.ts` 检测不到 `window.umami` 时直接返回，不报错、不排队。所有事件只允许下列粗粒度属性，**不上报文件名、页面内容、书签内容或任何可识别个人的信息**。

| 事件 | 属性 | 用途 |
| --- | --- | --- |
| `tool_open` | `source`: `picker` / `drag` / `demo`；`ext`（仅扩展名，异常值记 `unknown`）；`size_bucket`: `<10MB` / `10-50MB` / `>50MB`（`demo` 只带 `source`，不带文件名与体积） | 打开链路的来源与包体积分布，判断大包比例 |
| `render_success` | `ms`：从打开文件到首屏解码完成 | 核心转化指标，替代「打开即成功」的误判 |
| `mode_switch` | `mode`: `single` / `double` / `scroll`（切换后的模式） | 布局偏好，验证纵向与双页的实际使用 |
| `zoom` | `level`：首次进入放大时的百分比 | 判断高倍缩放需求，只报每本书的第一次 |
| `bookmark_add` | 无 | 书签使用率；删除书签不上报 |
| `thumb_open` | 无 | 页面缩略图面板的打开率 |
| `thumb_jump` | `from` / `to`：1 起始的页码 | 用缩略图或目录跳页的距离分布；不带文件名 |
| `resume_accept` | 无 | 书架续读被接受（直接用本地副本打开） |
| `resume_decline` | 无 | 书架续读被拒绝（无副本，走重新选文件分支） |
| `cta_click` | `page`：所在页面路径；`target`：目标 href | 落地页 CTA 与相关内链的去向 |
| `conv_start` | `page_size`: `original` / `a4` | 转换被发起，用于看尺寸偏好 |
| `conv_success` | `pages`：页数；`ms`：从点击到 PDF 生成完成；`page_size` | 转换成功率与耗时分布 |
| `conv_fail` | `reason`: `not-zip` / `encrypted` / `no-images` / `memory` / `unknown`；`page_size` | 失败原因分类，`cancelled` 不上报 |

隐私页文案与此保持一致：两项统计（Cloudflare Web Analytics、Umami）均为无 cookie、不跨站跟踪、不做设备指纹。

### 5.9 样例漫画：来源、许可与处理

- 作品：*Little Nemo in Slumberland*，Winsor McCay 为《New York Herald》绘制的周日版（1905–1914）。选用 1908-03-01 至 1908-05-17 连续 12 个周日。
- 来源分类页：<https://commons.wikimedia.org/wiki/Category:Little_Nemo_in_Slumberland,_1908>
- 逐个文件页（每个都以 `?action=raw` 读取原文核对许可）：
  - <https://commons.wikimedia.org/wiki/File:Little_Nemo_1908-03-01.jpg>
  - <https://commons.wikimedia.org/wiki/File:Little_Nemo_1908-03-08.jpg>
  - <https://commons.wikimedia.org/wiki/File:Little_Nemo_1908-03-15.jpg>
  - <https://commons.wikimedia.org/wiki/File:Little_Nemo_1908-03-22.jpg>
  - <https://commons.wikimedia.org/wiki/File:Little_Nemo_1908-03-29.jpg>
  - <https://commons.wikimedia.org/wiki/File:Little_Nemo_1908-04-05.jpg>
  - <https://commons.wikimedia.org/wiki/File:Little_Nemo_1908-04-12.jpg>
  - <https://commons.wikimedia.org/wiki/File:Little_Nemo_1908-04-19.jpg>
  - <https://commons.wikimedia.org/wiki/File:Little_Nemo_1908-04-26.jpg>
  - <https://commons.wikimedia.org/wiki/File:Little_Nemo_1908-05-03.jpg>
  - <https://commons.wikimedia.org/wiki/File:Little_Nemo_1908-05-10.jpg>
  - <https://commons.wikimedia.org/wiki/File:Little_Nemo_1908-05-17.jpg>
- 许可：12 个文件页的 `{{Information}}` 里 `|Author=[[Winsor McCay]]`、`|Source=archive.org`、`|Permission={{PD-US}}`；页面没有单独的 Licensing 段，模板就挂在 `Permission` 字段上。**只有 `{{PD-US}}`，不是 CC0，也不是 CC BY**，站内与文档都不使用这两个标记。
- 页数与内容：12 页，均为完整周日版整页（报头、分格、对白、页脚版权行齐全），日期连续、风格统一；源扫描为 ~1740–1820×2300，单页 635–900 KB。
- 图像处理（`scripts/make-demo-comic.mjs`，无 sharp/ImageMagick，全部在无头浏览器 canvas 内完成）：
  1. 白平衡：按各通道 98.5 分位估计纸色并拉到 252，增益上限 1.5，修正老扫描的偏黄；
  2. 去页边：以亮度 < 224 的墨迹包围盒裁掉外围空白，留 8px 边距；任一侧裁掉超过 8% 或结果小于 70% 时判定为可疑，整页不裁，避免切到画面；
  3. 降采样：等比缩到 780px 宽，`imageSmoothingQuality = 'high'`；
  4. 统一编码 JPEG(q=0.58)；
  5. 以 STORE（不压缩）方式打包 CBZ，文件名 `page-001.jpg` … `page-012.jpg`。
- 结果：`public/samples/little-nemo-1908.cbz`，12 页，780×999–1027（首页 780×1018），约 1.83 MB。
- 复现：`npm run demo:comic`（可选 `--width` / `--quality` / `--out`）。脚本先用 `?action=raw` 逐页核验许可，缺 PD 模板会直接失败；源图缓存到 `scripts/.cache/little-nemo/`（已 gitignore），再次运行不重复下载。


---

## 6. 已知限制

- **iOS 文件导入**：iOS 不允许网站注册 `.cbz` 文件处理器，也没有 Web Share Target，因此必须先打开本站再选文件；iCloud 中未下载的文件需要先下载。iPad 上可拖拽，iPhone 上只能走文件选择器。
- **iOS 内存**：单标签页内存预算明显低于桌面，超大页面会被降采样；极大的包（数百 MB 以上、页面尺寸很高）仍可能触发页面重载。IndexedDB 在长期不访问时可能被系统清理，阅读进度不保证永久保留。
- **iOS 全屏**：Safari 不支持元素级 Fullscreen API，全屏菜单项与 `F` 自动隐藏。阅读器本身已经是固定视口层，首次进入会提示「添加到主屏可全屏阅读」，该提示只出现一次。
- **格式**：当前只支持 CBZ/ZIP；CBR（RAR）与 CB7（7z）会明确提示不支持并建议先转成 CBZ。加密 ZIP 无法读取。
- **转换输入**：只接受 CBZ/ZIP，CBR/CB7 与加密包会直接报错并说明原因；非图片条目（`ComicInfo.xml`、封面缓存、`__MACOSX`）会被跳过，因此 PDF 页数可能少于 ZIP 条目数。
- **转换的像素与体积**：原图尺寸模式下 1 像素 = 1pt，不做缩放；因此 3000×4500 的页面在 PDF 里也是 3000×4500。JPEG 直通不重编码，PNG 无损嵌入，WebP/GIF/AVIF/BMP 会转一次 JPEG(q=0.92)，这一步是有损的。
- **转换的内存**：整个 PDF 在标签页内构建，页数多、单页大的包需要同时容纳源码流与 PDF 缓冲；内存不足时会明确提示，但极高分辨率与极大页数组合仍可能失败，桌面比移动端更稳。
- **批量转换**：一次只处理一个文件，不支持队列或打包下载。
- **离线范围**：只有首页外壳与带 hash 的静态资源是预缓存的。没访问过的内容页断网时会显示一个离线提示页（不会把首页内容伪装成该 URL）；访问过的页面保留最后一次的副本，联网后再打开就会更新。
- **离线缓存的生命周期**：Service Worker 的缓存由浏览器管理。iOS 在长期不访问站点后可能清理它，用户清理站点数据或换浏览器也会丢失；清理后需要联网访问一次才能恢复离线能力。
- **续读指纹**：指纹包含文件名，重命名文件会被视为新文件；修改文件内容也会导致指纹变化。
- **续读副本**：只有 ≤32MB 的包会存副本，且最多 3 个；更大的包每次都要重新选文件，浏览器不允许网页自行重开本地文件。
- **双页配对**：默认封面单页，之后按 2-3、4-5 配对；暂不自动识别宽页（跨页大图）并单独展示。
- **纵向连续模式**：缩放范围 1x–4x，放大后需要横向拖动查看整页，不会自动按高度适配；DOM 只挂载 12 页窗口，极长漫画快速拖动滚动条时可能出现短暂占位符。
- **缩放的清晰度**：所有平台统一上限为单边 4096px、1200 万像素（12MP）解码；超过的页面等比降采样（3000×4500 与 5000×7500 在常规档都收敛到 2400×3600 = 8.64MP，宽屏高倍档收敛到 2731×4096 = 11.19MP）。放大后新进入窗口的页面会按当前缩放请求更高解码宽度（上限 3200px），已在窗口内的页面沿用原解码结果，不会因为放大而重新解码。常规档 2x 已接近 1:1、3x 略软；宽屏高倍档比 8MP 档多约 18% 线性分辨率，3x 的线条更实。
- **语言**：落地页目前只有英文，尚未接入 i18n。
- **无服务端**：没有云端备份、没有跨设备同步，清理浏览器数据会丢失进度。
- **统计**：只接 Cloudflare Web Analytics 与 Umami，均为无 cookie 统计；事件口径见 5.8，不记录文件名、页面内容或书签内容。

---

## 7. 目录结构

```text
cbz-reader/
├─ index.html                  # 预渲染模板（含 <!--head--> / <!--app-html--> 占位）
├─ scripts/prerender.mjs       # 构建时预渲染、sitemap、robots、sw.js
├─ scripts/sw-template.js      # Service Worker 模板（注入版本与预缓存清单）
├─ scripts/make-icons.mjs      # 从 favicon.svg 渲染 PWA 图标
├─ scripts/make-samples.mjs    # 生成真机测试用 CBZ（默认输出到仓库外，--demo 写入 public/samples）
├─ scripts/make-demo-comic.mjs # 从公版源 CBZ 生成 /demo/ 样例（来源与参数见 5.9）
├─ public/                     # favicon、manifest、PWA 图标、_headers、IndexNow key 文件、samples/（/demo/ 样例包）
├─ src/
│  ├─ main.ts                  # 静态首屏入口：文件选择 / 拖拽 / 懒加载阅读器
│  ├─ dev/devLanding.ts        # 仅开发模式：客户端挂载落地页
│  ├─ components/LandingPage.vue
│  ├─ components/recentShelf.ts # 首页「最近阅读」的客户端渲染（标记为预渲染占位）
│  ├─ content/                 # 页面文案、站点常量（Node 与浏览器共用）
│  ├─ prerender/               # SSR 入口与 head/JSON-LD 生成
│  ├─ reader/
│  │  ├─ ReaderApp.vue         # 阅读器 UI 与交互
│  │  └─ core/                 # ZIP、图片、指纹、进度、书签/最近阅读、排序
│  ├─ convert/                 # CBZ → PDF：pdf.ts 转换核心、ConvertApp.vue、mount.ts
│  └─ styles/base.css          # 设计系统与落地页样式
└─ test/
   ├─ e2e.mjs                  # 开发服务器上的阅读器交互验证
   ├─ offline.mjs              # 生产构建上的断网验收
   └─ convert.mjs              # CBZ → PDF 的产物与零上传校验
```
