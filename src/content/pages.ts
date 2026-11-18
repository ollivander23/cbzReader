export interface PageToolLink {
  href: string
  label: string
  note: string
  kind: 'tool' | 'guide' | 'sample'
}

export interface PageSectionTable {
  head: string[]
  rows: string[][]
}

export interface PageSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
  /** A compact 3-column comparison, rendered as a real table. */
  table?: PageSectionTable
  // A compact left-to-right pipeline drawn with CSS, one entry per stage.
  flow?: string[]
  note?: PageSectionNote
  /** Optional follow-up link rendered under the section text. */
  link?: { href: string; label: string }
  /** External directory badges rendered as image links under the section text. */
  badges?: PageSectionBadge[]
  /** Renders the page-level contact address as a visible mailto link. */
  contact?: boolean
}

export interface PageSectionBadge {
  href: string
  src: string
  alt: string
  width: number
  height: number
}

export interface PageSectionNote {
  title: string
  paragraphs?: string[]
  bullets?: string[]
}

export interface FaqItem {
  question: string
  answer: string
  /** Optional follow-up link rendered after the answer; kept out of the answer text. */
  link?: { href: string; label: string }
}

/** A related link, optionally with anchor text other than the target's H1. */
export interface RelatedLink {
  href: string
  label?: string
}

export interface PageContent {
  path: string
  title: string
  description: string
  h1: string
  eyebrow: string
  lead: string
  /** Optional short factual paragraph under the hero trust list. */
  heroNote?: string
  /** Optional link appended to the hero note, e.g. a deeper explanation. */
  heroNoteLink?: { href: string; label: string }
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
  related: (string | RelatedLink)[]
}

export const PAGES: PageContent[] = [
  {
    path: '/',
    title: 'CBZ Reader & Converter — Your File Stays on Your Device',
    description:
      'Read CBZ comics or convert them to PDF in your browser. No install, no account, and the file never leaves your device. Sample comic included.',
    h1: 'Read or convert a CBZ without handing it over.',
    eyebrow: 'CBZ reader and converter',
    lead: 'Both run in your browser — the file never leaves your device.',
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
    updated: '2026-11-12',
    trust: ['Nothing is uploaded — the file stays in your browser, no account needed.'],
    heroNote:
      'Everything happens in this tab: the archive is read, the pages are decoded, and the PDF is written by the browser itself. There is no upload request, so there is no server that could keep a copy. Your original file stays where you picked it from.',
    heroNoteLink: { href: '/private-process/', label: 'How that works →' },
    sections: [],
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
        question: 'Which formats are supported?',
        answer:
          'CBZ and ZIP archives that contain JPG, PNG, WebP, GIF, AVIF, or BMP pages. CBR and CB7 are on the roadmap but are not supported in this version.',
      },
    ],
    tools: [
      {
        href: '/what-is-a-cbz-file/',
        label: 'What is a CBZ file?',
        note: 'ZIP container, pages, metadata.',
        kind: 'guide',
      },
      {
        href: '/how-to-open-cbz/',
        label: 'How to open a CBZ',
        note: 'Desktop, Android, iPhone.',
        kind: 'guide',
      },
      {
        href: '/how-to-make-a-cbz-file/',
        label: 'Make a CBZ',
        note: 'Zip scans into a readable archive.',
        kind: 'guide',
      },
      {
        href: '/cbz-file-wont-open/',
        label: 'A CBZ that will not open',
        note: 'Renamed RAR or encrypted.',
        kind: 'guide',
      },
      {
        href: '/cbz-vs-cbr/',
        label: 'CBZ vs CBR vs CB7',
        note: 'Which containers browsers open.',
        kind: 'guide',
      },
      {
        href: '/private-process/',
        label: 'A private process',
        note: 'What the tab does with the file.',
        kind: 'guide',
      },
    ],
    related: [],
  },
  {
    path: '/how-to-open-cbz/',
    title: 'How to Open a CBZ File on Windows, Mac, iPhone, and Android',
    description:
      'A friend sends you a .cbz and double-clicking does nothing. Open it in a browser tab, on Windows, Mac, iPhone, or Android, and flip the page direction when a manga volume reads backwards.',
    h1: 'How to open a CBZ file',
    eyebrow: 'Step-by-step guide',
    lead: 'It is late, a friend drops a .cbz into the chat, and the file just sits there. Double-clicking does nothing, and there is no comic app on this laptop.',
    schema: 'article',
    updated: '2026-11-18',
    sections: [
      {
        heading: 'Nothing happens on a double-click, and that is normal',
        paragraphs: [
          'A CBZ is a ZIP file with a comic-book name. Windows and macOS know exactly what a .zip is, but the .cbz ending belongs to no program on a fresh install, so your double-click lands nowhere. The file is not damaged, and nobody has claimed it yet.',
          'That answers half the question already. You are not fixing anything, you are choosing who opens it. There are three choices: a browser tab, an archive tool, or a reader app you install once and keep.',
        ],
      },
      {
        heading: 'The quickest route: open it in a browser tab',
        paragraphs: [
          'Go to this site, drop the archive on the page, or press the button and pick it from the folder it landed in. The page count appears as soon as the archive is read, usually a second or two for a normal volume.',
          'Turn pages with the arrow keys, the slider along the bottom, or a swipe on a touch screen. It remembers where you stopped, so page 40 is still page 40 when you open the laptop tomorrow.',
        ],
        bullets: [
          'Nothing gets installed.',
          'Nothing gets uploaded. The tab reads the file where it already sits on your disk.',
        ],
        link: { href: '/private-process/', label: 'How the tab reads a file without sending it anywhere' },
      },
      {
        heading: 'Windows: what to pick when the icon is blank',
        paragraphs: [
          'A new Windows install has no idea what a .cbz is. 7-Zip and WinRAR will open the archive and show you the pages, which is handy when you want to look at one page or check whether the file is complete. Unpacking a 300-page volume just to read it is slower than the tab.',
          'If you read comics more than once a month, install a reader. CDisplayEx, YACReader and ComicRack all take .cbz, and after one install the blank icons turn into real ones.',
          'One detail that catches people: Windows can keep handing .cbz to the old program. Right-click a file, choose Open with, then Always, and the association sticks.',
        ],
      },
      {
        heading: 'Mac: it opens, just not as a comic',
        paragraphs: [
          'Macs hand a .cbz to Archive Utility, which unpacks it into a folder of 001.jpg, 002.jpg and so on. That is a fine way to see whether the file is sound, but it is not reading: you end up clicking through images in Preview one at a time.',
          'The browser tab skips the unpacking. For regular reading, YACReader or Panels give you a proper page view and a shelf to keep volumes on.',
        ],
      },
      {
        heading: 'iPhone and iPad: the file has to be really on the device',
        paragraphs: [
          'Save the archive into Files first. When a file arrives through Mail or from a cloud folder, iOS can leave it as a placeholder that looks exactly like a real file but has no data behind it, and every reader fails on those. Tap it once and let it download.',
          'Then open the site in Safari and pick it from Files. On an iPad, a comic app with a shelf view is more comfortable than a browser tab for long sessions.',
        ],
      },
      {
        heading: 'Android: look in Downloads, not in the app list',
        paragraphs: [
          'The archive is usually in Downloads, or in the folder the chat app saves to. Open the site in Chrome and choose it from there.',
          'If a file manager refuses to list it, that is a filter on the extension rather than a missing file. The browser picker does not apply that filter, which makes it the easier route.',
        ],
      },
      {
        heading: 'Manga that reads backwards',
        paragraphs: [
          'A Japanese volume is meant to be read right to left: what you would call page one sits at the right edge, and moving forward means moving left. If the volume feels wrong, it usually is.',
          'Press RTL in the toolbar and the direction flips. Archives that carry ComicInfo.xml with Manga set to YesAndRightToLeft open that way on their own, but most scans carry no metadata at all.',
        ],
        link: { href: '/what-is-a-cbz-file/', label: 'What is inside an archive, and why page order matters' },
      },
      {
        heading: 'When the file still will not open',
        paragraphs: [
          'Two causes cover most cases: a download that never finished, and a .rar renamed to .cbz. Both take about a minute to check.',
        ],
        link: { href: '/cbz-file-wont-open/', label: 'Check the file, one step at a time' },
      },
    ],
    faq: [
      {
        question: 'Can I open a CBZ with 7-Zip or WinRAR?',
        answer:
          'Yes, both extract the pages, which is useful for checking one page or repacking. For reading a whole volume, a tab or a reader is quicker, because extraction leaves you with hundreds of loose images.',
      },
      {
        question: 'Does it work offline?',
        answer:
          'After the first visit the page is cached, so the reader opens without a connection. The archive is already on your disk, so page turning does not need the network either.',
      },
      {
        question: 'Why are the pages out of order?',
        answer:
          'Sorting filenames as text puts 10 before 2. This reader compares numbers, which fixes a lot of scans; other readers need the names zero-padded, like 001, 002.',
      },
      {
        question: 'Can I read a CBZ on a Kindle?',
        answer:
          'Not directly. Convert it to PDF first, or use an app that accepts archives. Kindle firmware does not open CBZ on its own.',
      },
      {
        question: 'Do I need an account or an install?',
        answer:
          'Neither. The tab is the whole reader, there is no sign-in, and there is no app to download.',
      },
      {
        question: 'Is it safe to open a CBZ from a stranger?',
        answer:
          'A real CBZ holds images, and a reader only decodes those. What to watch for is a file that is not an archive at all, for example an executable someone renamed. Check the first bytes before you trust the name.',
      },
    ],
    related: [
      '/',
      '/what-is-a-cbz-file/',
      '/cbz-to-pdf/',
      { href: '/cbz-vs-cbr/', label: 'CBR needs a different decoder' },
    ],
    bridge: {
      text: 'Curious what the tab does with the file while it reads?',
      href: '/private-process/',
      label: 'See the private process',
    },
  },
  {
    path: '/cbz-vs-cbr/',
    title: 'CBZ vs CBR vs CB7: What Is the Difference?',
    description:
      'CBZ is ZIP, CBR is RAR, and CB7 is 7z. Compare compatibility, compression, licensing, and which format this browser reader supports today.',
    h1: 'CBZ vs CBR vs CB7',
    eyebrow: 'Format comparison',
    lead: 'A .cbr lands in your downloads folder and the icon stays blank. A .cbz from the same series opens fine, and the two files look alike in the list.',
    schema: 'article',
    updated: '2026-11-13',
    sections: [
      {
        heading: 'Same book, different container',
        bullets: [
          'CBZ is ZIP. CBR is RAR. CB7 is 7z.',
          'The extension is a label, not a conversion: rename a .cbr to .cbz and the bytes are still RAR, so a ZIP reader still fails.',
          'CB7 is rare among comics and often compressed as one solid block, which matters for the next section.',
        ],
      },
      {
        heading: 'What the container changes',
        paragraphs: [
          'ZIP keeps a directory and each page separate, so a reader jumps to page 180 without touching the rest. RAR and 7z can compress every page as one stream: to reach page 180, the decoder unpacks everything before it.',
          'RAR also needs the UnRAR decoder, which is free to use but not OSI open source. That is why browsers ship no RAR reader.',
        ],
      },
      {
        heading: 'Which one to keep',
        paragraphs: [
          'Keep CBZ for anything you read on a phone, a Chromebook, or in a browser. Use CBR or CB7 only when the source arrived that way.',
          'Two files can look identical in a folder and behave differently, because the listing shows extensions, not bytes. The header decides: PK means ZIP, Rar! means RAR, 7z means 7z.',
        ],
      },
      {
        heading: 'What this site opens',
        paragraphs: [
          'This site opens CBZ and ZIP only. CBR and CB7 need a decoder browsers do not ship, and a solid archive cannot open instantly.',
          'To read a CBR here, extract it with a local RAR tool, repack the images as a ZIP, then rename to .cbz.',
          'The unpacking happens in the tab, and the file is never uploaded.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is CBR smaller than CBZ?',
        answer: 'Often, by a few percent, because RAR compresses better. That gain rarely matters next to faster page seeking.',
      },
      {
        question: 'Does a CBZ open everywhere?',
        answer: 'In most comic apps, phone readers, and browsers. A CBR needs an app that ships a RAR decoder.',
      },
      {
        question: 'Which should I download if I have the choice?',
        answer: 'CBZ. It opens in more places without an extra decoder.',
      },
    ],
    related: [
      '/',
      '/what-is-a-cbz-file/',
      '/cbz-file-wont-open/',
      { href: '/how-to-open-cbz/', label: 'Open a CBZ without installing anything' },
      { href: '/private-process/', label: 'What the tab does with the file' },
    ],
    bridge: {
      text: 'What happens to a CBZ once the tab opens it?',
      href: '/private-process/',
      label: 'See the private process',
    },
  },
  {
    path: '/what-is-a-cbz-file/',
    title: 'What Is a CBZ File? Structure, Contents, and How to Open One',
    description:
      'A .cbz is a ZIP archive of comic page images in reading order. What is inside, how to check the file really is one, which readers open it, and the problems that look like a broken file.',
    h1: 'What is a CBZ file?',
    eyebrow: 'File basics',
    lead: 'A .cbz is a ZIP archive of comic page images with a comic-specific extension.',
    schema: 'article',
    updated: '2026-11-18',
    sections: [
      {
        heading: 'The short answer',
        paragraphs: [
          'A CBZ file, short for Comic Book ZIP, is a ZIP archive that holds the pages of a comic or manga in reading order. The .cbz extension labels the archive as a comic so a reader knows what to do with it. Underneath it is an ordinary ZIP: the same PK header, the same central directory, the same lossless compression.',
          'It is not a document format like PDF. Nothing inside describes layout, fonts, or text flow. It is a stack of page images with an extension that says: open these in order.',
        ],
      },
      {
        heading: 'What is usually inside',
        bullets: [
          'Page images in reading order. JPEG is the most common, but PNG, WebP, GIF, AVIF, and BMP all work. One image is one page.',
          'ComicInfo.xml, an optional metadata file with the series name, volume or issue number, page count, and reading direction. A reader may use it to fill a library entry.',
          'Optional folders, one per chapter or per volume. The format does not require a flat layout.',
        ],
        note: {
          title: 'ComicInfo.xml is optional, and often missing',
          paragraphs: [
            'Scanned and repacked archives rarely carry it. The reader then falls back to page order and to the direction chosen in the toolbar, which is why a manga volume without metadata can still read right-to-left. A CBZ that has no ComicInfo.xml opens exactly like one that does.',
          ],
        },
      },
      {
        heading: 'Where the page order comes from',
        paragraphs: [
          'A CBZ has no page numbers stored inside it. Readers open pages in the order they sort the file names, so pages are almost always numbered with leading zeros: 001.jpg, 002.jpg, and so on.',
          'Without that padding, a plain name sort puts 1, 10, and 11 ahead of 2, and the volume turns out of sequence. When a CBZ opens in the wrong order, the file list is almost always the cause, not the reader.',
        ],
      },
      {
        heading: 'Compression does not change the image',
        paragraphs: [
          'ZIP compression is lossless. It shrinks the archive without changing a single pixel of the pages inside, so repacking the same images into a new CBZ leaves them exactly as they were.',
          'Quality drops in one place only: when a tool re-saves the images themselves, for example by writing pages out as lower-quality JPEGs before packing. That is a conversion, not compression.',
        ],
        link: { href: '/how-to-make-a-cbz-file/', label: 'Pack a folder of images into a CBZ' },
      },
      {
        heading: 'CBZ, ZIP, CBR, CB7',
        paragraphs: [
          'A CBZ and a ZIP are the same container. Only the extension and the convention differ, which also means the extension alone proves nothing about what is inside.',
        ],
        table: {
          head: ['Extension', 'Container', 'What it means in practice'],
          rows: [
            ['.cbz', 'ZIP', 'The usual comic archive. Every reader listed below opens it.'],
            ['.cbr', 'RAR', 'Needs a RAR decoder, which browsers do not ship.'],
            ['.cb7', '7z', 'Rare. Often packed as one solid block, so a page cannot be reached instantly.'],
            ['.cba', 'ACE', 'A legacy format from the 2000s, very rare today.'],
          ],
        },
        link: { href: '/cbz-vs-cbr/', label: 'Compare CBZ, CBR, and CB7 in detail' },
      },
      {
        heading: 'How to check that the file really is a CBZ',
        paragraphs: [
          'Rename a .cbr to .cbz and the bytes do not change: the label says ZIP, the file is still RAR. The header decides, so look at the first bytes rather than the name.',
        ],
        bullets: [
          'A ZIP starts with the two bytes PK, and most CBZ files do.',
          'Rar! means the file is a CBR with a renamed extension. 7z means it is a CB7.',
          'On Windows, copy the file, rename the copy to .zip, and open it. If the page images appear, it is a ZIP archive.',
          'On macOS or Linux, run unzip -l file.cbz. A readable page list means the archive is intact and is ZIP.',
          'If the content opens as a web page, the download saved an error or login page under the archive name. HTML starts with <html or <!doctype.',
        ],
      },
      {
        heading: 'What opens a CBZ',
        bullets: [
          'A browser, through a reader that unpacks the archive in the tab. Nothing to install, and the file never leaves the device.',
          'Phone and tablet comic apps, including Tachiyomi-style readers and Moon Reader.',
          'Desktop readers such as YACReader, CDisplayEx, ComicRack, and calibre.',
          'E-readers and their companion apps, when the device library accepts archive imports over USB or through a sync folder.',
        ],
        link: { href: '/how-to-open-cbz/', label: 'Open a CBZ on desktop, Android, or iPhone' },
      },
      {
        heading: 'Problems that look like a broken CBZ',
        bullets: [
          'A blank or generic icon means no program on that system claims the extension. The file is still valid.',
          'An archive that will not list its pages is usually an incomplete download, a split archive, or a damaged central directory.',
          'Pages out of sequence are a naming problem, fixed by renaming the files with zero-padded numbers.',
          'A file that opens as text or as a web page was saved wrongly by the browser, not packed wrongly.',
        ],
        link: { href: '/cbz-file-wont-open/', label: 'Steps for a CBZ file that will not open' },
      },
    ],
    faq: [
      {
        question: 'Is a CBZ the same as a ZIP?',
        answer:
          'Yes. Same header, same central directory, same compression. CBZ is the extension and the convention that tells reader software the archive is a comic.',
      },
      {
        question: 'Does packing pages into a CBZ reduce quality?',
        answer:
          'No. ZIP compression is lossless. Pages look worse only when a tool re-saves the images at a lower quality before packing.',
      },
      {
        question: 'What is ComicInfo.xml?',
        answer:
          'An optional metadata file inside the archive with the series name, volume, page count, and reading direction. Readers may use it to build a library entry. A CBZ without it still opens.',
      },
      {
        question: 'Why does my CBZ show a blank icon?',
        answer:
          'No program on that system claims the extension. The file is still valid; open it in a reader, or assign one as the default for .cbz.',
      },
      {
        question: 'What is the difference between CBZ and CBR?',
        answer:
          'CBZ is ZIP, CBR is RAR. ZIP keeps every page separate, so a reader jumps straight to a later page. Solid RAR and 7z streams often have to unpack everything before the chosen page.',
      },
      {
        question: 'Can a CBZ contain text, video, or audio?',
        answer:
          'No. A CBZ is a bundle of page images. Video, audio, and scripted storytelling belong to other formats.',
      },
    ],
    related: [
      '/how-to-open-cbz/',
      '/how-to-make-a-cbz-file/',
      '/cbz-vs-cbr/',
      { href: '/cbz-to-pdf/', label: 'Turn it into a PDF locally' },
      { href: '/private-process/', label: 'What the tab does with it' },
    ],
    bridge: {
      text: 'What happens to the file when the tab opens it?',
      href: '/private-process/',
      label: 'See the private process',
    },
  },
  {
    path: '/how-to-make-a-cbz-file/',
    title: 'How to Make a CBZ File from Images or a Folder',
    description:
      'Build a CBZ the right way: zero-padded page names, ZIP settings that avoid wasted CPU, optional ComicInfo.xml, and packing mistakes that break page order.',
    h1: 'How to make a CBZ file',
    eyebrow: 'Packing guide',
    lead: 'A folder of scans sits on your desktop, 120 images named scan_001.jpg upward. You want one file that opens at page one and turns to the end.',
    schema: 'article',
    updated: '2026-11-13',
    sections: [
      {
        heading: 'Name the pages first',
        paragraphs: [
          'Number them with a fixed width: 001.jpg through 120.jpg. Plain sorting puts 10 before 2, so padding is the difference between a book and a shuffle.',
        ],
      },
      {
        heading: 'Pack them',
        bullets: [
          'Windows: select the images, right-click, Send to, Compressed (zipped) folder, then rename the result to .cbz.',
          'macOS: select the images, right-click, Compress, then rename the archive to .cbz. Compress the images, not the folder holding them.',
          'Command line: `zip -0 -X book.cbz *.jpg` stores the pages without compression and skips extra attributes.',
        ],
      },
      {
        heading: 'Store, and the 4 GiB limit',
        bullets: [
          'Pick Store when the tool asks. JPEG and PNG are already compressed; deflate saves a few percent and costs CPU on every page turn.',
          'Above 4 GiB or 65,535 entries, the archive switches to ZIP64. Some readers open those incorrectly, so split the run into two volumes.',
          'Do not set a password. Browsers cannot prompt for ZIP passwords, so the file will not open in a tab.',
        ],
      },
      {
        heading: 'Leave out what is not a page',
        bullets: [
          'Remove __MACOSX, .DS_Store, Thumbs.db, and cover thumbnails.',
          'Copy the images in; do not re-save them on the way.',
          'A PDF inside will be ignored, and a readme or .exe only makes the archive look wrong.',
        ],
      },
      {
        heading: 'ComicInfo.xml, if you want a title',
        paragraphs: [
          'One small file at the archive root can set the title and confirm page order; the reader still sorts by filename.',
        ],
      },
      {
        heading: 'Test before sharing',
        bullets: [
          'Rename a copy to .zip and open it: the page count matches, the first and last pages are there, and no thumbnails sit in the middle.',
          'Open it in a reader and jump to page 40. A truncated archive fails at open time, not halfway through.',
          'Packing happens on your machine; this site never sees the archive.',
        ],
      },
    ],
    faq: [
      {
        question: 'Do I need special software?',
        answer: 'No. Any ZIP tool works; the extension is the only comic-specific part.',
      },
      {
        question: 'Does zipping lower image quality?',
        answer: 'No. ZIP is lossless; quality drops only if a tool re-encodes the pages.',
      },
      {
        question: 'Can I do this on a phone?',
        answer: 'Yes. Files by Google and iOS Files compress selected files; rename the result to .cbz.',
      },
    ],
    related: [
      '/what-is-a-cbz-file/',
      '/how-to-open-cbz/',
      '/cbz-file-wont-open/',
      { href: '/cbz-to-pdf/', label: 'Turn the pages into a PDF' },
      { href: '/private-process/', label: 'What the tab does with the file' },
    ],
    bridge: {
      text: 'What does the tab do when the finished file is opened here?',
      href: '/private-process/',
      label: 'See the private process',
    },
  },
  {
    path: '/cbz-file-wont-open/',
    title: 'CBZ File Won’t Open? Causes and Fixes',
    description:
      'Double-clicking does nothing, or the reader calls the archive invalid. Check the download size, the file header, the index at the end, encryption, and the image formats inside.',
    h1: 'Why a CBZ file will not open',
    eyebrow: 'Troubleshooting',
    lead: 'You finally get the volume you have been waiting for. Double-click, and either nothing happens or the spinner sits at zero. Most of the time the archive is fine, and one small thing is in the way.',
    schema: 'article',
    updated: '2026-11-18',
    sections: [
      {
        heading: 'First the boring question: did the download finish?',
        paragraphs: [
          'Compare the size in your folder with the size the source page quotes. A file that stopped at sixty percent looks completely normal in a file list, and it will not open no matter which reader you try.',
          'Two names ending in .z01 and .z02 are one split archive. Every part has to be joined before anything can read it, and a reader handed only the .cbz part will refuse it.',
          'A zero-byte file means the browser saved the name before any data arrived. Download again and watch the size as it grows.',
        ],
      },
      {
        heading: 'Then check what the file really is',
        paragraphs: [
          'Extensions are typed by whoever packed the file, and they can be wrong. The first bytes are the part that cannot lie: PK means ZIP, Rar! means RAR, 7z means 7z, and a web page starts with <html or <!doctype.',
        ],
        bullets: [
          'Windows: copy the file, rename the copy to .zip, and open it. If the page images appear, it is a ZIP archive.',
          'macOS or Linux: unzip -l file.cbz lists the pages, and unzip -t reports whether the archive is intact.',
          'Rar! means someone renamed a CBR. Extract with a RAR tool, repack the images as a ZIP, then rename the result to .cbz.',
          'HTML means the download saved a login or error page under the archive name. Sign in first, then download again.',
        ],
        note: {
          title: 'Renaming is not converting',
          paragraphs: [
            'Changing .cbr to .cbz changes the label and nothing else. The bytes inside still need a RAR decoder, and browsers do not ship one.',
          ],
        },
      },
      {
        heading: 'The index at the end of the file is gone',
        paragraphs: [
          'A ZIP keeps a small table at the very end that lists where each page starts. Lose the last few kilobytes and the table disappears; every image may still be in there, and the reader cannot show a single page. This is what a broken download usually leaves behind.',
          'Download again without a split-file manager, then compare the size. If only a few pages misbehave, unzip -t names the damaged entry.',
        ],
      },
      {
        heading: 'It is asking for a password',
        paragraphs: [
          'Encrypted entries need a password, and a browser tab has nowhere to put one. Open the archive in 7-Zip, extract with the password, and save the result as a fresh CBZ.',
        ],
      },
      {
        heading: 'The pages are in a format the app cannot decode',
        paragraphs: [
          'JPG, PNG, WebP, GIF, AVIF and BMP are all fine. TIFF, JPEG 2000, HEIC and JPEG XL are not, and they turn up in scans and in exports from photo software. The archive is healthy; the pages simply speak a language the browser does not.',
          'Convert those pages to JPEG or PNG and repack. A desktop reader often handles TIFF directly, which is the faster path if you only need to look at the content once.',
        ],
      },
      {
        heading: 'It opens, but pages are out of order or missing',
        bullets: [
          '1, 10, 11 sitting ahead of 2 is a text sort. Rename the files with zero-padded numbers.',
          'The same page name in two chapter folders breaks the sort. Keep one folder per archive.',
          'Thumbs.db, .DS_Store and __MACOSX folders are packing leftovers, not pages.',
          'A cover saved as cover.jpg can land in the middle of the volume.',
        ],
      },
      {
        heading: 'Fine on the computer, stuck on the phone',
        bullets: [
          'iOS: an iCloud placeholder looks like a file and has no data behind it. Open it once in Files.',
          'Android: the file app may filter .cbz by MIME type. The browser picker does not.',
          'Pages around 4000px can exhaust the memory a phone gives a browser tab. Resize before repacking.',
        ],
      },
      {
        heading: 'A quick way to tell which side is broken',
        paragraphs: [
          'Open the same file in a second reader. If it fails there too, the archive is the problem. If it opens elsewhere, the limit belongs to the first app: an image format it cannot decode, or encryption it cannot touch.',
          'Checking a file in a browser tab uploads nothing, so the experiment costs nothing either.',
        ],
        link: { href: '/private-process/', label: 'What happens while the tab checks a file' },
      },
    ],
    faq: [
      {
        question: 'Can a damaged CBZ be repaired?',
        answer:
          'Sometimes. Repair tools rebuild the index at the end of the archive. When the index is gone for good, extracting the pages that remain and repacking them is usually faster than repairing.',
      },
      {
        question: 'It lists in 7-Zip but no reader will open it',
        answer:
          'Archive tools show bytes, readers need images they can decode. TIFF, HEIC and encrypted entries all look fine in 7-Zip and fail in a reader.',
      },
      {
        question: 'Can I open a split CBZ?',
        answer:
          'Not on its own. Join .z01, .z02 and the rest into a single archive first, then open the result.',
      },
      {
        question: 'Why is one page grey or blank?',
        answer:
          'That page image is truncated. Either download the file again or repack the pages that are intact.',
      },
      {
        question: 'What if the file came from a paid store?',
        answer:
          'Paid downloads are often wrapped in DRM, which is neither a plain ZIP nor an archive a reader can open. Check the header before you blame the reader.',
      },
      {
        question: 'Will converting it to PDF help?',
        answer:
          'It helps when the pages are readable but the app is not. A PDF will not rescue a truncated download.',
      },
    ],
    related: [
      '/how-to-open-cbz/',
      '/what-is-a-cbz-file/',
      '/cbz-vs-cbr/',
      { href: '/cbz-to-pdf/', label: 'Try it as a PDF' },
    ],
    bridge: {
      text: 'What does the tab do with a file it cannot open?',
      href: '/private-process/',
      label: 'See the private process',
    },
  },
  {
    path: '/privacy/',
    title: 'Privacy - CBZ Reader',
    description:
      'CBZ Reader processes files locally in your browser. No uploads, no account, no cookies, and only cookie-free visit statistics.',
    h1: 'Privacy',
    eyebrow: 'Plain language',
    lead: 'Your comic never leaves your device, there is no account, and visit statistics are cookie-free and aggregate.',
    contact: 'jiamin.wu23@mavi.help',
    schema: 'article',
    updated: '2026-11-13',
    sections: [
      {
        heading: 'Files',
        paragraphs: [
          'Archives are opened with the browser File API and decoded in the tab; nothing is uploaded and no server copy is kept. Reading progress stays in IndexedDB, keyed by a file fingerprint, and clearing site data removes it.',
        ],
      },
      {
        heading: 'Analytics',
        paragraphs: [
          'Cloudflare Web Analytics, served by the host, and Umami count visits without cookies, device fingerprints, or cross-site tracking.',
          'Umami records page views and coarse events: file opened (extension, size range), first-page timing, layout, zoom, bookmark, resume, and reader or related-link clicks. File names, page images, and anything identifying a person are never sent.',
        ],
      },
      {
        heading: 'Third parties',
        paragraphs: [
          'The only third-party script is Umami from cloud.umami.is. No remote fonts, images, players, or ads load, and data is not sold or shared.',
        ],
      },
      {
        heading: 'Changes and contact',
        contact: true,
        paragraphs: [
          'This page is updated with the site; the date above is the latest revision.',
          'Questions, corrections, or removal requests: write to the address below.',
        ],
      },
    ],
    faq: [],
    related: [
      '/',
      '/how-to-open-cbz/',
      '/terms/',
      '/disclaimer/',
      { href: '/private-process/', label: 'What the code does with the file' },
    ],
  },
  {
    path: '/terms/',
    title: 'Terms of Use - CBZ Reader',
    description:
      'The terms that apply to this browser-based CBZ reader and converter: as-is service, local file processing, acceptable use, and liability limits.',
    h1: 'Terms of Use',
    eyebrow: 'Legal',
    lead: 'These terms cover your use of this site and its reader and converter; using the site means you accept them.',
    contact: 'jiamin.wu23@mavi.help',
    legal: true,
    schema: 'article',
    updated: '2026-11-13',
    sections: [
      {
        heading: 'The service',
        paragraphs: [
          'This site is a browser-based CBZ reader and converter, provided "as is" and "as available", and may change or end at any time.',
        ],
      },
      {
        heading: 'Your files',
        paragraphs: [
          'Files are read and processed inside your browser tab; nothing is uploaded or stored here. You must have the right to open every file, and must not use the site for infringement or other unlawful purposes.',
        ],
      },
      {
        heading: 'No warranty',
        paragraphs: [
          'The site and its output come with no warranty, express or implied, including fitness for a particular purpose and non-infringement. Check a conversion before relying on it.',
        ],
      },
      {
        heading: 'Limitation of liability',
        paragraphs: [
          'To the extent permitted by law, the operator is not liable for data loss, corrupted output, lost profits, or indirect loss from this site or its unavailability. Keep your own copies. Liability that cannot be excluded by law and consumer rights are unaffected.',
        ],
      },
      {
        heading: 'Changes, law and contact',
        contact: true,
        paragraphs: [
          'These terms may be updated; continued use after a change means you accept the current version. Local law governs, without affecting mandatory consumer rights.',
          'Questions: write to the address below.',
        ],
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
    lead: 'An independent tool for files you already have, not a comic platform.',
    contact: 'jiamin.wu23@mavi.help',
    legal: true,
    schema: 'article',
    updated: '2026-11-13',
    sections: [
      {
        heading: 'No affiliation',
        paragraphs: [
          'This site is an independent tool, not affiliated with, authorized, sponsored, or endorsed by any publisher, distributor, storefront, scanlation group, or reading platform.',
        ],
      },
      {
        heading: 'Trademarks and content',
        paragraphs: [
          'CBZ, CBR, PDF, and product names belong to their owners and describe formats only. This site hosts no comics, catalogue, or links to copyrighted works; it handles only files you open. The sample is public domain and credited.',
        ],
      },
      {
        heading: 'Local processing',
        paragraphs: [
          'Everything runs in your browser tab; no server-side copy is kept and a deleted file cannot be recovered.',
        ],
      },
      {
        heading: 'External links',
        paragraphs: [
          'Third-party links are outside this site\'s control, may change, and are not endorsements; their own terms and privacy practices apply.',
        ],
      },
      {
        heading: 'Changes and contact',
        contact: true,
        paragraphs: [
          'This page is updated with the site; questions: write to the address below.',
        ],
      },
    ],
    faq: [],
    related: ['/terms/', '/privacy/', '/'],
  },
  {
    path: '/cbz-to-pdf/',
    title: 'CBZ to PDF Converter - No Upload, Runs in Your Browser',
    description:
      'Convert a CBZ comic to PDF in your browser without uploading it. JPEG pages are copied unchanged, and pages keep their original size or fit A4.',
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
    updated: '2026-11-13',
    sections: [
      {
        heading: 'Why most CBZ to PDF converters upload your file',
        paragraphs: [
          'Other converters upload because the work happens on a server, and a server has to be paid for, kept online, and given somewhere to hold the archive while the job runs.',
        ],
        link: { href: '/private-process/', label: 'What a server in the middle means for your file →' },
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
        ],
      },
      {
        heading: 'Offline use',
        paragraphs: [
          'The converter loads once, then runs from the same offline shell as the reader, so after that first visit a conversion needs no network at all. You can confirm it on your own device; the method is on the private-process page.',
        ],
        link: { href: '/private-process/', label: 'Check it in a minute →' },
      },
      {
        heading: 'Original size or A4',
        paragraphs: [
          'With original size, the page keeps the physical size the image was authored for: CSS pixels are 96 DPI and PDF points are 1/72 inch, so one pixel becomes 0.75 points and a 3000 × 4500 scan gives a 2250 × 3375 point page. Nothing is resampled, and most comic PDFs are built this way.',
          'With A4, every page becomes 595 × 842 points and the image is scaled to fit inside it without cropping or stretching, centred with margins. Choose this when the PDF is meant for printing or for an app that handles very large page boxes badly. The embedded image data is identical in both modes, so file size barely changes; only the page geometry does.',
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
          'For JPEG and PNG pages, no: the compressed image data is copied into the PDF unchanged, and only WebP, GIF, AVIF and BMP pages are decoded and written once as JPEG at quality 92.',
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
        question: 'Can I convert a comic I bought without uploading it somewhere?',
        answer:
          'Yes. There is no upload step: the archive is opened from your disk and the PDF is written in the same tab.',
      },
      {
        question: 'How large a CBZ can it convert?',
        answer:
          'There is no quota, because nothing is sent to a server; the limit is the memory the tab is given. A few hundred ordinary pages convert comfortably on a desktop, while hundreds of very large pages can exhaust a phone. The run pauses between pages, and Cancel stops it without downloading a partial PDF.',
      },
    ],
    related: [
      '/',
      '/what-is-a-cbz-file/',
      '/cbz-file-wont-open/',
      { href: '/private-process/', label: 'What runs inside the tab' },
    ],
    bridge: {
      text: 'Only want to look through the archive, not convert it?',
      href: '/',
      label: 'Open this CBZ in the browser reader',
    },
  },
  {
    path: '/private-process/',
    title: 'Private Process — What Actually Happens in the Tab',
    description:
      'The archive is unpacked, pages are decoded, PDFs are written, all by this tab. What the process rules out, what it doesn\'t, and how to verify it in a minute.',
    h1: 'A private process, not a service',
    eyebrow: 'Under the hood',
    lead: 'Everything below happens inside this tab — there is no server side to send anything to.',
    schema: 'article',
    updated: '2026-11-13',
    sections: [
      {
        heading: 'What private process means here',
        paragraphs: [
          'A colleague sends a .cbz at 11pm. The laptop has a locked-down company image, no comic app, and no permission to install one. You open it in a browser tab instead.',
          'That is the whole idea: the file comes in, the work happens inside the tab, and the result goes back to you. There is nowhere in that loop to send a copy.',
        ],
      },
      {
        heading: 'Why the other tools need a server',
        paragraphs: [
          'An upload site works the other way round. Your archive leaves the tab, goes to a machine with the software and the memory for the job, and a link comes back. The page in front of you only passes the file along.',
          'A copy sits on hardware someone else controls and stays there until they decide to delete it — often longer, in a cache or a log. Because server capacity costs money, large files usually require an account or a paid tier. And the service still has to exist tomorrow for the tool to work at all. None of that is bad faith; it is what putting a server in the middle produces.',
        ],
      },
      {
        heading: 'The promises, and what holds them up',
        paragraphs: [
          'You are on hotel Wi-Fi with a work laptop and a strict no-upload policy. The home page makes four promises, and each one rests on something specific.',
        ],
        table: {
          head: ['The promise', 'What holds it up'],
          rows: [
            [
              'Your file stays on your device',
              'The browser hands the file to the page, and the page has no upload destination to hand it to',
            ],
            ['read', 'Opened where it already sits, not copied to a service first'],
            ['convert', 'Decoded and assembled on your machine, not on ours'],
            ['without handing it over', 'Saved by your browser: no link to collect and no copy for anyone to hold'],
          ],
        },
        link: { href: '/cbz-to-pdf/', label: 'How the conversion runs, step by step →' },
      },
      {
        heading: 'The path a file takes',
        flow: ['Unpack', 'Decode', 'Lay out', 'Deliver'],
        paragraphs: [
          'A 400 MB archive opens on a phone with no app installed.',
          'Unpack, decode and lay out all happen in the tab, and Deliver has two exits: pixels to the screen, PDF bytes to a download. Neither exit ends at a server.',
        ],
      },
      {
        heading: 'Where the tab ends (Privacy details)',
        paragraphs: [
          'This site still has a host and a bill, so three minor things happen outside the tab. None of them contains your file.',
        ],
        bullets: [
          'Cloudflare (CDN): Sees basic request data like IP address and browser type (but never your files).',
          'Umami (Analytics): Gets one event per visit or conversion, but no file data.',
          'Browser Storage: Saves your language choice and reading progress locally. Clearing site data removes both.',
        ],
      },
      {
        heading: 'Check it in a minute',
        paragraphs: ['Pick a real file and watch the browser while it works.'],
        bullets: [
          'Open DevTools → Network, filter by this domain, then start the work. The page and its scripts load, one analytics request appears, and nothing carries the archive or the page images.',
          'On a phone, open this page once while online, turn on airplane mode, reload, then convert a local CBZ. The PDF is still built and saved.',
          'Search the request list for an endpoint that accepts a file. There is nothing to find.',
        ],
      },
    ],
    faq: [
      {
        question: 'How does local processing actually work?',
        answer:
          'The browser reads the ZIP central directory in the tab, pulls one page at a time, and pdf-lib writes the PDF bytes locally. The finished file is handed to you as a Blob download made in the tab, so no request carries the archive and there is no copy on a server to expire or to delete.',
      },
      {
        question: 'Is this the same as the privacy page?',
        answer:
          'The privacy page lists what is collected and why. This page covers what the code does with the file.',
      },
      {
        question: 'What is sitting in my browser storage?',
        answer:
          'A language preference and reading progress, plus the service worker copy of this page. Clearing site data removes all of it.',
      },
      {
        question: 'Why did a conversion finish on a plane?',
        answer:
          'A service worker kept the page and its scripts after the first visit. The archive was already on your disk.',
      },
      {
        question: 'What happens if I switch browsers?',
        answer: 'Nothing carries over. Reading progress stays in the browser that wrote it.',
      },
    ],
    related: [
      '/',
      { href: '/cbz-to-pdf/', label: 'Try it with one file' },
      { href: '/privacy/', label: 'What the site collects' },
      { href: '/cbz-vs-cbr/', label: 'What the container changes' },
    ],
  },
  {
    path: '/about/',
    title: 'About CBZ Reader - Who Builds It and What It Leaves Out',
    description:
      'An independent, single-purpose tool for opening and converting comic archives. Who builds it, how it is funded, what it deliberately leaves out, and what changed when.',
    h1: 'About this site',
    eyebrow: 'Who runs this',
    lead: 'CBZ Reader is a small independent tool with one job: open a comic archive you already own, in a browser tab, without sending it anywhere.',
    schema: 'article',
    updated: '2026-11-13',
    sections: [
      {
        heading: 'Who builds it',
        paragraphs: [
          'One independent developer, between other work. There is no company or roadmap meeting: pages are added when a real question has no answer yet. Corrections are welcome — write to the address on the privacy page.',
        ],
      },
      {
        heading: 'What it does',
        paragraphs: [
          'A comic viewer and a CBZ to PDF converter share one archive reader. Both read files from your disk and work inside the tab, so there is no upload to opt out of. No account, server library, or conversion queue.',
        ],
      },
      {
        heading: 'What it leaves out',
        bullets: [
          'CBR and CB7 input: browsers ship no RAR or 7z decoder.',
          'OCR and text layers: PDF output is images, so nothing is selectable.',
          'Accounts, sync, cloud libraries: progress stays in this browser.',
          'Batch conversion: one archive at a time keeps memory bounded and Cancel meaningful.',
        ],
      },
      {
        heading: 'How it is funded',
        paragraphs: [
          'Free, with no ads, paid tier, or watermark. Static hosting and a domain cost little enough to pay for directly, and there is no storage to sell or dataset to build.',
        ],
      },
      {
        heading: 'What changed',
        bullets: [
          '2026-11-12 — Homepage repositioned around reading and converting without an upload; the language switcher became plain links; page dates moved into the sitemap.',
          '2026-11-11 — First public version: browser reader, CBZ to PDF converter, and offline shell.',
          'Since launch — Corrected the Android guide and documented how very large pages are handled.',
        ],
      },
      {
        heading: 'Where it is listed',
        badges: [
          {
            href: 'https://www.saashub.com/cbz-reader-mavi-help?utm_source=badge&utm_campaign=badge&utm_content=cbz-reader-mavi-help&badge_variant=color&badge_kind=approved',
            src: 'https://cdn-b.saashub.com/img/badges/approved-color.png?v=1',
            alt: 'Approved on SaaSHub',
            width: 150,
            height: 40,
          },
          {
            href: 'https://programmerneeds.com/tools/cbz-reader?utm_source=maker-site&utm_medium=badge&utm_campaign=cbz-reader',
            src: 'https://programmerneeds.com/api/badge/cbz-reader?v=10',
            alt: 'Find CBZ Reader on ProgrammerNeeds',
            width: 220,
            height: 54,
          },
        ],
      },
    ],
    faq: [],
    related: [
      '/',
      '/privacy/',
      '/cbz-vs-cbr/',
      { href: '/private-process/', label: 'How the tab does the work' },
    ],
  },
]

export function findPage(pathname: string): PageContent {
  const normalized = pathname === '/' ? '/' : pathname.endsWith('/') ? pathname : `${pathname}/`
  return PAGES.find((page) => page.path === normalized) ?? PAGES[0]
}
