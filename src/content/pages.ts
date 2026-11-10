export interface PageSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

export interface FaqItem {
  question: string
  answer: string
}

export interface PageContent {
  path: string
  title: string
  description: string
  h1: string
  eyebrow: string
  lead: string
  tool?: boolean
  schema: 'app' | 'article'
  updated: string
  sections: PageSection[]
  faq: FaqItem[]
  related: string[]
}

export const PAGES: PageContent[] = [
  {
    path: '/',
    title: 'CBZ Reader - Open CBZ Comic Files in Your Browser',
    description:
      'Read CBZ comics in your browser. No uploads, no account: files stay on your device. Manga RTL, double-page spreads, zoom, and resume where you left off.',
    h1: 'Read CBZ comics in your browser',
    eyebrow: 'Local-first comic reader',
    lead: 'Drop a .cbz file and start reading in seconds. Pages are unpacked on your device, never uploaded. No account, no library to maintain, no waiting for a conversion job.',
    tool: true,
    schema: 'app',
    updated: '2026-11-11',
    sections: [
      {
        heading: 'A reader, not another upload form',
        paragraphs: [
          'Most online comic readers ask you to upload an archive, wait for a server to unpack it, and then hand you a temporary link. That is a lot of trust for a file you already own. This reader takes the opposite approach: the archive is opened with the browser file API, and every page is decoded locally.',
          'That means the first page usually appears before an upload would have finished. It also means the site has no copy of your comic, no storage bill, and nothing to leak.',
        ],
      },
      {
        heading: 'Built for real comic archives',
        bullets: [
          'Reads the ZIP central directory, so it can jump to page 180 without unpacking pages 1 to 179.',
          'Natural page sorting: 2.jpg comes before 10.jpg, not after it.',
          'Understands ComicInfo.xml, including the Manga / right-to-left hint.',
          'Single-page and double-page views, with the cover kept on its own page.',
          'Pinch, double-tap, and wheel zoom with pan, plus keyboard shortcuts on desktop.',
          'Keeps your page locally and restores it when you open the same file again.',
        ],
      },
      {
        heading: 'What this version does not do',
        paragraphs: [
          'It does not read CBR (RAR) or CB7 (7z) archives yet, and it does not open files from a URL. There is no cloud library, no sync across devices, and no DRM support. Those are deliberate omissions: the goal of this version is to make CBZ reading fast and dependable before adding more containers.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is my comic uploaded to a server?',
        answer:
          'No. The file is opened with the browser file picker and parsed in the page. Page images are decoded locally. Nothing is sent to this site or to a third party.',
      },
      {
        question: 'Does it work on iPhone and iPad?',
        answer:
          'Yes. iOS does not let websites register as file handlers, so you open this page first and then pick the .cbz file from the Files app. On iOS the file picker is intentionally allowed to show all files, because .cbz has no registered system type.',
      },
      {
        question: 'Which formats are supported?',
        answer:
          'CBZ and ZIP archives that contain JPG, PNG, WebP, GIF, AVIF, or BMP pages. CBR and CB7 are on the roadmap but are not supported in this version.',
      },
      {
        question: 'Does it remember where I stopped reading?',
        answer:
          'Yes. The reader stores a page marker in your browser, keyed by a fingerprint of the file (name, size, and a hash of the first and last 64 KB). Pick the same file again and it offers to resume.',
      },
      {
        question: 'Is there a file size limit?',
        answer:
          'There is no fixed limit in the code. The practical limit is your device memory. A 1 GB archive is fine on a desktop browser, but phones have a much smaller per-tab memory budget, so very large pages are downsampled automatically.',
      },
      {
        question: 'Is it free?',
        answer: 'Yes. The reader runs entirely in your browser and does not require an account.',
      },
    ],
    related: ['/how-to-open-cbz/', '/manga-reader/', '/cbz-vs-cbr/'],
  },
  {
    path: '/read-cbz-online/',
    title: 'Read CBZ Online Without Uploading the File',
    description:
      'Open a CBZ online in your browser without uploading it. Local unpacking, instant page access, and no account. Works on desktop and mobile.',
    h1: 'Read CBZ online without uploading it',
    eyebrow: 'No-upload online reader',
    lead: 'An online CBZ reader usually means an upload, a queue, and a temporary link. This one opens the archive in your browser instead, so the file never leaves your device.',
    schema: 'article',
    updated: '2026-11-11',
    sections: [
      {
        heading: 'What "online" should mean for a local file',
        paragraphs: [
          'You already have the comic. The only thing you need is a viewer. Sending a 600 MB archive to a stranger just to look at page one is unnecessary work for both sides.',
          'This reader uses the File API to read the archive from disk. The ZIP central directory gives the page list, and only the page you are looking at is decompressed. The rest of the archive stays on disk until you reach it.',
        ],
      },
      {
        heading: 'How to open your file',
        bullets: [
          'Open the CBZ Reader home page.',
          'Click "Open a CBZ file" and choose the archive, or drag it onto the reader.',
          'Wait for the page count, then read with the arrow keys, swipe, or the page slider.',
          'Come back later with the same file and the reader offers to resume at your last page.',
        ],
      },
      {
        heading: 'When a desktop browser is the better choice',
        paragraphs: [
          'Phones are fine for reading, but the file picker on iOS is a few taps deeper than on a desktop. If you are organising a library, testing a batch of archives, or reading a very large scan, a desktop browser with drag and drop is the fastest path.',
        ],
      },
    ],
    faq: [
      {
        question: 'Do I need to install anything?',
        answer: 'No. It is a static website. There is no extension, no desktop app, and no sign-up.',
      },
      {
        question: 'Can I use it offline?',
        answer:
          'Once the page is loaded, the reader itself works without a network connection. Your comic is already local, so page turns do not depend on the server.',
      },
      {
        question: 'Why does the first page take a moment on a huge archive?',
        answer:
          'The browser has to read the archive directory and decode the first image. After that, nearby pages are preloaded in the background. On phones, very large pages are downsampled to stay inside the tab memory limit.',
      },
    ],
    related: ['/', '/how-to-open-cbz/', '/privacy/'],
  },
  {
    path: '/manga-reader/',
    title: 'CBZ Manga Reader with Right-to-Left Pages',
    description:
      'Read CBZ manga with right-to-left page order, double-page spreads, and a cover that stays on its own page. Local, no upload, works in your browser.',
    h1: 'A CBZ manga reader that respects right-to-left pages',
    eyebrow: 'Manga mode',
    lead: 'Western comics read left to right. Manga does not. The reader detects the direction from ComicInfo.xml, and you can flip it with one tap when a file is tagged wrong.',
    schema: 'article',
    updated: '2026-11-11',
    sections: [
      {
        heading: 'Right-to-left is more than reversing the arrow keys',
        paragraphs: [
          'In a two-page spread, the earlier page belongs on the right. The cover is usually a single page, so pairing has to start after page one, not at page one. Getting this wrong makes every spread feel backwards even when the page numbers are correct.',
          'This reader keeps a cover offset in double-page mode, reverses the visual order for RTL, and maps the left tap zone to "next page" when RTL is on. The arrow keys follow the same rule.',
        ],
      },
      {
        heading: 'How the direction is chosen',
        bullets: [
          'If ComicInfo.xml contains Manga = YesAndRightToLeft, the file opens in RTL mode.',
          'Otherwise the reader starts left to right.',
          'The RTL button in the toolbar overrides the guess for the current session.',
          'Your choice is saved with the reading progress for that file.',
        ],
      },
      {
        heading: 'Double-page spreads',
        paragraphs: [
          'Double-page mode is available on wide screens and can be toggled at any time. The cover is displayed alone by default, then pages pair as 2-3, 4-5, and so on. If a spread looks wrong, switch to single-page mode; automatic wide-page detection is planned but not part of this version.',
        ],
      },
    ],
    faq: [
      {
        question: 'How do I turn on right-to-left mode?',
        answer:
          'Open a file and press the RTL button in the toolbar. If the archive has a ComicInfo.xml with Manga = YesAndRightToLeft, it is already on.',
      },
      {
        question: 'Does it support double-page spreads?',
        answer:
          'Yes. Use the Single / Double button in the toolbar. The cover is kept as a single page, and the visual order follows the RTL setting.',
      },
      {
        question: 'Can I read vertical webtoon strips?',
        answer:
          'Single-page mode displays tall images and lets you zoom, but a continuous vertical scroll mode is not included in this version. It is the first feature on the cut list from the original plan, so it will come before more formats.',
      },
    ],
    related: ['/', '/how-to-open-cbz/', '/cbz-vs-cbr/'],
  },
  {
    path: '/how-to-open-cbz/',
    title: 'How to Open a CBZ File on Windows, Mac, iPhone, and Android',
    description:
      'A CBZ file is a ZIP archive of comic pages. Learn how to open one on desktop or phone, with or without an app, and why page order sometimes breaks.',
    h1: 'How to open a CBZ file',
    eyebrow: 'Step-by-step guide',
    lead: 'A .cbz file is not a special image format. It is a ZIP archive with comic pages inside, usually JPG or PNG, plus an optional metadata file. That is why almost anything that can open a ZIP can open a CBZ.',
    schema: 'article',
    updated: '2026-11-11',
    sections: [
      {
        heading: 'What is inside a CBZ file',
        paragraphs: [
          'Rename a .cbz to .zip and you can inspect it with any archive tool. You will usually find numbered images, sometimes a folder per chapter, and often a ComicInfo.xml file with the series name, volume, page count, and reading direction.',
          'Because the pages are ordinary images, the quality of the reading experience depends on the viewer: page sorting, memory use, and spread handling matter more than the container itself.',
        ],
      },
      {
        heading: 'Open a CBZ on Windows or Mac',
        bullets: [
          'Fastest, no install: open the CBZ Reader in your browser and drag the file onto the page.',
          'With an archive tool: rename a copy to .zip, extract it, and open the images in any image viewer.',
          'With a comic app: most comic readers accept CBZ directly and remember your page.',
        ],
      },
      {
        heading: 'Open a CBZ on iPhone or iPad',
        bullets: [
          'Save the file to the Files app first. Files stored only in iCloud Drive may need to be downloaded before they can be opened.',
          'Open the CBZ Reader in Safari, tap "Open a CBZ file", then pick the archive from Files.',
          'iOS does not let a website register as the default handler for .cbz, so you cannot long-press a file and choose the site. Opening the site first is the reliable route.',
        ],
      },
      {
        heading: 'Open a CBZ on Android',
        bullets: [
          'Open the site in Chrome and use the file picker, or drag the file in on a tablet.',
          'If you install the site to your home screen, Android can share a file to it from the Files app.',
          'Android file pickers are generally more tolerant of the .cbz extension than iOS.',
        ],
      },
      {
        heading: 'Why the pages are out of order',
        paragraphs: [
          'Computers sort text alphabetically by default: 1.jpg, 10.jpg, 11.jpg, 2.jpg. Comic archives expect numeric order. A reader that does not use natural sorting will show page 10 before page 2. This reader sorts numerically and falls back to the full path when two files share a number.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is CBZ the same as ZIP?',
        answer:
          'Yes, structurally. CBZ is a ZIP archive with a comic-specific extension. Some tools also add ComicInfo.xml for metadata. Renaming .cbz to .zip does not change the contents.',
      },
      {
        question: 'Can I open a CBZ with WinRAR or 7-Zip?',
        answer:
          'Yes. Both can extract the images. That is useful for inspecting a file, but it is not a comfortable way to read a 200-page comic.',
      },
      {
        question: 'Why does my reader show pages in the wrong order?',
        answer:
          'It is almost always alphabetical sorting instead of natural sorting. Look for a "natural sort" or "numeric sort" option, or use a reader that sorts numbers correctly by default.',
      },
      {
        question: 'Can I convert CBZ to PDF?',
        answer:
          'Yes, with a separate conversion tool. This site does not convert files; it reads the archive in place and never uploads it.',
      },
    ],
    related: ['/', '/cbz-vs-cbr/', '/read-cbz-online/'],
  },
  {
    path: '/cbz-vs-cbr/',
    title: 'CBZ vs CBR vs CB7: What Is the Difference?',
    description:
      'CBZ is ZIP, CBR is RAR, and CB7 is 7z. Compare compatibility, compression, licensing, and which format this browser reader supports today.',
    h1: 'CBZ vs CBR vs CB7',
    eyebrow: 'Format comparison',
    lead: 'The three comic container formats differ mainly in which archive algorithm they use. That single difference decides which apps can open them, how fast a page can be reached, and whether a browser can read them at all.',
    schema: 'article',
    updated: '2026-11-11',
    sections: [
      {
        heading: 'The short version',
        bullets: [
          'CBZ = ZIP. The most compatible option and the easiest to read in a browser.',
          'CBR = RAR. Often slightly smaller, but requires a RAR decoder with a restrictive licence.',
          'CB7 = 7z. Good compression, less common for comics, and frequently uses solid blocks.',
        ],
      },
      {
        heading: 'Why CBR is harder in a browser',
        paragraphs: [
          'ZIP stores each file separately, and its directory sits at the end of the archive. A reader can jump straight to page 180. RAR supports solid compression, where many files are compressed as one stream. To reach page 180 in a solid archive, a decoder has to decompress everything before it.',
          'The decoder is also a licensing question. UnRAR is free to use for extraction but is not an OSI-approved open-source licence, and it forbids using the code to build a RAR compressor. That is manageable for a reader, but it needs care in a commercial product.',
        ],
      },
      {
        heading: 'What this reader supports',
        paragraphs: [
          'This version reads CBZ and ZIP. CBR and CB7 are not supported yet. The plan is to add them through a lazily loaded libarchive module, with a clear progress indicator for solid archives, rather than pretending a solid RAR can open instantly.',
          'If you have a CBR and need to read it here today, convert it to CBZ with a local tool first. Do not upload a copyrighted comic to a random converter.',
        ],
      },
      {
        heading: 'Which format should you keep?',
        paragraphs: [
          'For a personal library, CBZ is the safest default. It opens in more apps, on more devices, and in the browser without a native decoder. Use CBR or CB7 when the source only exists in that format, not as a deliberate archival choice.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is CBR better than CBZ?',
        answer:
          'Not inherently. CBR often produces a smaller file, but compatibility is worse and solid archives can be slower to seek. For reading, CBZ is usually the better trade.',
      },
      {
        question: 'Can I convert CBR to CBZ?',
        answer:
          'Yes, with a local archive tool that can extract RAR. Extract the images, then zip them with the .cbz extension. Do not rename .cbr to .cbz; the bytes are still RAR and the file will not open.',
      },
      {
        question: 'Does this reader support CBR or CB7?',
        answer:
          'Not in this version. CBZ and ZIP are supported. CBR and CB7 are planned, with solid-archive progress and a graceful fallback for unsupported encryption.',
      },
    ],
    related: ['/', '/how-to-open-cbz/', '/manga-reader/'],
  },
  {
    path: '/privacy/',
    title: 'Privacy - CBZ Reader',
    description:
      'CBZ Reader processes files locally in your browser. No uploads, no account, no cookies, and no third-party analytics.',
    h1: 'Privacy',
    eyebrow: 'Plain language',
    lead: 'The short version: your comic never leaves your device, and this site does not ask for an account or set advertising cookies.',
    schema: 'article',
    updated: '2026-11-11',
    sections: [
      {
        heading: 'Files',
        paragraphs: [
          'Comic archives are opened with the browser File API and parsed in the page. Page images are decoded locally. There is no upload endpoint, no server-side conversion, and no copy of your file stored by this site.',
          'Reading progress is stored in your browser IndexedDB, keyed by a fingerprint derived from the file name, size, and a hash of the first and last 64 KB. It stays on your device and can be removed by clearing site data.',
        ],
      },
      {
        heading: 'Analytics and cookies',
        paragraphs: [
          'This version does not include third-party analytics, advertising scripts, or tracking cookies. The hosting provider may keep standard access logs (IP address, user agent, requested URL) for security and operations, as any web host does.',
        ],
      },
      {
        heading: 'Third parties',
        paragraphs: [
          'The site serves its own JavaScript and CSS. It does not load remote fonts, remote images, or embedded players. If that changes, this page will list what is loaded and why.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [
          'For privacy questions, use the contact address published on the domain that hosts this site. This page is a technical description of the current build, not legal advice.',
        ],
      },
    ],
    faq: [
      {
        question: 'Do you keep my comics?',
        answer: 'No. There is no upload. The file is read from your disk inside the browser tab.',
      },
      {
        question: 'Can I delete my reading history?',
        answer:
          'Yes. Clear site data for this domain in your browser settings. That removes the locally stored page markers and settings.',
      },
      {
        question: 'Do you use cookies?',
        answer: 'No. The reader uses IndexedDB for local progress, which is not a cookie and is not sent to a server.',
      },
    ],
    related: ['/', '/read-cbz-online/', '/how-to-open-cbz/'],
  },
]

export function findPage(pathname: string): PageContent {
  const normalized = pathname === '/' ? '/' : pathname.endsWith('/') ? pathname : `${pathname}/`
  return PAGES.find((page) => page.path === normalized) ?? PAGES[0]
}
