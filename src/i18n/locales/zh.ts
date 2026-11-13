import type { PageContent } from '../../content/pages'

export const zhHome: PageContent = {
  path: '/zh/',
  title: 'CBZ Reader - 在浏览器里读 CBZ、转 PDF',
  description:
    '在浏览器中阅读 CBZ 漫画，或把 CBZ 转成 PDF。文件始终留在本机：无需上传、无需账号。支持日漫右开、双页、缩放和阅读进度。',
  h1: '在浏览器里读 CBZ 漫画',
  eyebrow: 'CBZ 阅读器与转换工具',
  lead: '打开 CBZ 直接读，或转成 PDF。两件事都在你的设备上完成。',
  tool: true,
  schema: 'app',
  schemaFeatures: [
    '在本地打开 CBZ 和 ZIP 漫画压缩包',
    '在浏览器里把 CBZ 转成 PDF，不上传文件',
    '从右到左的日漫阅读模式',
    '单页与双页排版',
    '缩放与拖动',
    '在本机保存阅读进度',
  ],
  updated: '2026-11-12',
  trust: ['文件不会上传，始终留在浏览器里，也不需要账号。'],
  sections: [],
  faq: [
    {
      question: '漫画会被上传到服务器吗？',
      answer:
        '不会。文件通过浏览器的文件选择器打开，并在页面里解析，页面图片也在本地解码。文件不会发到这个网站，也不会发给第三方。',
    },
    {
      question: '第一次访问之后，离线还能用吗？',
      answer:
        '可以。页面外壳由 Service Worker 缓存，所以断网后也能重新打开阅读器；CBZ 从你的设备读取，翻页不需要网络。没有在这个站点打开过的页面不会被保存，浏览器也可能在长期不访问后清掉缓存，联网访问一次即可恢复。',
    },
    {
      question: '支持哪些格式？',
      answer:
        '支持包含 JPG、PNG、WebP、GIF、AVIF 或 BMP 页面的 CBZ 和 ZIP 压缩包。CBR 和 CB7 已在计划中，但当前版本还不支持。',
    },
  ],
  tools: [
    {
      href: '/what-is-a-cbz-file/',
      label: 'CBZ 是什么文件？',
      note: 'ZIP 容器、页面和元数据。',
      kind: 'guide',
    },
    {
      href: '/how-to-open-cbz/',
      label: '如何打开 CBZ',
      note: '电脑、Android、iPhone。',
      kind: 'guide',
    },
    {
      href: '/how-to-make-a-cbz-file/',
      label: '制作 CBZ',
      note: '把扫描图打包成可读的压缩包。',
      kind: 'guide',
    },
    {
      href: '/cbz-file-wont-open/',
      label: 'CBZ 打不开怎么办',
      note: '扩展名被改过的 RAR，或加密文件。',
      kind: 'guide',
    },
    {
      href: '/cbz-vs-cbr/',
      label: 'CBZ、CBR 与 CB7',
      note: '浏览器能打开哪些容器。',
      kind: 'guide',
    },
    {
      href: '/demo/',
      label: '试读样例漫画',
      note: '一部公版作品，无需准备文件。',
      kind: 'sample',
    },
  ],
  related: [],
}

export const zhCbzToPdf: PageContent = {
  path: '/zh/cbz-to-pdf/',
  title: 'CBZ 转 PDF - 不上传，在浏览器里完成',
  description:
    '在浏览器里把 CBZ 漫画转成 PDF，文件不上传。JPEG 页面原样嵌入，可选原始尺寸或适配 A4。',
  h1: '不上传，把 CBZ 转成 PDF',
  eyebrow: 'CBZ 转 PDF',
  lead: '选一个 .cbz 文件，直接拿到 PDF，不用往返服务器。压缩包在这个标签页里解压，PDF 也在这里生成，页面从不离开你的设备。',
  converter: true,
  schema: 'app',
  schemaFeatures: [
    '在浏览器里把 CBZ 压缩包转成 PDF',
    'JPEG 页面不重新编码，原样嵌入',
    '可选原始尺寸或 A4 页面',
    '不上传，也不需要账号',
    '可取消的转换，错误信息具体',
  ],
  updated: '2026-11-12',
  trust: ['不上传', 'JPEG 原样复制', '原始尺寸或 A4', '离线可用'],
  sections: [
    {
      heading: '为什么大多数 CBZ 转 PDF 工具要上传文件',
      paragraphs: [
        '别家之所以要上传，是因为活要在服务器上干：服务器要花钱养、要保持在线，转换期间还得找个地方把压缩包放住。',
      ],
      link: { href: '/zh/private-process/', label: '中间多一台服务器，对你的文件意味着什么 →' },
    },
    {
      heading: '这个标签页里是怎么转换的',
      paragraphs: [
        '浏览器既能读 ZIP 的中央目录，也能写出二进制数据，所以整件事可以留在本地。转换器用和阅读器同一套 ZIP 读取逻辑，按「先目录、再文件名」的自然排序（2.jpg 排在 10.jpg 之前），并忽略目录条目、__MACOSX 和 ComicInfo.xml。',
        '每一页 JPEG 都以 DCT 流直接写进 PDF：压缩数据原样搬过去，不解码也不重新编码。PNG 页同样无损嵌入，包括透明通道。PDF 没有 WebP、GIF、AVIF、BMP 的原生格式，这几类页面会被解码一次、以质量 92 写成 JPEG——这是唯一会重新压缩像素的路径。',
        '页面一页一页处理，中间让出线程，所以进度条会更新、标签页保持响应，取消也会在每一页开始前被检查。',
      ],
      bullets: [
        'JPEG 和 PNG 页面：不重新编码，直接嵌入。',
        'WebP、GIF、AVIF、BMP 页面：重新编码一次，质量 92 的 JPEG。',
        '页序与阅读器一致：先目录、再文件名，做自然排序。',
      ],
    },
    {
      heading: '离线可用',
      paragraphs: [
        '转换器加载一次之后，就和阅读器跑在同一个离线外壳里，之后的转换完全不需要网络。你可以自己在设备上验证，方法写在本地处理那一页。',
      ],
      link: { href: '/zh/private-process/', label: '花一分钟自己验证 →' },
    },
    {
      heading: '原始尺寸还是 A4',
      paragraphs: [
        '选原始尺寸时，一个图像像素对应一个 PDF 点，所以 3000 × 4500 的扫描件会生成 3000 × 4500 点的页面。不做任何缩放，阅读器或打印机按各自的输出尺寸缩小它。大多数漫画 PDF 是这么做出来的，它保留了每一个像素。',
        '选 A4 时，每一页都变成 595 × 842 点，图片等比缩放、居中留白，不裁切也不拉伸。要打印、或者要给对超大页面处理不好的应用看，就选这个。两种模式嵌入的图像数据完全相同，文件大小几乎不变，变的只是页面几何。',
      ],
    },
    {
      heading: '转换失败的时候',
      paragraphs: [
        '加密压缩包会在开头就被拒绝；没有图片条目的压缩包也会被拒绝，并告诉你扫到了多少个条目；某一页解码失败会当场停下并指出压缩包里的文件名；内存不足（通常要几百页超大页面才会发生）会报告为内存错误，实际办法是关掉其他标签页或把压缩包拆小。',
        '取消会在页面之间生效，并丢弃不完整的 PDF：不会下载任何东西，也不会留下临时文件。',
      ],
    },
  ],
  faq: [
    {
      question: '转成 PDF 会损失画质吗？',
      answer:
        'JPEG 和 PNG 页面不会：压缩数据被原样复制进 PDF；只有 WebP、GIF、AVIF、BMP 页面需要解码一次，以质量 92 写成 JPEG。',
    },
    {
      question: '能一次转换多个 CBZ 吗？',
      answer:
        '不能。一次一个压缩包可以让内存占用可控、取消操作可预期。等第一个 PDF 下载完，再开始下一个。',
    },
    {
      question: '带密码的压缩包会怎样？',
      answer: '会被拒绝并给出说明。先用解压工具去掉密码、另存为普通 CBZ，再来转换那个文件。',
    },
    {
      question: '页面尺寸该选哪个？',
      answer:
        '要和扫描件完全一致的存档 PDF 选原始尺寸；要打印选 A4。两种模式的图像数据相同，所以画质和文件大小几乎没差别。',
    },
    {
      question: '能转换我买来的漫画而不上传吗？',
      answer:
        '可以。整个流程没有上传这一步：压缩包从你的磁盘打开，PDF 在同一个标签页里写出。',
    },
    {
      question: '能转多大的 CBZ？',
      answer:
        '没有额度限制，因为不往服务器发送任何东西；上限是标签页拿到的内存。几百页普通扫描件在电脑上转起来很轻松，几百页超大扫描件在手机上可能耗尽内存。转换会在页面之间停顿，取消会停下并丢弃不完整的 PDF。',
    },
  ],
  related: ['/', '/what-is-a-cbz-file/', '/cbz-file-wont-open/'],
  bridge: {
    text: '只是想翻一遍这个压缩包，不需要转换？',
    href: '/zh/',
    label: '在浏览器阅读器里打开这本 CBZ',
  },
}

export const zhPrivateProcess: PageContent = {
  path: '/zh/private-process/',
  title: '本地处理 - 标签页里究竟发生了什么',
  description:
    '压缩包在这个标签页里解开，页面在这里解码，PDF 也在这里写出。这个流程排除了什么、没排除什么，以及怎么用一分钟自己验证。',
  h1: '是本地处理，不是一个在线服务',
  eyebrow: '打开盖子看看',
  lead: '下面这些事都发生在这个标签页里，没有另一头可以接收文件。',
  schema: 'article',
  updated: '2026-11-13',
  sections: [
    {
      heading: '「本地处理」在这里指什么',
      paragraphs: [
        '晚上十一点，同事发来一个 .cbz。公司电脑装着一套锁死的系统，没有漫画软件，也不允许自己装。你于是打开一个浏览器标签页来读它。',
        '整件事就这么简单：文件进来，处理在标签页里完成，结果回到你手上。这个循环里没有任何一处可以顺手把副本发出去。',
      ],
    },
    {
      heading: '别家为什么非上传不可',
      paragraphs: [
        '上传型网站正好相反：你的压缩包离开标签页，去一台装了相应软件、内存也够用的机器上，最后回来一个链接。你面前的页面只负责把文件送出去。',
        '副本留在别人控制的机器上，删不删、什么时候删由对方决定——常常更久，缓存或日志里还会再留一份。服务器容量是要花钱的，所以文件一大，通常就要求有账号或付费档位。而且服务明天必须还在，这个工具才算能用。这不是谁存心使坏，是中间放一台服务器必然的结果。',
      ],
    },
    {
      heading: '那几句承诺，各自靠什么撑着',
      paragraphs: [
        '你在酒店的 Wi-Fi 上，用的是公司电脑，规定不许上传任何文件。首页写了四句承诺，每一句背后都有一件具体的事。',
      ],
      table: {
        head: ['承诺', '靠什么成立'],
        rows: [
          ['文件留在你的设备上', '浏览器把文件交给页面，页面没有可以把它交出去的上传地址'],
          ['读', '就在它原本所在的位置打开，不先复制到某个服务上'],
          ['转', '解码和拼装都在你的机器上，不在我们这边'],
          ['不交出去', '保存的是你的浏览器：没有链接要收，也没有副本落在谁手里'],
        ],
      },
      link: { href: '/zh/cbz-to-pdf/', label: '转换一步步是怎么跑的 →' },
    },
    {
      heading: '一个文件走过的路',
      flow: ['解包', '解码', '排版', '交付'],
      paragraphs: [
        '手机上一个 App 都没装，也能打开一个 400 MB 的压缩包。',
        '解包、解码、排版都在标签页里跑；交付有两条出口，像素送到屏幕，PDF 字节送到下载。两条出口都不通往服务器。',
      ],
    },
    {
      heading: '标签页的边界在哪（隐私细节）',
      paragraphs: [
        '这个站仍然有服务器和账单，所以有三件小事发生在标签页之外。它们都不包含你的文件。',
      ],
      bullets: [
        'Cloudflare（CDN）：能看到请求的基本信息，比如 IP 地址和浏览器类型（但从不涉及你的文件）。',
        'Umami（统计）：每次访问或转换收到一条事件，但不涉及任何文件数据。',
        '浏览器存储：把语言选择和阅读进度存在本地，清除站点数据就都没了。',
      ],
    },
    {
      heading: '一分钟自己验证',
      paragraphs: ['挑一个真实文件，处理的时候盯着浏览器看。'],
      bullets: [
        '打开 DevTools → Network，按本站域名过滤，再开始处理。页面和脚本会加载，统计上报会有一条，但没有任何请求携带压缩包或页面图片。',
        '在手机上先联网打开这一页，切到飞行模式后刷新，再转换一个本地 CBZ。PDF 依然能生成并保存。',
        '在请求列表里找找有没有接收文件的接口。找不到。',
      ],
    },
  ],
  faq: [
    {
      question: '本地处理具体是怎么跑的？',
      answer:
        '浏览器在标签页里读 ZIP 中央目录，一次取一页，再由 pdf-lib 在本地写出 PDF 字节。结果以标签页里生成的 Blob 下载交给你，所以没有任何请求携带压缩包，服务器上也没有副本会过期或被删除。',
    },
    {
      question: '这和隐私页是一回事吗？',
      answer: '隐私页列的是收集了哪些信息、为什么收集。这页讲的是代码拿文件做了什么。',
    },
    {
      question: '浏览器存储里到底存了什么？',
      answer: '语言偏好和阅读进度，还有 Service Worker 存下的这一页。清除站点数据就全清了。',
    },
    {
      question: '为什么在飞机上也能转换完？',
      answer: '第一次访问后 Service Worker 把页面和脚本留在了本机。压缩包本来就在你的磁盘上。',
    },
    {
      question: '换个浏览器会怎样？',
      answer: '什么都带不过去。阅读进度留在写它的那个浏览器里。',
    },
  ],
  related: [
    { href: '/zh/', label: '回到阅读器' },
    { href: '/zh/cbz-to-pdf/', label: '拿一个文件试试' },
    { href: '/privacy/', label: '这个站收集什么' },
    { href: '/cbz-vs-cbr/', label: '换个容器会有什么不同' },
  ],
}

export default {
  nav: {
    primary: '主导航',
    reader: '阅读器',
    cbzToPdf: 'CBZ 转 PDF',
    privateProcess: '本地处理',
    // Footer labels only; the top bar is the three entries above.
    howToOpen: '如何打开 CBZ',
    compare: 'CBZ 与 CBR',
  },
  header: {
    language: '语言',
    noTranslation: '这一页还没有{lang}版本。',
    localeName: { en: '英文', zh: '中文', ja: '日文' },
    themeDark: '切换到深色主题',
    themeLight: '切换到浅色主题',
  },
  footer: {
    tagline: '文件只留在你的设备上。',
    label: '页脚导航',
    about: '关于',
    privacy: '隐私政策',
    terms: '使用条款',
    disclaimer: '免责声明',
    github: 'GitHub 仓库',
  },
  breadcrumb: {
    label: '面包屑导航',
    reader: '阅读器',
  },
  convert: {
    kicker: 'CBZ → PDF',
    title: '把 CBZ 转成 PDF',
    lead: '把 .cbz 文件拖到这里，或从设备中选择。压缩包在这个标签页里解压，PDF 也在这里生成。',
    choose: '选择 CBZ 文件',
    chooseAria: '选择要转换的 CBZ 文件',
    fine: '不会上传。JPEG 页面不重新编码，直接嵌入。',
    ready: '可以开始转换',
    pageSize: '页面尺寸',
    sizeOriginal: '原始尺寸',
    sizeOriginalNote: '每一页与图像像素完全对应，不做缩放。',
    sizeA4: '适配 A4',
    sizeA4Note: '等比缩放到 A4 并留白，不裁切，适合打印。',
    start: '转换为 PDF',
    startAnother: '换一个文件',
    fineDownload: 'PDF 一准备好就会自动下载。',
    working: '正在转换',
    building: '正在生成 PDF…',
    reading: '正在读取压缩包',
    progress: '第 {done} 页 / 共 {total} 页',
    cancel: '取消',
    done: '完成',
    readyTitle: 'PDF 已就绪',
    pagesOne: '{count} 页',
    pagesMany: '{count} 页',
    a4Note: 'A4',
    originalNote: '原始页面尺寸',
    download: '下载 {name}',
    convertAnother: '转换另一个文件',
    fineDone: '文件从未离开你的设备。',
    noscript:
      '解压压缩包和生成 PDF 需要 JavaScript。所有处理都在浏览器里完成，文件不会发送到服务器。',
    failed: '转换失败',
    failedTitle: '这个文件无法转换成 PDF',
    tryAnother: '换一个文件试试',
    errNotZip:
      '这个文件无法按 CBZ 或 ZIP 压缩包读取。如果它来自 CBR（RAR）或 CB7（7z），请先转成 CBZ 再试。',
    errEncrypted: '这个压缩包有密码保护。请先去掉密码再转换，加密页面无法转换。',
    errNoImages: '这个压缩包里没有可用的图片页。它需要 JPG、PNG、WebP、GIF、AVIF 或 BMP 页面。',
    errMemory: '浏览器内存不足。试试更小的压缩包，或关掉其他标签页。',
    errUnknown: '转换因未知原因失败。请重试，或换一个压缩包。',
  },
  home: {
    readInBrowser: '在浏览器里阅读',
    readNote: '打开压缩包就能翻页，文件不会上传。',
    pickFile: '选择文件',
    convertTitle: '转成 PDF',
    convertNote: '按原始尺寸或 A4 重新生成 PDF，内容仍在本机处理。',
    openConverter: '打开转换工具',
    sampleTitle: '用样例漫画试一下',
    sampleNote: '直接打开一部公版短篇，不需要准备文件。',
    recentTitle: '最近打开',
    clearAll: '全部清除',
    readerLabel: 'CBZ 阅读器',
    openTitle: '打开 CBZ 文件',
    openLead: '把 .cbz 文件拖到这里，或从设备中选择。压缩包只在本地读取。',
    choose: '选择 CBZ 文件',
    fine: '不会上传。支持 CBZ 和 ZIP 压缩包。',
    tip: '小提示：在 iPhone 或 iPad 上，先打开本页，再从「文件」App 里选择文件。iOS 不允许网站注册为文件处理器。',
    noscript:
      '解压和显示 CBZ 页面需要 JavaScript。所有解析都在浏览器里完成，不会发送到服务器。',
    toolsHeading: '处理 CBZ 文件',
    kindSample: '样例',
    kindTool: '工具',
    kindGuide: '指南',
    questions: '常见问题',
    ctaTitle: '现在就打开一本 CBZ',
    ctaLead: '把文件拖进阅读器，它不会离开你的设备。',
    ctaButton: '打开 CBZ 阅读器',
    related: '继续阅读',
    defaultTrust: ['不上传', '无需账号', '支持右开', '记住进度'],
  },
  shelf: {
    modeSingle: '单页',
    modeDouble: '双页',
    modeScroll: '连续',
    justNow: '刚刚',
    minutesAgo: '{count} 分钟前',
    hoursAgo: '{count} 小时前',
    daysAgo: '{count} 天前',
    meta: '{pages} 页 · {mode} · 第 {page} 页',
    wrongFile: '刚才选的是「{picked}」。要回到第 {page} 页，请重新选择「{expected}」。',
    tooLarge: '这个文件太大，无法保留副本（或副本已被清理）。重新选择「{name}」后会从第 {page} 页继续。',
    remove: '从最近打开中移除 {name}',
    clearConfirm: '要移除所有最近文件、本地副本和书签吗？',
  },
  reader: {
    kicker: 'CBZ / ZIP',
    readingArchive: '正在读取压缩包…',
    openTitle: '打开 CBZ 文件',
    buildingList: '正在整理页序并解码第一页。',
    openLead: '把 .cbz 文件拖到这里，或从设备中选择。页面只在本地解压。',
    opening: '正在打开…',
    chooseFile: '选择 CBZ 文件',
    fine: '不会上传。支持 CBZ 和 ZIP 压缩包。',
    modeSingle: '单页',
    modeDouble: '双页',
    modeScroll: '连续',
    modeTitle: '阅读模式：{mode}，点击切换',
    modeAria: '当前阅读模式：{mode}。切换到下一模式。',
    zoomTitle: '缩放 {level}%，点击适应宽度',
    zoomAria: '当前缩放 {level}%，重置为适应宽度',
    bookmarkAdd: '给本页加书签',
    bookmarkRemove: '移除本页书签',
    rtlTitle: '阅读方向：从右到左，点击改为从左到右',
    ltrTitle: '阅读方向：从左到右，点击改为从右到左',
    rtlAria: '当前从右到左阅读。改为从左到右。',
    ltrAria: '当前从左到右阅读。改为从右到左。',
    openAnother: '打开另一个 CBZ 文件',
    moreOptions: '更多选项',
    moreOptionsAria: '更多阅读选项',
    optionsLabel: '阅读选项',
    rtlOption: '从右到左阅读',
    on: '开',
    off: '关',
    showBrowser: '显示浏览器界面（F）',
    hideBrowser: '隐藏浏览器界面（F）',
    bookmarkRemoveShort: '移除书签',
    theme: '主题',
    darkMode: '深色模式',
    bookmarks: '书签',
    pageNumber: '第 {page} 页',
    here: '当前',
    removeBookmarkPage: '移除第 {page} 页的书签',
    comicInfo: '漫画信息',
    close: '关闭阅读器',
    iosHint: '添加到主屏幕后，阅读时可以隐藏 Safari 的工具栏。',
    dismiss: '知道了',
    dismissHint: '关闭提示',
    comicPages: '漫画页面',
    retry: '重试',
    dropToOpen: '松开以打开',
    resumed: '已从第 {page} 页继续',
    startOver: '从头开始',
    prev: '上一页',
    next: '下一页',
    page: '页码',
    thumbnails: '页面缩略图',
    pages: '页面',
    pageCount: '{count} 页',
    contents: '目录',
    goToPage: '跳到第 {page} 页',
    singlePage: '第 {page} 页 / 共 {total} 页',
    doublePage: '第 {page} 页 / 共 {total} 页',
    doublePages: '第 {start}-{end} 页 / 共 {total} 页',
    genericError: '打开这个文件时出了点问题。',
  },
  errors: {
    unsupportedCbr:
      '暂不支持 CBR（RAR）压缩包。请先转成 CBZ：解压出页面图片，再重新打包为 .cbz 文件。只把 .cbr 改名成 .cbz 不够，里面的容器仍然是 RAR。',
    unsupportedCb7:
      '暂不支持 CB7（7z）压缩包。请先转成 CBZ：解压出页面图片，重新打包为 .cbz 文件，再打开新的压缩包。',
    notZip:
      '这个文件无法按 CBZ 或 ZIP 压缩包读取。如果它来自 CBR（RAR）或 CB7（7z），请先转成 CBZ 再试。',
    encrypted: '这个压缩包有密码保护。请先去掉密码再打开。',
    noImages: '这个压缩包里没有可读取的图片。',
    missingPage: '这个压缩包里没有这一页。',
    decode: '这一页无法解码。',
    topLevel: '最上层',
  },
}
