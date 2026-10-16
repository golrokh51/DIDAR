/*
 * DIDAR — Persian program and session data
 * -----------------------------------------
 * PROGRAMS: General descriptions that appear only once.
 * ACTIVITIES: Individual dated sessions; multiple rows can share programId.
 * For future Google Sheets integration, use the same program IDs in both tabs.
 * Do not put attendee names, emails, or private information in public data.
 */

const PROGRAMS = [
  {
    id: "dialogue-crisis",
    title: "هنر گفت‌وگو در بحران",
    subtitle: "همدلی، اختلاف و حمایت بدون بازتولید خشونت",
    status: "برنامهٔ آموزشی و مشارکتی",
    startDate: "",
    schedule: "زمان نشست‌های بعدی متعاقباً اعلام می‌شود.",
    audience: "بزرگسالان فارسی‌زبان مونترآل، به‌ویژه مهاجران و تازه‌واردان",
    languages: ["فارسی"],
    description: "فرصتی برای یادگیری و تمرین شنیدن فعال، بیان محترمانهٔ اختلاف‌نظر، همدلی، مراقبت از یکدیگر و حمایت بدون قضاوت، تحقیر، طرد یا بازتولید خشونت.",
    topics: ["گفت‌وگو", "همدلی", "مدیریت اختلاف‌نظر", "حمایت متقابل"],
    visible: true,
    sortOrder: 1
  },
  {
    id: "harassment-consent",
    title: "آزار جنسی، آزار روانی و رضایت",
    subtitle: "مجموعه‌ای از سه کارگاه آموزشی دربارهٔ احترام، مسئولیت‌پذیری و مرزهای شخصی",
    status: "به‌زودی",
    startDate: "",
    schedule: "تاریخ برگزاری و زمان ثبت‌نام متعاقباً اعلام می‌شود.",
    audience: "بزرگسالان مونترآل، به‌ویژه مهاجران و تازه‌واردان؛ گروه مخاطبان هر کارگاه جداگانه مشخص می‌شود.",
    languages: ["فارسی"],
    description: "سه کارگاه با محوریت شناخت مرز میان اختلاف و آزار، مفهوم رضایت و مسئولیت‌پذیری، اختیار فردی و مرزهای شخصی. این برنامه شامل گفت‌وگو و تمرین‌های مشارکتی است.",
    topics: ["مرز میان اختلاف، آزار و خشونت", "رضایت، احترام و مسئولیت‌پذیری", "رضایت، اختیار و مرزهای شخصی"],
    visible: true,
    sortOrder: 2
  },
  {
    id: "digital-cafe",
    title: "کافه دیجیتال",
    subtitle: "همراهی صبورانه و کاربردی برای استفاده از فناوری‌های روزمره",
    status: "شروع از ۲۶ اکتبر ۲۰۲۶",
    startDate: "2026-10-26",
    schedule: "دوشنبه‌ها، ساعت ۱۶ تا ۱۹",
    audience: "برای همه؛ هیچ سؤالی بیش از حد ساده نیست.",
    languages: ["فارسی", "فرانسوی", "انگلیسی"],
    description: "راهنمایی عملی دربارهٔ تلفن همراه، تبلت و لپ‌تاپ، اپلیکیشن‌ها، ایمیل، فرم‌های آنلاین، تنظیمات و تماس‌های تصویری. می‌توانید دستگاه خودتان را همراه بیاورید.",
    topics: ["فناوری روزمره", "آموزش دیجیتال", "کمک و همراهی"],
    visible: true,
    sortOrder: 3
  }
];

const ACTIVITIES = [
  {
    id: "afi-dialogue-2026-10-11",
    programId: "dialogue-crisis",
    date: "2026-10-11",
    status: "completed", // For a future occurrence use "upcoming".
    title: "کارگاه هنر گفت‌وگو در بحران",
    subtitle: "همدلی، اختلاف و حمایت بدون بازتولید خشونت",
    type: "workshop",
    project: "گفت‌وگوهای دیدار",
    partner: "انجمن زنان ایرانی مونترآل (AFI)",
    location: "مونترآل",
    language: ["فارسی"],
    role: "طراحی و تسهیل کارگاه، به دعوت و با همکاری انجمن زنان ایرانی مونترآل",
    audience: "بزرگسالان فارسی‌زبان",
    summary: "در این نشست مشارکتی، شرکت‌کنندگان دربارهٔ گفت‌وگوی سازنده در شرایط بحران، شنیدن فعال، بیان محترمانهٔ اختلاف‌نظر، مرزهای سالم و حمایت از یکدیگر بدون بازتولید خشونت گفت‌وگو و تمرین کردند.",
    tags: ["گفت‌وگو", "همدلی", "مدیریت اختلاف‌نظر", "حمایت اجتماعی"],
    photos: [],
    documents: [],
    link: "",
    visible: true
  }
];
