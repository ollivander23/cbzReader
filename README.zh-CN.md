[English](README.md) | **简体中文**

# CBZ Reader —— 在浏览器里看 CBZ 漫画
**一款把文件留在你自己设备上的浏览器漫画阅读器兼 cbz 转 pdf 工具。无需上传、无需账号、无需安装。**
**在线使用：[cbzreader.mavi.help](https://cbzreader.mavi.help/) · 在线演示：[cbzreader.mavi.help/demo](https://cbzreader.mavi.help/demo/)**

![CBZ Reader —— 在浏览器里看 CBZ 漫画](public/og-image.png)

<!-- TODO: 发布前在这里换成一张真正的阅读器截图或一小段 GIF。上面这张是社交预览图，不是应用内截图。 -->

CBZ Reader 可以直接在标签页里打开本地的 `.cbz` 和 `.zip` 漫画压缩包。它把「下载一个桌面漫画阅读器、导入文件、等它建好索引」这套流程，换成了一个文件选择框；手机、平板和电脑上都能用，压缩包不会被发送到任何地方。

## 功能

- 在本地以单页、双页或垂直滚动模式阅读 CBZ/ZIP 压缩包，支持缩放、平移、滑动、点击区域和键盘翻页。
- 按文件记住上次读到第几页、阅读模式和翻页方向，首页还有最近阅读书架。
- 可以添加页面书签、浏览缩略图；当压缩包里带文件夹章节或 `ComicInfo.xml` 书签时，缩略图面板里会多出一条目录栏。
- 在阅读器内显示 ComicInfo.xml 元数据（标题、系列、期号、简介）。
- 一个开关即可切换到从右往左的日漫阅读方向。
- 在标签页内把 cbz 转成 pdf：可选原始像素尺寸或适配 A4、JPEG 直通、PNG 无损嵌入，带页码进度和取消。
- 可安装为 PWA，离线重新打开此前加载过的页面；断网时本地文件依然能打开。
- 支持拖放文件或使用文件选择框；没有账号，也没有服务端书库。

## 你的文件始终留在浏览器里

压缩包在标签页内由 `zip.js` 读取，页面图片在本地解码，PDF 也在同一个标签页里用 `pdf-lib` 组装。压缩包、页面图片和转换后的 PDF 都不会被上传。

你可以自己验证：

1. 打开 DevTools → Network，选择一个本地 CBZ，翻几页再转换一次。请求应该只有站点的静态资源和不带 cookie 的统计脚本；没有任何请求体包含压缩包或页面图片。
2. 访问过一次之后，把设备切到飞行模式，重新加载站点，再打开一个本地 CBZ。阅读和转换都仍然可用；只有从未缓存过的页面或路由可能会显示离线提示。

## 限制

- 不支持 CBR（RAR）和 CB7（7z）。阅读器和转换器会提示你先转成 CBZ；格式差异见 [CBZ vs CBR 对比](https://cbzreader.mavi.help/cbz-vs-cbr/)。
- 过大的页面会被降采样，长边统一限制到 4096 px、总像素限制到 1200 万，所以 3000×4500 及更大的扫描件放大后可能偏软。
- iOS 只在 Safari 18（iPhone 16e）上测试过。Android Chrome 也测试过，但 iOS 的文件导入、手势和超大压缩包仍有尚未验证的边角情况。

## 技术栈

Vue 3、TypeScript 和 Vite 6，用 `zip.js` 读取 ZIP，用 `pdf-lib` 输出 PDF，用 `idb-keyval` 在设备上保存阅读进度和书签。页面预渲染为静态 HTML，service worker 负责离线缓存，站点部署在 Cloudflare Pages 上。

### 本地运行

需要 Node.js 20 或 22，以及 npm 10 及以上。

```bash
npm install
npm run dev       # http://localhost:5173/
npm run build     # 类型检查、构建并预渲染
npm run preview   # 预览生产构建
```

可选的检查（需已安装 Edge 或 Chrome）：

```bash
npm run test:e2e
npm run test:offline
npm run test:convert
```

用 `npm run samples` 生成手动检查用的测试压缩包。它们会写到 `test/.cache/samples`（已被 git 忽略）；设置 `SAMPLE_OUT`（PowerShell：`$env:SAMPLE_OUT='D:\path'; npm run samples`）或传入 `npm run samples -- --out <dir>` 可以改用其他目录。

## 示例漫画

`public/samples/little-nemo-1908.cbz` 包含 12 页 Winsor McCay 的《Little Nemo in Slumberland》周日版漫画，1908 年刊登在《New York Herald》上。Wikimedia Commons 的文件页面（[来源分类](https://commons.wikimedia.org/wiki/Category:Little_Nemo_in_Slumberland,_1908)）标注了 `{{PD-US}}`，因此这些漫画在美国属于公有领域；它们不是 CC0，也不是 CC BY 授权。页面为演示做过缩放。

`public/samples/sample-large-20-pages.cbz` 由本仓库的示例脚本从简单的合成页面生成，不包含任何第三方美术作品。

## 许可证

本仓库的代码以 [MIT License](LICENSE) 发布。

`public/samples/` 下的文件属于示例内容，不是 MIT 许可的软件。`little-nemo-1908.cbz` 保留上文所述的美国公有领域状态；`sample-large-20-pages.cbz` 是生成的演示内容，同样不包含在 MIT License 的覆盖范围内。
