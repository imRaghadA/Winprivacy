// ── WinPrivacy Search Engine v2 ──
// Features: MS Store live search, Analyze Now pipeline, Winny AI Chat

const SUPABASE_URL = 'https://mthksiaihxgyesvxxtbt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10aGtzaWFpaHhneWVzdnh4dGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2OTEsImV4cCI6MjA5MjUxNDY5MX0.STu8JYCABANBUkJtKQYYAIg_TVQF5GV-GrsPB2fSI3w';
const ANTHROPIC_KEY = 'YOUR_ANTHROPIC_KEY_HERE'; // replace with your key
const BACKEND_URL   = 'YOUR_BACKEND_URL_HERE';    // e.g. https://winprivacy.onrender.com

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
         v === 'normal+'      ? 'normalplus' :
         v === 'safe'         ? 'safe'       :
         v === 'normal'       ? 'normal'     : 'normal';
}

function verdictColor(verdict) {
  return verdict === 'safe'       ? '#22c55e' :
         verdict === 'normal'     ? '#3b82f6' :
         verdict === 'normalplus' ? '#eab308' :
         verdict === 'anomaly'    ? '#f97316' : '#ef4444';
}

function verdictLabel(verdict) {
  const labels = {
    en: { safe:'Safe', normal:'Normally Detected', normalplus:'Normal+', anomaly:'Anomaly Detected', highrisk:'High Risk' },
    ar: { safe:'آمن', normal:'طبيعي', normalplus:'طبيعي+', anomaly:'شذوذ مكتشف', highrisk:'خطر مرتفع' }
  };
  return (labels[L()] || labels.en)[verdict] || verdict;
}

function fdColor(fd) {
  const v = (fd || '').toLowerCase().trim();
  return v === 'high risk'    ? '#ef4444' :
         v === 'anomaly det.' ? '#f97316' :
         v === 'normal+'      ? '#eab308' :
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
      return { name:{ en:name, ar:name }, icon:meta.icon, risk:meta.risk, level:riskWidth[meta.risk] };
    });
}

// ════════════════════════════════════════
// ROW → APP SHAPE
// ════════════════════════════════════════
function rowToApp(row) {
  const verdict    = mapVerdict(row.final_decision);
  const levelMap   = { 'low':'Low','medium':'Medium','high':'High','very high':'Very High','safe':'Safe/Very Low' };
  const rsLevelKey = levelMap[(row.rs_level||'').toLowerCase()] || 'Medium';
  const cleanName  = cleanAppName(row.app_name || '');
  const riskReason = row.risk_reason && row.risk_reason !== 'None (Typical)' ? row.risk_reason : '';
  const flags      = row.custom_flags && row.custom_flags !== '—' ? row.custom_flags : '';
  const ac         = row.anomalous_count || 0;
  const pc         = row.permission_count || 0;

  let commentEn = row.winny_analysis || '';
  if (!commentEn) {
    if (verdict==='highrisk')   commentEn = `⚠️ <strong>${cleanName}</strong> is flagged HIGH RISK — ${pc} permissions, ${ac} anomalous. Risk triggers: ${riskReason}. ${flags ? 'Custom flags: '+flags+'.' : ''} <strong class="hl">Do not install.</strong>`;
    else if (verdict==='anomaly')    commentEn = `<strong>${cleanName}</strong> reached maximum RS score (3.0) without critical API flags. ${pc} permissions, ${ac} anomalous. Exercise caution.`;
    else if (verdict==='normalplus') commentEn = `<strong>${cleanName}</strong> requests more permissions than most peers in its category (${pc} total, ${ac} elevated). Not critical but worth noting.`;
    else if (verdict==='normal')     commentEn = `<strong>${cleanName}</strong> behaves normally for its category with ${pc} permissions. No anomalies detected.`;
    else                             commentEn = `<strong>${cleanName}</strong> is safe — ${pc} permissions, all within expected range. ✅`;
  }

  return {
    name: cleanName, rawName: row.app_name,
    publisher: (row.category||'').replace(/_/g,' '),
    version: '—',
    cat: { en:(row.category||'').replace(/_/g,' '), ar:(row.category||'').replace(/_/g,' ') },
    date: '2025', rs: parseFloat(row.rs)||0,
    rsLevelKey, verdict, rawCategory: row.category,
    permissions: parsePermissions(row.effective_permissions),
    comment: { en:commentEn, ar:commentEn }
  };
}

// ════════════════════════════════════════
// SUPABASE FETCH
// ════════════════════════════════════════
async function fetchApp(name) {
  const q = sanitize(name);
  if (!q) return null;
  const url = `${SUPABASE_URL}/rest/v1/app_analysis?app_name=ilike.*${encodeURIComponent(q)}*&limit=1&select=*`;
  try {
    const res  = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows && rows.length > 0 ? rowToApp(rows[0]) : null;
  } catch { return null; }
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

// ════════════════════════════════════════
// MICROSOFT STORE SEARCH (via backend)
// ════════════════════════════════════════
async function searchMSStore(query) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/store-search?q=${encodeURIComponent(query)}`, { timeout: 8000 });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

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
  // Always search Supabase DB
  const dbResults = await searchSupabaseNames(q);

  // Only try MS Store if backend is configured
  let storeResults = [];
  if (BACKEND_URL && BACKEND_URL !== 'YOUR_BACKEND_URL_HERE') {
    try {
      storeResults = await Promise.race([
        searchMSStore(q),
        new Promise(resolve => setTimeout(() => resolve([]), 3000)) // 3s timeout
      ]);
    } catch { storeResults = []; }
  }

  currentStoreResults = storeResults;
  renderDropdown(dbResults, storeResults, q);
}

async function searchSupabaseNames(q) {
  const url = `${SUPABASE_URL}/rest/v1/app_analysis?app_name=ilike.*${encodeURIComponent(sanitize(q))}*&limit=4&select=app_name,final_decision`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    return res.ok ? await res.json() : [];
  } catch { return []; }
}

function renderDropdown(dbResults, storeResults, q) {
  let html = '';

  // DB results — already analyzed
  if (dbResults.length > 0) {
    html += `<div style="padding:8px 16px 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--muted);">
      ${t('In Database','في قاعدة البيانات')}
    </div>`;
    html += dbResults.map(r => {
      const name  = cleanAppName(r.app_name);
      const color = fdColor(r.final_decision);
      const raw   = r.app_name.replace(/'/g,"\\'");
      const safe  = name.replace(/'/g,"\\'");
      return `<div onclick="selectFromDropdown('${raw}','${safe}')"
        style="padding:10px 16px;cursor:pointer;display:flex;justify-content:space-between;
        align-items:center;border-bottom:0.5px solid var(--border);transition:background .15s;"
        onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:18px;">✅</span>
          <span style="font-size:14px;font-weight:500;">${name}</span>
        </div>
        <span style="font-size:11px;font-weight:700;color:${color};">${r.final_decision}</span>
      </div>`;
    }).join('');
  }

  // MS Store results — not yet analyzed
  const newStoreResults = storeResults.filter(s =>
    !dbResults.some(d => cleanAppName(d.app_name).toLowerCase() === s.name.toLowerCase())
  );

  if (newStoreResults.length > 0) {
    html += `<div style="padding:8px 16px 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--muted);">
      ${t('From Microsoft Store — Not Analyzed Yet','من متجر مايكروسوفت — لم يُحلَّل بعد')}
    </div>`;
    html += newStoreResults.map((s, i) => {
      const safeName = s.name.replace(/'/g,"\\'");
      const icon = s.iconUrl
        ? `<img src="${s.iconUrl}" style="width:24px;height:24px;border-radius:6px;object-fit:cover;" onerror="this.style.display='none'">`
        : `<span style="font-size:18px;">📦</span>`;
      return `<div onclick="selectStoreApp(${i},'${safeName}')"
        style="padding:10px 16px;cursor:pointer;display:flex;justify-content:space-between;
        align-items:center;border-bottom:0.5px solid var(--border);transition:background .15s;"
        onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
        <div style="display:flex;align-items:center;gap:10px;">
          ${icon}
          <div>
            <div style="font-size:14px;font-weight:500;">${s.name}</div>
            <div style="font-size:11px;color:var(--muted);">${s.publisher}</div>
          </div>
        </div>
        <span style="font-size:11px;padding:3px 10px;border-radius:20px;
          background:rgba(79,143,255,0.12);color:var(--accent);font-weight:600;">
          ${t('Analyze','تحليل')}
        </span>
      </div>`;
    }).join('');
  }

  if (!html) { dropdown.style.display = 'none'; return; }
  dropdown.innerHTML = html;
  dropdown.style.display = 'block';
}

function selectFromDropdown(rawName, cleanName) {
  document.getElementById('appInput').value = cleanName;
  if (dropdown) dropdown.style.display = 'none';
  runSearchByRaw(rawName);
}

function selectStoreApp(index, cleanName) {
  const store = currentStoreResults.filter(s => {
    const dbNames = [];
    return true;
  })[index] || currentStoreResults[index];
  lastSelectedStore = store;
  document.getElementById('appInput').value = cleanName;
  if (dropdown) dropdown.style.display = 'none';
  showAnalyzeNow(store);
}

// ════════════════════════════════════════
// ANALYZE NOW CARD
// ════════════════════════════════════════
function showAnalyzeNow(storeApp) {
  const wrap  = document.getElementById('results');
  const inner = document.getElementById('resultsInner');
  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior:'smooth', block:'start' });

  const icon = storeApp.iconUrl
    ? `<img src="${storeApp.iconUrl}" style="width:64px;height:64px;border-radius:16px;object-fit:cover;">`
    : `<div style="font-size:56px;">📦</div>`;

  inner.innerHTML = `
    <div class="result-card" style="text-align:center;padding:48px 32px;">
      <div style="margin-bottom:16px;">${icon}</div>
      <div style="font-family:var(--font-display);font-size:22px;font-weight:800;margin-bottom:6px;">
        ${storeApp.name}
      </div>
      <div style="color:var(--muted);font-size:13px;margin-bottom:6px;">${storeApp.publisher}</div>
      <div style="color:var(--muted);font-size:13px;max-width:420px;margin:0 auto 28px;line-height:1.6;">
        ${storeApp.description || ''}
      </div>
      <div style="display:inline-flex;align-items:center;gap:10px;
        background:rgba(79,143,255,0.08);border:0.5px solid rgba(79,143,255,0.25);
        border-radius:14px;padding:14px 24px;margin-bottom:28px;">
        <span style="font-size:18px;">🔍</span>
        <span style="font-size:13px;color:var(--muted);text-align:left;line-height:1.6;">
          ${t(
            'This app is not in our database yet. Click below to run a full privacy analysis.',
            'هذا التطبيق غير موجود في قاعدة بياناتنا بعد. اضغط أدناه لإجراء تحليل خصوصية كامل.'
          )}
        </span>
      </div>
      <button onclick="startAnalysis('${storeApp.name.replace(/'/g,"\\'")}','${storeApp.storeId}','')"
        style="background:var(--accent);color:white;border:none;cursor:pointer;
        padding:14px 36px;border-radius:30px;font-family:inherit;font-size:15px;font-weight:700;
        transition:all .2s;display:block;margin:0 auto 12px;"
        onmouseover="this.style.background='var(--accent2)'" onmouseout="this.style.background='var(--accent)'">
        ⚡ ${t('Analyze Now','تحليل الآن')}
      </button>
      <div style="font-size:12px;color:var(--muted);">
        ${t('Estimated time: 2–5 minutes','الوقت المتوقع: 2–5 دقائق')}
      </div>
    </div>`;

  if (window._winnyShowBubble)
    window._winnyShowBubble(
      t(`Found <strong>${storeApp.name}</strong> on the Store! Click Analyze Now to scan it 🔍`,
        `وجدت <strong>${storeApp.name}</strong> في المتجر! اضغط تحليل الآن للفحص 🔍`), 5000);
}

// ════════════════════════════════════════
// ANALYSIS PIPELINE (backend)
// ════════════════════════════════════════
async function startAnalysis(appName, storeId, category) {
  const wrap  = document.getElementById('results');
  const inner = document.getElementById('resultsInner');

  // Show progress UI
  showProgressUI(appName, 0,
    t('Starting analysis...', 'جاري بدء التحليل...'));

  try {
    const res = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName, storeId, category })
    });

    if (!res.ok) throw new Error('Backend unavailable');
    const data = await res.json();

    // Already in DB?
    if (data.existing) {
      const d = rowToApp(data.existing);
      inner.innerHTML = buildResult(d);
      animateRs(d.rs);
      setWinny('done', d.name, d.verdict);
      if (d.verdict === 'highrisk') showAlternatives(d.rawCategory, d.rawName, inner);
      return;
    }

    // Poll for job completion
    pollJob(data.jobId, appName);

  } catch (e) {
    showProgressUI(appName, -1,
      t('Backend server is unavailable. Please try again later.',
        'الخادم غير متاح حالياً. يرجى المحاولة لاحقاً.'));
  }
}

async function pollJob(jobId, appName) {
  const maxWait = 10 * 60 * 1000; // 10 min max
  const start   = Date.now();
  const interval = 3000; // poll every 3s

  const timer = setInterval(async () => {
    if (Date.now() - start > maxWait) {
      clearInterval(timer);
      showProgressUI(appName, -1, t('Analysis timed out. Please try again.', 'انتهت مهلة التحليل. يرجى المحاولة مرة أخرى.'));
      return;
    }

    try {
      const res  = await fetch(`${BACKEND_URL}/api/job/${jobId}`);
      const job  = await res.json();

      showProgressUI(appName, job.progress,
        t(job.message_en, job.message_ar));

      if (job.status === 'done') {
        clearInterval(timer);
        const d = rowToApp(job.result);
        const inner = document.getElementById('resultsInner');
        inner.innerHTML = buildResult(d);
        animateRs(d.rs);
        setWinny('done', d.name, d.verdict);
        if (d.verdict === 'highrisk') showAlternatives(d.rawCategory, d.rawName, inner);
      } else if (job.status === 'failed') {
        clearInterval(timer);
        showProgressUI(appName, -1, t(job.message_en, job.message_ar));
      }
    } catch { /* network blip, keep trying */ }
  }, interval);
}

function showProgressUI(appName, progress, message) {
  const inner = document.getElementById('resultsInner');
  const failed = progress === -1;
  const pct    = failed ? 0 : progress;

  // Estimated time label
  const estTime = pct < 20 ? t('~4 min remaining','~4 دقائق متبقية') :
                  pct < 50 ? t('~3 min remaining','~3 دقائق متبقية') :
                  pct < 75 ? t('~2 min remaining','~2 دقيقة متبقية') :
                  pct < 90 ? t('~1 min remaining','~دقيقة متبقية')   :
                             t('Almost done!','اكتمل تقريباً!');

  inner.innerHTML = `
    <div class="result-card" style="padding:48px 32px;text-align:center;">
      <div style="font-size:${failed?'48':'40'}px;margin-bottom:16px;">${failed?'❌':'⚙️'}</div>
      <div style="font-family:var(--font-display);font-size:20px;font-weight:800;margin-bottom:8px;">
        ${failed
          ? t('Analysis Failed', 'فشل التحليل')
          : t(`Analyzing <em>${appName}</em>`, `جاري تحليل <em>${appName}</em>`)}
      </div>
      <div style="color:var(--muted);font-size:14px;margin-bottom:32px;">${message}</div>

      ${!failed ? `
      <div style="max-width:480px;margin:0 auto 12px;">
        <div style="background:var(--surface2);border-radius:30px;height:12px;overflow:hidden;">
          <div id="progressBar" style="height:100%;border-radius:30px;
            background:linear-gradient(90deg,var(--accent),var(--accent2));
            width:${pct}%;transition:width 0.8s ease;"></div>
        </div>
      </div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:8px;">${pct}% — ${estTime}</div>

      <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:20px;">
        ${['⬇️ Downloading','📦 Extracting','🔍 Scanning APIs','📊 Scoring','💾 Saving'].map((step,i) => {
          const stepPct = [10,40,65,85,95][i];
          const done  = pct > stepPct;
          const active= pct >= (i===0?0:([10,40,65,85,95][i-1])) && pct <= stepPct;
          const color = done ? 'var(--safe)' : active ? 'var(--accent)' : 'var(--muted)';
          const bg    = done ? 'rgba(34,197,94,0.1)' : active ? 'rgba(79,143,255,0.12)' : 'transparent';
          return `<span style="font-size:12px;padding:6px 14px;border-radius:20px;
            border:0.5px solid ${color};color:${color};background:${bg};">${step}</span>`;
        }).join('')}
      </div>` : `
      <button onclick="showAnalyzeNow(window._lastStoreApp||{})"
        style="background:var(--accent);color:white;border:none;cursor:pointer;
        padding:12px 28px;border-radius:30px;font-family:inherit;font-size:14px;font-weight:600;">
        ${t('Try Again','حاول مرة أخرى')}
      </button>`}
    </div>`;

  window._lastStoreApp = lastSelectedStore;
}

// ════════════════════════════════════════
// SAFE ALTERNATIVES
// ════════════════════════════════════════
async function showAlternatives(category, excludeRaw, container) {
  const alts = await fetchSafeAlternatives(category, excludeRaw);
  if (!alts.length) return;

  const html = `
    <div style="background:var(--surface);border:0.5px solid rgba(34,197,94,0.35);
      border-radius:22px;padding:28px;margin-top:16px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
        <span style="font-size:22px;">✅</span>
        <div>
          <div style="font-family:var(--font-display);font-size:16px;font-weight:700;">
            ${t('Safer Alternatives','بدائل أكثر أماناً')}
          </div>
          <div style="font-size:13px;color:var(--muted);">
            ${t('Apps in the same category with a Safe rating','تطبيقات في نفس الفئة بتقييم آمن')}
          </div>
        </div>
      </div>
      ${alts.map(a => {
        const name = cleanAppName(a.app_name);
        const safe = name.replace(/'/g,"\\'");
        return `<div onclick="document.getElementById('appInput').value='${safe}';runSearch();"
          style="display:flex;justify-content:space-between;align-items:center;
          padding:12px 16px;margin-bottom:8px;border-radius:12px;cursor:pointer;
          background:rgba(34,197,94,0.07);border:0.5px solid rgba(34,197,94,0.2);
          transition:all .2s;"
          onmouseover="this.style.background='rgba(34,197,94,0.14)'"
          onmouseout="this.style.background='rgba(34,197,94,0.07)'">
          <span style="font-size:14px;font-weight:500;">${name}</span>
          <span style="font-size:12px;color:#22c55e;font-weight:700;">
            RS ${parseFloat(a.rs).toFixed(2)} · ${t('Safe','آمن')} ✅
          </span>
        </div>`;
      }).join('')}
    </div>`;
  container.insertAdjacentHTML('beforeend', html);
}

// ════════════════════════════════════════
// RUN SEARCH (by display name — for button/enter)
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

  // Try exact raw name first, then fuzzy
  let d = await fetchAppByRaw(rawName);
  if (!d) d = await fetchApp(rawName);
  if (d) {
    inner.innerHTML = buildResult(d);
    animateRs(d.rs);
    setWinny('done', d.name, d.verdict);
    if (d.verdict === 'highrisk') showAlternatives(d.rawCategory, d.rawName, inner);
  } else {
    inner.innerHTML = buildNotFound(rawName);
    setWinny('notfound', rawName);
  }
}

// ════════════════════════════════════════
// NOT FOUND + REQUEST FORM
// ════════════════════════════════════════
function buildNotFound(name) {
  const display = cleanAppName(name) || name;
  return `<div class="result-card" style="text-align:center;padding:48px 32px;">
    <div style="font-size:48px;margin-bottom:16px;">🔍</div>
    <div style="font-family:var(--font-display);font-size:22px;font-weight:700;margin-bottom:10px;">
      ${t('App not found in database','التطبيق غير موجود في قاعدة البيانات')}
    </div>
    <div style="color:var(--muted);font-size:14px;max-width:400px;margin:0 auto 28px;line-height:1.6;">
      <strong style="color:var(--text);">"${sanitize(display)}"</strong>
      ${t(" isn't in our database yet.",' غير موجود في قاعدة بياناتنا بعد.')}
    </div>
    <button onclick="showRequestForm('${sanitize(display).replace(/'/g,"\\'")}') "
      style="background:var(--accent);color:white;border:none;cursor:pointer;
      padding:13px 30px;border-radius:30px;font-family:inherit;font-size:14px;font-weight:600;
      transition:background .2s;margin-bottom:12px;display:block;margin-inline:auto;"
      onmouseover="this.style.background='var(--accent2)'" onmouseout="this.style.background='var(--accent)'">
      📩 ${t('Request Analysis','طلب تحليل')}
    </button>
    <div style="font-size:12px;color:var(--muted);">
      ${t("We'll notify you by email once the analysis is ready","سنتواصل معك بمجرد إضافة التحليل")}
    </div>
    <div class="winny-comment" style="text-align:${L()==='ar'?'right':'left'};margin-top:28px;">
      <svg width="36" height="36" viewBox="0 0 36 36" style="flex-shrink:0">
        <rect width="36" height="36" rx="10" fill="rgba(79,143,255,0.15)"/>
        <path d="M18 7l-7 3.5v5c0 4.4 2.8 8.5 7 9.5 4.2-1 7-5.1 7-9.5v-5L18 7z" fill="#4f8fff"/>
        <path d="M15 17.5l2.5 2.5 5-5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p>${t(
        "Hmm, not in my database yet! Request an analysis and I'll let you know when it's ready 📬",
        'لم أجده بعد! يمكنك طلب تحليله وسنُعلمك فور إضافته 📬'
      )}</p>
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
        ${t(`You've already submitted a request for`,`لقد أرسلت طلباً مسبقاً لـ`)}
        <strong style="color:var(--text);"> ${appName}</strong>
        ${t('using','باستخدام')}
        <strong style="color:var(--accent2);"> ${email}</strong>.
      </div>
      <div style="display:inline-flex;align-items:center;gap:10px;
        background:rgba(79,143,255,0.08);border:0.5px solid rgba(79,143,255,0.25);
        border-radius:14px;padding:16px 24px;margin-bottom:32px;max-width:440px;">
        <span style="font-size:22px;">🛡️</span>
        <span style="font-size:13px;color:var(--muted);text-align:left;line-height:1.6;">
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
        <span style="font-size:13px;color:var(--muted);">
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
  // Add chat button to Winny
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

  // Chat window
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

  // Initial greeting
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
    // Update button label
    const lbl = document.getElementById('chatBtnLabel');
    if (lbl) lbl.textContent = t('Close Chat', 'إغلاق الدردشة');
  } else {
    const lbl = document.getElementById('chatBtnLabel');
    if (lbl) lbl.textContent = t('Chat with Winny', 'تحدث مع ويني');
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

  // Build context about current app if one is being viewed
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
- How the SER (Seed Exclusiveness Ratio) scoring works
- How to use the WinPrivacy website
- What Safe, Normal+, Anomaly Detected, and High Risk verdicts mean
- General Windows app privacy questions

${appContext}

STRICT RULES:
- Only answer questions related to WinPrivacy, app privacy, Windows permissions, and cybersecurity
- If asked about anything unrelated (weather, cooking, coding help, etc.), politely say you can only help with WinPrivacy-related topics
- Be friendly, concise, and clear
- Use simple language for non-technical users
- If the user's language seems to be Arabic, respond in Arabic
- Never make up app scores or data you don't have
- Keep responses under 150 words`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: [
          ...chatMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message }
        ]
      })
    });

    removeTypingIndicator();

    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    const reply = data.content?.[0]?.text || t('Sorry, I had trouble responding. Please try again.','عذراً، واجهت مشكلة في الرد. يرجى المحاولة مرة أخرى.');
    addChatMessage('winny', reply);

  } catch (e) {
    removeTypingIndicator();
    addChatMessage('winny', t(
      'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
      'عذراً، أواجه مشكلة في الاتصال الآن. يرجى المحاولة بعد قليل.'
    ));
  }
}

// Update app context when results are shown
function updateChatContext(appData) {
  currentAppContext = appData;
}

// ════════════════════════════════════════
// INIT
// ════════════════════════════════════════
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { initLiveSearch(); initWinnyChat(); });
} else {
  initLiveSearch();
  initWinnyChat();
}
