/**
 * i18n.js — Lightweight multi-language support
 *
 * Strategy:
 *  1. Static dict covers all hardcoded UI chrome (fast, zero API cost).
 *  2. Edge Translate API translates dynamic content (tool names/descriptions).
 *     - Tries direct browser call first (no server load if CORS passes).
 *     - Falls back to /api/translate proxy if blocked by CORS.
 *  3. Translations cached in localStorage per (pathname × language).
 *  4. Language change saves pref and reloads page; translations applied on load.
 */

const LANG_KEY = "pic-lang";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const SUPPORTED = [
  { code: "zh-CN", label: "中文" },
  { code: "en",    label: "EN" },
  { code: "ja",    label: "日本語" },
  { code: "ko",    label: "한국어" },
  { code: "vi",    label: "Tiếng Việt" },
  { code: "fr",    label: "Français" },
  { code: "es",    label: "Español" },
  { code: "pt",    label: "Português" },
  { code: "ru",    label: "Русский" },
  { code: "ar",    label: "العربية" },
];

// ─── Static translation dict ─────────────────────────────────────────────────
// Keys are Chinese source strings; values are target translations.
const STATIC = {
  en: {
    // Header / Nav
    "在线处理图片与 PDF，更适合日常上传和资料整理": "Process images & PDFs online, optimised for everyday uploads",
    "全部工具": "All Tools",
    "联系我们": "Contact",
    "隐私政策": "Privacy Policy",
    "切换夜间": "Dark mode",
    "切换日间": "Light mode",
    "← 返回": "← Back",
    "首页": "Home",
    "全部": "All",
    // Hero stats
    "工具": "Tools",
    "隐私安全": "Private",
    "支持多文件": "Batch",
    "免费使用 · 无需登录 · 本地处理保护隐私": "Free · No login · Private processing",
    "个工具": " tools",
    // Upload zone
    "直接拖入文件，自动识别并推荐工具": "Drop a file — we'll detect the type and suggest the right tool",
    "支持 JPG、PNG、WebP、HEIC、GIF、PDF 等格式": "Supports JPG, PNG, WebP, HEIC, GIF, PDF and more",
    "选择文件": "Browse",
    // Dropzone
    "拖拽文件到这里，或点击选择文件": "Drop files here, or click to browse",
    // Queue
    "已选文件": "Selected files",
    "还没有选择文件": "No files selected",
    "选择文件后，这里会显示文件名、大小和可否处理。": "File names, sizes and processing status will appear here.",
    "浏览器处理": "Local",
    "服务器处理": "Server",
    "超出限制": "Too large",
    "超出数量": "Too many",
    // Buttons / queue states
    "开始处理": "Process",
    "清空": "Clear",
    "下载文件": "Download",
    "下载 ZIP": "Download ZIP",
    "下载": "Download",
    "打包下载": "Download ZIP",
    "等待中": "Waiting",
    "处理中…": "Processing…",
    "完成": "Done",
    "失败": "Failed",
    "重试": "Retry",
    "文件队列": "File Queue",
    "个文件处理完成": " file(s) processed",
    // Processing messages (mirrored in app.js via window.I18N.t)
    "正在浏览器中处理，请稍候…": "Processing locally…",
    "正在上传并处理，请稍候…": "Uploading & processing…",
    "请先选择符合大小和数量限制的文件。": "Please select files within the size and count limits.",
    "处理失败，请稍后重试。": "Processing failed. Please try again.",
    // Result area
    "结果会显示在这里": "Results appear here",
    "选择文件后会立即显示队列。点击「开始处理」后，这里会展示进度和下载结果。":
      "The queue appears after file selection. Click Process to see progress and download results.",
    "处理完成，共生成": "Done —",
    "个结果文件。": "result file(s).",
    "节省": "Saved",
    // Tool page sections
    "开始处理": "Process Now",
    "上传文件，确认参数，然后生成结果": "Upload files, adjust settings, then process",
    "系统会先校验文件大小和数量，再决定使用浏览器本地处理还是服务器处理。":
      "Files are validated first; processing runs locally or on the server as needed.",
    "结果": "Output",
    "使用体验": "Features",
    "的优势": "highlights",
    "使用步骤": "How to use",
    "如何使用": "How to use",
    "常见问题": "FAQ",
    "相关工具": "Related tools",
    "继续下一步处理": "Continue processing",
    // Tool hero tags
    "浏览器内处理": "Processed locally",
    "不上传服务器": "No upload needed",
    // Home page
    "先说你的目标，再帮你选对工具。": "Tell us what you need — we'll find the right tool.",
    "上传更顺手，整理更省事": "Smoother uploads, less hassle",
    "浏览全部工具": "Browse all tools",
    "直接开始转换": "Start converting",
    "常用入口": "Popular",
    "最常被使用的功能": "Most-used features",
    "适合上传限制、格式兼容、文章配图和 PDF 整理。": "For upload limits, format issues, image editing, and PDF tasks.",
    "按目标选择": "Browse by goal",
    "不知道该用哪个？先按场景走": "Not sure which tool? Start with your use case.",
    "把「我想做什么」放在前面，比从几十个功能名里硬找更省时间。":
      "Thinking about what you want to achieve is faster than scanning a long feature list.",
    "搜索工具": "Search tools",
    "常用工具可直接进入": "tools ready to use",
    "本地优先": "Local-first",
    "常见图片优先在浏览器处理": "Common images processed in-browser",
    "批量下载": "Batch download",
    "结果可逐个下载或打包": "Download individually or as a ZIP",
    // Footer
    "热门入口": "Popular",
    "PDF 工具": "PDF Tools",
    "站点信息": "Site",
    "图片压缩": "Compress images",
    "图片格式转换": "Convert format",
    "照片压缩到指定大小": "Resize to target size",
    "JPG 转 PDF": "JPG to PDF",
    "PDF 转 JPG": "PDF to JPG",
    "PDF 合并": "Merge PDF",
    "PDF 拆分": "Split PDF",
    "删除 PDF 页数": "Delete PDF pages",
    "全部工具": "All Tools",
    // Misc
    "围绕图片与 PDF 常见需求设计，强调清晰反馈、批量处理和稳定下载。":
      "Designed around common image & PDF tasks, with clear feedback and reliable downloads.",
  },

  ja: {
    // Header / Nav
    "在线处理图片与 PDF，更适合日常上传和资料整理": "画像とPDFをオンラインで処理",
    "全部工具": "すべてのツール",
    "联系我们": "お問い合わせ",
    "隐私政策": "プライバシーポリシー",
    "切换夜间": "ダークモード",
    "切换日间": "ライトモード",
    "← 返回": "← 戻る",
    "首页": "ホーム",
    "全部": "すべて",
    // Hero stats
    "工具": "ツール",
    "隐私安全": "プライベート",
    "支持多文件": "バッチ処理",
    "免费使用 · 无需登录 · 本地处理保护隐私": "無料・ログイン不要・プライベート処理",
    "个工具": " 個のツール",
    // Upload zone
    "直接拖入文件，自动识别并推荐工具": "ファイルをドロップ — 種類を検出してツールを提案",
    "支持 JPG、PNG、WebP、HEIC、GIF、PDF 等格式": "JPG、PNG、WebP、HEIC、GIF、PDF などに対応",
    "选择文件": "ファイルを選択",
    // Dropzone
    "拖拽文件到这里，或点击选择文件": "ここにファイルをドロップ、またはクリックで選択",
    // Queue
    "已选文件": "選択済みファイル",
    "还没有选择文件": "ファイルが選択されていません",
    "选择文件后，这里会显示文件名、大小和可否处理。": "ファイルを選択するとここに表示されます。",
    "浏览器处理": "ローカル処理",
    "服务器处理": "サーバー処理",
    "超出限制": "サイズ超過",
    "超出数量": "数量超過",
    // Buttons / queue states
    "开始处理": "処理開始",
    "清空": "クリア",
    "下载文件": "ダウンロード",
    "下载 ZIP": "ZIPダウンロード",
    "下载": "ダウンロード",
    "打包下载": "ZIPで一括ダウンロード",
    "等待中": "待機中",
    "处理中…": "処理中…",
    "完成": "完了",
    "失败": "失敗",
    "重试": "再試行",
    "文件队列": "ファイルキュー",
    "个文件处理完成": "件のファイルを処理しました",
    // Processing messages
    "正在浏览器中处理，请稍候…": "ローカルで処理中…",
    "正在上传并处理，请稍候…": "アップロード・処理中…",
    "请先选择符合大小和数量限制的文件。": "サイズと数量の制限内のファイルを選択してください。",
    "处理失败，请稍后重试。": "処理に失敗しました。後でもう一度お試しください。",
    // Result area
    "结果会显示在这里": "結果はここに表示されます",
    "选择文件后会立即显示队列。点击「开始处理」后，这里会展示进度和下载结果。":
      "ファイルを選択するとキューが表示されます。「処理開始」をクリックすると進捗と結果が表示されます。",
    "处理完成，共生成": "完了 —",
    "个结果文件。": "件のファイル",
    "节省": "節約",
    // Tool page sections
    "开始处理": "処理開始",
    "上传文件，确认参数，然后生成结果": "ファイルをアップロードし、設定を確認してから処理",
    "系统会先校验文件大小和数量，再决定使用浏览器本地处理还是服务器处理。":
      "ファイルを検証してからローカルまたはサーバーで処理します。",
    "结果": "出力",
    "使用体験": "機能",
    "の优势": "の特長",
    "使用步骤": "使い方",
    "如何使用": "使い方",
    "常见问题": "よくある質問",
    "相关工具": "関連ツール",
    "继续下一步处理": "次の処理へ",
    // Home page
    "先说你的目标，再帮你选对工具。": "目的を教えてください。最適なツールを選びます。",
    "上传更顺手，整理更省事": "スムーズなアップロード、効率的な整理",
    "浏览全部工具": "すべてのツールを見る",
    "直接开始转换": "変換を始める",
    "常用入口": "人気",
    "最常被使用的功能": "最も使われる機能",
    "按目标选択": "目的で選ぶ",
    "搜索工具": "ツールを検索",
    "常用工具可直接进入": "個のツールをすぐ使用可能",
    "本地优先": "ローカル優先",
    "常见图片优先在浏览器处理": "一般的な画像はブラウザで処理",
    "批量下载": "一括ダウンロード",
    "结果可逐个下载或打包": "個別またはZIPでダウンロード",
    // Footer
    "热门入口": "人気",
    "PDF 工具": "PDFツール",
    "站点信息": "サイト情報",
    "图片压缩": "画像圧縮",
    "图片格式转換": "形式変換",
    "照片压缩到指定大小": "指定サイズへ圧縮",
    "JPG 转 PDF": "JPGをPDFに",
    "PDF 转 JPG": "PDFをJPGに",
    "PDF 合并": "PDFを結合",
    "PDF 拆分": "PDFを分割",
    "删除 PDF 页数": "PDFのページ削除",
    "全部工具": "すべてのツール",
    "围绕图片与 PDF 常见需求设计，强调清晰反馈、批量处理和稳定下载。":
      "画像とPDFの一般的なニーズに応えた設計で、明確なフィードバックと安定したダウンロードを提供します。",
  },

  ko: {
    "在线处理图片与 PDF，更适合日常上传和资料整理": "이미지 및 PDF 온라인 처리",
    "全部工具": "전체 도구",
    "联系我们": "문의하기",
    "隐私政策": "개인정보 처리방침",
    "切换夜间": "다크 모드",
    "切换日间": "라이트 모드",
    "← 返回": "← 뒤로",
    "首页": "홈",
    "全部": "전체",
    "工具": "도구",
    "隐私安全": "프라이버시",
    "支持多文件": "일괄 처리",
    "免费使用 · 无需登录 · 本地处理保护隐私": "무료 · 로그인 불필요 · 로컬 처리",
    "个工具": "개 도구",
    "直接拖入文件，自动识别并推荐工具": "파일을 드롭하면 유형을 감지하고 도구를 추천합니다",
    "支持 JPG、PNG、WebP、HEIC、GIF、PDF 等格式": "JPG, PNG, WebP, HEIC, GIF, PDF 등 지원",
    "选择文件": "파일 선택",
    "拖拽文件到这里，或点击选择文件": "파일을 여기에 드래그하거나 클릭하여 선택",
    "已选文件": "선택된 파일",
    "还没有选择文件": "선택된 파일 없음",
    "选择文件后，这里会显示文件名、大小和可否处理。": "파일 이름, 크기, 처리 상태가 여기에 표시됩니다.",
    "浏览器处理": "로컬",
    "服务器处理": "서버",
    "超出限制": "크기 초과",
    "超出数量": "수량 초과",
    "开始处理": "처리 시작",
    "清空": "지우기",
    "下载文件": "다운로드",
    "下载 ZIP": "ZIP 다운로드",
    "下载": "다운로드",
    "打包下载": "ZIP으로 다운로드",
    "等待中": "대기 중",
    "处理中…": "처리 중…",
    "完成": "완료",
    "失败": "실패",
    "重试": "재시도",
    "文件队列": "파일 대기열",
    "个文件处理完成": "개 파일 처리 완료",
    "正在浏览器中处理，请稍候…": "로컬에서 처리 중…",
    "正在上传并处理，请稍候…": "업로드 및 처리 중…",
    "请先选择符合大小和数量限制的文件。": "크기 및 수량 제한 내의 파일을 선택하세요.",
    "处理失败，请稍后重试。": "처리 실패. 다시 시도해주세요.",
    "结果会显示在这里": "결과가 여기에 표시됩니다",
    "选择文件后会立即显示队列。点击「开始处理」后，这里会展示进度和下载结果。":
      "파일 선택 후 대기열이 표시됩니다. 처리 시작을 클릭하면 진행 상황과 결과가 표시됩니다.",
    "处理完成，共生成": "완료 —",
    "个结果文件。": "개 결과 파일.",
    "节省": "절약",
    "上传文件，确认参数，然后生成结果": "파일 업로드, 설정 확인 후 처리",
    "系统会先校验文件大小和数量，再决定使用浏览器本地处理还是服务器处理。":
      "파일 검증 후 로컬 또는 서버에서 처리합니다.",
    "结果": "출력",
    "使用体验": "기능",
    "的优势": "주요 특징",
    "使用步骤": "사용 방법",
    "如何使用": "사용 방법",
    "常见问题": "자주 묻는 질문",
    "相关工具": "관련 도구",
    "继续下一步处理": "다음 처리 계속",
    "浏览器内处理": "로컬 처리",
    "不上传服务器": "업로드 불필요",
    "搜索工具": "도구 검색",
    "本地优先": "로컬 우선",
    "常见图片优先在浏览器处理": "일반 이미지는 브라우저에서 처리",
    "批量下载": "일괄 다운로드",
    "结果可逐个下载或打包": "개별 또는 ZIP으로 다운로드",
    "热门入口": "인기",
    "PDF 工具": "PDF 도구",
    "站点信息": "사이트 정보",
    "图片压缩": "이미지 압축",
    "图片格式转换": "형식 변환",
    "照片压缩到指定大小": "목표 크기로 압축",
    "JPG 转 PDF": "JPG를 PDF로",
    "PDF 转 JPG": "PDF를 JPG로",
    "PDF 合并": "PDF 병합",
    "PDF 拆分": "PDF 분할",
    "删除 PDF 页数": "PDF 페이지 삭제",
    "围绕图片与 PDF 常见需求设计，强调清晰反馈、批量处理和稳定下载。":
      "이미지 및 PDF의 일반적인 요구를 중심으로 설계되었으며, 명확한 피드백과 안정적인 다운로드를 제공합니다.",
  },

  vi: {
    "在线处理图片与 PDF，更适合日常上传和资料整理": "Xử lý ảnh & PDF trực tuyến",
    "全部工具": "Tất cả công cụ",
    "联系我们": "Liên hệ",
    "隐私政策": "Chính sách bảo mật",
    "切换夜间": "Chế độ tối",
    "切换日间": "Chế độ sáng",
    "← 返回": "← Quay lại",
    "首页": "Trang chủ",
    "全部": "Tất cả",
    "工具": "Công cụ",
    "隐私安全": "Riêng tư",
    "支持多文件": "Hàng loạt",
    "免费使用 · 无需登录 · 本地处理保护隐私": "Miễn phí · Không đăng nhập · Xử lý cục bộ",
    "个工具": " công cụ",
    "直接拖入文件，自动识别并推荐工具": "Thả tệp vào — tự động nhận dạng và đề xuất công cụ",
    "支持 JPG、PNG、WebP、HEIC、GIF、PDF 等格式": "Hỗ trợ JPG, PNG, WebP, HEIC, GIF, PDF và nhiều hơn",
    "选择文件": "Chọn tệp",
    "拖拽文件到这里，或点击选择文件": "Kéo tệp vào đây hoặc nhấp để chọn",
    "已选文件": "Tệp đã chọn",
    "还没有选择文件": "Chưa chọn tệp",
    "选择文件后，这里会显示文件名、大小和可否处理。": "Tên, kích thước và trạng thái xử lý sẽ hiển thị ở đây.",
    "浏览器处理": "Cục bộ",
    "服务器处理": "Máy chủ",
    "超出限制": "Quá lớn",
    "超出数量": "Quá nhiều",
    "开始处理": "Xử lý",
    "清空": "Xóa",
    "下载文件": "Tải xuống",
    "下载 ZIP": "Tải ZIP",
    "下载": "Tải xuống",
    "打包下载": "Tải ZIP",
    "等待中": "Đang chờ",
    "处理中…": "Đang xử lý…",
    "完成": "Hoàn thành",
    "失败": "Thất bại",
    "重试": "Thử lại",
    "文件队列": "Hàng đợi tệp",
    "个文件处理完成": " tệp đã xử lý",
    "正在浏览器中处理，请稍候…": "Đang xử lý cục bộ…",
    "正在上传并处理，请稍候…": "Đang tải lên và xử lý…",
    "请先选择符合大小和数量限制的文件。": "Vui lòng chọn tệp trong giới hạn kích thước và số lượng.",
    "处理失败，请稍后重试。": "Xử lý thất bại. Vui lòng thử lại.",
    "结果会显示在这里": "Kết quả sẽ hiển thị ở đây",
    "选择文件后会立即显示队列。点击「开始处理」后，这里会展示进度和下载结果。":
      "Hàng đợi hiển thị sau khi chọn tệp. Nhấp Xử lý để xem tiến độ và tải xuống.",
    "处理完成，共生成": "Hoàn thành —",
    "个结果文件。": " tệp kết quả.",
    "节省": "Tiết kiệm",
    "上传文件，确认参数，然后生成结果": "Tải tệp lên, điều chỉnh cài đặt, sau đó xử lý",
    "系统会先校验文件大小和数量，再决定使用浏览器本地处理还是服务器处理。":
      "Tệp được xác thực trước; xử lý chạy cục bộ hoặc trên máy chủ khi cần.",
    "结果": "Kết quả",
    "使用体验": "Tính năng",
    "的优势": "điểm nổi bật",
    "使用步骤": "Cách sử dụng",
    "如何使用": "Cách sử dụng",
    "常见问题": "Câu hỏi thường gặp",
    "相关工具": "Công cụ liên quan",
    "继续下一步处理": "Tiếp tục xử lý",
    "浏览器内处理": "Xử lý cục bộ",
    "不上传服务器": "Không cần tải lên",
    "搜索工具": "Tìm kiếm công cụ",
    "本地优先": "Ưu tiên cục bộ",
    "常见图片优先在浏览器处理": "Ảnh phổ biến xử lý trong trình duyệt",
    "批量下载": "Tải hàng loạt",
    "结果可逐个下载或打包": "Tải từng tệp hoặc theo ZIP",
    "热门入口": "Phổ biến",
    "PDF 工具": "Công cụ PDF",
    "站点信息": "Thông tin",
    "图片压缩": "Nén ảnh",
    "图片格式转换": "Chuyển đổi định dạng",
    "照片压缩到指定大小": "Nén theo kích thước mục tiêu",
    "JPG 转 PDF": "JPG sang PDF",
    "PDF 转 JPG": "PDF sang JPG",
    "PDF 合并": "Gộp PDF",
    "PDF 拆分": "Tách PDF",
    "删除 PDF 页数": "Xóa trang PDF",
    "围绕图片与 PDF 常见需求设计，强调清晰反馈、批量处理和稳定下载。":
      "Thiết kế xung quanh các nhu cầu ảnh và PDF phổ biến, với phản hồi rõ ràng và tải xuống ổn định.",
  },

  fr: {
    "在线处理图片与 PDF，更适合日常上传和资料整理": "Traitez images et PDF en ligne",
    "全部工具": "Tous les outils",
    "联系我们": "Contact",
    "隐私政策": "Politique de confidentialité",
    "切换夜间": "Mode sombre",
    "切换日间": "Mode clair",
    "← 返回": "← Retour",
    "首页": "Accueil",
    "全部": "Tout",
    "工具": "Outils",
    "隐私安全": "Privé",
    "支持多文件": "En lot",
    "免费使用 · 无需登录 · 本地处理保护隐私": "Gratuit · Sans connexion · Traitement local",
    "个工具": " outils",
    "直接拖入文件，自动识别并推荐工具": "Déposez un fichier — on détecte le type et propose le bon outil",
    "支持 JPG、PNG、WebP、HEIC、GIF、PDF 等格式": "Supporte JPG, PNG, WebP, HEIC, GIF, PDF et plus",
    "选择文件": "Parcourir",
    "拖拽文件到这里，或点击选择文件": "Déposez les fichiers ici ou cliquez pour sélectionner",
    "已选文件": "Fichiers sélectionnés",
    "还没有选择文件": "Aucun fichier sélectionné",
    "选择文件后，这里会显示文件名、大小和可否处理。": "Les noms, tailles et statuts des fichiers apparaîtront ici.",
    "浏览器处理": "Local",
    "服务器处理": "Serveur",
    "超出限制": "Trop volumineux",
    "超出数量": "Trop de fichiers",
    "开始处理": "Traiter",
    "清空": "Vider",
    "下载文件": "Télécharger",
    "下载 ZIP": "Télécharger ZIP",
    "下载": "Télécharger",
    "打包下载": "Télécharger en ZIP",
    "等待中": "En attente",
    "处理中…": "Traitement…",
    "完成": "Terminé",
    "失败": "Échec",
    "重试": "Réessayer",
    "文件队列": "File d'attente",
    "个文件处理完成": " fichier(s) traité(s)",
    "正在浏览器中处理，请稍候…": "Traitement local…",
    "正在上传并处理，请稍候…": "Chargement et traitement…",
    "请先选择符合大小和数量限制的文件。": "Veuillez sélectionner des fichiers dans les limites de taille et de quantité.",
    "处理失败，请稍后重试。": "Échec du traitement. Veuillez réessayer.",
    "结果会显示在这里": "Les résultats apparaîtront ici",
    "选择文件后会立即显示队列。点击「开始处理」后，这里会展示进度和下载结果。":
      "La file d'attente s'affiche après la sélection. Cliquez sur Traiter pour voir la progression et télécharger.",
    "处理完成，共生成": "Terminé —",
    "个结果文件。": " fichier(s) généré(s).",
    "节省": "Économisé",
    "上传文件，确认参数，然后生成结果": "Chargez les fichiers, ajustez les paramètres, puis traitez",
    "系统会先校验文件大小和数量，再决定使用浏览器本地处理还是服务器处理。":
      "Les fichiers sont vérifiés d'abord ; le traitement s'effectue localement ou sur le serveur selon les besoins.",
    "结果": "Résultat",
    "使用体验": "Fonctionnalités",
    "的优势": "points forts",
    "使用步骤": "Mode d'emploi",
    "如何使用": "Mode d'emploi",
    "常见问题": "FAQ",
    "相关工具": "Outils similaires",
    "继续下一步处理": "Continuer le traitement",
    "浏览器内处理": "Traitement local",
    "不上传服务器": "Sans chargement",
    "搜索工具": "Rechercher des outils",
    "本地优先": "Priorité locale",
    "常见图片优先在浏览器处理": "Images courantes traitées dans le navigateur",
    "批量下载": "Téléchargement en lot",
    "结果可逐个下载或打包": "Téléchargez individuellement ou en ZIP",
    "热门入口": "Populaires",
    "PDF 工具": "Outils PDF",
    "站点信息": "Site",
    "图片压缩": "Compression d'images",
    "图片格式转换": "Conversion de format",
    "照片压缩到指定大小": "Compresser à la taille cible",
    "JPG 转 PDF": "JPG en PDF",
    "PDF 转 JPG": "PDF en JPG",
    "PDF 合并": "Fusionner PDF",
    "PDF 拆分": "Diviser PDF",
    "删除 PDF 页数": "Supprimer des pages PDF",
    "围绕图片与 PDF 常见需求设计，强调清晰反馈、批量处理和稳定下载。":
      "Conçu pour les besoins courants en images et PDF, avec des retours clairs et des téléchargements fiables.",
  },

  es: {
    "在线处理图片与 PDF，更适合日常上传和资料整理": "Procesa imágenes y PDF en línea",
    "全部工具": "Todas las herramientas",
    "联系我们": "Contacto",
    "隐私政策": "Política de privacidad",
    "切换夜间": "Modo oscuro",
    "切换日间": "Modo claro",
    "← 返回": "← Volver",
    "首页": "Inicio",
    "全部": "Todo",
    "工具": "Herramientas",
    "隐私安全": "Privado",
    "支持多文件": "Por lotes",
    "免费使用 · 无需登录 · 本地处理保护隐私": "Gratis · Sin registro · Procesamiento local",
    "个工具": " herramientas",
    "直接拖入文件，自动识别并推荐工具": "Arrastra un archivo — detectamos el tipo y sugerimos la herramienta",
    "支持 JPG、PNG、WebP、HEIC、GIF、PDF 等格式": "Compatible con JPG, PNG, WebP, HEIC, GIF, PDF y más",
    "选择文件": "Explorar",
    "拖拽文件到这里，或点击选择文件": "Arrastra archivos aquí o haz clic para seleccionar",
    "已选文件": "Archivos seleccionados",
    "还没有选择文件": "Sin archivos seleccionados",
    "选择文件后，这里会显示文件名、大小和可否处理。": "Los nombres, tamaños y estados de los archivos aparecerán aquí.",
    "浏览器处理": "Local",
    "服务器处理": "Servidor",
    "超出限制": "Demasiado grande",
    "超出数量": "Demasiados",
    "开始处理": "Procesar",
    "清空": "Limpiar",
    "下载文件": "Descargar",
    "下载 ZIP": "Descargar ZIP",
    "下载": "Descargar",
    "打包下载": "Descargar ZIP",
    "等待中": "En espera",
    "处理中…": "Procesando…",
    "完成": "Completado",
    "失败": "Error",
    "重试": "Reintentar",
    "文件队列": "Cola de archivos",
    "个文件处理完成": " archivo(s) procesado(s)",
    "正在浏览器中处理，请稍候…": "Procesando localmente…",
    "正在上传并处理，请稍候…": "Subiendo y procesando…",
    "请先选择符合大小和数量限制的文件。": "Selecciona archivos dentro de los límites de tamaño y cantidad.",
    "处理失败，请稍后重试。": "Error al procesar. Inténtalo de nuevo.",
    "结果会显示在这里": "Los resultados aparecerán aquí",
    "选择文件后会立即显示队列。点击「开始处理」后，这里会展示进度和下载结果。":
      "La cola aparece al seleccionar archivos. Haz clic en Procesar para ver el progreso y descargar.",
    "处理完成，共生成": "Listo —",
    "个结果文件。": " archivo(s) generado(s).",
    "节省": "Ahorrado",
    "上传文件，确认参数，然后生成结果": "Sube archivos, ajusta la configuración y procesa",
    "系统会先校验文件大小和数量，再决定使用浏览器本地处理还是服务器处理。":
      "Los archivos se validan primero; el procesamiento se realiza localmente o en el servidor según sea necesario.",
    "结果": "Resultado",
    "使用体验": "Características",
    "的优势": "ventajas",
    "使用步骤": "Cómo usar",
    "如何使用": "Cómo usar",
    "常见问题": "Preguntas frecuentes",
    "相关工具": "Herramientas relacionadas",
    "继续下一步处理": "Continuar procesando",
    "浏览器内处理": "Procesado localmente",
    "不上传服务器": "Sin subida",
    "搜索工具": "Buscar herramientas",
    "本地优先": "Prioridad local",
    "常见图片优先在浏览器处理": "Imágenes comunes procesadas en el navegador",
    "批量下载": "Descarga por lotes",
    "结果可逐个下载或打包": "Descarga individualmente o en ZIP",
    "热门入口": "Popular",
    "PDF 工具": "Herramientas PDF",
    "站点信息": "Sitio",
    "图片压缩": "Comprimir imágenes",
    "图片格式转换": "Convertir formato",
    "照片压缩到指定大小": "Comprimir al tamaño objetivo",
    "JPG 转 PDF": "JPG a PDF",
    "PDF 转 JPG": "PDF a JPG",
    "PDF 合并": "Combinar PDF",
    "PDF 拆分": "Dividir PDF",
    "删除 PDF 页数": "Eliminar páginas de PDF",
    "围绕图片与 PDF 常见需求设计，强调清晰反馈、批量处理和稳定下载。":
      "Diseñado para las necesidades comunes de imágenes y PDF, con retroalimentación clara y descargas confiables.",
  },

  pt: {
    "在线处理图片与 PDF，更适合日常上传和资料整理": "Processe imagens e PDF online",
    "全部工具": "Todas as ferramentas",
    "联系我们": "Contato",
    "隐私政策": "Política de privacidade",
    "切换夜间": "Modo escuro",
    "切换日间": "Modo claro",
    "← 返回": "← Voltar",
    "首页": "Início",
    "全部": "Tudo",
    "工具": "Ferramentas",
    "隐私安全": "Privado",
    "支持多文件": "Em lote",
    "免费使用 · 无需登录 · 本地处理保护隐私": "Grátis · Sem login · Processamento local",
    "个工具": " ferramentas",
    "直接拖入文件，自动识别并推荐工具": "Solte o arquivo — detectamos o tipo e sugerimos a ferramenta",
    "支持 JPG、PNG、WebP、HEIC、GIF、PDF 等格式": "Suporta JPG, PNG, WebP, HEIC, GIF, PDF e mais",
    "选择文件": "Procurar",
    "拖拽文件到这里，或点击选择文件": "Arraste arquivos aqui ou clique para selecionar",
    "已选文件": "Arquivos selecionados",
    "还没有选择文件": "Nenhum arquivo selecionado",
    "选择文件后，这里会显示文件名、大小和可否处理。": "Nomes, tamanhos e status dos arquivos aparecerão aqui.",
    "浏览器处理": "Local",
    "服务器处理": "Servidor",
    "超出限制": "Muito grande",
    "超出数量": "Muitos arquivos",
    "开始处理": "Processar",
    "清空": "Limpar",
    "下载文件": "Baixar",
    "下载 ZIP": "Baixar ZIP",
    "下载": "Baixar",
    "打包下载": "Baixar ZIP",
    "等待中": "Aguardando",
    "处理中…": "Processando…",
    "完成": "Concluído",
    "失败": "Falhou",
    "重试": "Tentar novamente",
    "文件队列": "Fila de arquivos",
    "个文件处理完成": " arquivo(s) processado(s)",
    "正在浏览器中处理，请稍候…": "Processando localmente…",
    "正在上传并处理，请稍候…": "Enviando e processando…",
    "请先选择符合大小和数量限制的文件。": "Selecione arquivos dentro dos limites de tamanho e quantidade.",
    "处理失败，请稍后重试。": "Falha no processamento. Tente novamente.",
    "结果会显示在这里": "Os resultados aparecerão aqui",
    "选择文件后会立即显示队列。点击「开始处理」后，这里会展示进度和下载结果。":
      "A fila aparece após a seleção de arquivos. Clique em Processar para ver o progresso e baixar.",
    "处理完成，共生成": "Concluído —",
    "个结果文件。": " arquivo(s) gerado(s).",
    "节省": "Economizado",
    "上传文件，确认参数，然后生成结果": "Envie arquivos, ajuste as configurações e processe",
    "系统会先校验文件大小和数量，再决定使用浏览器本地处理还是服务器处理。":
      "Os arquivos são validados primeiro; o processamento ocorre localmente ou no servidor conforme necessário.",
    "结果": "Resultado",
    "使用体验": "Recursos",
    "的优势": "destaques",
    "使用步骤": "Como usar",
    "如何使用": "Como usar",
    "常见问题": "Perguntas frequentes",
    "相关工具": "Ferramentas relacionadas",
    "继续下一步处理": "Continuar processando",
    "浏览器内处理": "Processado localmente",
    "不上传服务器": "Sem envio",
    "搜索工具": "Pesquisar ferramentas",
    "本地优先": "Prioridade local",
    "常见图片优先在浏览器处理": "Imagens comuns processadas no navegador",
    "批量下载": "Baixar em lote",
    "结果可逐个下载或打包": "Baixe individualmente ou em ZIP",
    "热门入口": "Popular",
    "PDF 工具": "Ferramentas PDF",
    "站点信息": "Site",
    "图片压缩": "Comprimir imagens",
    "图片格式转换": "Converter formato",
    "照片压缩到指定大小": "Comprimir ao tamanho alvo",
    "JPG 转 PDF": "JPG para PDF",
    "PDF 转 JPG": "PDF para JPG",
    "PDF 合并": "Mesclar PDF",
    "PDF 拆分": "Dividir PDF",
    "删除 PDF 页数": "Excluir páginas do PDF",
    "围绕图片与 PDF 常见需求设计，强调清晰反馈、批量处理和稳定下载。":
      "Projetado para necessidades comuns de imagens e PDF, com feedback claro e downloads confiáveis.",
  },

  ru: {
    "在线处理图片与 PDF，更适合日常上传和资料整理": "Обработка изображений и PDF онлайн",
    "全部工具": "Все инструменты",
    "联系我们": "Контакты",
    "隐私政策": "Политика конфиденциальности",
    "切换夜间": "Тёмная тема",
    "切换日间": "Светлая тема",
    "← 返回": "← Назад",
    "首页": "Главная",
    "全部": "Все",
    "工具": "Инструменты",
    "隐私安全": "Конфиденциально",
    "支持多文件": "Пакетная обработка",
    "免费使用 · 无需登录 · 本地处理保护隐私": "Бесплатно · Без входа · Локальная обработка",
    "个工具": " инструментов",
    "直接拖入文件，自动识别并推荐工具": "Перетащите файл — определим тип и предложим инструмент",
    "支持 JPG、PNG、WebP、HEIC、GIF、PDF 等格式": "Поддержка JPG, PNG, WebP, HEIC, GIF, PDF и других",
    "选择文件": "Выбрать файл",
    "拖拽文件到这里，或点击选择文件": "Перетащите файлы сюда или нажмите для выбора",
    "已选文件": "Выбранные файлы",
    "还没有选择文件": "Файлы не выбраны",
    "选择文件后，这里会显示文件名、大小和可否处理。": "Имена файлов, размеры и статус обработки появятся здесь.",
    "浏览器处理": "Локально",
    "服务器处理": "На сервере",
    "超出限制": "Слишком большой",
    "超出数量": "Слишком много",
    "开始处理": "Обработать",
    "清空": "Очистить",
    "下载文件": "Скачать",
    "下载 ZIP": "Скачать ZIP",
    "下载": "Скачать",
    "打包下载": "Скачать ZIP",
    "等待中": "В очереди",
    "处理中…": "Обработка…",
    "完成": "Готово",
    "失败": "Ошибка",
    "重试": "Повторить",
    "文件队列": "Очередь файлов",
    "个文件处理完成": " файл(ов) обработано",
    "正在浏览器中处理，请稍候…": "Локальная обработка…",
    "正在上传并处理，请稍候…": "Загрузка и обработка…",
    "请先选择符合大小和数量限制的文件。": "Пожалуйста, выберите файлы в пределах ограничений.",
    "处理失败，请稍后重试。": "Ошибка обработки. Попробуйте ещё раз.",
    "结果会显示在这里": "Результаты появятся здесь",
    "选择文件后会立即显示队列。点击「开始处理」后，这里会展示进度和下载结果。":
      "После выбора файлов появится очередь. Нажмите «Обработать» для просмотра прогресса и скачивания.",
    "处理完成，共生成": "Готово —",
    "个结果文件。": " файл(ов) создано.",
    "节省": "Сэкономлено",
    "上传文件，确认参数，然后生成结果": "Загрузите файлы, настройте параметры, затем обработайте",
    "系统会先校验文件大小和数量，再决定使用浏览器本地处理还是服务器处理。":
      "Файлы проверяются; обработка выполняется локально или на сервере по необходимости.",
    "结果": "Результат",
    "使用体验": "Возможности",
    "的优势": "преимущества",
    "使用步骤": "Как использовать",
    "如何使用": "Как использовать",
    "常见问题": "Часто задаваемые вопросы",
    "相关工具": "Похожие инструменты",
    "继续下一步处理": "Продолжить обработку",
    "浏览器内处理": "Локальная обработка",
    "不上传服务器": "Без загрузки на сервер",
    "搜索工具": "Поиск инструментов",
    "本地优先": "Приоритет локальной обработки",
    "常见图片优先在浏览器处理": "Обычные изображения обрабатываются в браузере",
    "批量下载": "Пакетная загрузка",
    "结果可逐个下载或打包": "Скачивайте по одному или ZIP-архивом",
    "热门入口": "Популярное",
    "PDF 工具": "PDF инструменты",
    "站点信息": "О сайте",
    "图片压缩": "Сжатие изображений",
    "图片格式转换": "Конвертация формата",
    "照片压缩到指定大小": "Сжать до нужного размера",
    "JPG 转 PDF": "JPG в PDF",
    "PDF 转 JPG": "PDF в JPG",
    "PDF 合并": "Объединить PDF",
    "PDF 拆分": "Разделить PDF",
    "删除 PDF 页数": "Удалить страницы PDF",
    "围绕图片与 PDF 常见需求设计，强调清晰反馈、批量处理和稳定下载。":
      "Разработан для типичных задач с изображениями и PDF с понятной обратной связью и надёжной загрузкой.",
  },

  ar: {
    "在线处理图片与 PDF，更适合日常上传和资料整理": "معالجة الصور وملفات PDF عبر الإنترنت",
    "全部工具": "جميع الأدوات",
    "联系我们": "اتصل بنا",
    "隐私政策": "سياسة الخصوصية",
    "切换夜间": "الوضع المظلم",
    "切换日间": "الوضع الفاتح",
    "← 返回": "→ رجوع",
    "首页": "الرئيسية",
    "全部": "الكل",
    "工具": "أدوات",
    "隐私安全": "خاص",
    "支持多文件": "دفعة",
    "免费使用 · 无需登录 · 本地处理保护隐私": "مجاني · بدون تسجيل · معالجة محلية",
    "个工具": " أداة",
    "直接拖入文件，自动识别并推荐工具": "اسحب الملف — سنكشف النوع ونقترح الأداة المناسبة",
    "支持 JPG、PNG、WebP、HEIC、GIF、PDF 等格式": "يدعم JPG وPNG وWebP وHEIC وGIF وPDF والمزيد",
    "选择文件": "تصفح",
    "拖拽文件到这里，或点击选择文件": "اسحب الملفات هنا أو انقر للتحديد",
    "已选文件": "الملفات المحددة",
    "还没有选择文件": "لم يتم تحديد ملفات",
    "选择文件后，这里会显示文件名、大小和可否处理。": "ستظهر هنا أسماء الملفات وأحجامها وحالة المعالجة.",
    "浏览器处理": "محلي",
    "服务器处理": "الخادم",
    "超出限制": "كبير جدًا",
    "超出数量": "عدد كبير جدًا",
    "开始处理": "معالجة",
    "清空": "مسح",
    "下载文件": "تحميل",
    "下载 ZIP": "تحميل ZIP",
    "下载": "تحميل",
    "打包下载": "تحميل ZIP",
    "等待中": "في الانتظار",
    "处理中…": "جارٍ المعالجة…",
    "完成": "تم",
    "失败": "فشل",
    "重试": "إعادة المحاولة",
    "文件队列": "قائمة الملفات",
    "个文件处理完成": " ملف(ات) معالج(ة)",
    "正在浏览器中处理，请稍候…": "جارٍ المعالجة محليًا…",
    "正在上传并处理，请稍候…": "جارٍ الرفع والمعالجة…",
    "请先选择符合大小和数量限制的文件。": "يرجى تحديد ملفات ضمن حدود الحجم والعدد.",
    "处理失败，请稍后重试。": "فشلت المعالجة. يرجى المحاولة مرة أخرى.",
    "结果会显示在这里": "ستظهر النتائج هنا",
    "选择文件后会立即显示队列。点击「开始处理」后，这里会展示进度和下载结果。":
      "تظهر القائمة بعد تحديد الملفات. انقر على معالجة لرؤية التقدم والتحميل.",
    "处理完成，共生成": "تم —",
    "个结果文件。": " ملف(ات) منتج(ة).",
    "节省": "وفّرت",
    "上传文件，确认参数，然后生成结果": "ارفع الملفات واضبط الإعدادات ثم قم بالمعالجة",
    "系统会先校验文件大小和数量，再决定使用浏览器本地处理还是服务器处理。":
      "يتم التحقق من الملفات أولًا؛ تتم المعالجة محليًا أو على الخادم حسب الحاجة.",
    "结果": "النتيجة",
    "使用体验": "المميزات",
    "的优势": "مزايا",
    "使用步骤": "كيفية الاستخدام",
    "如何使用": "كيفية الاستخدام",
    "常见问题": "الأسئلة الشائعة",
    "相关工具": "أدوات ذات صلة",
    "继续下一步处理": "الاستمرار في المعالجة",
    "浏览器内处理": "معالجة محلية",
    "不上传服务器": "بدون رفع",
    "搜索工具": "البحث عن أدوات",
    "本地优先": "محلي أولًا",
    "常见图片优先在浏览器处理": "تُعالج الصور الشائعة في المتصفح",
    "批量下载": "تحميل الدُّفعة",
    "结果可逐个下载或打包": "حمّل فرديًا أو كملف ZIP",
    "热门入口": "الأكثر شيوعًا",
    "PDF 工具": "أدوات PDF",
    "站点信息": "الموقع",
    "图片压缩": "ضغط الصور",
    "图片格式转换": "تحويل الصيغة",
    "照片压缩到指定大小": "ضغط إلى الحجم المستهدف",
    "JPG 转 PDF": "JPG إلى PDF",
    "PDF 转 JPG": "PDF إلى JPG",
    "PDF 合并": "دمج PDF",
    "PDF 拆分": "تقسيم PDF",
    "删除 PDF 页数": "حذف صفحات PDF",
    "围绕图片与 PDF 常见需求设计，强调清晰反馈、批量处理和稳定下载。":
      "مصمم حول احتياجات الصور وملفات PDF الشائعة مع ردود فعل واضحة وتحميلات موثوقة.",
  },
};

// ─── Core i18n engine ─────────────────────────────────────────────────────────
const I18N = {
  current: "zh-CN",

  init() {
    const saved = localStorage.getItem(LANG_KEY) || "zh-CN";
    this.current = saved;
    document.documentElement.lang = saved;
    this._renderSwitcher();
    if (saved !== "zh-CN") {
      this._applyLanguage(saved);
    }
  },

  /** Translate a single string — used by app.js for JS-generated messages. */
  t(text) {
    if (this.current === "zh-CN") return text;
    return STATIC[this.current]?.[text] ?? text;
  },

  /** Called by the lang switcher buttons. */
  switchTo(lang) {
    if (lang === this.current) return;
    localStorage.setItem(LANG_KEY, lang);
    location.reload();
  },

  // ── Private ─────────────────────────────────────────────────────────────────
  async _applyLanguage(lang) {
    // 1. Static dict — instant, no network
    this._applyStatic(lang);

    // 2. Dynamic content (tool cards, descriptions) via Edge API + cache
    await this._applyDynamic(lang);
  },

  _applyStatic(lang) {
    const dict = STATIC[lang] || {};
    if (!Object.keys(dict).length) return;

    // 1. Explicit data-i18n attributes
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      if (dict[el.dataset.i18n]) el.textContent = dict[el.dataset.i18n];
    });

    // 2. Walk every text node in <body>: if its full trimmed content matches a
    //    dict key exactly, replace it. This covers nav links, buttons, footer
    //    links, sidebar labels, etc. without needing data-i18n attributes.
    const SKIP = new Set(["script","style","pre","code","textarea","input","option"]);
    const walk = (node) => {
      if (node.nodeType === 3 /* TEXT_NODE */) {
        const t = node.textContent.trim();
        if (t && dict[t]) {
          node.textContent = node.textContent.replace(t, dict[t]);
        }
      } else if (node.nodeType === 1 /* ELEMENT_NODE */) {
        if (!SKIP.has(node.tagName.toLowerCase())) {
          node.childNodes.forEach(walk);
        }
      }
    };
    if (document.body) walk(document.body);
  },

  async _applyDynamic(lang) {
    const cacheKey = `i18n:${location.pathname}:${lang}`;
    let map = this._loadCache(cacheKey);
    const selectors = [
      // Tool cards (new design)
      ".tool-card-name",
      ".tool-card-desc",
      ".tool-card-tags .tag",
      // Home hero
      ".hero h1",
      ".hero-sub",
      ".hero-badge",
      ".stat-label",
      ".stat-num",
      ".quick-upload-title",
      ".quick-upload-sub",
      // Catalog page
      ".catalog-hero h1",
      ".catalog-hero p",
      ".cat-name",
      // Tool page
      ".tool-page-header h1",
      ".tool-page-header p",
      ".upload-zone-title",
      ".upload-zone-sub",
      ".related-name",
      ".related-desc",
      ".tool-tips p",
      ".card-title",
      // FAQ / steps (tool page extended content)
      ".faq-item dt",
      ".faq-item dd",
      ".step-item",
      // Fallback
      "[data-i18n-dynamic]",
    ];
    const elements = Array.from(document.querySelectorAll(selectors.join(",")));

    // Collect texts not yet in cache
    const missing = [];
    elements.forEach((el) => {
      const src = el.textContent.trim();
      if (src && !map[src] && src.length > 1 && !/^\s*[\d\s.,/]+\s*$/.test(src)) {
        missing.push(src);
      }
    });

    if (missing.length > 0) {
      const unique = [...new Set(missing)];
      const translated = await this._edgeTranslate(unique, lang);
      unique.forEach((src, i) => {
        map[src] = translated[i] || src;
      });
      this._saveCache(cacheKey, map);
    }

    // Apply
    elements.forEach((el) => {
      const src = el.textContent.trim();
      if (map[src] && map[src] !== src) el.textContent = map[src];
    });
  },

  async _edgeTranslate(texts, lang) {
    const chunks = [];
    for (let i = 0; i < texts.length; i += 50) chunks.push(texts.slice(i, i + 50));
    const results = [];
    for (const chunk of chunks) {
      const translated = await this._translateChunk(chunk, lang);
      results.push(...translated);
    }
    return results;
  },

  async _translateChunk(texts, lang) {
    const edgeLang = lang === "en" ? "en" : lang === "ja" ? "ja" : lang;
    const edgeUrl = `https://edge.microsoft.com/translate/translatetext?from=zh-Hans&to=${edgeLang}&isEnterpriseClient=false`;

    // Edge API may return:
    //   a) ["translated", "strings"]                — plain array of strings
    //   b) [{translations:[{text:"...",to:"en"}]}]  — Azure Translator format
    //   c) [{text:"..."}]                           — simplified object format
    const extractStrings = (data) => {
      if (!Array.isArray(data) || !data.length) return null;
      if (typeof data[0] === "string") return data;
      if (data[0].translations) return data.map(d => (d.translations[0] || {}).text || d.translations[0] || "");
      if (typeof data[0].text === "string") return data.map(d => d.text || "");
      return null;
    };

    // Try direct browser call first (no server load)
    try {
      const resp = await fetch(edgeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(texts),
      });
      if (resp.ok) {
        const strings = extractStrings(await resp.json());
        if (strings) return strings;
      }
    } catch (_) {
      // CORS blocked — fall through to proxy
    }

    // Server-side proxy fallback
    try {
      const resp = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts, to: edgeLang }),
      });
      if (resp.ok) {
        const strings = extractStrings(await resp.json());
        if (strings) return strings;
      }
    } catch (_) {
      // network error
    }

    return texts; // ultimate fallback: return originals
  },

  _loadCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return {};
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL_MS) {
        localStorage.removeItem(key);
        return {};
      }
      return data;
    } catch (_) {
      return {};
    }
  },

  _saveCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    } catch (_) {
      // storage quota exceeded — skip cache
    }
  },

  _renderSwitcher() {
    const container = document.getElementById("lang-switcher");
    if (!container) return;
    const cur = SUPPORTED.find(l => l.code === this.current) || SUPPORTED[0];
    container.innerHTML =
      `<button class="lang-cur-btn" aria-haspopup="true" aria-expanded="false">` +
        `${cur.label}<span class="lang-arrow">▾</span>` +
      `</button>` +
      `<div class="lang-drop" role="menu">` +
        SUPPORTED.map(l =>
          `<button class="lang-opt${l.code === this.current ? " active" : ""}" ` +
          `data-lang="${l.code}" role="menuitem">${l.label}</button>`
        ).join("") +
      `</div>`;
    container.querySelectorAll(".lang-opt").forEach(btn => {
      btn.addEventListener("click", () => this.switchTo(btn.dataset.lang));
    });
  },
};

// Auto-init on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => I18N.init());
} else {
  I18N.init();
}

// Expose globally so app.js can call I18N.t(...)
window.I18N = I18N;
