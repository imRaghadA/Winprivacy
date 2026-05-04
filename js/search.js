// ── WinPrivacy Search Engine ──
// Phase 1: live search, sanitization, safe alternatives, app request form

const SUPABASE_URL = 'https://mthksiaihxgyesvxxtbt.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10aGtzaWFpaHhneWVzdnh4dGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2OTEsImV4cCI6MjA5MjUxNDY5MX0.STu8JYCABANBUkJtKQYYAIg_TVQF5GV-GrsPB2fSI3w';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

// ════════════════════════════════════════
// 1. INPUT SANITIZER
// ════════════════════════════════════════
function sanitize(input) {
  return input
    .replace(/[*%]/g, '')        // no Supabase wildcards
    .replace(/[<>"'`;\\]/g, '')  // no HTML/JS injection chars
    .trim()
    .slice(0, 80);               // max length
}

function sanitizeEmail(email) {
  return email.trim().toLowerCase().slice(0, 120);
}

// ════════════════════════════════════════
// 2. CLEAN DISPLAY NAME FROM PACKAGE ID
// e.g. "NHProd.AthanApp_1.0.3.0_x64__xxx" → "Athan App"
// ════════════════════════════════════════
function cleanAppName(rawName) {
  const afterDot        = rawName.includes('.') ? rawName.split('.').slice(1).join('.') : rawName;
  const beforeUnderscore = afterDot.split('_')[0];
  return beforeUnderscore.replace(/([A-Z])/g, ' $1').trim();
}

// ════════════════════════════════════════
// 3. FETCH SINGLE APP (on Enter / button)
// ════════════════════════════════════════
async function fetchApp(name) {
  const q = sanitize(name);
  if (!q) return null;
  const url = `${SUPABASE_URL}/rest/v1/app_analysis?app_name=ilike.*${encodeURIComponent(q)}*&limit=1&select=*`;
  try {
    const res  = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows || rows.length === 0) return null;
    return rowToApp(rows[0]);
  } catch (e) {
    console.error('fetchApp error:', e);
    return null;
  }
}

// ════════════════════════════════════════
// 4. FETCH BY EXACT PACKAGE NAME
// ════════════════════════════════════════
async function fetchAppByRaw(rawName) {
  const url = `${SUPABASE_URL}/rest/v1/app_analysis?app_name=eq.${encodeURIComponent(rawName)}&limit=1&select=*`;
  try {
    const res  = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows || rows.length === 0) return null;
    return rowToApp(rows[0]);
  } catch { return null; }
}

// ════════════════════════════════════════
// 5. LIVE SEARCH (dropdown suggestions)
// ════════════════════════════════════════
async function liveSearch(query) {
  const q = sanitize(query);
  if (!q || q.length < 2) return [];
  const url = `${SUPABASE_URL}/rest/v1/app_analysis?app_name=ilike.*${encodeURIComponent(q)}*&limit=6&select=app_name,final_decision`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

// ════════════════════════════════════════
// 6. FETCH SAFE ALTERNATIVES (same category)
// ════════════════════════════════════════
async function fetchSafeAlternatives(category, excludeName) {
  if (!category) return [];
  const url = `${SUPABASE_URL}/rest/v1/app_analysis?category=eq.${encodeURIComponent(category)}&final_decision=ilike.*safe*&app_name=neq.${encodeURIComponent(excludeName)}&limit=3&select=app_name,rs,rs_level,final_decision`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

// ════════════════════════════════════════
// 7. ROW → APP SHAPE
// ════════════════════════════════════════

function rowToApp(row) {
  const fd = (row.final_decision || '').toLowerCase().trim();
  const verdict =
    fd === 'high risk'    ? 'highrisk' :
    fd === 'anomaly det.' ? 'anomaly'  :
    fd === 'normal+'      ? 'normalplus' :
    fd === 'safe'         ? 'safe'     :
    fd === 'normal'       ? 'normal'   : 'normal';

  // --- إعادة الأكواد المحذوفة (خريطة المستويات والأيقونات) ---
  const levelMap = {
    'low': 'Low', 'medium': 'Medium', 'high': 'High',
    'very high': 'Very High', 'safe': 'Safe/Very Low',
  };
  const rsLevelKey = levelMap[(row.rs_level || '').toLowerCase()] || 'Medium';

  const permMeta = {
    microphone:                 { icon: '🎙️', risk: 'high'   },
    webcam:                     { icon: '📷', risk: 'high'   },
    privatenetworkclientserver: { icon: '🔒', risk: 'high'   },
    sharedusercertificates:     { icon: '🔑', risk: 'high'   },
    documentslibrary:           { icon: '📄', risk: 'high'   },
    enterpriseauthentication:   { icon: '🏢', risk: 'high'   },
    videoslibrary:              { icon: '🎬', risk: 'high'   },
    musiclibrary:               { icon: '🎵', risk: 'medium' },
    removablestorage:           { icon: '💾', risk: 'high'   },
    broadfilesystemaccess:      { icon: '📁', risk: 'high'   },
    internetclient:             { icon: '🌐', risk: 'low'    },
    internetclientserver:       { icon: '🔗', risk: 'medium' },
    runfulltrust:               { icon: '⚙️', risk: 'medium' },
    systemmanagement:           { icon: '🖥️', risk: 'medium' },
    location:                   { icon: '📍', risk: 'medium' },
    appointments:               { icon: '📅', risk: 'medium' },
    usernotificationlistener:   { icon: '🔔', risk: 'high'   },
    backgroundmediaplayback:    { icon: '🎵', risk: 'medium' },
  };
  const riskWidth = { high: 88, medium: 55, low: 25 };

  // معالجة الأذونات (Permissions)
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
      return { name: { en: name, ar: name }, icon: meta.icon, risk: meta.risk, level: riskWidth[meta.risk] };
    });

  const cleanName = cleanAppName(row.app_name || '');
  const fullAnalysis = row.winny_analysis || '';
  let shortIntro = '';
  let technicalDetails = '';

  // --- منطق التقسيم الذكي للتحليل الجاهز ---


  // --- منطق التنسيق المنظم (كل نقطة في سطر) ---
  if (fullAnalysis && fullAnalysis.includes('Winny says:')) {
    let cleanText = fullAnalysis.replace('Winny says:', '').trim();
    
    // التقسيم عند العناوين الرئيسية
    const splitPattern = /(?=Additional Permissions|Anomalous Permissions|Technical Risk Flags|Conclusion:)/g;
    const parts = cleanText.split(splitPattern);
    
    shortIntro = parts[0].trim(); 
    
    if (parts.length > 1) {
        // نأخذ باقي الأجزاء ونقوم بتنسيقها سطر بسطر
        technicalDetails = parts.slice(1).map(part => {
            // استبدال النقطة "•" بـ سطر جديد + نقطة لضمان الترتيب
            return part.trim().replace(/•/g, '<br>•');
        }).join('<br><br>');
    }
  }
  

  // إعدادات احتياطية في حال عدم وجود تحليل جاهز
  if (!shortIntro) {
      shortIntro = verdict === 'safe' ? `🛡️ ${cleanName} appears safe and uses expected permissions only.` : `⚠️ ${cleanName} analysis is ready. See details below.`;
  }
  
  if (!technicalDetails) {
      technicalDetails = `
        <strong>Technical Data:</strong><br>
        • Total Permissions: ${row.permission_count || 0}<br>
        • Risk Category: ${rsLevelKey}<br><br>
        <strong>Detected Permissions:</strong><br>
        ${permissions.map(p => `• ${p.icon} ${p.name.en}`).join('<br>')}
      `;
  }

  return {
    name: cleanName,
    rawName: row.app_name,
    publisher: (row.category || '').replace(/_/g, ' '),
    version: '—',
    cat: { en: (row.category || '').replace(/_/g, ' '), ar: (row.category || '').replace(/_/g, ' ') },
    date: '2025', 
    rs: parseFloat(row.rs) || 0,
    rsLevelKey, 
    verdict, 
    permissions,
    rawCategory: row.category,
    comment: { en: shortIntro, ar: shortIntro }, 
    details: { en: technicalDetails, ar: technicalDetails }
  };
}



// ════════════════════════════════════════
// 8. LIVE DROPDOWN UI
// ════════════════════════════════════════
let liveTimer = null;
let dropdown  = null;

function initLiveSearch() {
  const input = document.getElementById('appInput');
  if (!input) return;

  dropdown = document.createElement('div');
  dropdown.id = 'liveDropdown';
  dropdown.style.cssText = `
    position:absolute; top:100%; left:0; right:0; z-index:300;
    background:var(--surface); border:1px solid var(--border2);
    border-radius:0 0 16px 16px; overflow:hidden;
    box-shadow:0 8px 28px rgba(0,0,0,0.22); display:none;
  `;
  input.parentElement.style.position = 'relative';
  input.parentElement.appendChild(dropdown);

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(liveTimer);
    if (q.length < 2) { dropdown.style.display = 'none'; return; }
    liveTimer = setTimeout(() => triggerLiveSearch(q), 300);
  });

  document.addEventListener('click', e => {
    if (!input.parentElement.contains(e.target)) dropdown.style.display = 'none';
  });
}

async function triggerLiveSearch(q) {
  const results = await liveSearch(q);
  if (!results.length) { dropdown.style.display = 'none'; return; }

  const vColor = fd => {
    const v = (fd || '').toLowerCase().trim();
    return v === 'high risk'    ? '#ef4444' :
           v === 'anomaly det.' ? '#f97316' :
           v === 'normal+'      ? '#eab308' :
           v === 'safe'         ? '#22c55e' : '#3b82f6';
  };

  dropdown.innerHTML = results.map(r => {
    const name  = cleanAppName(r.app_name);
    const color = vColor(r.final_decision);
    const raw   = r.app_name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safe  = name.replace(/'/g, "\\'");
    return `<div
      onclick="selectFromDropdown('${raw}','${safe}')"
      style="padding:12px 18px;cursor:pointer;display:flex;justify-content:space-between;
      align-items:center;border-bottom:0.5px solid var(--border);transition:background .15s;"
      onmouseover="this.style.background='var(--surface2)'"
      onmouseout="this.style.background=''">
      <span style="font-size:14px;font-weight:500;">${name}</span>
      <span style="font-size:11px;font-weight:700;color:${color};">${r.final_decision}</span>
    </div>`;
  }).join('');
  dropdown.style.display = 'block';
}

function selectFromDropdown(rawName, cleanName) {
  document.getElementById('appInput').value = cleanName;
  if (dropdown) dropdown.style.display = 'none';
  runSearchByRaw(rawName);
}

// ════════════════════════════════════════
// 9. RUN SEARCH BY RAW PACKAGE NAME
// ════════════════════════════════════════
async function runSearchByRaw(rawName) {
  const wrap  = document.getElementById('results');
  const inner = document.getElementById('resultsInner');
  wrap.style.display = 'block';
  inner.innerHTML = `<div class="loading"><div class="spinner"></div><span style="color:var(--muted);font-size:14px;">Scanning…</span></div>`;
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (window._winnyLaunch) window._winnyLaunch();

  const d = await fetchAppByRaw(rawName);
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
// 10. SAFE ALTERNATIVES CARD
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
          <div style="font-family:var(--font-display);font-size:16px;font-weight:700;">Safer Alternatives</div>
          <div style="font-size:13px;color:var(--muted);">Apps in the same category with a Safe rating</div>
        </div>
      </div>
      ${alts.map(a => {
        const name = cleanAppName(a.app_name);
        const safe = name.replace(/'/g, "\\'");
        const rawSafe = a.app_name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `<div onclick="selectFromDropdown('${rawSafe}','${safe}')"
          style="display:flex;justify-content:space-between;align-items:center;
          padding:12px 16px;margin-bottom:8px;border-radius:12px;cursor:pointer;
          background:rgba(34,197,94,0.07);border:0.5px solid rgba(34,197,94,0.2);
          transition:all .2s;"
          onmouseover="this.style.background='rgba(34,197,94,0.14)'"
          onmouseout="this.style.background='rgba(34,197,94,0.07)'">
          <span style="font-size:14px;font-weight:500;">${name}</span>
          <span style="font-size:12px;color:#22c55e;font-weight:700;">RS ${parseFloat(a.rs).toFixed(2)} · Safe ✅</span>
        </div>`;
      }).join('')}
    </div>`;
  container.insertAdjacentHTML('beforeend', html);
}

// ════════════════════════════════════════
// 11. APP REQUEST FLOW
// ════════════════════════════════════════

// Already requested — show pending message
function showRequestPending(appName, email) {
  document.getElementById('resultsInner').innerHTML = `
    <div class="result-card" style="text-align:center;padding:56px 32px;">
      <div style="font-size:56px;margin-bottom:20px;">⏳</div>
      <div style="font-family:var(--font-display);font-size:24px;font-weight:800;margin-bottom:12px;">
        Already Requested!
      </div>
      <div style="color:var(--muted);font-size:15px;line-height:1.7;max-width:440px;margin:0 auto 28px;">
        You've already submitted a request for
        <strong style="color:var(--text);">${appName}</strong>
        using <strong style="color:var(--accent2);">${email}</strong>.
        Your request is currently pending.
      </div>
      <div style="display:inline-flex;align-items:center;gap:10px;
        background:rgba(79,143,255,0.08);border:0.5px solid rgba(79,143,255,0.25);
        border-radius:14px;padding:16px 24px;margin-bottom:32px;max-width:440px;">
        <span style="font-size:22px;">🛡️</span>
        <span style="font-size:13px;color:var(--muted);text-align:left;line-height:1.6;">
          Don't worry — we are going to process your request as soon as possible.
          We'll send you an email at <strong style="color:var(--text);">${email}</strong>
          the moment the analysis is ready.
        </span>
      </div>
      <button onclick="document.getElementById('appInput').value='';document.getElementById('results').style.display='none';"
        style="background:var(--accent);color:white;border:none;cursor:pointer;
        padding:12px 28px;border-radius:30px;font-family:inherit;font-size:14px;font-weight:600;">
        Search Another App
      </button>
    </div>`;
  if (window._winnyShowBubble)
    window._winnyShowBubble("You already requested this one! I'll let you know when it's ready 📬", 5000);
}

// Step 1 — user clicks "Request Analysis" → show the form
function showRequestForm(searchedName) {
  const wrap = document.getElementById('resultsInner');
  wrap.innerHTML = `
    <div class="result-card" style="text-align:center;padding:48px 32px;">
      <div style="font-size:48px;margin-bottom:16px;">🔍</div>
      <div style="font-family:var(--font-display);font-size:22px;font-weight:700;margin-bottom:8px;">
        App Not Found
      </div>
      <div style="color:var(--muted);font-size:14px;margin-bottom:32px;max-width:420px;margin-inline:auto;">
        <strong style="color:var(--text);">"${sanitize(searchedName)}"</strong>
        isn't in our database yet. Request an analysis and we'll notify you by email when it's ready.
      </div>

      <div style="max-width:420px;margin:0 auto;text-align:left;">
        <div style="margin-bottom:16px;">
          <label style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:6px;">
            App Name
          </label>
          <input id="reqAppName" value="${sanitize(searchedName)}" placeholder="e.g. Athan App"
            style="width:100%;background:var(--surface2);border:1px solid var(--border2);
            border-radius:10px;padding:12px 16px;color:var(--text);font-family:inherit;font-size:14px;outline:none;">
        </div>

        <div style="margin-bottom:24px;">
          <label style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:6px;">
            Your Email <span style="color:var(--danger);">*</span>
          </label>
          <input id="reqEmail" type="email" placeholder="you@example.com"
            style="width:100%;background:var(--surface2);border:1px solid var(--border2);
            border-radius:10px;padding:12px 16px;color:var(--text);font-family:inherit;font-size:14px;outline:none;">
          <div style="font-size:11px;color:var(--muted);margin-top:6px;">
            We'll email you once the analysis is ready. No spam, ever.
          </div>
        </div>

        <div id="reqError" style="color:var(--danger);font-size:13px;margin-bottom:12px;display:none;"></div>

        <div style="display:flex;gap:12px;">
          <button onclick="submitRequest('${sanitize(searchedName)}')"
            style="flex:1;background:var(--accent);color:white;border:none;cursor:pointer;
            padding:14px 24px;border-radius:30px;font-family:inherit;font-size:14px;font-weight:600;
            transition:background .2s;" onmouseover="this.style.background='var(--accent2)'" onmouseout="this.style.background='var(--accent)'">
            Request Analysis
          </button>
          <button onclick="document.getElementById('results').style.display='none'"
            style="background:var(--surface2);color:var(--muted);border:1px solid var(--border);
            cursor:pointer;padding:14px 20px;border-radius:30px;font-family:inherit;font-size:14px;
            transition:all .2s;">
            Cancel
          </button>
        </div>
      </div>
    </div>`;
}

// Step 2 — submit the request to Supabase
async function submitRequest(searchedName) {
  const L = typeof lang !== 'undefined' ? lang : 'en';
  const appNameEl = document.getElementById('reqAppName');
  const emailEl   = document.getElementById('reqEmail');
  const errorEl   = document.getElementById('reqError');

  const appName = sanitize(appNameEl.value);
  const email   = sanitizeEmail(emailEl.value);


// Validate
if (!appName) {
  showReqError(
    L === 'ar'
      ? 'الرجاء إدخال اسم التطبيق.'
      : 'Please enter the app name.'
  );
  return;
}

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  showReqError(
    L === 'ar'
      ? 'الرجاء إدخال بريد إلكتروني صحيح.'
      : 'Please enter a valid email address.'
  );
  return;
}
  
  errorEl.style.display = 'none';
  const btn = document.querySelector('[onclick^="submitRequest"]');
  if (btn) {
  btn.textContent = L === 'ar' ? 'جاري الإرسال…' : 'Submitting…';
  btn.disabled = true;
}

  // Use app name as the store ID placeholder (Phase 2 will fetch real ID from MS Store)
  const storeId = appName.toLowerCase().replace(/\s+/g, '-') + '-requested';

  try {
    // 1. Check if this email already requested this app
    const checkUrl = `${SUPABASE_URL}/rest/v1/user_requests?microsoft_store_id=eq.${encodeURIComponent(storeId)}&requester_email=eq.${encodeURIComponent(email)}&limit=1&select=id`;
    const checkRes  = await fetch(checkUrl, { headers: HEADERS });
    const existing  = await checkRes.json();

    if (existing && existing.length > 0) {
      // Already requested — show pending message instead
      showRequestPending(appName, email);
      return;
    }

    // 2. Upsert app into apps_requested (insert or increment count)
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_app_request`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ p_store_id: storeId, p_app_name: appName })
    });

    // 3. Insert into user_requests
    await fetch(`${SUPABASE_URL}/rest/v1/user_requests`, {
      method: 'POST',
      headers: { ...HEADERS, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ microsoft_store_id: storeId, requester_email: email })
    });

    // 4. Show success
    showRequestSuccess(appName, email);

  } catch (e) {
    console.error('Request error:', e);
  

    showReqError(
       L === 'ar'
       ? 'حدث خطأ ما. حاول مرة أخرى.'
       : 'Something went wrong. Please try again.'
     );
    
  


    if (btn) {
  btn.textContent = L === 'ar' ? 'طلب التحليل' : 'Request Analysis';
  btn.disabled = false;
    }
    
  }
}

function showReqError(msg) {
  const el = document.getElementById('reqError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

// Step 3 — success state
function showRequestSuccess(appName, email) {
  document.getElementById('resultsInner').innerHTML = `
    <div class="result-card" style="text-align:center;padding:56px 32px;">
      <div style="font-size:56px;margin-bottom:20px;">📬</div>
      <div style="font-family:var(--font-display);font-size:24px;font-weight:800;margin-bottom:12px;">
        Request Received!
      </div>
      <div style="color:var(--muted);font-size:15px;line-height:1.7;max-width:440px;margin:0 auto 32px;">
        Your request for <strong style="color:var(--text);">${appName}</strong> has been submitted.
        We'll send a notification to <strong style="color:var(--accent2);">${email}</strong>
        as soon as the analysis is added to the database.
      </div>
      <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(79,143,255,0.08);
        border:0.5px solid rgba(79,143,255,0.25);border-radius:14px;padding:14px 24px;margin-bottom:32px;">
        <span style="font-size:18px;">⏳</span>
        <span style="font-size:13px;color:var(--muted);">
          Most requested apps are prioritised. The more requests, the faster we process it!
        </span>
      </div>
      <button onclick="document.getElementById('appInput').value='';document.getElementById('results').style.display='none';"
        style="background:var(--accent);color:white;border:none;cursor:pointer;
        padding:12px 28px;border-radius:30px;font-family:inherit;font-size:14px;font-weight:600;">
        Search Another App
      </button>
    </div>`;
  if (window._winnyShowBubble)
    window._winnyShowBubble("Request sent! We'll notify you when it's ready 📬", 5000);
}

// ════════════════════════════════════════
// 12. OVERRIDE buildNotFound to show request button
// ════════════════════════════════════════
function buildNotFound(name) {
  const L        = typeof lang !== 'undefined' ? lang : 'en';
  const display  = cleanAppName(name) || name;
  return `<div class="result-card" style="text-align:center;padding:48px 32px;">
    <div style="font-size:48px;margin-bottom:16px;">🔍</div>
    <div style="font-family:var(--font-display);font-size:22px;font-weight:700;margin-bottom:10px;">
      ${L === 'ar' ? 'التطبيق غير موجود في قاعدة البيانات' : 'App not found in database'}
    </div>
    <div style="color:var(--muted);font-size:14px;max-width:400px;margin:0 auto 28px;line-height:1.6;">
      <strong style="color:var(--text);">"${sanitize(display)}"</strong>
      ${L === 'ar' ? ' غير موجود في قاعدة بياناتنا بعد.' : " isn't in our database yet."}
    </div>
    <button onclick="showRequestForm('${sanitize(display).replace(/'/g,"\\'")}') "
      style="background:var(--accent);color:white;border:none;cursor:pointer;
      padding:13px 30px;border-radius:30px;font-family:inherit;font-size:14px;font-weight:600;
      transition:background .2s;margin-bottom:12px;display:block;margin-inline:auto;"
      onmouseover="this.style.background='var(--accent2)'" onmouseout="this.style.background='var(--accent)'">
      📩 ${L === 'ar' ? 'طلب تحليل لهذا التطبيق' : 'Request Analysis for this App'}
    </button>
    <div style="font-size:12px;color:var(--muted);">
      ${L === 'ar' ? 'سنتواصل معك بمجرد إضافة التحليل' : "We'll notify you by email once the analysis is ready"}
    </div>
    <div class="winny-comment" style="text-align:left;margin-top:28px;">
      <svg width="36" height="36" viewBox="0 0 36 36" style="flex-shrink:0">
        <rect width="36" height="36" rx="10" fill="rgba(79,143,255,0.15)"/>
        <path d="M18 7l-7 3.5v5c0 4.4 2.8 8.5 7 9.5 4.2-1 7-5.1 7-9.5v-5L18 7z" fill="#4f8fff"/>
        <path d="M15 17.5l2.5 2.5 5-5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p>${L === 'ar'
        ? 'لم أجده بعد! يمكنك طلب تحليله وسنُعلمك فور إضافته 📬'
        : "Hmm, not in my database yet! Request an analysis and I'll let you know when it's ready 📬"
      }</p>
    </div>
  </div>`;
}

// ════════════════════════════════════════
// 13. INIT
// ════════════════════════════════════════
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLiveSearch);
} else {
  initLiveSearch();
}




function toggleDetails(btn) {

  const box = btn.nextElementSibling;

  if (box.style.display === 'none') {

    box.style.display = 'block';
    btn.textContent = 'See less';

  } else {

    box.style.display = 'none';
    btn.textContent = 'See more';

  }

}
