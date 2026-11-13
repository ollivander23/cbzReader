**简体中文** | [English](README.md)

# 读或转 CBZ，文件不离开你的设备

CBZ Reader 在浏览器标签页里打开你磁盘上的 `.cbz`——可以阅读，也可以转成 PDF。压缩包在标签页内解包，不会被上传：没有账号、无需安装，也没有服务端书库。

**[打开阅读器](https://cbzreader.mavi.help/)** · [把 CBZ 转成 PDF](https://cbzreader.mavi.help/cbz-to-pdf/) · [用示例漫画试一下](https://cbzreader.mavi.help/demo/) · [文件是如何留在本地的](https://cbzreader.mavi.help/private-process/)

## 文件不离开你的设备

压缩包在标签页内由 `zip.js` 读取，页面图片在本地解码，PDF 也在同一个标签页里用 `pdf-lib` 组装。压缩包、页面图片和转换后的 PDF 都不会被上传。

你可以自己验证：

1. 打开 DevTools → Network，选择一个 CBZ，翻几页再转换一次。请求只限于站点的静态资源和不带 Cookie 的统计脚本；没有任何请求体包含压缩包或页面图片。
2. 访问过一次之后，把设备切到飞行模式，重新加载站点，再打开一个本地 CBZ。阅读和转换仍然可用；只有从未缓存过的路由可能会显示离线提示。

## 阅读

- 支持 CBZ 和 ZIP 压缩包，页面格式可以是 JPG、PNG、WebP、GIF、AVIF 或 BMP。
- 单页、双页或连续滚动模式，支持缩放、平移、滑动、点击区域和键盘翻页。
- 从右往左的日漫阅读模式；`ComicInfo.xml` 已标注方向的压缩包会自动进入该模式。
- 按文件记住上次读到第几页、阅读模式和翻页方向，并提供最近打开书架。
- 页面书签、缩略图面板；当压缩包带文件夹章节或 `ComicInfo.xml` 章节书签时，会显示目录栏。
- 在阅读器内显示 `ComicInfo.xml` 的标题、系列、期号和简介。
- 可安装为 PWA；首次访问后，阅读器可在断网状态下打开。

## 把 CBZ 转成 PDF

- 在同一个标签页里生成 PDF，可选原始像素尺寸或适配 A4，不裁切页面。
- JPEG 页面按原样嵌入；PNG 页面无损嵌入。
- 逐页显示进度，并可随时取消。

## 限制

- 不支持 CBR（RAR）和 CB7（7z）。请先转成 CBZ；格式差异见 [CBZ vs CBR 对比](https://cbzreader.mavi.help/cbz-vs-cbr/)。
- 长边超过 4096 px 或超过 1200 万像素的页面在阅读时会被降采样，因此 3000×4500 的扫描件放大后可能偏软。
- 只在 Safari 18（iPhone 16e）和 Android Chrome 上测试过；iOS 的文件导入、手势和超大压缩包仍有尚未验证的边角情况。

## 本地运行

Vue 3、TypeScript 和 Vite 6，用 `zip.js` 读取 ZIP，用 `pdf-lib` 输出 PDF，用 `idb-keyval` 在设备上保存阅读进度和书签。页面预渲染为静态 HTML，service worker 让它们保持离线可用。

需要 Node.js 20 或 22，以及 npm 10 及以上。

```bash
npm install
npm run dev       # http://localhost:5173/
npm run build     # 类型检查、构建并预渲染
npm run preview   # 预览生产构建
```

可选的检查（需已安装 Edge 或 Chrome）：`npm run test:e2e`、`npm run test:offline`、`npm run test:convert`。

`npm run samples` 会生成测试用的本地压缩包，写到 `test/.cache/samples`（已被 git 忽略）。

## 示例漫画

`public/samples/little-nemo-1908.cbz` 包含 12 页 Winsor McCay 的《Little Nemo in Slumberland》周日版漫画，1908 年刊登在《New York Herald》上。Wikimedia Commons 的文件页面（[来源分类](https://commons.wikimedia.org/wiki/Category:Little_Nemo_in_Slumberland,_1908)）标注了 `{{PD-US}}`，因此这些漫画在美国属于公有领域——不是 CC0，也不是 CC BY 授权。页面为演示做过缩放。

`public/samples/sample-large-20-pages.cbz` 由 `npm run samples` 从简单的合成页面生成，不包含任何第三方美术作品。

## 许可

代码以 [MIT License](LICENSE) 发布。`public/samples/` 下的文件属于示例内容，不是 MIT 许可的软件：`little-nemo-1908.cbz` 保留上文所述的美国公有领域状态，`sample-large-20-pages.cbz` 是生成的演示内容。
