// ── WinPrivacy App Database ──
// All permissions taken directly from the effective_permissions column in CSV
// risk level per permission: low=green, medium=yellow, high=red
// bar width (0-100) is visual only — based on sensitivity of that permission type

const APPS_DB = [

  {
    search_keys: ["salati", "devmoe", "26335devmoe"],
    name: "Salati", publisher: "DevMoe", version: "1.1.0.0",
    cat: { en: "Prayer Times", ar: "أوقات الصلاة" }, date: "2025",
    rs: 1.56, rsLevelKey: "Medium", verdict: "anomaly",
    permissions: [
      { name: { en: "Appointments",           ar: "المواعيد"              }, icon: "📅", level: 55, risk: "medium" },
      { name: { en: "Internet Client",        ar: "عميل الإنترنت"         }, icon: "🌐", level: 35, risk: "low"    },
      { name: { en: "Internet Client/Server", ar: "خادم/عميل الإنترنت"   }, icon: "🔗", level: 45, risk: "medium" },
      { name: { en: "Location",               ar: "الموقع"               }, icon: "📍", level: 50, risk: "medium" },
    ],
    comment: {
      en: "Salati requests location and appointment access — expected for prayer times. One anomalous permission detected (appointments).",
      ar: "يطلب تطبيق صلاتي الوصول إلى الموقع والمواعيد. رُصد إذن شاذ واحد (المواعيد). آمن بشكل عام."
    }
  },

  {
    search_keys: ["salaattime", "salaat time", "31165"],
    name: "Salaat Time", publisher: "SalaatTime", version: "3.0.0.0",
    cat: { en: "Prayer Times", ar: "أوقات الصلاة" }, date: "2025",
    rs: 1.67, rsLevelKey: "Medium", verdict: "normal",
    permissions: [
      { name: { en: "Run Full Trust", ar: "تشغيل بثقة كاملة" }, icon: "⚙️", level: 60, risk: "medium" },
    ],
    comment: {
      en: "Salaat Time uses runFullTrust which gives it elevated system access. No anomalous behaviour detected. Exposure is low.",
      ar: "يستخدم تطبيق Salaat Time صلاحية التشغيل الكاملة. لا يوجد سلوك شاذ. مستوى التعرض منخفض."
    }
  },

  {
    search_keys: ["assalaat", "ceituna", "35824"],
    name: "Assalaat", publisher: "Ceituna", version: "2.3.0.0",
    cat: { en: "Prayer Times", ar: "أوقات الصلاة" }, date: "2025",
    rs: 1.33, rsLevelKey: "Medium", verdict: "safe",
    permissions: [
      { name: { en: "Internet Client",        ar: "عميل الإنترنت"        }, icon: "🌐", level: 30, risk: "low"    },
      { name: { en: "Internet Client/Server", ar: "خادم/عميل الإنترنت"  }, icon: "🔗", level: 40, risk: "medium" },
      { name: { en: "Location",               ar: "الموقع"              }, icon: "📍", level: 45, risk: "medium" },
    ],
    comment: {
      en: "Assalaat has a clean permission profile with no anomalies. Location access is expected for prayer direction. Safe to install.",
      ar: "يتمتع تطبيق Assalaat بملف أذونات نظيف دون أي شذوذات. آمن للتثبيت."
    }
  },

  {
    search_keys: ["muslimprayers", "muslim prayers", "holyland", "45456"],
    name: "Muslim Prayers", publisher: "HolyLand Times", version: "2.0.2.2",
    cat: { en: "Prayer Times", ar: "أوقات الصلاة" }, date: "2025",
    rs: 1.0, rsLevelKey: "Low", verdict: "safe",
    permissions: [
      { name: { en: "Internet Client", ar: "عميل الإنترنت" }, icon: "🌐", level: 20, risk: "low" },
    ],
    comment: {
      en: "Minimal permissions, no anomalies, very low exposure. One of the lowest-risk prayer apps in this category.",
      ar: "أذونات محدودة جداً، لا شذوذات. من أقل تطبيقات أوقات الصلاة مخاطرةً في هذه الفئة."
    }
  },

  {
    search_keys: ["salaatfirst", "salaat first", "hicham", "50980"],
    name: "Salaat First", publisher: "Hicham Boushaba", version: "6.3.0.0",
    cat: { en: "Prayer Times", ar: "أوقات الصلاة" }, date: "2025",
    rs: 1.89, rsLevelKey: "Medium", verdict: "normal",
    permissions: [
      { name: { en: "Broad File System Access", ar: "الوصول الواسع للملفات" }, icon: "📁", level: 70, risk: "high"   },
      { name: { en: "Run Full Trust",           ar: "تشغيل بثقة كاملة"     }, icon: "⚙️", level: 60, risk: "medium" },
      { name: { en: "System Management",        ar: "إدارة النظام"          }, icon: "🖥️", level: 55, risk: "medium" },
    ],
    comment: {
      en: "Salaat First requests broad file system access and system management — elevated for a prayer app, though no anomalies were detected.",
      ar: "يطلب تطبيق Salaat First الوصول الواسع لنظام الملفات وإدارة النظام. لم يُرصد أي سلوك شاذ."
    }
  },

  {
    search_keys: ["myprayers", "my prayers", "hamza", "57127"],
    name: "My Prayers", publisher: "Hamza", version: "1.2.4.0",
    cat: { en: "Prayer Times", ar: "أوقات الصلاة" }, date: "2025",
    rs: 1.56, rsLevelKey: "Medium", verdict: "anomaly",
    permissions: [
      { name: { en: "Internet Client",            ar: "عميل الإنترنت"        }, icon: "🌐", level: 30, risk: "low"    },
      { name: { en: "Internet Client/Server",     ar: "خادم/عميل الإنترنت"  }, icon: "🔗", level: 40, risk: "medium" },
      { name: { en: "Location",                   ar: "الموقع"              }, icon: "📍", level: 45, risk: "medium" },
      { name: { en: "User Notification Listener", ar: "مستمع الإشعارات"     }, icon: "🔔", level: 72, risk: "high"   },
    ],
    comment: {
      en: "My Prayers has an anomalous notification listener permission — it can intercept system notifications beyond prayer times. Use with awareness.",
      ar: "يمتلك تطبيق My Prayers إذناً شاذاً للاستماع إلى الإشعارات. استخدمه بوعي."
    }
  },

  {
    search_keys: ["prayertimings", "prayer timings", "dnzh", "59811"],
    name: "Prayer Timings", publisher: "dnzh", version: "2.0.8.0",
    cat: { en: "Prayer Times", ar: "أوقات الصلاة" }, date: "2025",
    rs: 1.33, rsLevelKey: "Medium", verdict: "safe",
    permissions: [
      { name: { en: "Internet Client",        ar: "عميل الإنترنت"       }, icon: "🌐", level: 30, risk: "low"    },
      { name: { en: "Internet Client/Server", ar: "خادم/عميل الإنترنت" }, icon: "🔗", level: 40, risk: "medium" },
      { name: { en: "Location",               ar: "الموقع"             }, icon: "📍", level: 45, risk: "medium" },
    ],
    comment: {
      en: "Prayer Timings has a clean, expected permission set. No anomalies detected. Safe to install.",
      ar: "يتمتع تطبيق Prayer Timings بمجموعة أذونات نظيفة. لا توجد شذوذات. آمن للتثبيت."
    }
  },

  {
    search_keys: ["awqatsalaat", "awqat salaat", "khiro", "awqat"],
    name: "Awqat Salaat WinUI", publisher: "Khiro", version: "4.1.2.0",
    cat: { en: "Prayer Times", ar: "أوقات الصلاة" }, date: "2025",
    rs: 1.56, rsLevelKey: "Medium", verdict: "anomaly",
    permissions: [
      { name: { en: "Background Media Playback", ar: "تشغيل وسائط في الخلفية" }, icon: "🎵", level: 65, risk: "medium" },
      { name: { en: "Broad File System Access",  ar: "الوصول الواسع للملفات"  }, icon: "📁", level: 70, risk: "high"   },
      { name: { en: "Internet Client",           ar: "عميل الإنترنت"          }, icon: "🌐", level: 30, risk: "low"    },
      { name: { en: "Location",                  ar: "الموقع"                 }, icon: "📍", level: 50, risk: "medium" },
      { name: { en: "Run Full Trust",            ar: "تشغيل بثقة كاملة"       }, icon: "⚙️", level: 60, risk: "medium" },
      { name: { en: "System Management",         ar: "إدارة النظام"           }, icon: "🖥️", level: 55, risk: "medium" },
    ],
    comment: {
      en: "Elevated exposure due to broad file system access combined with background media playback. One anomaly detected.",
      ar: "تعرض مرتفع بسبب الوصول الواسع لنظام الملفات مع تشغيل الوسائط في الخلفية. رُصد شذوذ واحد."
    }
  },

  {
    search_keys: ["athanapp", "athan", "nhprod", "athan app"],
    name: "Athan App", publisher: "NHProd", version: "1.0.3.0",
    cat: { en: "Prayer Times", ar: "أوقات الصلاة" }, date: "2025",
    rs: 2.11, rsLevelKey: "High", verdict: "highrisk",
    permissions: [
      { name: { en: "Microphone",                   ar: "الميكروفون"               }, icon: "🎙️", level: 95, risk: "high"   },
      { name: { en: "Webcam",                        ar: "الكاميرا"                 }, icon: "📷", level: 95, risk: "high"   },
      { name: { en: "Private Network Client/Server", ar: "شبكة خاصة عميل/خادم"    }, icon: "🔒", level: 88, risk: "high"   },
      { name: { en: "Shared User Certificates",      ar: "شهادات المستخدم المشتركة"}, icon: "🔑", level: 90, risk: "high"   },
      { name: { en: "Documents Library",             ar: "مكتبة المستندات"         }, icon: "📄", level: 80, risk: "high"   },
      { name: { en: "Enterprise Authentication",     ar: "مصادقة المؤسسات"         }, icon: "🏢", level: 85, risk: "high"   },
      { name: { en: "Videos Library",                ar: "مكتبة الفيديو"           }, icon: "🎬", level: 75, risk: "high"   },
      { name: { en: "Music Library",                 ar: "مكتبة الموسيقى"          }, icon: "🎵", level: 65, risk: "medium" },
      { name: { en: "Removable Storage",             ar: "التخزين القابل للإزالة"  }, icon: "💾", level: 82, risk: "high"   },
      { name: { en: "Broad File System Access",      ar: "الوصول الواسع للملفات"   }, icon: "📁", level: 88, risk: "high"   },
      { name: { en: "Internet Client",               ar: "عميل الإنترنت"           }, icon: "🌐", level: 35, risk: "low"    },
      { name: { en: "Internet Client/Server",        ar: "خادم/عميل الإنترنت"      }, icon: "🔗", level: 45, risk: "medium" },
      { name: { en: "Run Full Trust",                ar: "تشغيل بثقة كاملة"        }, icon: "⚙️", level: 60, risk: "medium" },
      { name: { en: "System Management",             ar: "إدارة النظام"             }, icon: "🖥️", level: 55, risk: "medium" },
    ],
    comment: {
      en: "⚠️ Athan App is flagged HIGH RISK. It requests microphone, webcam, private network, enterprise authentication, and full file system access — far beyond what a prayer times app needs. Custom flags: credential access, dangerous memory access, hardware fingerprinting. <strong class='hl'>Do not install.</strong>",
      ar: "⚠️ تطبيق الأذان مُصنَّف كخطر مرتفع. يطلب الوصول إلى الميكروفون والكاميرا والشبكة الخاصة — أبعد بكثير مما يحتاجه تطبيق أوقات الصلاة. <strong class='hl'>لا تقم بتثبيته.</strong>"
    }
  },

  // ── ADD MORE CATEGORIES BELOW ──

];
