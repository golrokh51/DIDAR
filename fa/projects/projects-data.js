/*
  DIDAR — Project data
  --------------------
  To add a new project:
  1) Copy one {...} block below.
  2) Change title, status, summary, tags and link.
  3) Save the file.

  Available status values:
    active         = در حال اجرا
    development    = در حال توسعه
    collaboration  = همکاری
    completed      = انجام‌شده

  "link" can be:
    ""                         -> no "more info" button
    "nima/"                    -> a subpage in /fa/projects/nima/
    "https://example.com"      -> an external page
*/

const PROJECTS = [

  {
    title: "کتابخانه نیما",
    subtitle: "ادبیات، میراث و حافظه فرهنگی",
    status: ["collaboration", "در حال توسعه"],
    summary:
      "همکاری در زمینه ادبیات، مستندسازی، حافظه فرهنگی، دسترسی به کتاب‌ها و مجموعه‌ها، دیجیتال‌سازی، نمایشگاه‌ها و فعالیت‌های بین‌نسلی.",
    tags: ["ادبیات", "میراث", "جامعه"],
    link: ""
  },

  {
    title: "دیدار سالمندان",
    subtitle: "توانمندی دیجیتال، دسترسی به خدمات و همراهی",
    status: "development",
    summary:
      "برنامه‌ای برای همراهی اجتماعی سالمندان، کمک در امور دیجیتال، دسترسی به خدمات و در صورت امکان همراهی عملی در برخی امور اداری، اجتماعی و مراجعه‌های پزشکی.",
    tags: ["سالمندان", "دیجیتال", "همراهی"],
    link: ""
  },

  {
    title: "گفت‌وگوهای دیدار",
    subtitle: "گفت‌وگو، یادگیری و مشارکت",
    status: "active",
    summary:
      "کارگاه‌ها، گفت‌وگوهای عمومی و رویدادهای اجتماعی درباره موضوعاتی مانند مشارکت، تنوع، رضایت، جنسیت، احساس تعلق، تجربه مهاجرت، حقوق و درک بین‌فرهنگی.",
    tags: ["آموزش", "گفت‌وگو", "بین‌فرهنگی"],
    link: ""
  },

  {
    title: "صدای جامعه در دیدار",
    subtitle: "مستندسازی نیازها و موانع تکرارشونده",
    status: "development",
    summary:
      "جمع‌آوری و مستندسازی مسائل تکرارشونده جامعه و ایجاد داده و شواهدی که بتواند به بهبود خدمات، همکاری‌ها و پاسخ نهادها کمک کند.",
    tags: ["مستندسازی", "جامعه", "پیگیری"],
    link: ""
  }

];
