// ── WinPrivacy App Database ──
// Add more apps below following the same structure.
// Each entry matches the shape expected by search.js and index.html.

const APPS_DB = [

  // ── Prayer Times Category ──

  {
    id: "salati",
    search_keys: ["salati", "26335devmoe", "devmoe"],
    name: "Salati",
    publisher: "DevMoe",
    version: "1.1.0.0",
    category_en: "Prayer Times",
    category_ar: "أوقات الصلاة",
    date_reviewed: "2025",
    // SER scores — converted from your rs/rsp scale to 0-100
    // rs=1.5556 (Medium), rsp=2.1111 (High), final=Normal+
    ser: 58,
    safety: 62,
    exposure: 70,
    risk: 55,
    verdict: "warn",
    label_en: "Normal+",
    label_ar: "طبيعي+",
    permissions: [
      { name_en: "Appointments",          name_ar: "المواعيد",          icon: "📅", level: 40, risk: "medium" },
      { name_en: "Internet Client",        name_ar: "عميل الإنترنت",     icon: "🌐", level: 35, risk: "low"    },
      { name_en: "Internet Client/Server", name_ar: "خادم/عميل الإنترنت",icon: "🔗", level: 50, risk: "medium" },
      { name_en: "Location",               name_ar: "الموقع",            icon: "📍", level: 55, risk: "medium" },
    ],
    anomalous_count: 1,
    risk_reason_en: "Appointments access flagged as anomalous",
    risk_reason_ar: "الوصول إلى المواعيد تم تصنيفه كشاذ",
    comment_en: "Salati requests location and appointment data — expected for a prayer times app. One anomalous permission detected. Generally safe to use.",
    comment_ar: "يطلب تطبيق صلاتي الوصول إلى الموقع والمواعيد — وهو أمر متوقع لتطبيق أوقات الصلاة. تم رصد إذن شاذ واحد. آمن بشكل عام."
  },

  {
    id: "salaattime",
    search_keys: ["salaattime", "salaat time", "31165"],
    name: "Salaat Time",
    publisher: "SalaatTime",
    version: "3.0.0.0",
    category_en: "Prayer Times",
    category_ar: "أوقات الصلاة",
    date_reviewed: "2025",
    // rs=1.6667 (Medium), rsp=0.6667 (Low), final=Normal+
    ser: 60,
    safety: 65,
    exposure: 22,
    risk: 30,
    verdict: "warn",
    label_en: "Normal+",
    label_ar: "طبيعي+",
    permissions: [
      { name_en: "Run Full Trust", name_ar: "تشغيل بثقة كاملة", icon: "⚙️", level: 60, risk: "medium" },
    ],
    anomalous_count: 0,
    risk_reason_en: "None (Typical)",
    risk_reason_ar: "لا يوجد (نموذجي)",
    comment_en: "Salaat Time uses runFullTrust which gives it elevated system access. No anomalous behaviour detected. Exposure is low.",
    comment_ar: "يستخدم تطبيق Salaat Time صلاحية التشغيل الكاملة التي تمنحه وصولاً موسعاً للنظام. لا يوجد سلوك شاذ. مستوى التعرض منخفض."
  },

  {
    id: "assalaat",
    search_keys: ["assalaat", "ceituna", "35824"],
    name: "Assalaat",
    publisher: "Ceituna",
    version: "2.3.0.0",
    category_en: "Prayer Times",
    category_ar: "أوقات الصلاة",
    date_reviewed: "2025",
    // rs=1.3333 (Medium), rsp=1.1111 (Medium), final=Safe
    ser: 72,
    safety: 78,
    exposure: 37,
    risk: 32,
    verdict: "safe",
    label_en: "Safe",
    label_ar: "آمن",
    permissions: [
      { name_en: "Internet Client",        name_ar: "عميل الإنترنت",      icon: "🌐", level: 30, risk: "low"    },
      { name_en: "Internet Client/Server", name_ar: "خادم/عميل الإنترنت", icon: "🔗", level: 40, risk: "medium" },
      { name_en: "Location",               name_ar: "الموقع",             icon: "📍", level: 45, risk: "medium" },
    ],
    anomalous_count: 0,
    risk_reason_en: "None (Typical)",
    risk_reason_ar: "لا يوجد (نموذجي)",
    comment_en: "Assalaat has a clean permission profile with no anomalies. Location access is expected for prayer direction. Safe to install.",
    comment_ar: "يتمتع تطبيق Assalaat بملف أذونات نظيف دون أي شذوذات. الوصول إلى الموقع متوقع لتحديد اتجاه القبلة. آمن للتثبيت."
  },

  {
    id: "muslimprayers",
    search_keys: ["muslimprayers", "muslim prayers", "holyland", "45456"],
    name: "Muslim Prayers",
    publisher: "HolyLand Times",
    version: "2.0.2.2",
    category_en: "Prayer Times",
    category_ar: "أوقات الصلاة",
    date_reviewed: "2025",
    // rs=1.0 (Low), rsp=0.3333 (Low), final=Safe
    ser: 88,
    safety: 90,
    exposure: 10,
    risk: 12,
    verdict: "safe",
    label_en: "Safe",
    label_ar: "آمن",
    permissions: [
      { name_en: "Internet Client", name_ar: "عميل الإنترنت", icon: "🌐", level: 20, risk: "low" },
    ],
    anomalous_count: 0,
    risk_reason_en: "None (Typical)",
    risk_reason_ar: "لا يوجد (نموذجي)",
    comment_en: "Minimal permissions, no anomalies, low exposure. One of the lowest-risk prayer apps in this category.",
    comment_ar: "أذونات محدودة جداً، لا شذوذات، تعرض منخفض. من أقل تطبيقات أوقات الصلاة مخاطرةً في هذه الفئة."
  },

  {
    id: "salaatfirst",
    search_keys: ["salaatfirst", "salaat first", "hicham", "boushaba", "50980"],
    name: "Salaat First",
    publisher: "Hicham Boushaba",
    version: "6.3.0.0",
    category_en: "Prayer Times",
    category_ar: "أوقات الصلاة",
    date_reviewed: "2025",
    // rs=1.8889 (Medium), rsp=1.0 (Low), final=Normal+
    ser: 55,
    safety: 60,
    exposure: 33,
    risk: 42,
    verdict: "warn",
    label_en: "Normal+",
    label_ar: "طبيعي+",
    permissions: [
      { name_en: "Broad File System Access", name_ar: "الوصول الواسع للملفات", icon: "📁", level: 70, risk: "high"   },
      { name_en: "Run Full Trust",           name_ar: "تشغيل بثقة كاملة",      icon: "⚙️", level: 60, risk: "medium" },
      { name_en: "System Management",        name_ar: "إدارة النظام",           icon: "🖥️", level: 55, risk: "medium" },
    ],
    anomalous_count: 0,
    risk_reason_en: "None (Typical)",
    risk_reason_ar: "لا يوجد (نموذجي)",
    comment_en: "Salaat First requests broad file system access and system management — elevated for a prayer app, though no anomalies were detected.",
    comment_ar: "يطلب تطبيق Salaat First الوصول الواسع لنظام الملفات وإدارة النظام — وهو مرتفع لتطبيق أوقات صلاة، لكن لم يُرصد أي سلوك شاذ."
  },

  {
    id: "myprayers",
    search_keys: ["myprayers", "my prayers", "hamza", "57127"],
    name: "My Prayers",
    publisher: "Hamza",
    version: "1.2.4.0",
    category_en: "Prayer Times",
    category_ar: "أوقات الصلاة",
    date_reviewed: "2025",
    // rs=1.5556 (Medium), rsp=2.1111 (High), final=Normal+
    ser: 56,
    safety: 62,
    exposure: 70,
    risk: 58,
    verdict: "warn",
    label_en: "Normal+",
    label_ar: "طبيعي+",
    permissions: [
      { name_en: "Internet Client",           name_ar: "عميل الإنترنت",         icon: "🌐", level: 35, risk: "low"    },
      { name_en: "Internet Client/Server",    name_ar: "خادم/عميل الإنترنت",    icon: "🔗", level: 45, risk: "medium" },
      { name_en: "Location",                  name_ar: "الموقع",                icon: "📍", level: 50, risk: "medium" },
      { name_en: "User Notification Listener",name_ar: "مستمع الإشعارات",       icon: "🔔", level: 72, risk: "high"   },
    ],
    anomalous_count: 1,
    risk_reason_en: "User Notification Listener flagged as anomalous",
    risk_reason_ar: "تم تصنيف مستمع الإشعارات كشاذ",
    comment_en: "My Prayers has an anomalous notification listener permission — it can intercept system notifications beyond prayer times. Use with awareness.",
    comment_ar: "يمتلك تطبيق My Prayers إذناً شاذاً للاستماع إلى الإشعارات — يمكنه اعتراض إشعارات النظام بما يتجاوز أوقات الصلاة. استخدمه بوعي."
  },

  {
    id: "prayertimings",
    search_keys: ["prayertimings", "prayer timings", "dnzh", "59811"],
    name: "Prayer Timings",
    publisher: "dnzh",
    version: "2.0.8.0",
    category_en: "Prayer Times",
    category_ar: "أوقات الصلاة",
    date_reviewed: "2025",
    // rs=1.3333 (Medium), rsp=1.1111 (Medium), final=Safe
    ser: 72,
    safety: 78,
    exposure: 37,
    risk: 32,
    verdict: "safe",
    label_en: "Safe",
    label_ar: "آمن",
    permissions: [
      { name_en: "Internet Client",        name_ar: "عميل الإنترنت",      icon: "🌐", level: 30, risk: "low"    },
      { name_en: "Internet Client/Server", name_ar: "خادم/عميل الإنترنت", icon: "🔗", level: 40, risk: "medium" },
      { name_en: "Location",               name_ar: "الموقع",             icon: "📍", level: 45, risk: "medium" },
    ],
    anomalous_count: 0,
    risk_reason_en: "None (Typical)",
    risk_reason_ar: "لا يوجد (نموذجي)",
    comment_en: "Prayer Timings has a clean, expected permission set for its category. No anomalies detected. Safe to install.",
    comment_ar: "يتمتع تطبيق Prayer Timings بمجموعة أذونات نظيفة ومتوقعة لفئته. لا توجد شذوذات. آمن للتثبيت."
  },

  {
    id: "awqatsalaat",
    search_keys: ["awqatsalaat", "awqat salaat", "khiro", " awqat"],
    name: "Awqat Salaat WinUI",
    publisher: "Khiro",
    version: "4.1.2.0",
    category_en: "Prayer Times",
    category_ar: "أوقات الصلاة",
    date_reviewed: "2025",
    // rs=1.5556 (Medium), rsp=2.3333 (High), final=Normal+
    ser: 54,
    safety: 60,
    exposure: 78,
    risk: 62,
    verdict: "warn",
    label_en: "Normal+",
    label_ar: "طبيعي+",
    permissions: [
      { name_en: "Background Media Playback", name_ar: "تشغيل وسائط في الخلفية", icon: "🎵", level: 65, risk: "medium" },
      { name_en: "Broad File System Access",  name_ar: "الوصول الواسع للملفات",  icon: "📁", level: 70, risk: "high"   },
      { name_en: "Internet Client",           name_ar: "عميل الإنترنت",          icon: "🌐", level: 30, risk: "low"    },
      { name_en: "Location",                  name_ar: "الموقع",                 icon: "📍", level: 50, risk: "medium" },
      { name_en: "Run Full Trust",            name_ar: "تشغيل بثقة كاملة",       icon: "⚙️", level: 60, risk: "medium" },
      { name_en: "System Management",         name_ar: "إدارة النظام",            icon: "🖥️", level: 55, risk: "medium" },
    ],
    anomalous_count: 1,
    risk_reason_en: "Background media playback flagged as anomalous",
    risk_reason_ar: "تم تصنيف تشغيل الوسائط في الخلفية كشاذ",
    comment_en: "Awqat Salaat has high exposure due to broad file system access combined with background media playback. One anomaly detected. Monitor usage.",
    comment_ar: "يتمتع تطبيق أوقات الصلاة بتعرض مرتفع بسبب الوصول الواسع لنظام الملفات مع تشغيل الوسائط في الخلفية. رُصد شذوذ واحد. راقب الاستخدام."
  },

  {
    id: "athanapp",
    search_keys: ["athanapp", "athan", "nhprod", "athan app"],
    name: "Athan App",
    publisher: "NHProd",
    version: "1.0.3.0",
    category_en: "Prayer Times",
    category_ar: "أوقات الصلاة",
    date_reviewed: "2025",
    // rs=2.1111 (High), rsp=2.5556 (High), final=High Risk
    ser: 18,
    safety: 15,
    exposure: 95,
    risk: 92,
    verdict: "danger",
    label_en: "High Risk",
    label_ar: "خطر مرتفع",
    permissions: [
      { name_en: "Microphone",                  name_ar: "الميكروفون",               icon: "🎙️", level: 95, risk: "high"   },
      { name_en: "Webcam",                       name_ar: "الكاميرا",                 icon: "📷", level: 95, risk: "high"   },
      { name_en: "Private Network Client/Server",name_ar: "شبكة خاصة عميل/خادم",     icon: "🔒", level: 88, risk: "high"   },
      { name_en: "Shared User Certificates",     name_ar: "شهادات المستخدم المشتركة", icon: "🔑", level: 90, risk: "high"   },
      { name_en: "Documents Library",            name_ar: "مكتبة المستندات",          icon: "📄", level: 80, risk: "high"   },
      { name_en: "Enterprise Authentication",    name_ar: "مصادقة المؤسسات",          icon: "🏢", level: 85, risk: "high"   },
      { name_en: "Videos Library",               name_ar: "مكتبة الفيديو",            icon: "🎬", level: 75, risk: "high"   },
      { name_en: "Music Library",                name_ar: "مكتبة الموسيقى",           icon: "🎵", level: 70, risk: "medium" },
      { name_en: "Removable Storage",            name_ar: "التخزين القابل للإزالة",   icon: "💾", level: 82, risk: "high"   },
      { name_en: "Broad File System Access",     name_ar: "الوصول الواسع للملفات",    icon: "📁", level: 88, risk: "high"   },
    ],
    anomalous_count: 10,
    risk_reason_en: "Microphone, webcam, private network, shared certificates, enterprise authentication",
    risk_reason_ar: "ميكروفون، كاميرا، شبكة خاصة، شهادات مشتركة، مصادقة مؤسسية",
    comment_en: "⚠️ Athan App is flagged HIGH RISK. It requests microphone, webcam, private network, enterprise authentication, and full file system access — far beyond what a prayer times app needs. Custom flags include credential access, dangerous memory access, and hardware fingerprinting. Do not install.",
    comment_ar: "⚠️ تطبيق الأذان مُصنَّف كخطر مرتفع. يطلب الوصول إلى الميكروفون والكاميرا والشبكة الخاصة والمصادقة المؤسسية والوصول الكامل لنظام الملفات — وهو أبعد بكثير مما يحتاجه تطبيق أوقات الصلاة. الأعلام المخصصة تشمل الوصول إلى بيانات الاعتماد، والوصول الخطير إلى الذاكرة، وبصمة الأجهزة. لا تقم بتثبيته."
  },

  // ── ADD MORE CATEGORIES BELOW ──
  // Copy the block above and fill in your data.
  // The search_keys array is what the user types to find this app —
  // add short names, publisher names, abbreviations, etc.

];
