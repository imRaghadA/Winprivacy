// ── WinPrivacy Search Engine v2 ──
// Features: MS Store live search, Analyze Now pipeline, Winny AI Chat

const SUPABASE_URL = 'https://mthksiaihxgyesvxxtbt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10aGtzaWFpaHhneWVzdnh4dGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2OTEsImV4cCI6MjA5MjUxNDY5MX0.STu8JYCABANBUkJtKQYYAIg_TVQF5GV-GrsPB2fSI3w';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

// ════════════════════════════════════════
// SANITIZER
// ════════════════════════════════════════
function sanitize(input) {
  return (input || '').replace(/[*%<>"'`;\\]/g, '').trim().slice(0, 80);
}
function sanitizeEmail(email) {
  return (email || '').trim().toLowerCase().slice(0, 120);
}

// ════════════════════════════════════════
// LANGUAGE HELPER
// ════════════════════════════════════════
function L() { return typeof lang !== 'undefined' ? lang : 'en'; }
function t(en, ar) { return L() === 'ar' ? ar : en; }

// ════════════════════════════════════════
// CLEAN DISPLAY NAME
// ════════════════════════════════════════
function cleanAppName(rawName) {
  const afterDot = rawName.includes('.') ? rawName.split('.').slice(1).join('.') : rawName;
  const beforeUs = afterDot.split('_')[0];
  return beforeUs.replace(/([A-Z])/g, ' $1').trim();
}

// ════════════════════════════════════════
// VERDICT HELPERS
// ════════════════════════════════════════
function mapVerdict(fd) {
  const v = (fd || '').toLowerCase().trim();
  return v === 'high risk'    ? 'highrisk'   :
         v === 'anomaly det.' ? 'anomaly'    :
         v === 'safe'         ? 'safe'       :
         v === 'normal'       ? 'moderate'   :
         v === 'moderate risk'? 'moderate'   :
                                'moderate';
}

function verdictColor(verdict) {
  return verdict === 'safe'     ? '#22c55e' :
         verdict === 'moderate' ? '#3b82f6' :
         verdict === 'anomaly'  ? '#facc15' :
         verdict === 'highrisk' ? '#ef4444' : '#3b82f6';
}

function verdictLabel(verdict) {
  const labels = {
    en: { safe:'Safe', moderate:'Moderate Risk', anomaly:'Anomaly Detected', highrisk:'High Risk' },
    ar: { safe:'آمن',  moderate:'خطر متوسط',      anomaly:'سلوك غير معتاد',  highrisk:'خطر مرتفع' }
  };
  return (labels[L()] || labels.en)[verdict] || verdict;
}

function fdColor(fd) {
  const v = (fd || '').toLowerCase().trim();
  return v === 'high risk'    ? '#ef4444' :
         v === 'anomaly det.' ? '#f97316' :
         v === 'moderate'     ? '#3b82f6' :
         v === 'safe'         ? '#22c55e' : '#3b82f6';
}

// ════════════════════════════════════════
// PERMISSION METADATA
// ════════════════════════════════════════
const permMeta = {
  microphone:                 { icon:'🎙️', risk:'high'   },
  webcam:                     { icon:'📷', risk:'high'   },
  privatenetworkclientserver: { icon:'🔒', risk:'high'   },
  sharedusercertificates:     { icon:'🔑', risk:'high'   },
  documentslibrary:           { icon:'📄', risk:'high'   },
  enterpriseauthentication:   { icon:'🏢', risk:'high'   },
  videoslibrary:              { icon:'🎬', risk:'high'   },
  musiclibrary:               { icon:'🎵', risk:'medium' },
  removablestorage:           { icon:'💾', risk:'high'   },
  broadfilesystemaccess:      { icon:'📁', risk:'high'   },
  internetclient:             { icon:'🌐', risk:'low'    },
  internetclientserver:       { icon:'🔗', risk:'medium' },
  runfulltrust:               { icon:'⚙️', risk:'medium' },
  systemmanagement:           { icon:'🖥️', risk:'medium' },
  location:                   { icon:'📍', risk:'medium' },
  appointments:               { icon:'📅', risk:'medium' },
  usernotificationlistener:   { icon:'🔔', risk:'high'   },
  backgroundmediaplayback:    { icon:'🎵', risk:'medium' },
  pictureslibrary:            { icon:'🖼️', risk:'medium' },
  contacts:                   { icon:'👤', risk:'medium' },
};
const riskWidth = { high:88, medium:55, low:25 };

function parsePermissions(effectivePerms) {
  const seen = new Set();
  return (effectivePerms || '').split(',').map(p => p.trim()).filter(Boolean)
    .filter(p => { const k=p.toLowerCase().replace(/[^a-z]/g,''); if(seen.has(k)) return false; seen.add(k); return true; })
    .map(p => {
      const key  = p.toLowerCase().replace(/[^a-z]/g,'');
      const meta = permMeta[key] || { icon:'🔧', risk:'medium' };
      const name = p.replace(/([A-Z])/g,' $1').trim();
      return { name:{en:name,ar:name}, icon:meta.icon, risk:meta.risk, level:riskWidth[meta.risk] };
    });
}

// ════════════════════════════════════════
// ROW → APP SHAPE
// ════════════════════════════════════════



// ════════════════════════════════════════
// ROW → APP SHAPE
// ════════════════════════════════════════
function rowToApp(row) {
  const fd = (row.final_decision || '').toLowerCase().trim();
  const verdict =
    fd === 'high risk'    ? 'highrisk' :
    fd === 'anomaly det.' ? 'anomaly'  :
    fd === 'safe'         ? 'safe'     : 'moderate';

  const levelMap = {
    'low':'Low', 'medium':'Medium', 'high':'High',
    'very high':'Very High', 'safe':'Safe/Very Low'
  };
  const rsLevelKey = levelMap[(row.rs_level || '').toLowerCase()] || 'Medium';

  const seen = new Set();
  const permissions = (row.effective_permissions || '')
    .split(',').map(p => p.trim()).filter(Boolean)
    .filter(p => {
      const k = p.toLowerCase().replace(/[^a-z]/g, '');
      if (seen.has(k)) return false;
      seen.add(k); return true;
    })
    .map(p => {
      const key  = p.toLowerCase().replace(/[^a-z]/g, '');
      const meta = permMeta[key] || { icon: '🔧', risk: 'medium' };
      const name = p.replace(/([A-Z])/g, ' $1').trim();
      return { name:{en:name, ar:name}, icon:meta.icon, risk:meta.risk, level:riskWidth[meta.risk] };
    });

  const cleanName = cleanAppName(row.app_name || '');

  
  const fullAnalysisEn = row.winny_analysis || '';
  const fullAnalysisAr = row.winny_text_translated || fullAnalysisEn; 

  
function splitText(fullAnalysis, isAr) {
    let intro = '';
    let details = '';
    if (fullAnalysis) {
      // تنظيف النص تماماً من الكلمات المكررة في الداتا بيس مهما كان شكلها
      let cleanText = fullAnalysis
        .replace(/Winny says:/gi, '') // الحرف i يضمن حذفها سواء كانت S كابيتال أو سمول
        .replace(/يقول ويني:/g, '')
        .replace(/تطبيق ويني/g, '')
        .replace(/يقول:/g, '')
        .trim();

      // التقسيم بدون كونكلوجن وخلاصة عشان الـ See more ما يخرب
      const splitPattern = /(?=Additional Permissions|Anomalous Permissions|Technical Risk Flags|الصلاحيات الإضافية)/g;
      const parts = cleanText.split(splitPattern);
      intro = parts[0].trim();

      if (parts.length > 1) {
        details = parts.slice(1).map(part => part.trim().replace(/•/g, '<br>•')).join('<br><br>');
      }
    }
    if (!intro) {
      intro = isAr 
        ? (verdict === 'safe' ? `🛡️ يبدو ${cleanName} آمناً ويستخدم الأذونات المتوقعة فقط.` : `⚠️ تحليل ${cleanName} جاهز. انظر التفاصيل أدناه.`)
        : (verdict === 'safe' ? `🛡️ ${cleanName} appears safe and uses expected permissions only.` : `⚠️ ${cleanName} analysis is ready. See details below.`);
    }
    
    if (!details) {
      details = isAr 
        ? `<strong>البيانات الفنية:</strong><br>• إجمالي الأذونات: ${row.permission_count || 0}<br>• فئة الخطورة: ${rsLevelKey}`
        : `<strong>Technical Data:</strong><br>• Total Permissions: ${row.permission_count || 0}<br>• Risk Category: ${rsLevelKey}`;
    }
    return { intro, details };
  }

  
  const enRes = splitText(fullAnalysisEn, false);
  const arRes = splitText(fullAnalysisAr, true);

  return {
    name: cleanName,
    rawName: row.app_name,
    publisher: (row.category || '').replace(/_/g, ' '),
    version: '—',
    cat: { en:(row.category||'').replace(/_/g,' '), ar:(row.category||'').replace(/_/g,' ') },
    date: '2025',
    rs: parseFloat(row.rs) || 0,
    rsLevelKey,
    verdict,
    permissions,
    rawCategory: row.category,

    comment: {
      en: enRes.intro,
      ar: arRes.intro
    },
    details: {
      en: enRes.details,
      ar: arRes.details
    }
  };
}




// ════════════════════════════════════════
// SUPABASE FETCH
// ════════════════════════════════════════
async function fetchApp(name) {
  const q = sanitize(name);
  if (!q) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/app_analysis?app_name=ilike.*${encodeURIComponent(q)}*&limit=1&select=*`;
    const res  = await fetch(url, { headers: HEADERS });
    if (res.ok) {
      const rows = await res.json();
      if (rows && rows.length > 0) return rowToApp(rows[0]);
    }
    return null;
  } catch(e) {
    console.error('fetchApp error:', e);
    return null;
  }
}

async function fetchAppById(appId) {
  if (!appId || appId.endsWith('-queued')) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/app_analysis?app_id=eq.${encodeURIComponent(appId)}&limit=1&select=*`;
    const res  = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows && rows.length > 0 ? rowToApp(rows[0]) : null;
  } catch(e) {
    console.error('fetchAppById error:', e);
    return null;
  }
}

async function fetchAppByRaw(rawName) {
  const url = `${SUPABASE_URL}/rest/v1/app_analysis?app_name=eq.${encodeURIComponent(rawName)}&limit=1&select=*`;
  try {
    const res  = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows && rows.length > 0 ? rowToApp(rows[0]) : null;
  } catch { return null; }
}

async function fetchSafeAlternatives(category, excludeRaw) {
  if (!category) return [];
  const url = `${SUPABASE_URL}/rest/v1/app_analysis?category=eq.${encodeURIComponent(category)}&final_decision=ilike.*safe*&app_name=neq.${encodeURIComponent(excludeRaw)}&limit=3&select=app_name,rs,rs_level,final_decision`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    return res.ok ? await res.json() : [];
  } catch { return []; }
}

async function searchMSStore(query) { return []; }

// ════════════════════════════════════════
// LIVE DROPDOWN
// ════════════════════════════════════════
let liveTimer = null;
let dropdown  = null;
let currentStoreResults = [];
let lastSelectedStore   = null;

function initLiveSearch() {
  const input = document.getElementById('appInput');
  if (!input) return;

  dropdown = document.createElement('div');
  dropdown.id = 'liveDropdown';
  dropdown.style.cssText = `
    position:absolute;top:100%;left:0;right:0;z-index:300;
    background:var(--surface);border:1px solid var(--border2);
    border-radius:0 0 16px 16px;overflow:hidden;
    box-shadow:0 8px 28px rgba(0,0,0,0.22);display:none;`;
  input.parentElement.style.position = 'relative';
  input.parentElement.appendChild(dropdown);

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(liveTimer);
    lastSelectedStore = null;
    if (q.length < 2) { dropdown.style.display = 'none'; return; }
    liveTimer = setTimeout(() => triggerLiveSearch(q), 350);
  });

  document.addEventListener('click', e => {
    if (!input.parentElement.contains(e.target)) dropdown.style.display = 'none';
  });
}

async function triggerLiveSearch(q) {
  const dbResults = await searchSupabaseNames(q);
  currentStoreResults = [];
  renderDropdown(dbResults, [], q);
}

async function searchSupabaseNames(q) {
  const url = `${SUPABASE_URL}/rest/v1/app_analysis?app_name=ilike.*${encodeURIComponent(sanitize(q))}*&limit=4&select=app_name,final_decision`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    return res.ok ? await res.json() : [];
  } catch { return []; }
}

function renderDropdown(dbResults, storeResults, q) {
  if (!dbResults || !dbResults.length) { dropdown.style.display = 'none'; return; }

  const html = dbResults.map(r => {
    const name  = cleanAppName(r.app_name);
    const color = fdColor(r.final_decision);
    const raw   = r.app_name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    const safe  = name.replace(/'/g,"\\'");
    const displayFd = (r.final_decision || '').toLowerCase() === 'normal'
      ? (L() === 'ar' ? 'خطر متوسط' : 'Moderate Risk')
      : r.final_decision;
    return `<div onclick="selectFromDropdown('${raw}','${safe}')"
      style="padding:11px 16px;cursor:pointer;display:flex;justify-content:space-between;
      align-items:center;border-bottom:0.5px solid var(--border);transition:background .15s;"
      onmouseover="this.style.background='var(--surface2)'"
      onmouseout="this.style.background=''">
      <span style="font-size:14px;font-weight:500;">${name}</span>
      <span style="font-size:11px;font-weight:700;color:${color};">${displayFd}</span>
    </div>`;
  }).join('');

  dropdown.innerHTML = html;
  dropdown.style.display = 'block';
}

function selectFromDropdown(rawName, cleanName) {
  document.getElementById('appInput').value = cleanName;
  if (dropdown) dropdown.style.display = 'none';
  runSearchByRaw(rawName);
}

// ════════════════════════════════════════
// SAFE ALTERNATIVES
// ════════════════════════════════════════
async function showAlternatives(category, excludeRaw, container, verdict) {
  const alts = await fetchSafeAlternatives(category, excludeRaw);
  if (!alts.length) return;

  const isHigh    = verdict === 'highrisk';
  const isAnomaly = verdict === 'anomaly';
  const icon      = isHigh ? '🚨' : isAnomaly ? '⚠️' : '💡';
  const titleEn   = isHigh    ? 'Safer Alternatives — Strongly Recommended'
                  : isAnomaly ? 'Safer Alternatives — Consider Switching'
                  :             'Safer Alternatives Available';
  const titleAr   = isHigh    ? 'بدائل أكثر أماناً — موصى بها بشدة'
                  : isAnomaly ? 'بدائل أكثر أماناً — ننصح بالتبديل'
                  :             'بدائل أكثر أماناً متاحة';
  const subEn     = isHigh    ? 'These apps do the same job with a Safe rating and far fewer privacy risks.'
                  : isAnomaly ? 'These apps share the same category and carry significantly lower risk.'
                  :             'These apps in the same category have a cleaner privacy profile.';
  const subAr     = isHigh    ? 'هذه التطبيقات تؤدي نفس المهمة بتقييم آمن ومخاطر خصوصية أقل بكثير.'
                  : isAnomaly ? 'هذه التطبيقات في نفس الفئة وتحمل مخاطر أقل بكثير.'
                  :             'هذه التطبيقات في نفس الفئة ولديها ملف خصوصية أنظف.';
  const borderColor = isHigh ? 'rgba(239,68,68,0.3)' : isAnomaly ? 'rgba(249,115,22,0.3)' : 'rgba(34,197,94,0.3)';

  const html = `
    <div style="background:var(--surface);border:0.5px solid ${borderColor};
      border-radius:22px;padding:28px;margin-top:16px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
        <span style="font-size:22px;">${icon}</span>
        <div>
          <div style="font-family:var(--font-display);font-size:16px;font-weight:700;">
            ${t(titleEn, titleAr)}
          </div>
          <div style="font-size:13px;color:var(--muted);margin-top:3px;">${t(subEn, subAr)}</div>
        </div>
      </div>
      ${alts.map(a => {
          const name = cleanAppName(a.app_name);
          const raw  = a.app_name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
          const safe = name.replace(/'/g,"\\'");
          const rsVal = parseFloat(a.rs).toFixed(2);

         return `<div onclick="document.getElementById('appInput').value='${safe}';runSearchByRaw('${raw}');"
         style="display:flex;justify-content:space-between;align-items:center;
         padding:12px 16px;margin-bottom:8px;border-radius:12px;cursor:pointer;
         background:rgba(34,197,94,0.07);border:0.5px solid rgba(34,197,94,0.2);transition:all .2s;"
         onmouseover="this.style.background='rgba(34,197,94,0.14)'"
         onmouseout="this.style.background='rgba(34,197,94,0.07)'">
    
       <span style="font-size:14px;font-weight:500;">${name}</span>

       <span style="font-size:12px;color:#22c55e;font-weight:700;">
         RS ${rsVal} · ${t('Safe','آمن')} ✅
       </span>

        </div>`;
    }).join('')}
      <div style="margin-top:14px;font-size:12px;color:var(--muted);text-align:center;">
        ${t('Click any app above to check its full privacy report','انقر على أي تطبيق أعلاه لعرض تقرير الخصوصية الكامل')}
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', html);
}

// ════════════════════════════════════════
// RUN SEARCH
// ════════════════════════════════════════
async function runSearchByRaw(rawName) {
  const wrap  = document.getElementById('results');
  const inner = document.getElementById('resultsInner');
  wrap.style.display = 'block';
  inner.innerHTML = `<div class="loading"><div class="spinner"></div>
    <span style="color:var(--muted);font-size:14px;">
      ${t('Scanning database...','جاري البحث في قاعدة البيانات...')}
    </span></div>`;
  wrap.scrollIntoView({ behavior:'smooth', block:'start' });
  if (window._winnyLaunch) window._winnyLaunch();

  let d = await fetchAppByRaw(rawName);
  if (!d) d = await fetchApp(rawName);
  if (d) {
    inner.innerHTML = buildResult(d);
    animateRs(d.rs);
    setWinny('done', d.name, d.verdict);
    if (d.verdict !== 'safe') showAlternatives(d.rawCategory, d.rawName, inner, d.verdict);
  } else {
    inner.innerHTML = buildNotFound(rawName);
    setWinny('notfound', rawName);
  }
}

// ════════════════════════════════════════
// NOT FOUND
// ════════════════════════════════════════
function buildNotFound(name) {
  const Lv      = typeof lang !== 'undefined' ? lang : 'en';
  const display = cleanAppName(name) || sanitize(name);
  const safeName = sanitize(display).replace(/'/g, "\\'");

  return `<div class="result-card" style="text-align:center;padding:48px 32px;">
    <div style="font-size:48px;margin-bottom:16px;">🔍</div>
    <div style="font-family:var(--font-display);font-size:22px;font-weight:700;margin-bottom:10px;">
      ${Lv === 'ar' ? 'التطبيق غير موجود في قاعدة البيانات' : 'App not found in database'}
    </div>
    <div style="color:var(--muted);font-size:14px;max-width:420px;margin:0 auto 28px;line-height:1.6;">
      <strong style="color:var(--text);">"${sanitize(display)}"</strong>
      ${Lv === 'ar' ? ' غير موجود في قاعدة بياناتنا بعد.' : " isn't in our database yet."}
    </div>
    <button onclick="startAnalysisJob('${safeName}', '')"
      style="background:var(--accent);color:white;border:none;cursor:pointer;
      padding:14px 36px;border-radius:30px;font-family:inherit;font-size:15px;font-weight:700;
      display:block;margin:0 auto 12px;transition:background .2s;"
      onmouseover="this.style.background='var(--accent2)'"
      onmouseout="this.style.background='var(--accent)'">
      ⚡ ${Lv === 'ar' ? 'تحليل الآن' : 'Analyze Now'}
    </button>
    <div style="font-size:12px;color:var(--muted);margin-bottom:28px;">
      ${Lv === 'ar'
        ? 'سيتم تحليل التطبيق وعرض النتائج خلال دقائق'
        : 'The app will be analyzed and results shown within minutes'}
    </div>
    <div class="winny-comment" style="text-align:${Lv==='ar'?'right':'left'};">
      <svg width="36" height="36" viewBox="0 0 36 36" style="flex-shrink:0">
        <rect width="36" height="36" rx="10" fill="rgba(79,143,255,0.15)"/>
        <path d="M18 7l-7 3.5v5c0 4.4 2.8 8.5 7 9.5 4.2-1 7-5.1 7-9.5v-5L18 7z" fill="#4f8fff"/>
        <path d="M15 17.5l2.5 2.5 5-5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p>${Lv === 'ar'
        ? 'لم أجده بعد! اضغط <strong>تحليل الآن</strong> وسأعالجه وأعرض لك النتائج فور الانتهاء 🔍'
        : "Not in my database yet! Click <strong>Analyze Now</strong> and I'll process it and show you the results 🔍"
      }</p>
    </div>
  </div>`;
}

// ════════════════════════════════════════
// REQUEST FORM
// ════════════════════════════════════════
function showRequestForm(searchedName) {
  document.getElementById('resultsInner').innerHTML = `
    <div class="result-card" style="text-align:center;padding:48px 32px;">
      <div style="font-size:48px;margin-bottom:16px;">🔍</div>
      <div style="font-family:var(--font-display);font-size:22px;font-weight:700;margin-bottom:8px;">
        ${t('App Not Found','التطبيق غير موجود')}
      </div>
      <div style="color:var(--muted);font-size:14px;margin-bottom:32px;max-width:420px;margin-inline:auto;">
        <strong style="color:var(--text);">"${sanitize(searchedName)}"</strong>
        ${t(" isn't in our database yet. Request an analysis and we'll notify you by email when it's ready.",
            ' غير موجود بعد. اطلب تحليلاً وسنُعلمك بالبريد الإلكتروني فور جاهزيته.')}
      </div>
      <div style="max-width:420px;margin:0 auto;text-align:${L()==='ar'?'right':'left'};">
        <div style="margin-bottom:16px;">
          <label style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:6px;">
            ${t('App Name','اسم التطبيق')}
          </label>
          <input id="reqAppName" value="${sanitize(searchedName)}"
            style="width:100%;background:var(--surface2);border:1px solid var(--border2);
            border-radius:10px;padding:12px 16px;color:var(--text);font-family:inherit;font-size:14px;outline:none;">
        </div>
        <div style="margin-bottom:24px;">
          <label style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:6px;">
            ${t('Your Email','بريدك الإلكتروني')} <span style="color:var(--danger);">*</span>
          </label>
          <input id="reqEmail" type="email" placeholder="${t('you@example.com','أنت@مثال.com')}"
            style="width:100%;background:var(--surface2);border:1px solid var(--border2);
            border-radius:10px;padding:12px 16px;color:var(--text);font-family:inherit;font-size:14px;outline:none;">
          <div style="font-size:11px;color:var(--muted);margin-top:6px;">
            ${t("We'll email you once the analysis is ready. No spam, ever.",
                'سنرسل لك بريداً فور جاهزية التحليل. لا بريد مزعج أبداً.')}
          </div>
        </div>
        <div id="reqError" style="color:var(--danger);font-size:13px;margin-bottom:12px;display:none;"></div>
        <div style="display:flex;gap:12px;">
          <button onclick="submitRequest('${sanitize(searchedName)}')"
            style="flex:1;background:var(--accent);color:white;border:none;cursor:pointer;
            padding:14px 24px;border-radius:30px;font-family:inherit;font-size:14px;font-weight:600;">
            ${t('Request Analysis','طلب التحليل')}
          </button>
          <button onclick="document.getElementById('results').style.display='none'"
            style="background:var(--surface2);color:var(--muted);border:1px solid var(--border);
            cursor:pointer;padding:14px 20px;border-radius:30px;font-family:inherit;font-size:14px;">
            ${t('Cancel','إلغاء')}
          </button>
        </div>
      </div>
    </div>`;
}

function showReqError(msg) {
  const el = document.getElementById('reqError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

async function submitRequest(searchedName) {
  const appName = sanitize(document.getElementById('reqAppName')?.value || '');
  const email   = sanitizeEmail(document.getElementById('reqEmail')?.value || '');
  if (!appName) { showReqError(t('Please enter the app name.','يرجى إدخال اسم التطبيق.')); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showReqError(t('Please enter a valid email address.','يرجى إدخال عنوان بريد إلكتروني صالح.')); return;
  }
  const btn = document.querySelector('[onclick^="submitRequest"]');
  if (btn) { btn.textContent = t('Submitting…','جاري الإرسال…'); btn.disabled = true; }

  const storeId = appName.toLowerCase().replace(/\s+/g,'-') + '-requested';

  try {
    const checkUrl = `${SUPABASE_URL}/rest/v1/user_requests?microsoft_store_id=eq.${encodeURIComponent(storeId)}&requester_email=eq.${encodeURIComponent(email)}&limit=1&select=id`;
    const checkRes = await fetch(checkUrl, { headers: HEADERS });
    const existing = await checkRes.json();
    if (existing && existing.length > 0) { showRequestPending(appName, email); return; }

    await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_app_request`, {
      method:'POST', headers:HEADERS,
      body: JSON.stringify({ p_store_id:storeId, p_app_name:appName })
    });
    await fetch(`${SUPABASE_URL}/rest/v1/user_requests`, {
      method:'POST', headers:{...HEADERS,'Prefer':'return=minimal'},
      body: JSON.stringify({ microsoft_store_id:storeId, requester_email:email })
    });
    showRequestSuccess(appName, email);
  } catch {
    showReqError(t('Something went wrong. Please try again.','حدث خطأ. يرجى المحاولة مرة أخرى.'));
    if (btn) { btn.textContent = t('Request Analysis','طلب التحليل'); btn.disabled = false; }
  }
}

function showRequestPending(appName, email) {
  document.getElementById('resultsInner').innerHTML = `
    <div class="result-card" style="text-align:center;padding:56px 32px;">
      <div style="font-size:56px;margin-bottom:20px;">⏳</div>
      <div style="font-family:var(--font-display);font-size:24px;font-weight:800;margin-bottom:12px;">
        ${t('Already Requested!','تم الطلب مسبقاً!')}
      </div>
      <div style="color:var(--muted);font-size:15px;line-height:1.7;max-width:440px;margin:0 auto 28px;">
        ${t('You\'ve already submitted a request for','لقد أرسلت طلباً مسبقاً لـ')}
        <strong style="color:var(--text);"> ${appName}</strong>
        ${t('using','باستخدام')}
        <strong style="color:var(--accent2);"> ${email}</strong>.
      </div>
      <div style="display:inline-flex;align-items:center;gap:10px;
        background:rgba(79,143,255,0.08);border:0.5px solid rgba(79,143,255,0.25);
        border-radius:14px;padding:16px 24px;margin-bottom:32px;max-width:440px;">
        <span style="font-size:22px;">🛡️</span>
        <span style="font-size:13px;color:var(--muted);text-align:${L()==='ar'?'right':'left'};line-height:1.6;">
          ${t("Don't worry — we are going to process your request as soon as possible.",
              'لا تقلق — سنعالج طلبك في أقرب وقت ممكن.')}
        </span>
      </div>
      <button onclick="document.getElementById('appInput').value='';document.getElementById('results').style.display='none';"
        style="background:var(--accent);color:white;border:none;cursor:pointer;
        padding:12px 28px;border-radius:30px;font-family:inherit;font-size:14px;font-weight:600;">
        ${t('Search Another App','ابحث عن تطبيق آخر')}
      </button>
    </div>`;
  if (window._winnyShowBubble)
    window._winnyShowBubble(t("You already requested this one! I'll let you know when it's ready 📬",
      'لقد طلبت هذا التطبيق من قبل! سأعلمك عندما يكون جاهزاً 📬'), 5000);
}

function showRequestSuccess(appName, email) {
  document.getElementById('resultsInner').innerHTML = `
    <div class="result-card" style="text-align:center;padding:56px 32px;">
      <div style="font-size:56px;margin-bottom:20px;">📬</div>
      <div style="font-family:var(--font-display);font-size:24px;font-weight:800;margin-bottom:12px;">
        ${t('Request Received!','تم استلام الطلب!')}
      </div>
      <div style="color:var(--muted);font-size:15px;line-height:1.7;max-width:440px;margin:0 auto 28px;">
        ${t('Your request for','طلبك لـ')}
        <strong style="color:var(--text);"> ${appName}</strong>
        ${t('has been submitted. We\'ll send a notification to','تم إرساله. سنرسل إشعاراً إلى')}
        <strong style="color:var(--accent2);"> ${email}</strong>
        ${t('as soon as the analysis is added.','بمجرد إضافة التحليل.')}
      </div>
      <div style="display:inline-flex;align-items:center;gap:10px;
        background:rgba(79,143,255,0.08);border:0.5px solid rgba(79,143,255,0.25);
        border-radius:14px;padding:14px 24px;margin-bottom:32px;">
        <span style="font-size:18px;">⏳</span>
        <span style="font-size:13px;color:var(--muted);text-align:${L()==='ar'?'right':'left'};">
          ${t('Most requested apps are prioritised. The more requests, the faster we process it!',
              'يتم إعطاء الأولوية للتطبيقات الأكثر طلباً. كلما زادت الطلبات، كلما أسرعنا!')}
        </span>
      </div>
      <button onclick="document.getElementById('appInput').value='';document.getElementById('results').style.display='none';"
        style="background:var(--accent);color:white;border:none;cursor:pointer;
        padding:12px 28px;border-radius:30px;font-family:inherit;font-size:14px;font-weight:600;">
        ${t('Search Another App','ابحث عن تطبيق آخر')}
      </button>
    </div>`;
  if (window._winnyShowBubble)
    window._winnyShowBubble(t("Request sent! We'll notify you when it's ready 📬",
      'تم إرسال الطلب! سنعلمك عندما يكون جاهزاً 📬'), 5000);
}

// ════════════════════════════════════════
// WINNY AI CHAT
// ════════════════════════════════════════
let chatOpen = false;
let chatMessages = [];
let currentAppContext = null;

function initWinnyChat() {
  const floatEl = document.getElementById('winnyFloat');
  if (!floatEl) return;

  const chatBtn = document.createElement('div');
  chatBtn.id = 'winnyChatBtn';
  chatBtn.innerHTML = `
    <button onclick="toggleWinnyChat()" style="
      background:var(--accent);color:white;border:none;cursor:pointer;
      padding:8px 16px;border-radius:30px;font-family:inherit;font-size:13px;font-weight:600;
      display:flex;align-items:center;gap:6px;box-shadow:0 4px 16px rgba(79,143,255,0.35);
      transition:all .2s;white-space:nowrap;"
      onmouseover="this.style.background='var(--accent2)'"
      onmouseout="this.style.background='var(--accent)'">
      💬 <span id="chatBtnLabel">${t('Chat with Winny','تحدث مع ويني')}</span>
    </button>`;
  floatEl.insertBefore(chatBtn, floatEl.firstChild);

  const chatWin = document.createElement('div');
  chatWin.id = 'winnyChatWindow';
  chatWin.style.cssText = `
    position:fixed;bottom:260px;right:32px;z-index:998;
    width:340px;max-height:480px;
    background:var(--surface);border:1px solid var(--border2);
    border-radius:20px;display:none;flex-direction:column;
    box-shadow:0 16px 48px rgba(0,0,0,0.3);overflow:hidden;`;
  chatWin.innerHTML = `
    <div style="padding:16px 20px;border-bottom:0.5px solid var(--border);
      display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;border-radius:10px;background:rgba(79,143,255,0.15);
          display:flex;align-items:center;justify-content:center;font-size:18px;">🛡️</div>
        <div>
          <div style="font-weight:700;font-size:14px;">${t('Winny','ويني')}</div>
          <div style="font-size:11px;color:var(--safe);">● ${t('Online','متصل')}</div>
        </div>
      </div>
      <button onclick="toggleWinnyChat()" style="background:none;border:none;cursor:pointer;
        color:var(--muted);font-size:18px;padding:4px;">✕</button>
    </div>
    <div id="chatMessages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;max-height:320px;"></div>
    <div style="padding:12px;border-top:0.5px solid var(--border);display:flex;gap:8px;">
      <input id="chatInput" placeholder="${t('Ask Winny anything...','اسأل ويني أي شيء...')}"
        style="flex:1;background:var(--surface2);border:1px solid var(--border2);border-radius:20px;
        padding:10px 16px;color:var(--text);font-family:inherit;font-size:13px;outline:none;"
        onkeydown="if(event.key==='Enter')sendChatMessage()">
      <button onclick="sendChatMessage()" style="background:var(--accent);color:white;border:none;
        cursor:pointer;padding:10px 16px;border-radius:20px;font-size:13px;font-weight:600;
        white-space:nowrap;">${t('Send','إرسال')}</button>
    </div>`;
  document.body.appendChild(chatWin);

  addChatMessage('winny', t(
    "Hi! I'm <strong>Winny</strong> 👋 I can help you understand app privacy scores, permissions, and how WinPrivacy works. What would you like to know?",
    "مرحباً! أنا <strong>ويني</strong> 👋 يمكنني مساعدتك في فهم درجات خصوصية التطبيقات والأذونات وكيفية عمل WinPrivacy. ماذا تريد أن تعرف؟"
  ));
}

function toggleWinnyChat() {
  const win = document.getElementById('winnyChatWindow');
  if (!win) return;
  chatOpen = !chatOpen;
  win.style.display = chatOpen ? 'flex' : 'none';
  if (chatOpen) {
    document.getElementById('chatInput')?.focus();
    const lbl = document.getElementById('chatBtnLabel');
    if (lbl) lbl.textContent = t('Close Chat','إغلاق الدردشة');
  } else {
    const lbl = document.getElementById('chatBtnLabel');
    if (lbl) lbl.textContent = t('Chat with Winny','تحدث مع ويني');
  }
}

function addChatMessage(role, html) {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  const isWinny = role === 'winny';
  const div = document.createElement('div');
  div.style.cssText = `display:flex;justify-content:${isWinny?'flex-start':'flex-end'};`;
  div.innerHTML = `
    <div style="max-width:85%;padding:10px 14px;border-radius:${isWinny?'4px 16px 16px 16px':'16px 4px 16px 16px'};
      background:${isWinny?'var(--surface2)':'var(--accent)'};
      color:${isWinny?'var(--text)':'white'};font-size:13px;line-height:1.6;">
      ${html}
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  chatMessages.push({ role: isWinny ? 'assistant' : 'user', content: html.replace(/<[^>]*>/g,'') });
}

function addTypingIndicator() {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.id = 'typingIndicator';
  div.style.cssText = 'display:flex;justify-content:flex-start;';
  div.innerHTML = `
    <div style="padding:10px 14px;border-radius:4px 16px 16px 16px;background:var(--surface2);">
      <span style="display:inline-flex;gap:4px;align-items:center;">
        <span style="width:6px;height:6px;border-radius:50%;background:var(--muted);animation:bounce 0.6s infinite;"></span>
        <span style="width:6px;height:6px;border-radius:50%;background:var(--muted);animation:bounce 0.6s 0.15s infinite;"></span>
        <span style="width:6px;height:6px;border-radius:50%;background:var(--muted);animation:bounce 0.6s 0.3s infinite;"></span>
      </span>
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTypingIndicator() {
  document.getElementById('typingIndicator')?.remove();
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const message = input.value.trim();
  if (!message) return;
  input.value = '';

  addChatMessage('user', message);
  addTypingIndicator();

  let appContext = '';
  if (currentAppContext) {
    appContext = `The user is currently viewing: ${currentAppContext.name}
      (RS Score: ${currentAppContext.rs}/4, Verdict: ${currentAppContext.verdict},
      Category: ${currentAppContext.cat?.en},
      Permissions: ${currentAppContext.permissions?.map(p=>p.name.en).join(', ')}).`;
  }

  const systemPrompt = `You are Winny, the friendly AI assistant for WinPrivacy — a Windows application privacy analysis tool.
Your job is to help users understand:
- What their app's privacy risk score means (RS score 0-4 scale)
- What permissions mean and why they matter
- How the scoring works
- How to use the WinPrivacy website
- What Safe, Moderate Risk, Anomaly Detected, and High Risk verdicts mean
- General Windows app privacy questions

${appContext}

STRICT RULES:
- Only answer questions related to WinPrivacy, app privacy, Windows permissions, and cybersecurity
- If asked about anything unrelated, politely say you can only help with WinPrivacy-related topics
- Be friendly, concise, and clear — use simple language for non-technical users
- If the user writes in Arabic, respond fully in Arabic
- If the user writes in English, respond fully in English
- Never make up app scores or data you don't have
- Keep responses under 150 words`;

  try {
    const apiKey = (typeof CONFIG !== 'undefined' && CONFIG.ANTHROPIC_KEY) ? CONFIG.ANTHROPIC_KEY : '';
    if (!apiKey) {
      removeTypingIndicator();
      addChatMessage('winny', t(
        'Chat is not configured yet. Add ANTHROPIC_KEY to js/config.js.',
        'لم يتم إعداد الدردشة بعد.'
      ));
      return;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: [
          ...chatMessages.slice(-6).map(m => ({ role:m.role, content:m.content })),
          { role:'user', content:message }
        ]
      })
    });

    removeTypingIndicator();
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    const reply = data.content?.[0]?.text || t('Sorry, I had trouble responding.','عذراً، واجهت مشكلة في الرد.');
    addChatMessage('winny', reply);

  } catch(e) {
    removeTypingIndicator();
    addChatMessage('winny', t(
      'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
      'عذراً، أواجه مشكلة في الاتصال الآن. يرجى المحاولة بعد قليل.'
    ));
  }
}

function updateChatContext(appData) { currentAppContext = appData; }

// ════════════════════════════════════════
// INIT
// ════════════════════════════════════════
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLiveSearch);
} else {
  initLiveSearch();
}

// ════════════════════════════════════════
// NORMALIZE APP NAME (before sending to worker)
// ════════════════════════════════════════
function normalizeAppName(name) {
  // 1. Trim and collapse spaces
  let n = name.trim().replace(/\s+/g, ' ');
  // 2. Title case
  n = n.replace(/\b\w/g, c => c.toUpperCase());
  // 3. Common corrections
  const corrections = {
    'Whatsapp':       'WhatsApp',
    'Watsapp':        'WhatsApp',
    'Whats App':      'WhatsApp',
    'You Tube':       'YouTube',
    'Youtube':        'YouTube',
    'Tiktok':         'TikTok',
    'Tick Tock':      'TikTok',
    'Notpad':         'Notepads App',
    'Notepad App':    'Notepads App',
    'Vlc':            'VLC',
    'Itunes':         'iTunes',
    'I Tunes':        'iTunes',
    'Ms Teams':       'Microsoft Teams',
    'Microsof Teams': 'Microsoft Teams',
    'Adobe Reader':   'Adobe Acrobat Reader',
  };
  for (const [wrong, right] of Object.entries(corrections)) {
    if (n.toLowerCase() === wrong.toLowerCase()) return right;
  }
  return n;
}

// ════════════════════════════════════════
// ANALYSIS JOBS — queue + polling
// ════════════════════════════════════════
async function queueAnalysisJob(appName, storeId) {
  // Normalize before sending to worker
  const normalizedName = normalizeAppName(appName);
  if (normalizedName !== appName) {
    console.log(`[WinPrivacy] Name normalized: "${appName}" → "${normalizedName}"`);
  }
  appName = normalizedName;
  const q = sanitize(appName);

  try {
    const res  = await fetch(
      `${SUPABASE_URL}/rest/v1/analysis_jobs?app_name=ilike.*${encodeURIComponent(q)}*&status=in.(queued,processing)&limit=1&select=job_id`,
      { headers: HEADERS }
    );
    const rows = await res.json();
    if (rows && rows.length > 0) {
      console.log('Job already exists:', rows[0].job_id);
      return rows[0].job_id;
    }
  } catch(e) {}

  const storeIdClean = (storeId && !storeId.endsWith('-requested') && !storeId.endsWith('-queued'))
    ? storeId
    : appName.toLowerCase().replace(/\s+/g, '-') + '-queued';

  const res = await fetch(`${SUPABASE_URL}/rest/v1/analysis_jobs`, {
    method:  'POST',
    headers: { ...HEADERS, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      microsoft_store_id: storeIdClean,
      app_name:           appName,
      status:             'queued',
      progress:           0,
      message:            'Waiting in queue...'
    })
  });

  if (!res.ok) throw new Error(`Failed to queue: ${res.status}`);
  const rows = await res.json();
  return rows[0]?.job_id || null;
}

async function pollJobStatus(jobId, appName) {
  const maxWait = 10 * 60 * 1000;
  const start   = Date.now();

  const timer = setInterval(async () => {
    if (Date.now() - start > maxWait) {
      clearInterval(timer);
      showJobProgress(appName, -1,
        'Analysis timed out. Please try again later.',
        'انتهت مهلة التحليل. يرجى المحاولة لاحقاً.');
      return;
    }

    try {
      const res  = await fetch(
        `${SUPABASE_URL}/rest/v1/analysis_jobs?job_id=eq.${jobId}&select=status,progress,message,error_detail`,
        { headers: HEADERS }
      );
      const rows = await res.json();
      const job  = rows && rows[0];
      if (!job) return;

      showJobProgress(appName, job.progress, job.message, job.message);

      if ((job.status === 'done' || job.status === 'complete')) {
        clearInterval(timer);

        const jobRes = await fetch(
          `${SUPABASE_URL}/rest/v1/analysis_jobs?job_id=eq.${jobId}&select=microsoft_store_id`,
          { headers: HEADERS }
        );
        const jobRows = jobRes.ok ? await jobRes.json() : [];
        const realStoreId = jobRows[0]?.microsoft_store_id || '';

        await new Promise(r => setTimeout(r, 3000));

        let d = null;
        for (let attempt = 0; attempt < 6; attempt++) {
          if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
          if (realStoreId && !realStoreId.endsWith('-queued')) {
            d = await fetchAppById(realStoreId);
            if (d) break;
          }
          const terms = [appName, appName.split(' ')[0]];
          for (const term of terms) {
            d = await fetchApp(term);
            if (d) break;
          }
          if (d) break;
        }

        const inner = document.getElementById('resultsInner');
        if (d) {
          inner.innerHTML = buildResult(d);
          animateRs(d.rs);
          setWinny('done', d.name, d.verdict);
          if (d.verdict !== 'safe') showAlternatives(d.rawCategory, d.rawName, inner, d.verdict);
          if (window.updateChatContext) updateChatContext(d);
        } else {
          const Lv = typeof lang !== 'undefined' ? lang : 'en';
          inner.innerHTML = `<div class="result-card" style="text-align:center;padding:48px 32px;">
            <div style="font-size:48px;margin-bottom:16px;">✅</div>
            <div style="font-family:var(--font-display);font-size:20px;font-weight:700;margin-bottom:12px;">
              ${Lv==='ar' ? 'اكتمل التحليل!' : 'Analysis Complete!'}
            </div>
            <div style="color:var(--muted);font-size:14px;margin-bottom:24px;">
              ${Lv==='ar' ? 'تم تحليل التطبيق. ابحث عنه الآن.' : 'App analyzed successfully. Search for it now.'}
            </div>
            <button onclick="document.getElementById('appInput').value='${appName}';runSearch();"
              style="background:var(--accent);color:white;border:none;cursor:pointer;
              padding:12px 28px;border-radius:30px;font-family:inherit;font-size:14px;font-weight:600;">
              🔍 ${Lv==='ar' ? 'عرض النتائج' : 'View Results'}
            </button>
          </div>`;
        }

      } else if ((job.status === 'failed' || job.status === 'error')) {
        clearInterval(timer);
        const isAr  = (typeof lang !== 'undefined' ? lang : 'en') === 'ar';
        const errMsg = (job.message || '').toLowerCase();
        const inner  = document.getElementById('resultsInner');

        let icon, title, body, tip, btnLabel, btnAction;

        if (errMsg.includes('not available on the ms store') ||
            errMsg.includes('all strategies failed') ||
            errMsg.includes('no package found') ||
            errMsg.includes('could not download')) {
          icon      = '🖥️';
          title     = isAr ? 'التطبيق غير متوفر في متجر مايكروسوفت' : 'Not a Microsoft Store App';
          body      = isAr
            ? `يبدو أن <strong>${appName}</strong> تطبيق ويندوز تقليدي (Win32) وليس من متجر مايكروسوفت. يحلل WinPrivacy تطبيقات المتجر فقط حالياً.`
            : `<strong>${appName}</strong> appears to be a traditional Windows app (Win32), not available on the Microsoft Store. WinPrivacy currently analyzes Store apps only.`;
          tip       = isAr
            ? '💡 جرّب البحث عن نسخة المتجر — كثير من التطبيقات لها نسختان مثل "VLC for Windows Store"'
            : '💡 Try the Store version — many apps have both editions, e.g. "VLC for Windows Store"';
          btnLabel  = isAr ? '🔍 ابحث مجدداً' : '🔍 Search Again';
          btnAction = `document.getElementById('appInput').value='';document.getElementById('appInput').focus();`;

        } else if (errMsg.includes('extraction failed') ||
                   errMsg.includes('could not read package')) {
          icon      = '⚙️';
          title     = isAr ? 'تعذّر قراءة بيانات التطبيق' : 'Could Not Read App Data';
          body      = isAr
            ? `واجهنا مشكلة أثناء فحص ملفات <strong>${appName}</strong>. قد يكون التطبيق محمياً أو تالفاً.`
            : `We had trouble reading <strong>${appName}</strong>'s package files. The app may be protected or corrupted.`;
          tip       = isAr
            ? '💡 حاول مرة أخرى — أو تواصل معنا عبر "إرسال طلب" إذا تكررت المشكلة'
            : '💡 Try again — or use "Submit App" if the problem persists';
          btnLabel  = isAr ? '🔄 حاول مجدداً' : '🔄 Try Again';
          btnAction = `document.getElementById('appInput').value='${appName}';runSearch();`;

        } else if (errMsg.includes('scoring failed') ||
                   errMsg.includes('database save')) {
          icon      = '📊';
          title     = isAr ? 'خطأ في حساب درجة الخطورة' : 'Scoring Error';
          body      = isAr
            ? `تم تحليل <strong>${appName}</strong> بنجاح لكن حدث خطأ أثناء حفظ النتائج. يرجى المحاولة مجدداً.`
            : `<strong>${appName}</strong> was analyzed but we hit an error saving the results. Please try again.`;
          tip       = isAr
            ? '💡 المشكلة مؤقتة — حاول مرة أخرى بعد لحظات'
            : '💡 This is likely temporary — try again in a moment';
          btnLabel  = isAr ? '🔄 حاول مجدداً' : '🔄 Try Again';
          btnAction = `document.getElementById('appInput').value='${appName}';runSearch();`;

        } else {
          icon      = '❓';
          title     = isAr ? 'حدث خطأ غير متوقع' : 'Something Went Wrong';
          body      = isAr
            ? `لم نتمكن من تحليل <strong>${appName}</strong> في هذه المرة. قد يكون الاسم غير دقيق أو التطبيق غير مدعوم.`
            : `We couldn't analyze <strong>${appName}</strong> this time. The name may be incorrect or the app may not be supported.`;
          tip       = isAr
            ? '💡 تأكد من كتابة الاسم كما يظهر في متجر مايكروسوفت'
            : '💡 Make sure the name matches exactly as it appears in the Microsoft Store';
          btnLabel  = isAr ? '🔍 ابحث مجدداً' : '🔍 Try Again';
          btnAction = `document.getElementById('appInput').value='${appName}';document.getElementById('appInput').focus();`;
        }

        inner.innerHTML = `
          <div class="result-card" style="text-align:center;padding:48px 32px;">
            <div style="font-size:56px;margin-bottom:16px;">${icon}</div>
            <div style="font-family:var(--font-display);font-size:22px;font-weight:800;
                        margin-bottom:14px;color:var(--text);">${title}</div>
            <div style="color:var(--muted);font-size:15px;line-height:1.7;
                        margin-bottom:16px;max-width:520px;margin-left:auto;margin-right:auto;">
              ${body}
            </div>
            <div style="background:rgba(79,143,255,0.07);border:1px solid rgba(79,143,255,0.2);
                        border-radius:14px;padding:14px 20px;font-size:13px;color:var(--muted);
                        margin-bottom:28px;max-width:520px;margin-left:auto;margin-right:auto;
                        text-align:${isAr ? 'right' : 'left'};">
              ${tip}
            </div>
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
              <button onclick="${btnAction}"
                style="background:var(--accent);color:white;border:none;cursor:pointer;
                       padding:12px 28px;border-radius:30px;font-family:inherit;
                       font-size:14px;font-weight:600;transition:background .2s;"
                onmouseover="this.style.background='var(--accent2)'"
                onmouseout="this.style.background='var(--accent)'">
                ${btnLabel}
              </button>
              <button onclick="document.getElementById('submitSection')?.scrollIntoView({behavior:'smooth'})"
                style="background:transparent;color:var(--accent);border:1.5px solid var(--accent);
                       cursor:pointer;padding:12px 28px;border-radius:30px;font-family:inherit;
                       font-size:14px;font-weight:600;transition:all .2s;"
                onmouseover="this.style.background='rgba(79,143,255,0.08)'"
                onmouseout="this.style.background='transparent'">
                ${isAr ? '📩 إرسال طلب تحليل' : '📩 Request Analysis'}
              </button>
            </div>
          </div>`;
      }

    } catch(e) { console.error('Poll error:', e); }
  }, 3000);
}

function showJobProgress(appName, progress, msgEn, msgAr) {
  const Lv     = typeof lang !== 'undefined' ? lang : 'en';
  const failed = progress === -1;
  const pct    = failed ? 0 : progress;
  const msg    = Lv === 'ar' ? msgAr : msgEn;

  const estTime =
    pct < 20 ? (Lv==='ar' ? '~4 دقائق متبقية'  : '~4 min remaining') :
    pct < 50 ? (Lv==='ar' ? '~3 دقائق متبقية'  : '~3 min remaining') :
    pct < 75 ? (Lv==='ar' ? '~2 دقيقة متبقية'  : '~2 min remaining') :
    pct < 90 ? (Lv==='ar' ? '~دقيقة متبقية'    : '~1 min remaining') :
               (Lv==='ar' ? 'اكتمل تقريباً!'   : 'Almost done!');

  const steps = [
    { label: Lv==='ar' ? '⬇️ التنزيل'     : '⬇️ Downloading',  t: 10 },
    { label: Lv==='ar' ? '📦 الاستخراج'   : '📦 Extracting',   t: 40 },
    { label: Lv==='ar' ? '🔍 فحص الـ API' : '🔍 Scanning APIs',t: 65 },
    { label: Lv==='ar' ? '📊 الحساب'      : '📊 Scoring',      t: 85 },
    { label: Lv==='ar' ? '💾 الحفظ'       : '💾 Saving',       t: 95 },
  ];

  const stepsHtml = steps.map(s => {
    const done   = pct > s.t;
    const active = pct >= s.t - 25 && pct <= s.t;
    const color  = done ? 'var(--safe)' : active ? 'var(--accent)' : 'var(--muted)';
    const bg     = done ? 'rgba(34,197,94,0.1)' : active ? 'rgba(79,143,255,0.12)' : 'transparent';
    return `<span style="font-size:12px;padding:6px 14px;border-radius:20px;border:0.5px solid ${color};color:${color};background:${bg};">${s.label}</span>`;
  }).join('');

  document.getElementById('resultsInner').innerHTML = `
    <div class="result-card" style="padding:48px 32px;text-align:center;">
      <div style="font-size:${failed?'48':'40'}px;margin-bottom:16px;">${failed ? '❌' : '⚙️'}</div>
      <div style="font-family:var(--font-display);font-size:20px;font-weight:800;margin-bottom:8px;">
        ${failed
          ? (Lv==='ar' ? 'فشل التحليل' : 'Analysis Failed')
          : (Lv==='ar' ? `جاري تحليل <em>${appName}</em>` : `Analyzing <em>${appName}</em>`)}
      </div>
      <div style="color:var(--muted);font-size:14px;margin-bottom:32px;">${msg}</div>
      ${!failed ? `
        <div style="max-width:480px;margin:0 auto 12px;">
          <div style="background:var(--surface2);border-radius:30px;height:12px;overflow:hidden;">
            <div style="height:100%;border-radius:30px;background:linear-gradient(90deg,var(--accent),var(--accent2));width:${pct}%;transition:width 0.8s ease;"></div>
          </div>
        </div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:20px;">${pct}% — ${estTime}</div>
        <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">${stepsHtml}</div>
      ` : `
        <button onclick="document.getElementById('appInput').value='${appName}';runSearch();"
          style="background:var(--accent);color:white;border:none;cursor:pointer;
          padding:12px 28px;border-radius:30px;font-family:inherit;font-size:14px;font-weight:600;">
          ${Lv==='ar' ? 'حاول مرة أخرى' : 'Try Again'}
        </button>
      `}
      <div style="margin-top:24px;font-size:12px;color:var(--muted);">
        ${Lv==='ar' ? '🔒 لا تغلق هذه الصفحة.' : '🔒 Keep this page open.'}
      </div>
    </div>`;
}

async function startAnalysisJob(appName, storeId) {
  const Lv   = typeof lang !== 'undefined' ? lang : 'en';
  const wrap = document.getElementById('results');
  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showJobProgress(appName, 0, 'Queueing your request...', 'جاري إضافة طلبك...');

  try {
    const jobId = await queueAnalysisJob(appName, storeId || '');
    if (!jobId) throw new Error('No job ID returned');

    if (window._winnyShowBubble)
      window._winnyShowBubble(
        Lv === 'ar'
          ? 'طلبك في قائمة الانتظار! سأعلمك عند انتهاء التحليل 🔍'
          : "Queued! I'll show you the results when ready 🔍",
        5000
      );

    pollJobStatus(jobId, appName);

  } catch(e) {
    console.error('Queue error:', e);
    showJobProgress(appName, -1,
      'Failed to queue. Please try again.',
      'فشل الإضافة. يرجى المحاولة مرة أخرى.');
  }
}
