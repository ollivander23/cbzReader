export interface PageToolLink {
  href: string
  label: string
  note: string
  kind: 'tool' | 'guide'
}

export interface PageSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
  note?: PageSectionNote
  /** Renders the page-level contact address as a visible mailto link. */
  contact?: boolean
}

export interface PageSectionNote {
  title: string
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
  converter?: boolean
  trust?: string[]
  tools?: PageToolLink[]
  bridge?: { text: string; href: string; label: string }
  contact?: string
  schemaFeatures?: string[]
  /** Legal pages keep structured data to the breadcrumb only. */
  legal?: boolean
  schema: 'app' | 'article'
  updated: string
  sections: PageSection[]
  faq: FaqItem[]
  related: string[]
}

export const PAGES: PageContent[] = [
  {
    path: '/',
    title: 'CBZ Reader - Read and Convert CBZ Files in Your Browser',
    description:
      'Read CBZ comics and convert CBZ to PDF in your browser. Files stay on your device: no upload, no account. Manga right-to-left, spreads, zoom, and resume.',
    h1: 'Read CBZ comics in your browser',
    eyebrow: 'CBZ reader and converter',
    lead: 'Drop a .cbz file and start reading in seconds, or turn the same archive into a PDF. Both run on your device, so the file is never uploaded. No account, no library to maintain.',
    tool: true,
    schema: 'app',
    schemaFeatures: [
      'Open CBZ and ZIP comic archives locally',
      'Convert CBZ to PDF in the browser without uploading',
      'Right-to-left manga reading mode',
      'Single-page and double-page layouts',
      'Zoom and pan',
      'Local reading progress',
    ],
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
        heading: 'Works offline, and installs like an app',
        paragraphs: [
          'After the first visit the reader shell is stored on your device, so reloading the page or reopening it with no connection still works. Your comics were never online in the first place: they are read from local files, so page turning keeps working offline as well.',
          'On Android and desktop Chrome you can install the site from the browser menu (Install app, or Add to Home screen) and launch it full screen. On iPhone and iPad, open the site in Safari and use Share → Add to Home Screen. Offline support relies on the browser keeping its stored copy; a long gap without visits may clear it, and one online visit restores it.',
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
        question: 'Does the reader work offline?',
        answer:
          'Yes, after the first visit. The page shell is kept by a service worker, so the reader can be reloaded without a connection, and your CBZ file is read from your device, so page turning does not need the network either. Pages you have never opened on this site are not stored, and a browser may drop its stored copy after a long period without visits; one online visit restores it.',
      },
      {
        question: 'Can I add it to my home screen?',
        answer:
          'Yes. On Android and desktop Chrome use the Install app entry in the browser menu; on iPhone and iPad open the site in Safari and choose Share → Add to Home Screen. It then opens full screen without browser chrome.',
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
    tools: [
      {
        href: '/cbz-to-pdf/',
        label: 'CBZ to PDF converter',
        note: 'Rebuild the archive as a PDF, keeping original page sizes or fitting A4.',
        kind: 'tool',
      },
      {
        href: '/read-cbz-online/',
        label: 'Read CBZ online',
        note: 'What changes when the reader never uploads the archive.',
        kind: 'guide',
      },
      {
        href: '/manga-reader/',
        label: 'Manga mode',
        note: 'Right-to-left spreads for Japanese comics, and how to flip the direction.',
        kind: 'guide',
      },
      {
        href: '/how-to-open-cbz/',
        label: 'How to open a CBZ',
        note: 'Desktop, Android, and iPhone, step by step.',
        kind: 'guide',
      },
      {
        href: '/what-is-a-cbz-file/',
        label: 'What is a CBZ file?',
        note: 'The ZIP container, the page images, and the metadata inside.',
        kind: 'guide',
      },
      {
        href: '/cbz-file-format/',
        label: 'Inside the CBZ format',
        note: 'ComicInfo.xml, page order, and how the archive is laid out.',
        kind: 'guide',
      },
      {
        href: '/how-to-make-a-cbz-file/',
        label: 'Make a CBZ',
        note: 'Zip a folder of scans into an archive readers accept.',
        kind: 'guide',
      },
      {
        href: '/cbz-file-wont-open/',
        label: 'A CBZ that will not open',
        note: 'Renamed RAR files, encrypted entries, and broken page names.',
        kind: 'guide',
      },
      {
        href: '/cbz-vs-cbr/',
        label: 'CBZ vs CBR vs CB7',
        note: 'Which containers a browser can open, and why CBR needs extra code.',
        kind: 'guide',
      },
      {
        href: '/read-cbz-on-iphone/',
        label: 'Read CBZ on iPhone',
        note: 'Working within the Files app and Safari limits.',
        kind: 'guide',
      },
      {
        href: '/read-cbz-on-android/',
        label: 'Read CBZ on Android',
        note: 'Picking a file from Downloads or Drive without a reader app.',
        kind: 'guide',
      },
    ],
    related: [],
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
    related: ['/', '/how-to-open-cbz/', '/what-is-a-cbz-file/', '/privacy/', '/cbz-to-pdf/'],
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
          'Yes. Switch the layout to Scroll in the toolbar and the pages line up in one continuous vertical column. Only a window of pages is kept in memory, so a long archive scrolls without loading every image, and pinch or Ctrl + wheel widens the column.',
      },
    ],
    related: ['/', '/how-to-open-cbz/', '/cbz-vs-cbr/', '/cbz-to-pdf/'],
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
          'Adding the site to your home screen gives you a shortcut, but the site does not register a share target, so you still pick the file with the button.',
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
          'Yes. The converter on this site builds the PDF in the same tab, so the archive still stays on your device. This page covers reading; the conversion options are described on the converter page.',
      },
    ],
    related: ['/', '/cbz-vs-cbr/', '/read-cbz-on-iphone/', '/read-cbz-on-android/', '/cbz-to-pdf/'],
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
    related: ['/', '/cbz-file-format/', '/cbz-file-wont-open/', '/manga-reader/', '/cbz-to-pdf/'],
  },
  {
    path: '/what-is-a-cbz-file/',
    title: 'What Is a CBZ File? Comic Book ZIP, Explained',
    description:
      'A CBZ is a ZIP archive of comic pages with a comic-specific extension. See what is inside, how to verify the file yourself, and which beliefs are wrong.',
    h1: 'What is a CBZ file?',
    eyebrow: 'File basics',
    lead: 'A .cbz file is an ordinary ZIP archive with a comic-specific extension. Inside are page images, sometimes a metadata file, and nothing else. The extension is a naming convention, not a new kind of compression.',
    schema: 'article',
    updated: '2026-11-11',
    sections: [
      {
        heading: 'One sentence, then the details',
        paragraphs: [
          'CBZ stands for Comic Book Zip. The file is a ZIP archive whose extension has been changed from .zip to .cbz so that comic readers and file managers can recognise it. Rename it back to .zip and every archive tool opens it without complaint.',
          'There is no standards body behind CBZ. The extension was popularised by early Windows comic readers such as CDisplay, which paired .cbz with .cbr (a RAR archive) and told the operating system which app should open them. Modern readers follow the same convention because it is simple and self-describing.',
        ],
      },
      {
        heading: 'What is usually inside',
        bullets: [
          'Page images in reading order, most often JPEG. PNG, WebP, GIF, AVIF, and BMP also appear. This reader accepts those six types and ignores everything else in the archive.',
          'An optional ComicInfo.xml with series name, volume, page count, and reading direction. It is metadata only: a CBZ without it still reads fine.',
          'Sometimes one folder per chapter, a cover image, or a credits page. Nothing in the format requires a flat structure.',
          'No database, no index, no DRM. The archive is the whole book.',
        ],
      },
      {
        heading: 'How to confirm a file really is a CBZ',
        paragraphs: [
          'If a file refuses to open, check the bytes before blaming the reader. A real ZIP starts with the characters PK. On Windows, renaming a copy to .zip and double-clicking is the fastest test. On macOS or Linux, `unzip -l file.cbz` lists the contents and `file file.cbz` prints the container type.',
          'A file whose header is Rar! or 7z was simply renamed, and no CBZ reader can open it. A file that turns out to be HTML is usually an error or login page that the browser saved under the archive name.',
        ],
      },
      {
        heading: 'Beliefs worth dropping',
        bullets: [
          '“CBZ is an image format.” It is a container. Sharpness and colour depend entirely on the images packed into it.',
          '“A CBZ must include ComicInfo.xml.” It is optional. When present, only two things change here: the title and the right-to-left hint.',
          '“CBZ files are encrypted.” The container has no DRM. Individual ZIP entries can be password-protected, but that is a ZIP feature, not a comic one, and this reader refuses those archives with a clear message.',
          '“Renaming CBR to CBZ converts it.” It does not. The bytes stay RAR and the file stays unreadable as a ZIP.',
          '“CBZ is safer than other archives.” A ZIP cannot run code by itself, but it can contain anything. Where the file came from matters more than the extension.',
        ],
      },
      {
        heading: 'Where the name comes from',
        paragraphs: [
          'CDisplay, a small Windows viewer from the early 2000s, used .cbz and .cbr so that double-clicking a comic opened the right program. The names stuck because every later reader wanted the same file associations.',
          'Today the extension is mostly a signal between you and your software. The bytes are ZIP, which is why a browser can read a CBZ without a plugin: it only has to unzip the archive and decode images.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is a CBZ file the same as a ZIP file?',
        answer:
          'Structurally yes. Same header, same directory, same compression. Only the extension and the convention around it differ.',
      },
      {
        question: 'Do I need an app to open a CBZ?',
        answer:
          'No. A browser reader can unpack and display it locally, and archive tools can extract it. A dedicated app adds library management and file association, not format support.',
      },
      {
        question: 'Why does my CBZ show a blank icon?',
        answer:
          'No application on that system claims the .cbz extension. The file is still valid; assign a reader, or open the site first and pick the file.',
      },
      {
        question: 'Does packing pages into a CBZ reduce quality?',
        answer:
          'No, as long as the images are stored or deflated and not re-encoded. Quality drops only if a tool re-saves the JPEGs. ZIP compression itself is lossless.',
      },
      {
        question: 'Can a CBZ contain PDF pages?',
        answer:
          'No reader treats a PDF as a page image. Some archives include PDF extras, but this reader lists only JPG, PNG, WebP, GIF, AVIF, and BMP.',
      },
    ],
    related: ['/cbz-file-format/', '/how-to-open-cbz/', '/how-to-make-a-cbz-file/', '/cbz-vs-cbr/', '/cbz-to-pdf/'],
  },
  {
    path: '/cbz-file-format/',
    title: 'CBZ File Format: ZIP Layout, ComicInfo.xml, and Page Order',
    description:
      'How a CBZ works inside: ZIP central directory, store vs deflate, filename sorting, ComicInfo.xml, and the archives a browser cannot open.',
    h1: 'The CBZ file format, from the bytes up',
    eyebrow: 'Format internals',
    lead: 'CBZ has no specification document. What it has is the ZIP specification plus a set of community conventions. Knowing both explains why one comic opens instantly and another stalls at page one.',
    schema: 'article',
    updated: '2026-11-11',
    sections: [
      {
        heading: 'A naming convention, not a spec',
        paragraphs: [
          'There is no RFC and no committee. A CBZ is a ZIP archive. The ComicInfo.xml metadata file and the idea of numbered pages come from the ComicRack ecosystem and are followed by most readers. That looseness is why two files with the same extension can behave very differently.',
        ],
      },
      {
        heading: 'The ZIP layout that makes seeking cheap',
        paragraphs: [
          'A ZIP contains local file headers, each followed by compressed data, plus a central directory at the end that lists every entry and its offset. A reader reads the tail first, builds the page index, then jumps to the exact byte range of the page it needs. Page 180 costs about the same as page 2.',
          'This is also why solid RAR archives are a poor fit for reading: one compressed stream means everything before page 180 must be decompressed first. ZIP does not have that restriction, and CBZ inherits the advantage.',
          'ZIP64 takes over above 4 GiB or 65,535 entries. Most comic archives stay below both, but a full scan run packed into one file can cross the first limit, and older tools may produce an archive that a reader opens incorrectly.',
        ],
      },
      {
        heading: 'Compression methods: store or deflate',
        paragraphs: [
          'The ZIP specification allows many methods. In practice, comic archives use two: store (method 0) and deflate (method 8). Page images are already compressed, so deflate usually saves very little while costing CPU time on every page open. Many tools store JPEG pages verbatim for that reason.',
          'Other methods exist — bzip2, LZMA, PPMd — and a ZIP using them is still a valid ZIP. Browser-based readers cannot unpack those, which is one reason a CBZ can open on the desktop and fail in a tab.',
        ],
      },
      {
        heading: 'Page order is a naming convention',
        paragraphs: [
          'The format stores filenames, not page numbers. Readers sort image entries with a natural comparison, so 2.jpg precedes 10.jpg. Zero-padded names such as 001.jpg make the order unambiguous even for tools that sort as plain text.',
          'Folders are usually flattened: chapter 1/001.jpg and chapter 2/001.jpg become consecutive pages in path order. Two files with the same basename fall back to comparing the full path.',
          'Build scripts and macOS add junk entries: __MACOSX folders, .DS_Store, Thumbs.db. This reader filters them out; a reader that does not will show duplicate or blank pages.',
        ],
      },
      {
        heading: 'ComicInfo.xml',
        paragraphs: [
          'An optional XML file, normally at the archive root, describing the book. The fields that matter for reading are Series, Number, Volume, Title, PageCount, Summary, Year, LanguageISO, BlackAndWhite, and Manga. Manga accepts Yes, No, or YesAndRightToLeft.',
          'This reader uses only Manga and the series/number pair. A malformed or missing file degrades to a neutral title and left-to-right pages instead of an error, because metadata should never block reading.',
        ],
      },
      {
        heading: 'Encoding and filename quirks',
        paragraphs: [
          'ZIP filenames are bytes. General purpose bit 11 marks a name as UTF-8; without it, old tools wrote CP437 and accented titles turn into mojibake. macOS also stores names in decomposed Unicode, so the same Japanese title can look identical on screen and still compare differently.',
          'None of this changes the images, but it can change sort order and the title shown in the toolbar.',
        ],
      },
      {
        heading: 'What a browser cannot open',
        paragraphs: [
          'Password-protected entries (ZipCrypto or AES-256), split or multi-volume archives (.z01, .z02), entries compressed with an unsupported method, and RAR or 7z files renamed to .cbz. This reader reports the encrypted and no-image cases explicitly instead of showing a blank page.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is CBZ an official format?',
        answer:
          'No. It is a widely followed convention: ZIP plus comic pages, with optional ComicInfo.xml metadata. Nothing enforces the layout, which is why readers vary.',
      },
      {
        question: 'Does the compression method affect image quality?',
        answer:
          'No. Store and deflate are both lossless. Quality changes only if a tool re-encodes the JPEGs inside the archive.',
      },
      {
        question: 'Why do my pages appear as 1, 10, 2?',
        answer:
          'The packing tool or the reader sorted names as plain text. Rename with zero-padded numbers (001, 002, … 010) or use a reader that sorts numbers naturally.',
      },
      {
        question: 'Can I put video or PDF files in a CBZ?',
        answer:
          'You can put anything in a ZIP, but a comic reader ignores non-image entries. This one lists only JPG, PNG, WebP, GIF, AVIF, and BMP.',
      },
      {
        question: 'What is the difference between CBZ and CB7?',
        answer:
          'CBZ wraps ZIP, CB7 wraps 7z. CB7 compresses better and is less common; browsers have no built-in 7z decoder, so CB7 stays a desktop-app format for now.',
      },
    ],
    related: ['/what-is-a-cbz-file/', '/cbz-vs-cbr/', '/cbz-file-wont-open/', '/how-to-make-a-cbz-file/', '/cbz-to-pdf/'],
  },
  {
    path: '/read-cbz-on-iphone/',
    title: 'How to Read a CBZ File on iPhone and iPad',
    description:
      'Open CBZ comics on iPhone or iPad with the Files app and Safari. Covers iCloud download checks, renaming a ZIP to CBZ on iOS, and Safari memory limits.',
    h1: 'Read a CBZ file on iPhone or iPad',
    eyebrow: 'iOS guide',
    lead: 'iOS has no built-in handler for .cbz, so tapping the file in Files does nothing useful. The reliable route is the reverse: open the reader in Safari first, then pick the archive from the Files browser.',
    schema: 'article',
    updated: '2026-11-11',
    sections: [
      {
        heading: 'Why tapping the file does nothing',
        paragraphs: [
          'iPhone and iPad ship with viewers for PDF, images, and office documents, but not for comic archives. No system app claims .cbz, and a website cannot register itself as the handler for a file type. A tap offers sharing options, not reading.',
          'Quick Look can preview individual images after you extract an archive, which is not the same as reading a comic in order.',
        ],
      },
      {
        heading: 'Step by step',
        bullets: [
          'Get the file into the Files app: from Mail, tap the attachment and choose Save to Files; from a computer, use AirDrop; from a cloud provider, open it in Files.',
          'Check that it is really downloaded. An iCloud item with a cloud icon is a placeholder, and the picker will stall or refuse until it is local. Tap the cloud icon first.',
          'Open this site in Safari, tap Choose a CBZ file, then Browse and pick the archive from On My iPhone or iCloud Drive.',
          'If the file arrived as a .zip, rename it in Files (long-press, Rename, replace .zip with .cbz). The bytes are already a ZIP, so no conversion is needed.',
          'Add the site to your Home Screen if you expect to come back. It still opens the same picker, but saves typing the address.',
        ],
      },
      {
        heading: 'Where the file can live',
        paragraphs: [
          'On My iPhone is the simplest location because it is always local. iCloud Drive works, but only after the file is downloaded. External drives and SD cards appear in Files on modern iOS and iPadOS, which is useful for large scan archives that would otherwise fill local storage.',
          'Third-party providers such as Dropbox or Google Drive appear in the Files browser once their Files extension is enabled. Picking from one may trigger a download before the reader can open the archive.',
        ],
      },
      {
        heading: 'iOS limits you will actually notice',
        bullets: [
          'No file association for .cbz, so the site has to be opened first. This is an OS rule, not a site limitation.',
          'The file picker filters by declared types. iOS greys out files when the filter is too specific, so this reader relaxes the filter on iOS and shows every file instead.',
          'Safari gives each tab a memory budget. Very large pages are downsampled before display; without that, a 5000-pixel scan can exhaust a phone tab.',
          'Switching apps under memory pressure can discard the page. Reading progress is stored locally and restored, but the browser is not allowed to reopen your file by itself, so you pick it again.',
          'Private browsing can clear local progress when the session ends.',
        ],
      },
      {
        heading: 'iPad specifics',
        paragraphs: [
          'Wide screens make double-page mode useful, and an external keyboard gives you arrow-key page turns. Split View and Slide Over shrink the memory available to the tab, so a huge archive is more likely to be reloaded there than in full screen.',
        ],
      },
      {
        heading: 'When a native app is the better tool',
        paragraphs: [
          'If you keep a large library on the device, a native comic app handles file association, folders, and offline covers better. A browser reader is for opening one file quickly, on a device where you do not want to install or sign in to anything.',
        ],
      },
    ],
    faq: [
      {
        question: 'Can I open a CBZ in Apple Books?',
        answer:
          'No. Books handles PDF and EPUB. A CBZ is an image archive and needs a reader that understands ZIP containers.',
      },
      {
        question: 'Why is my file greyed out in the picker?',
        answer:
          'Most often it is an iCloud placeholder that has not been downloaded. Tap the cloud icon in Files, then pick it again.',
      },
      {
        question: 'Can I read straight from iCloud Drive?',
        answer:
          'Yes, after the file is downloaded to the device. The browser only receives the file when the provider hands over the bytes.',
      },
      {
        question: 'Is my progress synced between iPhone and iPad?',
        answer:
          'No. Progress lives in the browser profile on each device; there is no account and no sync.',
      },
      {
        question: 'Does it work in Chrome or Firefox on iOS?',
        answer:
          'Those browsers use the same WebKit engine and file picker as Safari, so the steps are identical, but Safari is the best-tested path.',
      },
    ],
    related: ['/read-cbz-on-android/', '/how-to-open-cbz/', '/what-is-a-cbz-file/', '/cbz-file-wont-open/', '/cbz-to-pdf/'],
  },
  {
    path: '/read-cbz-on-android/',
    title: 'How to Read a CBZ File on Android',
    description:
      'Read CBZ comics on Android from Downloads, SD cards, or cloud providers. Covers Chrome file picking, the .cbz filter workaround, and tab memory on phones.',
    h1: 'Read a CBZ file on Android',
    eyebrow: 'Android guide',
    lead: 'Android has no default comic handler either, but its document picker is more forgiving than iOS: the file usually sits in Downloads, and Chrome hands it to the page in two taps.',
    schema: 'article',
    updated: '2026-11-11',
    sections: [
      {
        heading: 'Android already treats it as an archive',
        paragraphs: [
          'Android identifies files by MIME type, and .cbz has no registered type. The system usually falls back to a generic ZIP or binary type, both of which Chrome can pass to a web page. That is why Android rarely blocks a CBZ the way iOS does.',
          'Nothing is installed and no storage permission is requested: the picker grants the page read access to exactly the file you choose.',
        ],
      },
      {
        heading: 'Step by step',
        bullets: [
          'Download the archive, or move it into Downloads from a chat app or cloud drive.',
          'Open this site in Chrome, tap Choose a CBZ file, then pick the file under Downloads, Recent, or your SD card.',
          'If the entry is greyed out, the picker is filtering on a MIME type it cannot map. Rename a copy to .zip, which every Android build recognises, or open it from a file manager that reports ZIP.',
          'Add the site to your Home Screen for quicker access. It still opens the same picker; the site does not register a share target.',
        ],
      },
      {
        heading: 'Where Android files usually are',
        paragraphs: [
          'Downloads is the default target for Chrome. Chat apps keep files in their own folders, which the picker can still reach. SD cards and USB drives appear as separate roots. Google Drive and other providers show up through the system picker once their app is installed, and a large file may need to download locally first.',
          'Scoped storage on Android 11 and later hides other apps’ private directories from file managers, but it does not affect a file you pick yourself.',
        ],
      },
      {
        heading: 'Zip handling on the device',
        paragraphs: [
          'Files by Google and most OEM file managers can extract a ZIP and rename files. To turn a folder of images into a CBZ on the phone, compress the images and rename the result from .zip to .cbz; the extension is the only difference.',
          'Some managers hide extensions by default. If the rename produces .zip.cbz, the real name is now wrong; enable extension display and rename again.',
        ],
      },
      {
        heading: 'Android vs iPhone in practice',
        bullets: [
          'Getting the file in: Android is usually one download away; iOS often needs Save to Files plus an iCloud download check.',
          'File association: neither OS opens .cbz on double-tap, so both routes start at the site.',
          'External storage: Android is more direct with SD cards and USB drives; iOS supports them through Files but with more steps.',
          'Memory: low-RAM Android phones and older iPads both reload heavy tabs. Downsampling keeps a large page inside the tab budget on either platform.',
          'Gestures: Android back closes the menu or leaves the reader, while the iOS back gesture belongs to Safari and behaves differently.',
        ],
      },
      {
        heading: 'Tablets, foldables, and keyboards',
        paragraphs: [
          'On a wide screen, double-page mode pairs spreads after the cover, and arrow keys from an external keyboard turn pages. Split-screen reduces available memory, so keep very large archives in full-screen mode.',
        ],
      },
    ],
    faq: [
      {
        question: 'Do I need a file manager on Android?',
        answer:
          'No. Chrome’s picker reaches Downloads, Recent, and most cloud providers. A file manager helps when a file is buried in an app-specific folder.',
      },
      {
        question: 'Why does the reader say no readable images?',
        answer:
          'The archive may contain TIFF, HEIC, JXL, or PDF pages, which browsers cannot display, or the images may be encrypted. Convert pages to JPEG or PNG first.',
      },
      {
        question: 'Can I read a CBZ from Google Drive directly?',
        answer:
          'Yes if the provider hands the file to the picker. Large archives may download to local storage first, because the page needs the bytes, not a link.',
      },
      {
        question: 'Does it work offline on Android?',
        answer:
          'There is no app and no service worker in this version, so reloading the page needs a network connection. Once the reader is loaded, page turns are local.',
      },
      {
        question: 'Why does the tab reload when I switch apps?',
        answer:
          'Android reclaims memory from background tabs. Progress is saved, but you have to pick the file again because a page cannot reopen a local file by itself.',
      },
    ],
    related: ['/read-cbz-on-iphone/', '/how-to-open-cbz/', '/what-is-a-cbz-file/', '/cbz-file-wont-open/', '/cbz-to-pdf/'],
  },
  {
    path: '/how-to-make-a-cbz-file/',
    title: 'How to Make a CBZ File from Images or a Folder',
    description:
      'Build a CBZ the right way: zero-padded page names, ZIP settings that avoid wasted CPU, optional ComicInfo.xml, and packing mistakes that break page order.',
    h1: 'How to make a CBZ file',
    eyebrow: 'Packing guide',
    lead: 'Making a CBZ is making a ZIP with the right name. The work is not in the compression; it is in page naming, folder structure, and metadata that readers will actually use.',
    schema: 'article',
    updated: '2026-11-11',
    sections: [
      {
        heading: 'The whole job in one line',
        paragraphs: [
          'Collect the page images, put them into one archive in reading order, and name the archive with a .cbz extension. Any ZIP tool can do it; no comic-specific software is required.',
        ],
      },
      {
        heading: 'Name pages so they sort correctly',
        bullets: [
          'Zero-pad to a fixed width: 001.jpg through 120.jpg. Without padding, 10.jpg sorts before 2.jpg in plain text order.',
          'Keep one naming pattern. Mixing page-1.jpg with p10.png and scan_011 forces every reader to guess.',
          'Use chapter folders only if the reader flattens paths predictably. This one sorts by file name first, then by full path.',
          'Avoid duplicate numbers. Two files named 012.jpg in different folders are ambiguous by design.',
        ],
      },
      {
        heading: 'Zip it without wasting time',
        bullets: [
          'JPEG and PNG pages are already compressed. Deflate on top saves a few percent and costs CPU on every page open; choose Store when your tool offers it.',
          'Archive the images themselves, not the folder that contains them. Most readers flatten a single wrapper folder, but the extra level makes debugging harder.',
          'Exclude macOS resource forks (__MACOSX), .DS_Store, Thumbs.db, and cover thumbnails you do not want as pages.',
          'Do not add a password. Browsers have no prompt for ZIP passwords, so an encrypted CBZ is unreadable in a tab.',
          'Windows: select the images, right-click, Send to, Compressed folder, then rename .zip to .cbz. macOS: select the images and use Compress; compressing a folder instead adds one nested directory.',
        ],
      },
      {
        heading: 'Add ComicInfo.xml only if it helps',
        paragraphs: [
          'A minimal file at the archive root is enough: a ComicInfo element with Series, Number, PageCount, and Manga. Series and Number become the title, and Manga set to YesAndRightToLeft switches the initial reading direction.',
          'Wrong metadata is worse than none: a stale PageCount or a wrong Manga value changes what the reader shows. Most readers ignore unknown tags, so keep the file small.',
        ],
      },
      {
        heading: 'Check the archive before you share it',
        bullets: [
          'Rename a copy to .zip and open it: the page count should match, the first and last pages should be present, and no thumbnails should appear in the middle.',
          'Open it in a reader and jump to a middle page. A missing central directory or a truncated file usually fails at open time, not at page 40.',
          'Spot-check a spread. Two-page spreads scanned as one image will look wrong in double-page mode.',
        ],
      },
      {
        heading: 'Common packing mistakes',
        bullets: [
          'Re-saving JPEGs instead of copying them, which lowers quality with every pass.',
          'Mixing page sizes wildly; the reader has to rescale each page and the reading rhythm suffers.',
          'Leaving an .exe or readme inside. It is harmless to the reader, but it makes the archive look untrustworthy.',
          'Assuming a PDF belongs in a CBZ. A PDF is not a page image and will be ignored.',
        ],
      },
    ],
    faq: [
      {
        question: 'Do I need special software to make a CBZ?',
        answer:
          'No. Any ZIP tool plus a rename works. Dedicated comic tools add metadata editing and batch naming, not a different format.',
      },
      {
        question: 'Does zipping lower image quality?',
        answer:
          'No. ZIP is lossless. Quality drops only if a tool re-encodes the images before packing.',
      },
      {
        question: 'Can I make a CBZ on a phone?',
        answer:
          'Yes. Files by Google and iOS Files can compress selected files; rename the result to .cbz. Long archives are easier to verify on a desktop.',
      },
      {
        question: 'Should I use CBZ or PDF for scans?',
        answer:
          'CBZ for reading: pages stay separate, seeking is cheap, and readers handle right-to-left order. PDF suits printing and text-heavy documents.',
      },
      {
        question: 'Can this site create a CBZ for me?',
        answer:
          'No. It only reads archives; repacking happens in your file manager or archive tool.',
      },
    ],
    related: ['/what-is-a-cbz-file/', '/cbz-file-format/', '/cbz-file-wont-open/', '/how-to-open-cbz/', '/cbz-to-pdf/'],
  },
  {
    path: '/cbz-file-wont-open/',
    title: 'CBZ File Won’t Open? Causes and Fixes',
    description:
      'Diagnose a CBZ that will not open: renamed RAR, truncated download, encrypted entries, unsupported image types, and picker problems on phones.',
    h1: 'Why a CBZ file will not open',
    eyebrow: 'Troubleshooting',
    lead: 'Most broken CBZ files are not broken archives. They are a RAR renamed, a download saved as an error page, or a folder of images the reader cannot decode. A few checks separate those cases quickly.',
    schema: 'article',
    updated: '2026-11-11',
    sections: [
      {
        heading: 'Check the container first',
        paragraphs: [
          'Look at the first bytes. A ZIP starts with PK, RAR starts with Rar!, 7z starts with 7z. If the header is HTML, you saved a login or error page under the archive name. On macOS or Linux, `file` and `unzip -l` answer this in one command; on Windows, rename a copy to .zip and try to open it.',
          'A zero-byte file, or one far smaller than the original download, means the transfer never finished.',
        ],
      },
      {
        heading: 'The archive is truncated or corrupted',
        paragraphs: [
          'A ZIP keeps its index at the end. If the last bytes are missing, the reader cannot list the pages and reports an invalid archive even though the first images are intact. Download again, ideally without a manager that splits the file, and compare the size with the source.',
          'If the file opens but one page fails, that entry is damaged; `unzip -t` names it.',
        ],
      },
      {
        heading: 'It is actually RAR or 7z',
        paragraphs: [
          'Renaming does not convert. Extract the archive with a tool that understands RAR or 7z, then pack the images into a ZIP and rename it .cbz. This reader does not support CBR or CB7.',
        ],
      },
      {
        heading: 'The archive is encrypted',
        paragraphs: [
          'A ZIP can protect entries with a password. A browser tab has no place to type it, so this reader stops with a password-protected message instead of showing blank pages. Remove the password in 7-Zip or a similar tool, then reopen the archive.',
        ],
      },
      {
        heading: 'The images are in a format a browser cannot show',
        paragraphs: [
          'This reader accepts JPG, PNG, WebP, GIF, AVIF, and BMP. TIFF, JPEG 2000, HEIC, and JPEG XL are common in scans and are not decoded by the page. Convert those pages to JPEG or PNG, then repack.',
          'Some CMYK JPEGs display with different colours in a browser because colour conversion is left to the browser. Re-exporting the pages as sRGB avoids the surprise.',
        ],
      },
      {
        heading: 'The pages are there but out of order, or some are missing',
        paragraphs: [
          'Alphabetical sorting puts 10 before 2. If the reader has no natural-sort option, rename with zero-padded numbers. Duplicate names across chapter folders also confuse the order, and an archive that mixes images with thumbnails can show what looks like a missing page.',
        ],
      },
      {
        heading: 'It works on a computer but not on a phone',
        bullets: [
          'iOS: the file may still be an iCloud placeholder, so it is greyed out or fails to open. Download it in Files first.',
          'Android: the picker may filter .cbz by MIME type. Pick it from Downloads, or rename a copy to .zip.',
          'Both: very large pages can exhaust a phone tab. Pages are downsampled automatically, but an archive with hundreds of huge pages can still be slow to open.',
        ],
      },
      {
        heading: 'Narrowing it down',
        paragraphs: [
          'Try the same file in another reader. If it fails there too, the archive is the problem. If it opens elsewhere but not here, check the image formats and encryption, which are the two limits this reader enforces.',
        ],
      },
    ],
    faq: [
      {
        question: 'Can a corrupted CBZ be repaired?',
        answer:
          'Sometimes. ZIP repair tools can recover intact entries and rebuild the index. If the central directory is gone, extracting what remains and repacking is usually faster than repairing.',
      },
      {
        question: 'Why does the file open in an archive tool but not in a reader?',
        answer:
          'Archive tools show bytes; readers need supported image entries in a readable order. Encrypted entries, TIFF or HEIC pages, and PDF-only archives all fail in a reader.',
      },
      {
        question: 'Is it safe to open a CBZ?',
        answer:
          'The format cannot execute code. Risk comes from where the file was downloaded and from executables bundled inside it, not from the ZIP itself. This site only reads image entries.',
      },
      {
        question: 'Why is my file greyed out on iPhone or Android?',
        answer:
          'On iOS it is usually an iCloud file that has not been downloaded. On Android it is usually a picker MIME filter; picking from Downloads or renaming to .zip works around it.',
      },
      {
        question: 'Can I open a split CBZ (.z01, .z02)?',
        answer:
          'Not in a browser. Multi-volume ZIP needs every part joined, and this reader expects a single archive.',
      },
    ],
    related: ['/how-to-open-cbz/', '/cbz-vs-cbr/', '/cbz-file-format/', '/read-cbz-on-android/', '/cbz-to-pdf/'],
  },
  {
    path: '/privacy/',
    title: 'Privacy - CBZ Reader',
    description:
      'CBZ Reader processes files locally in your browser. No uploads, no account, no cookies, and only cookie-free visit statistics.',
    h1: 'Privacy',
    eyebrow: 'Plain language',
    lead: 'The short version: your comic never leaves your device, this site does not ask for an account, and the visit statistics it keeps are cookie-free and aggregate.',
    contact: 'jiamin.wu23@mavi.help',
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
          'Two cookie-free measurement tools are in use: Cloudflare Web Analytics, provided by the host, and Umami. Neither sets cookies, fingerprints devices, nor follows you across other sites. They are used to count page views and see which pages and features are actually used.',
          'Umami records page views plus a small set of coarse interaction events: a file was opened (with its extension and size range), the first page finished rendering (with timing), a layout mode was chosen, the first zoom, a bookmark was added, whether a recently opened file was resumed, and clicks on the reader button or related links. An event carries only its name and a few aggregate properties such as mode or size range. File names, page images, bookmark contents, and anything that could identify a person are never sent.',
        ],
      },
      {
        heading: 'Third parties',
        paragraphs: [
          'Pages load one third-party script: the Umami tracker from cloud.umami.is, identified by a public website ID. Cloudflare Web Analytics is supplied by the hosting provider. The site does not load remote fonts, remote images, embedded players, or advertising scripts, and it does not sell or share data with anyone else.',
        ],
      },
      {
        heading: 'Contact',
        contact: true,
        paragraphs: [
          'For privacy questions, corrections, or removal requests, write to the address below.',
          'This page is a technical description of the current build, not legal advice.',
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
        answer: 'No. The reader uses IndexedDB for local progress, which is not a cookie and is not sent to a server. Both analytics tools are cookie-free as well.',
      },
    ],
    related: ['/', '/read-cbz-online/', '/how-to-open-cbz/', '/terms/', '/disclaimer/'],
  },
  {
    path: '/terms/',
    title: 'Terms of Use - CBZ Reader',
    description:
      'The terms that apply to this browser-based CBZ reader and converter: as-is service, local file processing, acceptable use, and liability limits.',
    h1: 'Terms of Use',
    eyebrow: 'Legal',
    lead: 'These terms cover your use of this site and its CBZ reader and converter. By using the site, you accept them.',
    contact: 'jiamin.wu23@mavi.help',
    legal: true,
    schema: 'article',
    updated: '2026-11-11',
    sections: [
      {
        heading: 'The service',
        paragraphs: [
          'This site is a browser-based tool for reading CBZ archives and converting them to PDF. It is provided on an "as is" and "as available" basis. The operator does not promise that it will always be available, uninterrupted, or free of errors, and may change or discontinue it at any time.',
          'No account is required to use the features described on this site.',
        ],
      },
      {
        heading: 'Your files',
        paragraphs: [
          'Files you open or convert are read by your browser and processed inside the page. They are not uploaded to, stored on, or backed up by this site.',
          'You are responsible for making sure you have the right to open, convert, and use every file you load. Do not use this site for copyright infringement, for material you are not allowed to hold, or for any other unlawful purpose.',
        ],
      },
      {
        heading: 'No warranty',
        paragraphs: [
          'The site and its output are provided without warranties of any kind, express or implied, including fitness for a particular purpose and non-infringement. A conversion may fail, re-encode some image formats, or produce a file that another application reads differently; check the result before relying on it.',
        ],
      },
      {
        heading: 'Limitation of liability',
        paragraphs: [
          'To the extent permitted by law, the operator is not liable for data loss, corrupted output, lost profits, or any indirect or consequential loss arising from the use of, or inability to use, this site. Keep your own copies of important files.',
          'Nothing in these terms excludes liability that cannot be excluded under applicable law, or limits rights that mandatory consumer law gives you.',
        ],
      },
      {
        heading: 'Changes and governing law',
        paragraphs: [
          'These terms may be updated as the site changes. The revision date at the top of this page reflects the current version, and continued use after an update means you accept the revised terms.',
          'These terms are governed by the laws applicable at the operator\'s place of business, without regard to conflict-of-law rules. Disputes are subject to the competent courts there, unless mandatory law provides otherwise.',
        ],
      },
      {
        heading: 'Contact',
        contact: true,
        paragraphs: ['Questions about these terms can be sent to the address below.'],
      },
    ],
    faq: [],
    related: ['/privacy/', '/disclaimer/', '/'],
  },
  {
    path: '/disclaimer/',
    title: 'Disclaimer - CBZ Reader',
    description:
      'CBZ Reader is an independent local tool. It is not affiliated with any comic publisher or platform, and it does not host or distribute comic content apart from one credited public-domain sample.',
    h1: 'Disclaimer',
    eyebrow: 'Legal',
    lead: 'This site is an independent tool for files you already have. It is not a comic platform and has no relationship with the companies that publish or sell comics.',
    legal: true,
    schema: 'article',
    updated: '2026-11-11',
    sections: [
      {
        heading: 'No affiliation or endorsement',
        paragraphs: [
          'This site is not affiliated with, authorized by, sponsored by, or endorsed by any comic publisher, distributor, storefront, scanlation group, or reading platform. Any similarity in naming is descriptive only.',
        ],
      },
      {
        heading: 'Trademarks and format names',
        paragraphs: [
          'Names such as CBZ, CBR, and PDF, along with any product or company names mentioned on this site, are the property of their respective owners and are used only to describe file formats and compatibility.',
        ],
      },
      {
        heading: 'No comic content is hosted',
        paragraphs: [
          'This site does not distribute, host, index, or provide links to comic books or any other copyrighted works. There is no library, no catalogue, and no search for titles. The only files it handles are the ones you open from your own device.',
          'The single exception is the sample comic on the sample page: a public-domain work by the U.S. Army Cyber Institute at West Point, included with its title, author, and source credited. It is there so the reader can be tried without a file; it is not a catalogue or a library.',
        ],
      },
      {
        heading: 'Local processing only',
        paragraphs: [
          'Reading and conversion run inside your browser tab. The site has no server-side copy of your files and no way to recover a file you closed or deleted.',
        ],
      },
      {
        heading: 'Third-party links',
        paragraphs: [
          'Some pages link to third-party sites for reference. Those sites are outside its control, their content may change, and a link is not an endorsement. Their own terms and privacy practices apply when you visit them.',
        ],
      },
    ],
    faq: [],
    related: ['/terms/', '/privacy/', '/'],
  },
  {
    path: '/cbz-to-pdf/',
    title: 'CBZ to PDF Converter - Local, No Upload',
    description:
      'Convert a CBZ comic archive to PDF in your browser. Nothing is uploaded, JPEG pages are copied unchanged, and pages keep their original size or fit A4.',
    h1: 'Convert CBZ to PDF without uploading',
    eyebrow: 'CBZ to PDF',
    lead: 'Pick a .cbz file and get a PDF back without a round trip to a server. The archive is unpacked and the PDF is assembled in this tab, so the pages never leave your device.',
    converter: true,
    trust: ['No upload', 'JPEG pages copied as-is', 'Original size or A4', 'Works offline'],
    schema: 'app',
    schemaFeatures: [
      'Convert a CBZ archive to PDF in the browser',
      'JPEG pages embedded without re-encoding',
      'Original image size or A4 pages',
      'No upload and no account',
      'Cancelable conversion with specific error messages',
    ],
    updated: '2026-11-11',
    sections: [
      {
        heading: 'Why most CBZ to PDF converters upload your file',
        paragraphs: [
          'Uploading is the simplest way to build this tool. The archive goes to a server, a machine with a PDF library and plenty of memory unpacks it, and the finished file comes back as a download link. The browser only has to send and receive bytes.',
          'That design suits the operator, not the reader. A copy of your comic exists somewhere else even if it is deleted an hour later, large files usually need an account or a paid tier, and the result depends on someone else keeping the service online. For a file that is already on your disk, the round trip buys nothing.',
        ],
      },
      {
        heading: 'How the conversion works in this tab',
        paragraphs: [
          'Browsers can read a ZIP central directory and write binary data, so the whole job can stay local. The converter opens the archive with the same ZIP reader as the comic reader, sorts image entries naturally (2.jpg before 10.jpg), and ignores directory entries, __MACOSX folders and ComicInfo.xml.',
          'Each JPEG page is copied into the PDF as a DCT stream: the compressed image data is passed through untouched, with no decode and no re-encode. PNG pages are embedded losslessly too, including transparency. PDF has no native format for WebP, GIF, AVIF or BMP, so those pages are decoded once and written as JPEG at quality 92; that is the only path where pixels are re-compressed.',
          'Pages are processed one at a time with a pause between them, so the progress bar updates, the tab stays responsive, and Cancel is checked before every page.',
        ],
        bullets: [
          'JPEG and PNG pages: embedded without re-encoding.',
          'WebP, GIF, AVIF, BMP pages: re-encoded once as JPEG at quality 92.',
          'Page order follows a natural sort of the image file names, the same order the reader uses.',
          'The finished PDF downloads directly; no link expires and no copy is kept.',
        ],
        note: {
          title: 'Verify it yourself',
          paragraphs: [
            'You do not have to take this on trust. Both checks take about a minute and only involve this converter.',
          ],
          bullets: [
            'On a desktop, open DevTools → Network and start a conversion. The page and its scripts load, but no request carries your archive or page images; the analytics event sent during a run records only the page count, the elapsed time and the page-size choice.',
            'On a phone, open this page once while you still have a connection, then switch on airplane mode and reload it. Convert a local CBZ with no network at all: the PDF is still built and downloaded.',
          ],
        },
      },
      {
        heading: 'Original size or A4',
        paragraphs: [
          'With original size, one image pixel becomes one PDF point, so a 3000 × 4500 scan produces a 3000 × 4500 point page. Nothing is scaled, and viewers or printers shrink it to fit their own output. This is how most comic PDFs are built, and it preserves every pixel.',
          'With A4, every page becomes 595 × 842 points and the image is scaled to fit inside it without cropping or stretching, centred with margins. Choose this when the PDF is meant for printing or for an app that handles very large page boxes badly. The embedded image data is identical in both modes, so file size barely changes; only the page geometry does.',
        ],
      },
      {
        heading: 'What this converter does not do',
        bullets: [
          'No OCR and no text layer. Output pages are images, so text cannot be selected, searched or read aloud.',
          'One archive at a time. Batch conversion is not implemented.',
          'No CBR (RAR) or CB7 (7z) input. Browsers cannot open those containers; convert them to CBZ first.',
          'No password-protected archives. Encrypted pages are rejected before anything is written.',
          'No server fallback. If a very large archive exhausts the tab memory, the conversion stops with an error instead of uploading the file.',
        ],
      },
      {
        heading: 'When a conversion fails',
        paragraphs: [
          'Encrypted archives are rejected up front. An archive with no image entries is rejected with the number of entries that were found. A page that cannot be decoded stops the run and names the file inside the archive. Running out of memory, which usually takes hundreds of very large pages, is reported as a memory error; closing other tabs or splitting the archive is the practical fix.',
          'Cancel stops the run between pages and discards the partial PDF. Nothing is downloaded and no temporary file is left behind.',
        ],
      },
    ],
    faq: [
      {
        question: 'Does converting to PDF reduce image quality?',
        answer:
          'For JPEG and PNG pages, no. The compressed image data is copied into the PDF unchanged. WebP, GIF, AVIF and BMP pages are re-encoded once as JPEG at quality 92, because PDF has no native format for them. If your archive is made of JPEG scans, as most CBZ files are, each page image in the PDF is the same data as in the archive.',
      },
      {
        question: 'Can I convert several CBZ files at once?',
        answer:
          'No. One archive at a time keeps memory bounded and makes cancellation predictable. Start the next file after the first PDF has downloaded.',
      },
      {
        question: 'What happens with a password-protected archive?',
        answer:
          'It is rejected with an explanation. Remove the password in your archive tool, save a plain CBZ, then convert that file.',
      },
      {
        question: 'Which page size should I choose?',
        answer:
          'Use original size for an archival PDF that matches the scans exactly, and A4 when the PDF will be printed. The image data is the same in both modes, so quality and file size barely change.',
      },
      {
        question: 'Are my files uploaded anywhere?',
        answer:
          'No. The archive is read with the browser file API and the PDF is assembled in the tab. No request carries file content; the analytics events for a conversion record only the page count, the elapsed time and the page-size choice.',
      },
      {
        question: 'How can I check that the conversion does not upload my file?',
        answer:
          'Open this page once, then either watch DevTools → Network while converting or switch a phone to airplane mode and convert. On desktop the request list shows the page, its scripts and an analytics ping, but nothing that carries the archive or the page images. With the network off, the same conversion still finishes and downloads a PDF. This applies to this converter only: the archive and the finished PDF never leave the tab.',
      },
      {
        question: 'Does the converter work offline?',
        answer:
          'Yes, after the first visit. The converter ships in the same offline-capable shell as the reader, and your CBZ is a local file either way.',
      },
    ],
    related: ['/', '/what-is-a-cbz-file/', '/cbz-file-format/', '/cbz-file-wont-open/'],
    bridge: {
      text: 'Only want to look through the archive, not convert it?',
      href: '/',
      label: 'Open this CBZ in the browser reader',
    },
  },
]

export function findPage(pathname: string): PageContent {
  const normalized = pathname === '/' ? '/' : pathname.endsWith('/') ? pathname : `${pathname}/`
  return PAGES.find((page) => page.path === normalized) ?? PAGES[0]
}
