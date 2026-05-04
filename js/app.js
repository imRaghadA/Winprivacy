/**
 * app.js — WinPrivacy Dynamic Features
 * ══════════════════════════════════════════════════════════════
 * Adds to the existing working site:
 *
 *  1. Microsoft Store live search — real app names + icons in
 *     the dropdown. Replaces the DB-only suggestions when the
 *     app is not found in Supabase yet.
 *
 *  2. "Analyze Now" job flow — creates a job row in Supabase,
 *     shows a live progress bar, polls every 3 s, auto-renders
 *     the result card when the worker finishes.
 *
 * Depends on: search.js (SUPABASE_URL, SUPABASE_KEY, HEADERS,
 *   rowToApp, buildResult, animateRs, setWinny, buildNotFound,
 *   sanitize, cleanAppName)
 * Does NOT modify search.js or index.html logic.
 */

// ─────────────────────────────────────────────────────────────
// SECTION 1 — MICROSOFT STORE SEARCH
// Calls the public MS Store catalog API to get real app names,
// icons, and Product IDs. Shown in a second layer of the
// existing dropdown when the user's query returns no DB results.
// ─────────────────────────────────────────────────────────────

const MS_STORE_API =
  'https://storeedgefd.dsx.mp.microsoft.com/v9.0/products' +
  '?query={Q}&market=US&locale=en-US&deviceFamily=Windows.Desktop';

/** Fetch live MS Store results → [{name, storeId, icon, publisher}] */
async function fetchMsStoreApps(query) {
  const url = MS_STORE_API.replace('{Q}', encodeURIComponent(query));
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return [];
    const data = await res.json();

    // The catalog API wraps results differently depending on query type
    const cards =
      data?.Payload?.Aggregations?.[0]?.Cards ||
      data?.Payload?.Cards ||
      [];

    return cards.slice(0, 6).map(c => ({
      name:      c.Title || c.ShortTitle || query,
      storeId:   c.ProductId || '',
      publisher: c.PublisherName || '',
      icon:      c.Images?.find(i => i.ImagePurpose === 'Tile')?.Uri ||
                 c.Images?.[0]?.Uri || '',
    })).filter(r => r.storeId);   // discard results with no Product ID

  } catch (e) {
    console.warn('MS Store API error:', e);
    return [];
  }
}


// ─────────────────────────────────────────────────────────────
// SECTION 2 — AUGMENTED DROPDOWN
// Extends the existing liveDropdown (created by search.js) with
// a second section showing MS Store results when present.
// ─────────────────────────────────────────────────────────────

let _msStoreTimer = null;

/**
 * Called by the patched input listener (installed below).
 * First shows DB results (via existing triggerLiveSearch),
 * then appends MS Store results underneath.
 */
async function augmentDropdownWithStore(query) {
  if (!query || query.length < 2) return;

  // Wait for triggerLiveSearch to paint first
  await new Promise(r => setTimeout(r, 320));

  const storeApps = await fetchMsStoreApps(query);
  if (!storeApps.length) return;

  // Re-use the dropdown div already created by search.js
  const dropdown = document.getElementById('liveDropdown');
  if (!dropdown) return;

  // Remove any previous MS Store section
  const existing = dropdown.querySelector('#msStoreSuggestions');
  if (existing) existing.remove();

  const section = document.createElement('div');
  section.id = 'msStoreSuggestions';

  // Divider — only if there are already DB results above
  const hasDbResults = dropdown.querySelectorAll('div:not(#msStoreSuggestions)').length > 0;
  const divider = hasDbResults
    ? `<div style="padding:6px 18px 4px;font-size:11px;font-weight:700;
                   letter-spacing:0.8px;color:var(--muted);
                   border-top:0.5px solid var(--border);
                   text-transform:uppercase;">
         🏪 Microsoft Store
       </div>`
    : `<div style="padding:6px 18px 4px;font-size:11px;font-weight:700;
                   letter-spacing:0.8px;color:var(--muted);
                   text-transform:uppercase;">
         🏪 Microsoft Store
       </div>`;

  section.innerHTML = divider + storeApps.map(app => {
    const safeId   = _esc(app.storeId);
    const safeName = _esc(app.name);
    const safePub  = _esc(app.publisher);

    return `
      <div onclick="msStoreSelect('${safeId}','${safeName}')"
           style="padding:10px 18px;cursor:pointer;display:flex;align-items:center;
                  gap:12px;border-bottom:0.5px solid var(--border);transition:background .15s;"
           onmouseover="this.style.background='var(--surface2)'"
           onmouseout="this.style.background=''">

        <!-- Icon -->
        <img src="${_esc(app.icon)}" width="32" height="32"
             style="border-radius:8px;object-fit:cover;flex-shrink:0;"
             onerror="this.src='';this.style.display='none'">

        <!-- Name + publisher -->
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:600;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${_escHtml(app.name)}
          </div>
          <div style="font-size:11px;color:var(--muted);">${_escHtml(app.publisher)}</div>
        </div>

        <!-- Analyze Now pill -->
        <span style="background:var(--accent);color:#fff;font-size:11px;font-weight:700;
                     padding:4px 12px;border-radius:20px;white-space:nowrap;flex-shrink:0;">
          Analyze Now →
        </span>
      </div>`;
  }).join('');

  dropdown.appendChild(section);
  dropdown.style.display = 'block';
}

/** User clicked an MS Store result in the dropdown */
window.msStoreSelect = function(storeId, appName) {
  // Close dropdown
  const dd = document.getElementById('liveDropdown');
  if (dd) dd.style.display = 'none';

  // Fill the search input with the real name
  const inp = document.getElementById('appInput');
  if (inp) inp.value = appName;

  // First check if this app already exists in Supabase by storeId
  checkAndRender(storeId, appName);
};

/**
 * Check Supabase first. If found → render immediately.
 * If not → show "Analyze Now" card.
 */
async function checkAndRender(storeId, appName) {
  const wrap  = document.getElementById('results');
  const inner = document.getElementById('resultsInner');
  wrap.style.display = 'block';
  inner.innerHTML = `<div class="loading"><div class="spinner"></div>
    <span style="color:var(--muted);font-size:14px;">Checking database…</span></div>`;
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Try by exact MS Store ID first, then by name
  let appData = await _fetchByStoreId(storeId);
  if (!appData) appData = await fetchApp(appName);

  if (appData) {
    // Already in DB — show result immediately (existing flow)
    inner.innerHTML = buildResult(appData);
    animateRs(appData.rs);
    setWinny('done', appData.name, appData.verdict);
  } else {
    // Not in DB — show Analyze Now card
    inner.innerHTML = _buildAnalyzeNowCard(appName, storeId);
    setWinny('notfound', appName);
    if (window._winnyShowBubble)
      window._winnyShowBubble(
        `I don't have <strong>${appName}</strong> yet — click <strong>Analyze Now</strong> and I'll scan it! 🔬`,
        5000
      );
  }
}

/** Fetch from app_analysis by microsoft_store_id column */
async function _fetchByStoreId(storeId) {
  const url = `${SUPABASE_URL}/rest/v1/app_analysis` +
    `?microsoft_store_id=eq.${encodeURIComponent(storeId)}&limit=1&select=*`;
  try {
    const res  = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.length ? rowToApp(rows[0]) : null;
  } catch { return null; }
}


// ─────────────────────────────────────────────────────────────
// SECTION 3 — ANALYZE NOW CARD
// Shown when the app is not in the DB.
// ─────────────────────────────────────────────────────────────

function _buildAnalyzeNowCard(appName, storeId) {
  const L = typeof lang !== 'undefined' ? lang : 'en';
  const safeId   = _esc(storeId);
  const safeName = _esc(appName);
  const isAr = L === 'ar';

  return `
    <div class="result-card" style="text-align:center;padding:48px 32px;">
      <div style="font-size:52px;margin-bottom:16px;">🔬</div>

      <div style="font-family:var(--font-display);font-size:22px;
                  font-weight:700;margin-bottom:10px;">
        ${isAr ? 'التطبيق غير موجود بعد' : 'Not analyzed yet'}
      </div>

      <div style="color:var(--muted);font-size:14px;max-width:460px;
                  margin:0 auto 28px;line-height:1.7;">
        <strong style="color:var(--text);">${_escHtml(appName)}</strong>
        ${isAr
          ? ' غير موجود في قاعدة بياناتنا. اضغط "تحليل الآن" وسيعود ويني بالنتيجة خلال دقيقتين.'
          : " isn't in our database yet. Click <strong>Analyze Now</strong> and the worker will download, extract, and score it — results appear here automatically in ~2 minutes."}
      </div>

      <!-- Product ID badge -->
      <div style="display:inline-flex;align-items:center;gap:8px;
                  background:var(--surface2);border:0.5px solid var(--border2);
                  border-radius:10px;padding:8px 16px;margin-bottom:28px;font-size:12px;">
        <span style="color:var(--muted);">Microsoft Store ID:</span>
        <code style="color:var(--accent);font-weight:700;">${_escHtml(storeId)}</code>
      </div>

      <!-- Analyze Now button -->
      <button onclick="analyzeNow('${safeId}','${safeName}')"
        style="display:block;margin:0 auto 14px;min-width:220px;
               background:var(--accent);color:white;border:none;cursor:pointer;
               padding:15px 36px;border-radius:30px;font-family:inherit;
               font-size:15px;font-weight:700;transition:background .2s;"
        onmouseover="this.style.background='var(--accent2)'"
        onmouseout="this.style.background='var(--accent)'">
        🚀 ${isAr ? 'تحليل الآن' : 'Analyze Now'}
      </button>

      <!-- Email fallback -->
      <button onclick="showRequestForm('${safeName}')"
        style="background:transparent;border:1px solid var(--border2);
               color:var(--muted);cursor:pointer;padding:9px 24px;
               border-radius:30px;font-family:inherit;font-size:13px;
               margin-bottom:28px;transition:all .2s;">
        📩 ${isAr ? 'أخبرني بالبريد عند الاكتمال' : 'Notify me by email when done'}
      </button>

      <div class="winny-comment" style="text-align:left;max-width:480px;margin:0 auto;">
        <svg width="36" height="36" viewBox="0 0 36 36" style="flex-shrink:0">
          <rect width="36" height="36" rx="10" fill="rgba(79,143,255,0.15)"/>
          <path d="M18 7l-7 3.5v5c0 4.4 2.8 8.5 7 9.5 4.2-1 7-5.1 7-9.5v-5L18 7z" fill="#4f8fff"/>
          <path d="M15 17.5l2.5 2.5 5-5" stroke="white" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p style="font-size:13px;line-height:1.7;">
          ${isAr
            ? 'سأقوم بتنزيل الحزمة، واستخراج الأذونات وواجهات API، وحساب درجة الخطر — كل ذلك تلقائياً! 🔍'
            : "I'll download the package, extract permissions and APIs, compute the risk score — all automatically! Results appear right here. 🔍"}
        </p>
      </div>
    </div>`;
}


// ─────────────────────────────────────────────────────────────
// SECTION 4 — PROGRESS BAR (job polling)
// ─────────────────────────────────────────────────────────────

const POLL_MS = 3000;
let _pollTimer   = null;
let _activeJobId = null;

/** Called by the "Analyze Now" button */
window.analyzeNow = async function(storeId, appName) {
  const wrap  = document.getElementById('results');
  const inner = document.getElementById('resultsInner');
  wrap.style.display = 'block';

  _renderProgress(appName, 0, 'Submitting job to worker…', 'queued');
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (window._winnyLaunch) window._winnyLaunch();

  // Resume existing job if one is already running
  const existing = await _latestJob(storeId);
  if (existing && ['queued','downloading','extracting','analyzing'].includes(existing.status)) {
    _renderProgress(appName, existing.progress || 0, existing.message || '…', existing.status);
    _startPolling(existing.job_id, storeId, appName);
    return;
  }

  // Create new job
  const job = await _createJob(storeId, appName);
  if (!job) {
    inner.innerHTML = `<div class="result-card" style="text-align:center;padding:48px;">
      <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
      <div style="font-family:var(--font-display);font-size:20px;font-weight:700;">
        Could not queue job
      </div>
      <div style="color:var(--muted);font-size:14px;margin-top:10px;">
        Database connection failed. Try again.
      </div></div>`;
    return;
  }

  _renderProgress(appName, 0, 'Queued — waiting for worker…', 'queued');
  _startPolling(job.job_id, storeId, appName);

  if (window._winnyShowBubble)
    window._winnyShowBubble(
      `Job submitted! I'm sending <strong>${_escHtml(appName)}</strong> to the worker. Give me ~2 minutes 🚀`,
      5000
    );
};

function _renderProgress(appName, pct, message, status) {
  const statusLabel = {
    queued:      '⏳ Queued',
    downloading: '📥 Downloading',
    extracting:  '🔬 Extracting',
    analyzing:   '📊 Scoring',
    completed:   '✅ Done',
    failed:      '❌ Failed',
  }[status] || status;

  const fillColor = status === 'failed'
    ? 'var(--danger)'
    : 'linear-gradient(90deg,var(--accent),var(--accent2))';

  document.getElementById('resultsInner').innerHTML = `
    <div class="result-card" id="progressCard" style="text-align:center;padding:48px 32px;">

      <div style="font-size:52px;margin-bottom:16px;animation:pulse 2s infinite;">
        ${ status === 'failed' ? '❌' : '🔬' }
      </div>

      <div style="font-family:var(--font-display);font-size:22px;font-weight:700;margin-bottom:8px;">
        Analyzing <span style="color:var(--accent);">${_escHtml(appName)}</span>
      </div>

      <div style="display:inline-flex;align-items:center;gap:8px;
                  background:rgba(79,143,255,0.1);border:1px solid rgba(79,143,255,0.25);
                  padding:6px 16px;border-radius:30px;font-size:13px;font-weight:600;
                  color:var(--accent);margin-bottom:28px;">
        ${statusLabel}
      </div>

      <!-- Bar -->
      <div style="max-width:500px;margin:0 auto 16px;">
        <div style="background:var(--surface2);border-radius:8px;height:10px;overflow:hidden;">
          <div id="progressFill"
               style="height:100%;width:${pct}%;border-radius:8px;
                      background:${fillColor};transition:width 0.6s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;">
          <span id="progressMsg" style="font-size:12px;color:var(--muted);">
            ${_escHtml(message)}
          </span>
          <span id="progressPct" style="font-size:12px;font-weight:700;color:var(--accent);">
            ${pct}%
          </span>
        </div>
      </div>

      <!-- Steps indicator -->
      <div style="display:flex;justify-content:center;gap:8px;margin-bottom:28px;flex-wrap:wrap;">
        ${[
          ['📥','Download', 'downloading', 20],
          ['🔬','Extract',  'extracting',  55],
          ['📊','Score',    'analyzing',   72],
          ['☁️','Upload',   'completed',   95],
        ].map(([ico, label, s, threshold]) => {
          const done    = pct >= threshold;
          const active  = status === s;
          const opacity = done ? '1' : active ? '0.9' : '0.35';
          const border  = done
            ? '1px solid var(--safe)'
            : active
              ? '1px solid var(--accent)'
              : '1px solid var(--border)';
          return `<div style="display:flex;align-items:center;gap:5px;padding:5px 12px;
                               border-radius:20px;border:${border};opacity:${opacity};
                               font-size:12px;font-weight:600;">
            ${ico} ${label}
          </div>`;
        }).join('')}
      </div>

      <div class="winny-comment" style="text-align:left;max-width:500px;margin:0 auto 24px;">
        <svg width="36" height="36" viewBox="0 0 36 36" style="flex-shrink:0">
          <rect width="36" height="36" rx="10" fill="rgba(79,143,255,0.15)"/>
          <path d="M18 7l-7 3.5v5c0 4.4 2.8 8.5 7 9.5 4.2-1 7-5.1 7-9.5v-5L18 7z" fill="#4f8fff"/>
          <path d="M15 17.5l2.5 2.5 5-5" stroke="white" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p style="font-size:13px;line-height:1.7;">
          Hang tight! I'm running the full pipeline: downloading the package, extracting APIs
          and permissions, then computing the Risk Score. <strong>~2 minutes</strong> usually. 🔍
        </p>
      </div>

      <button onclick="_cancelPolling()"
        style="background:transparent;border:1px solid var(--border2);color:var(--muted);
               cursor:pointer;padding:8px 24px;border-radius:30px;
               font-family:inherit;font-size:13px;transition:all .2s;">
        Cancel
      </button>
    </div>`;
}

function _updateBar(pct, message, status) {
  const fill = document.getElementById('progressFill');
  const msg  = document.getElementById('progressMsg');
  const pctEl= document.getElementById('progressPct');
  if (fill) {
    fill.style.width      = `${pct}%`;
    fill.style.background = status === 'failed'
      ? 'var(--danger)'
      : 'linear-gradient(90deg,var(--accent),var(--accent2))';
  }
  if (msg)   msg.textContent  = message || '';
  if (pctEl) pctEl.textContent= `${pct}%`;
}

window._cancelPolling = function() {
  if (_pollTimer) clearInterval(_pollTimer);
  _pollTimer = _activeJobId = null;
  document.getElementById('results').style.display = 'none';
};

function _startPolling(jobId, storeId, appName) {
  if (_pollTimer) clearInterval(_pollTimer);
  _activeJobId = jobId;

  _pollTimer = setInterval(async () => {
    if (_activeJobId !== jobId) { clearInterval(_pollTimer); return; }

    const job = await _getJob(jobId);
    if (!job) return;

    _updateBar(job.progress || 0, job.message || '', job.status);

    if (job.status === 'completed') {
      clearInterval(_pollTimer);
      _pollTimer = _activeJobId = null;
      _onComplete(storeId, appName);

    } else if (job.status === 'failed') {
      clearInterval(_pollTimer);
      _pollTimer = _activeJobId = null;
      _onFailed(appName, job.message || job.error_detail || 'Unknown error');
    }
  }, POLL_MS);
}

async function _onComplete(storeId, appName) {
  // Try fetching from app_analysis by storeId
  let appData = await _fetchByStoreId(storeId);
  if (!appData) appData = await fetchApp(appName);   // fallback to name search

  const inner = document.getElementById('resultsInner');
  if (appData) {
    inner.innerHTML = buildResult(appData);
    animateRs(appData.rs);
    setWinny('done', appData.name, appData.verdict);
  } else {
    inner.innerHTML = buildNotFound(appName);
    setWinny('notfound', appName);
  }
}

function _onFailed(appName, errorMsg) {
  document.getElementById('resultsInner').innerHTML = `
    <div class="result-card" style="text-align:center;padding:48px 32px;">
      <div style="font-size:52px;margin-bottom:16px;">❌</div>
      <div style="font-family:var(--font-display);font-size:22px;font-weight:700;margin-bottom:10px;">
        Analysis Failed
      </div>
      <div style="color:var(--muted);font-size:14px;max-width:420px;
                  margin:0 auto 12px;line-height:1.6;">
        Something went wrong while analyzing
        <strong style="color:var(--text);">${_escHtml(appName)}</strong>.
      </div>
      <code style="display:block;font-size:11px;background:var(--surface2);
                   padding:8px 16px;border-radius:8px;max-width:420px;
                   margin:0 auto 24px;word-break:break-word;color:var(--muted);">
        ${_escHtml(errorMsg)}
      </code>
      <button onclick="location.reload()"
        style="background:var(--accent);color:white;border:none;cursor:pointer;
               padding:12px 28px;border-radius:30px;font-family:inherit;
               font-size:14px;font-weight:600;">
        Try Again
      </button>
    </div>`;
  if (window._winnyShowBubble)
    window._winnyShowBubble('Analysis hit an error 😬 — try again!', 5000);
}


// ─────────────────────────────────────────────────────────────
// SECTION 5 — SUPABASE JOB HELPERS (anon key)
// Reuses the existing SUPABASE_URL + HEADERS from search.js
// ─────────────────────────────────────────────────────────────

async function _createJob(storeId, appName) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/analysis_jobs`, {
      method: 'POST',
      headers: { ...HEADERS, 'Prefer': 'return=representation' },
      body: JSON.stringify({
        microsoft_store_id: storeId,
        app_name:           appName,
        status:             'queued',
        progress:           0,
        message:            'Waiting for worker…',
      }),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] || null;
  } catch { return null; }
}

async function _getJob(jobId) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/analysis_jobs?job_id=eq.${encodeURIComponent(jobId)}&limit=1&select=*`,
      { headers: HEADERS }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] || null;
  } catch { return null; }
}

async function _latestJob(storeId) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/analysis_jobs?microsoft_store_id=eq.${encodeURIComponent(storeId)}&order=created_at.desc&limit=1&select=*`,
      { headers: HEADERS }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] || null;
  } catch { return null; }
}


// ─────────────────────────────────────────────────────────────
// SECTION 6 — PATCH THE EXISTING INPUT LISTENER
// Hooks into the input that search.js already created,
// without removing its existing behavior.
// ─────────────────────────────────────────────────────────────

function _patchInputForMsStore() {
  const input = document.getElementById('appInput');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(_msStoreTimer);
    if (q.length < 2) return;
    // Slight delay so the DB search fires first (300 ms in search.js)
    _msStoreTimer = setTimeout(() => augmentDropdownWithStore(q), 500);
  });
}

// Run after search.js has called initLiveSearch()
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _patchInputForMsStore);
} else {
  _patchInputForMsStore();
}


// ─────────────────────────────────────────────────────────────
// SECTION 7 — UTILS
// ─────────────────────────────────────────────────────────────

function _esc(s)     { return String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function _escHtml(s) { return String(s||'').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
