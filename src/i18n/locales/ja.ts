import type { PageContent } from '../../content/pages'

export const jaHome: PageContent = {
  path: '/ja/',
  title: 'CBZ Reader - ブラウザでCBZを読む・PDFに変換',
  description:
    'ブラウザ上でCBZコミックを読み、CBZをPDFに変換できます。ファイルは端末内だけで処理され、アップロードもアカウント登録も不要です。右開きのマンガ、見開き、ズーム、続きからの再開に対応。',
  h1: 'ブラウザでCBZコミックを読む',
  eyebrow: 'CBZリーダーと変換ツール',
  lead: 'CBZを開いてそのまま読むか、PDFに変換できます。どちらも端末内で完結します。',
  tool: true,
  schema: 'app',
  schemaFeatures: [
    'CBZとZIPのコミックアーカイブをローカルで開く',
    'アップロードせずにブラウザでCBZをPDFに変換',
    '右から左に読むマンガモード',
    '単ページと見開きのレイアウト',
    'ズームとパン',
    '端末内に閲覧位置を保存',
  ],
  updated: '2026-11-12',
  trust: ['ファイルはアップロードされず、ブラウザ内だけで処理されます。アカウントも不要です。'],
  sections: [],
  faq: [
    {
      question: 'コミックはサーバーにアップロードされますか？',
      answer:
        'いいえ。ファイルはブラウザのファイル選択から開き、ページ内で解析されます。ページ画像も端末内でデコードされ、当サイトや第三者に送信されることはありません。',
    },
    {
      question: '初回アクセス後はオフラインでも使えますか？',
      answer:
        'はい。ページの外枠はService Workerがキャッシュするため、接続がなくてもリーダーを開き直せます。CBZは端末から読み込むので、ページ送りにもネットワークは不要です。当サイトで一度も開いていないページは保存されず、長期間アクセスがないとブラウザがキャッシュを削除することがあります。オンラインで一度開けば復元されます。',
    },
    {
      question: '対応している形式は？',
      answer:
        'JPG、PNG、WebP、GIF、AVIF、BMPのページを含むCBZとZIPに対応しています。CBRとCB7は計画中で、現在のバージョンでは未対応です。',
    },
  ],
  tools: [
    {
      href: '/cbz-to-pdf/',
      label: 'CBZをPDFに変換',
      note: '元のサイズ、またはA4で出力。',
      kind: 'tool',
    },
    {
      href: '/read-cbz-online/',
      label: 'CBZをオンラインで読む',
      note: 'アップロードしない場合との違い。',
      kind: 'guide',
    },
    {
      href: '/manga-reader/',
      label: 'マンガモード',
      note: '右開きの見開きをワンタップで。',
      kind: 'guide',
    },
    {
      href: '/how-to-open-cbz/',
      label: 'CBZの開き方',
      note: 'パソコン、Android、iPhone。',
      kind: 'guide',
    },
    {
      href: '/what-is-a-cbz-file/',
      label: 'CBZファイルとは',
      note: 'ZIPコンテナ、ページ、メタデータ。',
      kind: 'guide',
    },
    {
      href: '/cbz-file-format/',
      label: 'CBZ形式の内部',
      note: 'ComicInfo.xml、ページ順、レイアウト。',
      kind: 'guide',
    },
    {
      href: '/how-to-make-a-cbz-file/',
      label: 'CBZを作る',
      note: 'スキャン画像を読めるアーカイブに。',
      kind: 'guide',
    },
    {
      href: '/cbz-file-wont-open/',
      label: 'CBZが開けないとき',
      note: '拡張子だけ変えたRARや暗号化。',
      kind: 'guide',
    },
    {
      href: '/cbz-vs-cbr/',
      label: 'CBZ・CBR・CB7の違い',
      note: 'ブラウザで開けるコンテナ。',
      kind: 'guide',
    },
    {
      href: '/read-cbz-on-iphone/',
      label: 'iPhoneでCBZを読む',
      note: 'ファイルAppとSafariの制限。',
      kind: 'guide',
    },
    {
      href: '/read-cbz-on-android/',
      label: 'AndroidでCBZを読む',
      note: 'ダウンロードやDriveからアプリなしで。',
      kind: 'guide',
    },
    {
      href: '/demo/',
      label: 'サンプルコミックを試す',
      note: 'パブリックドメイン作品をファイルなしで。',
      kind: 'sample',
    },
  ],
  related: [],
}

export const jaCbzToPdf: PageContent = {
  path: '/ja/cbz-to-pdf/',
  title: 'CBZ を PDF に変換 - アップロードなし、ブラウザ内で完結',
  description:
    'ブラウザで CBZ コミックを PDF に変換します。ファイルはアップロードされません。JPEG ページは再エンコードせずそのまま埋め込み、元のサイズか A4 を選べます。',
  h1: 'アップロードせずに CBZ を PDF へ',
  eyebrow: 'CBZ → PDF',
  lead: 'CBZ ファイルを選ぶだけで PDF ができます。サーバーへの往復はありません。書庫はこのタブで展開され、PDF もこのタブで組み立てられるので、ページが端末から出ることはありません。',
  converter: true,
  schema: 'app',
  schemaFeatures: [
    'ブラウザ内で CBZ 書庫を PDF に変換',
    'JPEG ページは再エンコードせずに埋め込み',
    '元のサイズ、または A4 ページ',
    'アップロードなし、アカウント不要',
    '中断できる変換と、具体的なエラーメッセージ',
  ],
  updated: '2026-11-12',
  trust: ['アップロードなし', 'JPEG はそのまま', '元サイズまたは A4', 'オフラインでも可'],
  sections: [
    {
      heading: '多くの CBZ→PDF 変換ツールがアップロードを挟む理由',
      paragraphs: [
        'アップロードは作り手にとって一番簡単です。書庫をサーバーへ送り、PDF ライブラリと十分なメモリを持つマシンが展開して生成し、ダウンロードリンクを返します。ブラウザはバイトを送受信するだけで済みます。',
        'この設計が楽なのは運営者であって、読者ではありません。1 時間後に削除されるとしても、あなたのコミックはどこかに存在したことになります。大きなファイルはアカウントや有料プランを要求されがちで、サービスが続くかどうかは他人の都合次第です。もともと自分のディスクにあるファイルにとって、この往復は何も生みません。',
      ],
      bullets: [
        'アップロード型の変換ツール：ファイルは端末を離れ、サーバーで変換され、リンクとして戻ってきます。あなたが管理していないマシン上に、運営者が消すまでコピーが残ります。',
        'この変換ツール：書庫はディスクから開かれ、PDF は同じタブ内で生成され、保存はブラウザが行います。ページのデータを含むリクエストは 1 つもありません。',
        '代償もはっきり書きます。一度に 1 書庫、OCR なし、CBR 入力なし。その代わり、そのコミックの唯一のコピーは元の場所に残ります。',
      ],
    },
    {
      heading: 'このタブ内での変換の仕組み',
      paragraphs: [
        'ブラウザは ZIP の中央ディレクトリを読み、バイナリを書き出せます。つまり作業全体をローカルに留められます。変換ツールはリーダーと同じ ZIP 読み込みを使い、フォルダ優先の自然順（2.jpg が 10.jpg より前）で並べ、ディレクトリ項目、__MACOSX、ComicInfo.xml は無視します。',
        'JPEG ページは DCT ストリームとしてそのまま PDF に書き込まれます。圧縮データをそのまま移すので、デコードも再エンコードもしません。PNG ページも透明部分を含めて可逆で埋め込みます。PDF には WebP、GIF、AVIF、BMP のネイティブ形式がないため、これらのページは一度デコードし、品質 92 の JPEG として書き出します。ピクセルが再圧縮されるのはこの経路だけです。',
        'ページは 1 枚ずつ処理し、合間にスレッドを明け渡すので、進捗バーが更新され、タブは反応し続け、キャンセルは各ページの直前で確認されます。',
      ],
      bullets: [
        'JPEG と PNG のページ：再エンコードせずに埋め込み。',
        'WebP、GIF、AVIF、BMP のページ：品質 92 の JPEG として 1 回だけ再エンコード。',
        'ページ順はリーダーと同じく、フォルダ→ファイル名の自然順。',
        'できた PDF は直接ダウンロードされ、期限切れのリンクもサーバー側のコピーもありません。',
      ],
      note: {
        title: '自分の目で確認する',
        paragraphs: [
          'この説明を信じる必要はありません。確認は 1 分ずつ、どちらもこの変換ツールだけで完結します。',
        ],
        bullets: [
          'パソコンで DevTools → Network を開き、変換を 1 回実行します。ページとスクリプトは読み込まれますが、書庫やページ画像を含むリクエストはありません。変換中の計測イベントは、ページ数、所要時間、ページサイズの選択だけを記録します。',
          'スマートフォンで一度オンラインでこのページを開き、機内モードにして再読み込みします。ネットワークが完全に切れた状態でローカルの CBZ を変換しても、PDF は生成されダウンロードできます。',
        ],
      },
    },
    {
      heading: '元のサイズか A4 か',
      paragraphs: [
        '元のサイズでは、画像の 1 ピクセルが PDF の 1 ポイントになります。3000 × 4500 のスキャンなら 3000 × 4500 ポイントのページです。拡大縮小はせず、ビューアやプリンタが各自の出力に合わせて縮めます。コミック PDF の多くはこの作り方で、ピクセルをすべて保ちます。',
        'A4 では、どのページも 595 × 842 ポイントになり、画像は切り取りも引き伸ばしもせず、余白を付けて中央に収まります。印刷するとき、大きなページを苦手とするアプリで見るときに選んでください。埋め込まれる画像データは両モードで同一なので、ファイルサイズはほとんど変わりません。変わるのはページの大きさだけです。',
      ],
    },
    {
      heading: 'この変換ツールがやらないこと',
      bullets: [
        '約 2400 万画素を超える PNG ページは元の解像度では出力しません。そのサイズのページは最大 4096 px に縮めてから 1 回だけ再エンコードします。原寸でデコードするとタブが落ちるためです。通常の 3000 × 4500 スキャンは影響を受けません。',
        'OCR もテキストレイヤーもありません。出力は画像なので、文字の選択・検索・読み上げはできません。',
        '一度に 1 書庫のみ。バッチ変換はありません。',
        'CBR（RAR）と CB7（7z）の入力には対応していません。ブラウザがこれらのコンテナを開けないため、先に CBZ に変換してください。',
        'パスワード付きの書庫には対応していません。暗号化されたページは書き込み前に拒否されます。',
        'サーバー側のフォールバックはありません。非常に大きな書庫でタブのメモリが尽きた場合、ファイルを送信するのではなくエラーで停止します。',
      ],
    },
    {
      heading: '変換に失敗したとき',
      paragraphs: [
        '暗号化された書庫は最初に拒否されます。画像項目が 1 つもない書庫も、見つかった項目数を添えて拒否されます。ページのデコードに失敗した場合はその場で停止し、書庫内のファイル名を示します。メモリ不足（数百ページの巨大なスキャンで起こります）はメモリエラーとして報告され、実際の対処は他のタブを閉じるか書庫を分割することです。',
        'キャンセルはページの区切りで効き、途中までの PDF は破棄されます。ダウンロードも一時ファイルも残りません。',
      ],
    },
  ],
  faq: [
    {
      question: 'PDF にすると画質は落ちますか？',
      answer:
        'JPEG と PNG のページは落ちません。圧縮データがそのまま PDF にコピーされます。WebP、GIF、AVIF、BMP は PDF にネイティブ形式がないため、品質 92 で 1 回だけ再エンコードされます。多くの CBZ のように JPEG スキャンで作られていれば、PDF 内の各ページは書庫内のデータと同一です。',
    },
    {
      question: '複数の CBZ をまとめて変換できますか？',
      answer:
        'できません。1 度に 1 書庫にすることで、メモリ使用量を抑え、キャンセルを予測可能にしています。最初の PDF がダウンロードされてから次を始めてください。',
    },
    {
      question: 'パスワード付きの書庫はどうなりますか？',
      answer:
        '説明とともに拒否されます。書庫ツールでパスワードを外し、通常の CBZ として保存し直してから変換してください。',
    },
    {
      question: 'ページサイズはどちらを選べばよいですか？',
      answer:
        'スキャンと完全に一致するアーカイブ用 PDF なら元のサイズ、印刷するなら A4 です。画像データはどちらも同じなので、画質もファイルサイズもほとんど変わりません。',
    },
    {
      question: 'ファイルはどこかにアップロードされますか？',
      answer:
        'されません。書庫はブラウザのファイル API で読まれ、PDF はタブ内で組み立てられます。ファイルの中身を含むリクエストはなく、変換中の計測イベントが記録するのはページ数、所要時間、ページサイズの選択だけです。',
    },
    {
      question: '購入したコミックをアップロードせずに変換できますか？',
      answer:
        'できます。この変換ツールにはアップロードの工程自体がありません。書庫はディスクから開かれ、PDF は同じタブ内で書き出されます。DevTools → Network で確認するか、一度オンラインで開いたあと機内モードで変換すれば確かめられます。',
    },
    {
      question: 'どのくらい大きな CBZ まで変換できますか？',
      answer:
        'サーバーへ何も送らないので割り当てはありません。上限はタブに与えられるメモリです。数百ページの普通のスキャンならパソコンでは余裕があり、数百ページの巨大なスキャンはスマートフォンでは尽きることがあります。変換はページの区切りで間を空け、キャンセルすると途中の PDF は破棄されます。',
    },
    {
      question: 'オフラインでも変換できますか？',
      answer:
        '初回アクセス以降は可能です。変換ツールはリーダーと同じオフライン対応のシェルに含まれており、CBZ はもともとローカルファイルです。',
    },
  ],
  related: ['/', '/what-is-a-cbz-file/', '/cbz-file-format/', '/cbz-file-wont-open/'],
  bridge: {
    text: '中身を眺めるだけでいい？',
    href: '/ja/',
    label: 'ブラウザのリーダーでこの CBZ を開く',
  },
}

export default {
  nav: {
    primary: 'メインナビゲーション',
    reader: 'リーダー',
    cbzToPdf: 'CBZをPDFに',
    howToOpen: 'CBZの開き方',
    mangaMode: 'マンガモード',
    compare: 'CBZとCBR',
  },
  header: {
    language: '言語',
    noTranslation: 'このページの{lang}版はまだありません。',
    localeName: { en: '英語', zh: '中国語', ja: '日本語' },
    themeDark: 'ダークテーマに切り替える',
    themeLight: 'ライトテーマに切り替える',
  },
  footer: {
    tagline: 'ファイルは端末内に残ります。',
    label: 'フッターナビゲーション',
    about: 'このサイトについて',
    privacy: 'プライバシー',
    terms: '利用規約',
    disclaimer: '免責事項',
    github: 'GitHub リポジトリ',
  },
  breadcrumb: {
    label: 'パンくずリスト',
    reader: 'リーダー',
  },
  convert: {
    kicker: 'CBZ → PDF',
    title: 'CBZ を PDF に変換',
    lead: '.cbz ファイルをここにドロップするか、端末から選択してください。書庫はこのタブで展開され、PDF もこのタブで作られます。',
    choose: 'CBZ ファイルを選択',
    chooseAria: '変換する CBZ ファイルを選択',
    fine: 'アップロードはありません。JPEG ページは再エンコードせずに埋め込みます。',
    ready: '変換の準備ができました',
    pageSize: 'ページサイズ',
    sizeOriginal: '元のサイズ',
    sizeOriginalNote: '各ページが画像のピクセル数と一致します。拡大縮小はしません。',
    sizeA4: 'A4 に合わせる',
    sizeA4Note: 'A4 に収まるよう拡大縮小し、余白を付けます。印刷向け。',
    start: 'PDF に変換',
    startAnother: '別のファイルを選ぶ',
    fineDownload: 'PDF の準備ができ次第、自動でダウンロードされます。',
    working: '変換中',
    building: 'PDF を生成しています…',
    reading: '書庫を読み込んでいます',
    progress: '{total} ページ中 {done} ページ',
    cancel: 'キャンセル',
    done: '完了',
    readyTitle: 'PDF ができました',
    pagesOne: '{count} ページ',
    pagesMany: '{count} ページ',
    a4Note: 'A4',
    originalNote: '元のページサイズ',
    download: '{name} をダウンロード',
    convertAnother: '別のファイルを変換',
    fineDone: 'ファイルは端末から出ていません。',
    noscript:
      '書庫の展開と PDF の生成には JavaScript が必要です。処理はすべてブラウザ内で行われ、ファイルがサーバーへ送られることはありません。',
    failed: '変換できませんでした',
    failedTitle: 'このファイルは PDF にできませんでした',
    tryAnother: '別のファイルを試す',
    errNotZip:
      'このファイルは CBZ / ZIP として読み込めません。CBR（RAR）や CB7（7z）であれば、先に CBZ に変換してください。',
    errEncrypted:
      'この書庫はパスワードで保護されています。パスワードを外してから変換してください。',
    errNoImages:
      '読み込める画像ページがありません。JPG、PNG、WebP、GIF、AVIF、BMP のページが必要です。',
    errMemory: 'ブラウザのメモリが不足しました。より小さい書庫にするか、他のタブを閉じてください。',
    errUnknown: '不明な理由で変換に失敗しました。再試行するか、別の書庫をお試しください。',
  },
  home: {
    readInBrowser: 'ブラウザで読む',
    readNote: 'アーカイブを開けばすぐにページをめくれます。アップロードはありません。',
    pickFile: 'ファイルを選ぶ',
    convertTitle: 'PDFに変換',
    convertNote: '同じアーカイブを元のサイズ、またはA4のPDFにします。',
    openConverter: '変換ツールを開く',
    sampleTitle: 'サンプルコミックで試す',
    sampleNote: '短いパブリックドメイン作品を、ファイルなしで開けます。',
    recentTitle: '最近開いたファイル',
    clearAll: 'すべて削除',
    readerLabel: 'CBZリーダー',
    openTitle: 'CBZファイルを開く',
    openLead: '.cbzファイルをここにドロップするか、端末から選択してください。アーカイブはローカルで読み込まれます。',
    choose: 'CBZファイルを選ぶ',
    fine: 'アップロードはありません。CBZとZIPに対応しています。',
    tip: 'ヒント：iPhoneやiPadでは、先にこのページを開いてから「ファイル」Appで選択してください。iOSではWebサイトをファイルハンドラとして登録できません。',
    noscript:
      'CBZの展開と表示にはJavaScriptが必要です。処理はすべてブラウザ内で行われ、サーバーには送信されません。',
    toolsHeading: 'その他のCBZツール',
    toolsIntro: 'アーカイブの変換、形式の確認、開けないファイルの対処に使えます。',
    kindSample: 'サンプル',
    kindTool: 'ツール',
    kindGuide: 'ガイド',
    questions: 'よくある質問',
    ctaTitle: '今すぐCBZを読む',
    ctaLead: 'ファイルをリーダーにドロップしてください。端末の外には出ません。',
    ctaButton: 'CBZリーダーを開く',
    related: '続けて読む',
    defaultTrust: ['アップロードなし', 'アカウント不要', '右開き対応', '続きから再開'],
  },
  shelf: {
    modeSingle: '単ページ',
    // TODO(ja-review): confirm the UI label for a two-page spread.
    modeDouble: '見開き',
    modeScroll: '縦スクロール',
    justNow: 'たった今',
    minutesAgo: '{count}分前',
    hoursAgo: '{count}時間前',
    daysAgo: '{count}日前',
    meta: '{pages}ページ · {mode} · {page}ページ目',
    wrongFile: '選択したのは「{picked}」です。{page}ページ目に戻るには「{expected}」をもう一度選んでください。',
    tooLarge:
      'このファイルは大きすぎてコピーを保存できません（またはコピーが削除されました）。「{name}」をもう一度選ぶと{page}ページ目から再開します。',
    remove: '最近開いたファイルから{name}を削除',
    clearConfirm: '最近のファイル、保存したコピー、しおりをすべて削除しますか？',
  },
  reader: {
    kicker: 'CBZ / ZIP',
    readingArchive: 'アーカイブを読み込み中…',
    openTitle: 'CBZファイルを開く',
    buildingList: 'ページ順を整理し、1ページ目をデコードしています。',
    openLead: '.cbzファイルをここにドロップするか、端末から選択してください。ページはローカルで展開されます。',
    opening: '開いています…',
    chooseFile: 'CBZファイルを選ぶ',
    fine: 'アップロードはありません。CBZとZIPに対応しています。',
    modeSingle: '単ページ',
    modeDouble: '見開き',
    modeScroll: '縦スクロール',
    modeTitle: '閲覧モード：{mode}（タップで切り替え）',
    modeAria: '現在の閲覧モード：{mode}。次のモードに切り替えます。',
    zoomTitle: 'ズーム {level}%（クリックで幅に合わせる）',
    zoomAria: '現在のズーム {level}%。幅に合わせてリセットします。',
    // TODO(ja-review): confirm that しおり is the preferred term for page bookmarks.
    bookmarkAdd: 'このページにしおりを追加',
    bookmarkRemove: 'このページのしおりを削除',
    rtlTitle: '閲覧方向：右から左（クリックで左から右に変更）',
    ltrTitle: '閲覧方向：左から右（クリックで右から左に変更）',
    rtlAria: '現在は右から左に読んでいます。左から右に変更します。',
    ltrAria: '現在は左から右に読んでいます。右から左に変更します。',
    openAnother: '別のCBZファイルを開く',
    moreOptions: 'その他のオプション',
    moreOptionsAria: 'その他の閲覧オプション',
    optionsLabel: '閲覧オプション',
    rtlOption: '右から左に読む',
    on: 'オン',
    off: 'オフ',
    showBrowser: 'ブラウザの表示を出す（F）',
    hideBrowser: 'ブラウザの表示を隠す（F）',
    bookmarkRemoveShort: 'しおりを削除',
    theme: 'テーマ',
    darkMode: 'ダークモード',
    bookmarks: 'しおり',
    pageNumber: '{page}ページ',
    here: '現在',
    removeBookmarkPage: '{page}ページのしおりを削除',
    comicInfo: 'コミック情報',
    close: 'リーダーを閉じる',
    iosHint: 'ホーム画面に追加すると、Safariのバーを隠して読めます。',
    dismiss: '閉じる',
    dismissHint: 'ヒントを閉じる',
    // TODO(ja-review): natural label for the comic page-list region.
    comicPages: 'コミックのページ',
    retry: '再試行',
    dropToOpen: 'ドロップして開く',
    resumed: '{page}ページ目から再開しました',
    startOver: '最初から',
    prev: '前へ',
    next: '次へ',
    page: 'ページ番号',
    thumbnails: 'ページのサムネイル',
    pages: 'ページ',
    pageCount: '{count}ページ',
    contents: '目次',
    goToPage: '{page}ページへ移動',
    singlePage: '{page} / {total}ページ',
    doublePage: '{page} / {total}ページ',
    doublePages: '{start}-{end} / {total}ページ',
    genericError: 'ファイルを開くときに問題が発生しました。',
  },
  errors: {
    unsupportedCbr:
      'CBR（RAR）アーカイブはまだ対応していません。先にCBZへ変換してください。ページ画像を取り出して、.cbzとして再圧縮します。拡張子だけを.cbrから.cbzに変えても、中身はRARのままなので開けません。',
    unsupportedCb7:
      'CB7（7z）アーカイブはまだ対応していません。先にCBZへ変換してください。ページ画像を取り出して.cbzとして再圧縮し、そのアーカイブを開いてください。',
    notZip:
      'このファイルはCBZまたはZIPとして読み込めませんでした。CBR（RAR）やCB7（7z）から来た場合は、先にCBZへ変換してからもう一度お試しください。',
    encrypted: 'このアーカイブはパスワードで保護されています。パスワードを解除してからもう一度お試しください。',
    noImages: 'このアーカイブには読み込める画像がありません。',
    missingPage: 'このアーカイブにそのページはありません。',
    decode: 'このページをデコードできませんでした。',
    // TODO(ja-review): confirm the label for the root folder group.
    topLevel: '最上位',
  },
}
