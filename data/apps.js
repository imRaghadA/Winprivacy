// ── WinPrivacy App Database ──
// Scores use the real SER scale: 0–4
// rs  = Risk Score
// rsLevelKey: 'Safe/Very Low' | 'Low' | 'Medium' | 'High' | 'Very High'
// verdict: 'safe' | 'normal' | 'anomaly' | 'highrisk'

const APPS_DB = [

  {
    search_keys: ["salati", "devmoe", "26335devmoe"],
    name: "Salati", publisher: "DevMoe", version: "1.1.0.0",
    cat: { en: "Prayer Times", ar: "أوقات الصلاة" }, date: "2025",
    rs: 1.56, rsLevelKey: "Medium", verdict: "anomaly",
    comment: {
      en: "Salati requests location and appointment access — expected for prayer times. One anomalous permission detected (appointments). Generally safe to use.",
      ar: "يطلب تطبيق صلاتي الوصول إلى الموقع والمواعيد. رُصد إذن شاذ واحد (المواعيد). آمن بشكل عام."
    }
  },

  {
    search_keys: ["salaattime", "salaat time", "31165"],
    name: "Salaat Time", publisher: "SalaatTime", version: "3.0.0.0",
    cat: { en: "Prayer Times", ar: "أوقات الصلاة" }, date: "2025",
    rs: 1.67, rsLevelKey: "Medium", verdict: "normal",
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
    comment: {
      en: "Prayer Timings has a clean, expected permission set for its category. No anomalies detected. Safe to install.",
      ar: "يتمتع تطبيق Prayer Timings بمجموعة أذونات نظيفة. لا توجد شذوذات. آمن للتثبيت."
    }
  },

  {
    search_keys: ["awqatsalaat", "awqat salaat", "khiro", "awqat"],
    name: "Awqat Salaat WinUI", publisher: "Khiro", version: "4.1.2.0",
    cat: { en: "Prayer Times", ar: "أوقات الصلاة" }, date: "2025",
    rs: 1.56, rsLevelKey: "Medium", verdict: "anomaly",
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
    comment: {
      en: "⚠️ Athan App is flagged HIGH RISK. It requests microphone, webcam, private network, enterprise authentication, and full file system access — far beyond what a prayer times app needs. Custom flags: credential access, dangerous memory access, hardware fingerprinting. <strong class='hl'>Do not install.</strong>",
      ar: "⚠️ تطبيق الأذان مُصنَّف كخطر مرتفع. يطلب الوصول إلى الميكروفون والكاميرا والشبكة الخاصة — أبعد بكثير مما يحتاجه تطبيق أوقات الصلاة. <strong class='hl'>لا تقم بتثبيته.</strong>"
    }
  },

  // ── ADD MORE CATEGORIES BELOW ──
  // Copy any block, fill in your data, and save.

];
