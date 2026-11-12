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
        href: '/demo/',
        label: 'Try a sample comic',
        note: 'A public-domain comic, no file.',
        kind: 'sample',
      },
    ],
    related: [],
  },
  {
    path: '/how-to-open-cbz/',
    title: 'How to Open a CBZ File on Windows, Mac, iPhone, and Android',
    description:
      'A CBZ file is a ZIP archive of comic pages. Learn how to open one on desktop or phone, with or without an app, and why page order sometimes breaks.',
    h1: 'How to open a CBZ file',
    eyebrow: 'Step-by-step guide',
    lead: 'At night a friend sends you a .cbz over chat. The laptop has no comic app, and you are not allowed to install one.',
    schema: 'article',
    updated: '2026-11-13',
    sections: [
      {
        heading: 'Why double-clicking does nothing',
        paragraphs: [
          'Nothing on that machine claims the .cbz extension, so the double-click has nowhere to go. The file itself is a ZIP of page images, and a browser can read a ZIP.',
        ],
      },
      {
        heading: 'Open it in a tab',
        paragraphs: [
          'Open this site, drag the archive onto the page or press the button and choose it, then turn pages with the arrow keys, the slider, or a swipe.',
          'The page count appears once the archive is open, and the first page follows within a second or two.',
          'Nothing is installed and nothing is uploaded; the tab reads the archive where it sits.',
        ],
        link: { href: '/private-process/', label: 'How the tab does it' },
      },
      {
        heading: 'On a phone',
        paragraphs: [
          'On iOS, save the archive to Files, open the site in Safari, and pick it from the Files sheet. On Android it is usually in Downloads: open the site in Chrome and choose it from that folder.',
        ],
      },
      {
        heading: 'If it still will not open',
        paragraphs: [
          'The usual causes are a RAR renamed to .cbz, or a download that stopped early.',
        ],
        link: { href: '/cbz-file-wont-open/', label: 'Work through the checks' },
      },
      {
        heading: 'If the pages come out backwards',
        paragraphs: [
          'Manga reads right to left: press RTL in the reader toolbar to flip the direction. Files tagged Manga = YesAndRightToLeft in ComicInfo.xml already start that way.',
        ],
      },
    ],
    faq: [
      {
        question: 'Can I open a CBZ with 7-Zip or WinRAR?',
        answer: 'Yes, both extract the images. That works for checking one page; reading a whole volume is faster in a tab.',
      },
      {
        question: 'Does it work offline?',
        answer: 'After the first visit the page is cached, so the reader loads without a connection. The archive is on your disk, so page turns do not need one either.',
      },
      {
        question: 'Why are the pages out of order?',
        answer: 'Filenames sorted as text put 10 before 2. This reader compares numbers, and zero-padding the names fixes other readers.',
      },
    ],
    related: [
      '/',
      '/cbz-vs-cbr/',
      '/what-is-a-cbz-file/',
      { href: '/cbz-to-pdf/', label: 'Open it as a PDF instead' },
    ],
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
    title: 'What Is a CBZ File? Comic Book ZIP, Explained',
    description:
      'A .cbz is a ZIP archive of comic page images with a comic-specific extension. Where the name comes from, what is usually inside, and whether your file counts.',
    h1: 'What is a CBZ file?',
    eyebrow: 'File basics',
    lead: 'A .cbz is a ZIP archive of comic page images with a comic-specific extension.',
    schema: 'article',
    updated: '2026-11-13',
    sections: [
      {
        heading: 'Where the name comes from',
        paragraphs: [
          'CDisplay, a small Windows viewer from the early 2000s, used .cbz so that double-clicking a comic opened the right program. The extension has been a signal between file and software ever since.',
          'Opening the file in this browser tab does not upload it.',
        ],
      },
      {
        heading: 'What is usually inside',
        bullets: [
          'Page images in reading order, usually JPEG, sometimes PNG, WebP, GIF, AVIF, or BMP.',
          'Sometimes a ComicInfo.xml with the series name, volume, and reading direction. Optional: a CBZ without it still opens.',
          'Sometimes one folder per chapter. Nothing in the format requires a flat layout.',
        ],
      },
      {
        heading: 'Does your file count as a CBZ?',
        paragraphs: [
          'Check the first two bytes: a ZIP starts with PK. On Windows, rename a copy to .zip and open it; on macOS or Linux, unzip -l file.cbz lists the pages.',
          'If the header reads Rar! or 7z, the extension was changed but the bytes were not. If it reads HTML, the download saved an error page under the archive name.',
        ],
      },
      
    ],
    faq: [
      {
        question: 'Is a CBZ the same as a ZIP?',
        answer: 'Yes: same header, same directory, same compression. Only the extension and the convention differ.',
      },
      {
        question: 'Why does my CBZ show a blank icon?',
        answer: 'No program on that system claims the extension. The file is still valid; open it in the browser or assign a reader.',
      },
      {
        question: 'Does packing pages into a CBZ reduce quality?',
        answer: 'No. ZIP compression is lossless, and quality drops only if a tool re-saves the images.',
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
      'Diagnose a CBZ that will not open: renamed RAR, truncated download, encrypted entries, unsupported image types, and picker problems on phones.',
    h1: 'Why a CBZ file will not open',
    eyebrow: 'Troubleshooting',
    lead: 'You open a CBZ and nothing appears: an empty page, an invalid archive message, or a spinner that never ends. The file is usually intact; the problem is what is inside it.',
    schema: 'article',
    updated: '2026-11-13',
    sections: [
      {
        heading: 'Check the container first',
        paragraphs: [
          'A ZIP starts with PK; RAR starts with Rar!, 7z with 7z. If the header differs, the extension was changed, not the format: extract the pages and repack them as a ZIP.',
          'If the header is HTML, you saved a login or error page under the archive name.',
          'A zero-byte file, or one far smaller than the source, never finished downloading.',
        ],
      },
      {
        heading: 'The archive is truncated',
        paragraphs: [
          'A ZIP keeps its index at the end. If the last bytes are missing, the reader cannot list the pages, even with the images intact.',
          'Download again without a split-file manager, then compare the size. If one page fails, `unzip -t` names the damaged entry.',
        ],
      },
      {
        heading: 'The archive is encrypted',
        paragraphs: [
          'Encrypted entries need a password the tab cannot take. Remove it in 7-Zip, then reopen the file.',
        ],
      },
      {
        heading: 'Images a browser cannot show',
        paragraphs: [
          'This reader accepts JPG, PNG, WebP, GIF, AVIF, and BMP. TIFF, JPEG 2000, HEIC, and JPEG XL appear in scans and are not decoded; convert them to JPEG or PNG and repack.',
        ],
      },
      {
        heading: 'Pages out of order, or some missing',
        paragraphs: [
          'Alphabetical sorting puts 10 before 2. Rename with zero-padded numbers. Duplicate names across chapter folders, or thumbnails mixed in, also look like missing pages.',
        ],
      },
      {
        heading: 'It works on a computer but not on a phone',
        bullets: [
          'iOS: the file may still be an iCloud placeholder. Download it in Files first.',
          'Android: the picker may filter .cbz by MIME type. Pick it from Downloads, or rename to .zip.',
          'Very large pages can exhaust a phone tab; downsize them first.',
        ],
      },
      {
        heading: 'Narrowing it down',
        paragraphs: [
          'Try the same file in another reader. If it fails there too, the archive is the problem; if it opens elsewhere, the limits here are image format and encryption.',
          'Nothing is uploaded while the tab checks the file.',
        ],
      },
    ],
    faq: [
      {
        question: 'Can a corrupted CBZ be repaired?',
        answer: 'Sometimes. ZIP repair tools rebuild the index; if the index is gone, extracting what remains and repacking is faster.',
      },
      {
        question: 'Why does it open in an archive tool but not in a reader?',
        answer: 'Archive tools show bytes; a reader needs image entries it can decode. TIFF, HEIC, and encrypted entries all fail there.',
      },
      {
        question: 'Can I open a split CBZ (.z01, .z02)?',
        answer: 'Not here. Multi-volume ZIP needs every part joined, and this reader expects one file.',
      },
    ],
    related: [
      '/how-to-open-cbz/',
      '/cbz-vs-cbr/',
      '/what-is-a-cbz-file/',
      { href: '/cbz-to-pdf/', label: 'Try converting the file to PDF' },
    ],
    bridge: {
      text: 'What happens to the file while the tab reads it?',
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
          'The single exception is the built-in public-domain sample on the sample page: a classic comic whose copyright has expired, included with its title, author, licence, and source credited. It is there so the reader can be tried without a file; it is not a catalogue or a library.',
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
    updated: '2026-11-12',
    sections: [
      {
        heading: 'Why most CBZ to PDF converters upload your file',
        paragraphs: [
          'Uploading is the simplest way to build this tool. The archive goes to a server, a machine with a PDF library and plenty of memory unpacks it, and the finished file comes back as a download link. The browser only has to send and receive bytes.',
          'That design suits the operator, not the reader. A copy of your comic exists somewhere else even if it is deleted an hour later, large files usually need an account or a paid tier, and the result depends on someone else keeping the service online. For a file that is already on your disk, the round trip buys nothing.',
        ],
        bullets: [
          'Upload-based converter: the archive leaves your device, is converted on a server, and comes back as a link. A copy exists on a machine you do not control until that operator deletes it.',
          'This converter: the archive is opened from your disk, the PDF is written in the same tab, and the browser saves the result. No request ever carries page bytes.',
          'The trade-off, stated plainly: one archive at a time, no OCR, and no CBR input. In exchange, the only copy of the comic stays where it already was.',
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
      },
      {
        heading: 'Offline use, and how to check it',
        paragraphs: [
          'The converter loads once, then runs from the same offline shell as the reader. A CBZ is a local file, so after that first visit a conversion needs no network at all.',
        ],
        bullets: [
          'Desktop: open DevTools → Network and start a conversion. The page, its scripts and one analytics request appear; nothing carries the archive or the page images. That request records only the page count, the elapsed time and the page-size choice.',
          'Phone: open this page once while online, turn on airplane mode, reload, then convert a local CBZ. The PDF is still built and downloaded.',
        ],
      },
      {
        heading: 'Original size or A4',
        paragraphs: [
          'With original size, the page keeps the physical size the image was authored for: CSS pixels are 96 DPI and PDF points are 1/72 inch, so one pixel becomes 0.75 points and a 3000 × 4500 scan gives a 2250 × 3375 point page. Nothing is resampled, and most comic PDFs are built this way.',
          'With A4, every page becomes 595 × 842 points and the image is scaled to fit inside it without cropping or stretching, centred with margins. Choose this when the PDF is meant for printing or for an app that handles very large page boxes badly. The embedded image data is identical in both modes, so file size barely changes; only the page geometry does.',
        ],
      },
      {
        heading: 'What this converter does not do',
        table: {
          head: ['Limit', 'Why', 'What to do'],
          rows: [
            [
              'PNG page above roughly 24 MP',
              'Full-size decoding can crash the tab',
              'Ordinary 3000 × 4500 scans are unaffected; use a desktop tool for an untouched original',
            ],
            ['No OCR or text layer', 'Pages are stored as images', 'Run OCR afterwards if you need searchable text'],
            ['One archive at a time', 'Keeps memory bounded and Cancel predictable', 'Start the next file after the first PDF downloads'],
            ['No CBR (RAR) or CB7 (7z) input', 'Browsers cannot open those containers', 'Convert to CBZ first'],
            ['No encrypted archives', 'Rejected before anything is written', 'Remove the password in your archive tool'],
            ['No server fallback', 'There is no upload path to fall back to', 'Close other tabs or split the archive'],
          ],
        },
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
        question: 'How does local processing actually work?',
        answer:
          'The browser reads the ZIP central directory in the tab, pulls one page at a time, and pdf-lib writes the PDF bytes locally. The download comes from a Blob URL, so no request carries the archive.',
        link: { href: '/private-process/', label: 'See the full process →' },
      },
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
        question: 'Can I convert a comic I bought without uploading it somewhere?',
        answer:
          'Yes. This converter has no upload step at all: the archive is opened from your disk with the browser file API and the PDF is written in the same tab. You can confirm it in DevTools → Network, or by converting once with the device in airplane mode.',
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
        heading: 'The promises, and what holds them up',
        paragraphs: [
          'You are on hotel Wi-Fi with a work laptop and a strict no-upload policy. The home page makes four promises, and each one rests on something specific.',
        ],
        table: {
          head: ['The promise', 'What holds it up'],
          rows: [
            [
              'Your file stays on your device',
              'Opened through a browser file handle, never written into a request body',
            ],
            ['read', 'ZIP central directory read in place, one page extracted at a time'],
            ['convert', 'Browser image decode, then pdf-lib writing PDF bytes in the tab'],
            ['without handing it over', 'Download from a Blob URL made locally, with no upload endpoint to call'],
          ],
        },
      },
      {
        heading: 'The path a file takes',
        flow: ['Unpack', 'Decode', 'Lay out', 'Deliver'],
        paragraphs: [
          'A 400 MB archive opens on a phone with no app installed.',
          'Unpack reads the ZIP index and pulls one page at a time. Decode and lay out run in the tab, and Deliver has two exits: pixels to the screen, PDF bytes to a download. Neither exit ends at a server.',
        ],
      },
      {
        heading: 'Where the tab ends',
        paragraphs: [
          'This site still has a host and a bill, so three things leave the browser. None of them contains your file.',
        ],
        bullets: [
          'Cloudflare terminates the connection and sees request metadata: IP address, user agent, page URL.',
          'Umami gets one event per visit or conversion, with an event name, the page path, and counters such as page count or time taken.',
          'Browser storage keeps your language choice and reading progress. Clearing site data removes both.',
        ],
      },
      {
        heading: 'Check it in a minute',
        paragraphs: ['Pick a real file and watch the browser while it works.'],
        bullets: [
          'Open DevTools → Network, filter by this domain, then start the work. The only non-GET request is the analytics ping, and it carries no file.',
          'Load the page once, switch to airplane mode, then convert. It finishes and the download still appears.',
          'Search the request list for an endpoint that accepts a file. There is nothing to find.',
        ],
      },
    ],
    faq: [
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
    lead: 'CBZ Reader is a small independent tool with one job: open a comic archive you already own, in a browser tab, without sending it anywhere. This page says who builds it and what it deliberately does not do.',
    schema: 'article',
    updated: '2026-11-12',
    sections: [
      {
        heading: 'Who builds it',
        paragraphs: [
          'One developer, working on it between other things. There is no company behind it and no roadmap meeting: a page gets added when someone asks a real question that nothing here answers yet.',
          'Corrections are welcome and get taken seriously. If a claim on this site is wrong — a format detail, an iOS behaviour, a limitation that has since changed — write to the address on the privacy page and it gets fixed rather than argued with.',
        ],
      },
      {
        heading: 'What it does',
        paragraphs: [
          'Two tools share the same archive reader: a comic viewer and a CBZ to PDF converter. Both read the file from your disk with the browser file API and do their work inside the tab, which is why there is no upload step to opt out of.',
          'Nothing here is a service you sign into. No account, no library on a server, no conversion queue. You pick a file, you get a result, and the tab can be closed.',
        ],
      },
      {
        heading: 'What it deliberately leaves out',
        bullets: [
          'CBR and CB7 input. A browser ships no RAR or 7z decoder, and adding one is a licensing question rather than a weekend patch. The comparison page says so plainly instead of pretending otherwise.',
          'OCR and text layers. The PDF output is images, so nothing in it is selectable or searchable.',
          'Accounts, sync and cloud libraries. Reading progress is kept in this browser only, keyed by a fingerprint of the file you opened.',
          'Batch conversion. One archive at a time keeps memory bounded and makes Cancel mean something.',
        ],
      },
      {
        heading: 'How it is funded',
        paragraphs: [
          'It is free, with no ads, no paid tier and no watermark. The marginal cost is a static site on a hosting plan plus a domain, which stays small enough to pay for out of pocket.',
          'The same fact is why there is no incentive to upload your files: there is no storage to sell and no dataset to build.',
        ],
      },
      {
        heading: 'What changed',
        bullets: [
          '2026-11-12 — Repositioned the homepage around reading and converting without an upload. The language switcher became plain links, so a visitor keeps the page they are reading instead of being sent home. Per-page dates now go into the sitemap instead of the build date.',
          '2026-11-11 — First public version: browser reader, CBZ to PDF converter with original-size and A4 output, an offline shell, and the English, Chinese and Japanese home pages.',
          'Corrections since launch — the Android guide claimed the site had no service worker, which had stopped being true. It now describes the offline shell accurately, and the converter notes how very large pages are handled.',
        ],
      },
    ],
    faq: [
      {
        question: 'Who makes CBZ Reader?',
        answer:
          'An independent developer. The source is public on GitHub, and the address for corrections and questions is on the privacy page.',
      },
      {
        question: 'Is there an app, or a paid version?',
        answer:
          'No and no. It is a static site that runs in the browser, with no account, no paid tier and no watermark. Installing it as a PWA is the closest thing to an app.',
      },
      {
        question: 'How does the site make money?',
        answer:
          'It does not. Hosting a static site is cheap enough to pay for directly, which is also why there is no incentive to collect files or build a dataset from them.',
      },
    ],
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
