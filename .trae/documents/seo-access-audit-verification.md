# 项目评估清单核实与优先级重排（只读）

## Context

外部给出的一份评估清单，断言了译文覆盖、EPUB 完成度、CBR 支持、收录状态和 5 个 P2 缺陷。本轮任务是不改代码地逐条核实，判断哪些是真问题、哪些被夸大，并回答：现阶段做 EPUB 是否有意义、先做哪一项最能解决访问量、会不会引入新麻烦。

本轮没有任何代码改动。以下结论分为 **已验证事实**（有文件/行号或线上抓取证据）、**推断**（有理据但未实测）、**无法证实**。

---

## 一、逐条核实

### 1. 译文覆盖 —— 数字接近，机制描述错误

**已验证事实**

`src/content/pages.ts` 定义了 16 个英文 URL：

| 类型 | 数量 | 路径（行号） |
| --- | --- | --- |
| 首页 | 1 | `/`（L53） |
| 工具/内容页 | 11 | `/read-cbz-online/`（167）、`/manga-reader/`（219）、`/how-to-open-cbz/`（272）、`/cbz-vs-cbr/`（345）、`/what-is-a-cbz-file/`（404）、`/cbz-file-format/`（485）、`/read-cbz-on-iphone/`（575）、`/read-cbz-on-android/`（662）、`/how-to-make-a-cbz-file/`（749）、`/cbz-file-wont-open/`（839）、`/cbz-to-pdf/`（1094） |
| About | 1 | `/about/`（1230） |
| 法律页 | 3 | `/privacy/`（933）、`/terms/`（991）、`/disclaimer/`（1047） |

中文只有 2 个：`/zh/`、`/zh/cbz-to-pdf/`；日文同样 2 个。见 [index.ts](file:///d:/project/rare-format-tool-site-v2/cbz-reader/src/i18n/index.ts) 的 `LOCALIZED_HOME_PAGES`、`LOCALIZED_CONTENT_PAGES`、`LOCALIZED_GROUPS`。

> 清单说「16 个英文内容页中只有 2 页有中文」：数字上成立，但把首页、About 和 3 个法律页都算成「内容页」不准确。真正该被翻译的工具/内容页是 11 个，其中只有 1 个（`/cbz-to-pdf/`）有中文。

**清单说错的地方**：「未翻译页面切换语言后仍显示英文」描述的是旧实现。当前 [LandingPage.vue](file:///d:/project/rare-format-tool-site-v2/cbz-reader/src/components/LandingPage.vue) 在无译文时渲染 `<button data-lang-missing>`，不导航；[main.ts](file:///d:/project/rare-format-tool-site-v2/cbz-reader/src/main.ts) 的 `wireLanguageNotice()`（164–185 行）只弹 5 秒提示。结果是「点中文无反应 + 提示暂无译文」，不是「切过去以后静默显示英文」。

**推断**：真正的问题不是机制，而是结果——中文用户在这些页面上得不到中文内容，体验断裂确实存在。

### 2. EPUB —— 准确

**已验证事实**

- `src/convert/epub.ts` 存在且实现完整：fixed-layout EPUB 3、复用 `@zip.js/zip.js`、图片字节原样复制、支持 ComicInfo 元数据与 RTL、错误分类 `not-zip | no-images | memory | cancelled | unknown`（L32）。
- 全 `src/` 搜索 `epub`（忽略大小写）只命中 `epub.ts` 自身，以及 `pages.ts:636` 一句 FAQ（「Books handles PDF and EPUB」）。`ConvertApp.vue` 只接 PDF，**没有任何 UI 入口**，用户确实用不到。

**无法证实**：「已通过结构测试」。`test/epub.mjs` 与 `package.json:18` 的 `test:epub` 脚本真实存在（断言 mimetype 为第一个且未压缩、container.xml / content.opf / nav.xhtml 存在），但本轮只读，未执行 `npm run test:epub`，不能替它背书。

### 3. CBR / CB7 —— 准确

**已验证事实**

- `pages.ts:87`：「CBR and CB7 are on the roadmap but are not supported in this version.」
- `pages.ts:373`、`:398` 同样写明计划用懒加载 libarchive 模块，并提到 UnRAR 许可证限制。
- `zipSource.ts:24-35` 的 `unsupportedMessage()` 对 `.cbr/.rar/.cb7/.7z` 给出明确错误文案，不只是页面上的 roadmap 措辞。

### 4. 收录与外链 —— 一半可证实，一半无法证实

| 断言 | 判定 | 证据 |
| --- | --- | --- |
| 未进 Google 索引 | **无法直接证实** | GSC 是用户私有面板，无法访问。公开 `site:cbzreader.mavi.help` 无结果，只能算间接信号，不等价于 GSC 的「Crawled - currently not indexed」 |
| 真外链 0 个 | **无法证实** | 需要完整 backlink 数据。只能确认公开检索里除 MobileRead 外没找到其他提及；「0」这个绝对值无法证明 |
| MobileRead 那条是 nofollow | **已验证** | 实际抓取 HTML 只有一个 anchor：`<a href="https://cbzreader.mavi.help/" rel="nofollow">` |
| GSC sitemap 报错未解 | **无法直接证实** | 用户观察。此前只读核查已证明线上 sitemap 对 Googlebot UA 返回 200、XML 合法、17 条 loc、域名正确、hreflang 合法、robots 一致 |
| Bing 侧靠 IndexNow | **已验证** | `scripts/indexnow.mjs` 提交到 `api.indexnow.org`（Bing/Yandex/Naver/Seznam），`package.json` 的 build 末尾执行；Google 不吃 IndexNow |

### 5. 五个 P2 缺陷

| # | 断言 | 判定 | 证据与修正 |
| --- | --- | --- | --- |
| a | SW 新版本无提示，要等下次访问 | **属实，但严重性被高估** | `main.ts:189-204` 的 `registerServiceWorker()` 没有 `updatefound` UI，只对已有 waiting worker 发 `SKIP_WAITING`。但 `scripts/sw-template.js` 对 HTML 走 network-first，用户通常仍能拿到新 HTML |
| b | 全屏阅读器空格翻页，按钮无法用空格触发 | **属实，且影响面比清单更大** | `ReaderApp.vue:1661-1666` 只排除 `INPUT/TEXTAREA/contentEditable`，不排除 `BUTTON`；`:1731-1735` 的 `case ' '` 先 `preventDefault()` 再翻页。所有聚焦按钮都受影响（缩放、翻页、菜单等），不止翻页按钮 |
| c | 缩略图面板一次渲染全部页面，上千页会卡 | **部分属实，有夸大** | `:238-240` 生成全部 `pageIndices`，`:2373-2396` 全量 `v-for` 出 DOM；但图片走 IntersectionObserver 懒加载，缓存上限 60（`:49`、`:1158`）。「全部 DOM」为真，「全部解码」为假；上千页卡顿是**推断**，未实测 |
| d | PDF「原始尺寸」把 1px 当 1pt | **属实** | `pdf.ts:324-327`：`pdf.addPage([image.width, image.height])`，注释明确写「one image pixel maps to one PDF point」。物理尺寸偏大（1800px→25 英寸），屏幕 fit-to-window 时不易察觉，打印/印刷会暴露 |
| e | 移动端按 2400px 解码，低端机掉帧 | **表述不准确** | `imageLoader.ts:3-12` 是全平台统一预算：`MAX_DECODE_DIM 4096`、`MAX_DECODE_PIXELS 12M`、`TARGET_WIDTH 2400`。只有超限的大图才降采样到 2400 宽，桌面与手机一致，不存在「移动端一律 2400」。低端机掉帧是**推断**，未实测 |

---

## 二、五个选项对流量三环节的作用

「被索引 → 被搜到 → 被点进来」是串联关系，前一步为 0 后面全是 0。

| 选项 | 被索引 | 被搜到 | 被点进来 | 备注 |
| --- | --- | --- | --- | --- |
| 补译文（14 页） | 低 | 中低 | 低 | 只增加 URL 数；无权重站点的 zh/ja 页很难排上；法律页根本不需要译 |
| EPUB 接线 | 低（+1~2 URL） | 中 | 中低 | 「cbz to epub」有真实搜索，但结果页被通用转换站占满 |
| 收录动作 | **高（前置条件）** | 0 | 0 | 不直接带流量，但缺了它其余全为 0 |
| 差异化数据内容 | 低 | **中高** | **中高** | 唯一能同时改善「被搜到」和「被点进来」的选项 |
| CBR 支持 | 低 | 中 | 中 | 「cbr to cbz」有量，但技术成本与许可证风险最高 |

**自我感觉良好、对流量几乎无效的**：一次性补完 14 页译文、EPUB 接线、短期上 CBR。三者都是在「站内已经很完整」的错觉上继续加固，而不是解决「没人找得到」。

---

## 三、EPUB 结论：现阶段不做

1. **搜索意图真实存在**（已验证搜索结果被占位，未验证具体搜索量）：「cbz to epub」「cbz to kindle」都能搜到大量结果页，占位者是 MiConv、11zon、Convert.guru、Kindle Comic Converter、MangaConverter 这类通用转换站/成熟工具。站点没有权重，进去只会当分母。
2. **Kindle 方向有平台级的坑**（推断，基于已知生态）：Amazon 已停收 MOBI，Send to Kindle 对 EPUB 会做转换；fixed-layout 漫画 EPUB 在 Kindle 上的排版支持不稳定；DRM 与「转成 EPUB 就能在 Kindle 读」并不等价。这些不是工程能解决的。
3. **稀释定位**：站点现在的身份是「浏览器内、隐私优先的 CBZ 阅读器 + CBZ→PDF」。加 EPUB 就变成第 N 个通用转换站，正面红海。
4. **维护负担**：EPUB 要面对 Kindle / Kobo / Apple Books 的兼容矩阵，测试面比 PDF 大得多。
5. **沉没成本不是上线理由**：它是唯一「代码写完但用户看不到」的功能，这恰恰说明它当初就没被验证过需求。

---

## 四、优先级与停止条件

### P0 收录闭环（先做这一项）
目标：让已有的 17 条 URL 真正进索引。
- 在 GSC 重新提交一次 sitemap，不反复重提。
- 查 Cloudflare Security Events，确认没有按 AS15169 拦截 Googlebot 真实 IP。
- 两周内无变化，再回来看 GSC 给出的具体错误码。
- **停止条件**：GSC sitemap 状态 Success，discovered URLs 与 sitemap 一致，首页 + `/cbz-to-pdf/` + `/read-cbz-online/` 确认 indexed。达成即停，不继续折腾收录工具。

### P1 一个高意图页面的差异化内容（收录打通后立刻做）
选 `/cbz-to-pdf/` 或 `/read-cbz-online/`，只做一个页面。
- 加只有本站在有的数据：转换前后体积/耗时实测、真实样例、边界情况说明。
- 从首页与相关页加内链。
- 争取 1–2 条真外链（非 nofollow）：相关工具目录、Reddit / MobileRead 的正常讨论帖。
- **停止条件**：一个页面做到「目标词能进前 3 页」的候选状态就停，不要立刻复制到第二个页面。

### P2 CBR 支持
有需求，但 UnRAR 许可证 + 浏览器解码是硬成本，排在内容之后。

### P3 EPUB
不做。代码保留，不作为上线项。

### 翻译
延后。只翻已经有搜索曝光数据的页面，而不是按「页面清单」批量翻。

---

## 五、清单里说错的地方（汇总）

1. 「16 个英文内容页」→ 应为「16 个英文 URL：1 首页 + 11 工具/内容页 + 1 About + 3 法律页」。
2. 「未翻译页面切换语言后仍显示英文」→ 实际是「拒绝切换并提示暂无译文」，不会发生切换。
3. 「缩略图面板一次渲染全部页面」→ DOM 全量渲染成立，但图片是懒加载 + 60 张缓存上限，「全部解码」不成立。
4. 「移动端按 2400px 解码」→ 全平台统一预算，只有超限大图才降到 2400 宽。
5. 「真外链 0 个」→ 无法证实；只能确认公开检索里 MobileRead 那条是 nofollow。
6. 「EPUB 已通过结构测试」→ 测试脚本存在，但本轮未执行，不能确认通过。

---

## 六、验证方式

本轮为只读核查，无代码改动，无需运行测试。若后续执行 P0/P1：
- P0：GSC 面板状态 + `Invoke-WebRequest` 抓 sitemap/首页确认 200 与内容一致。
- P1：`npm run build` 后检查 `dist/` 对应页面的静态 HTML、`sitemap.xml` 条目数、hreflang 互指未变；`npm run test:e2e` 必须通过。
