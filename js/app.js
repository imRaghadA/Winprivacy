/**
 * app.js — WinPrivacy Job Manager
 * ════════════════════════════════════════════════════════════
 * Responsibility: ONLY the Analyze Now job flow.
 *   - Create a job row in Supabase analysis_jobs
 *   - Show a live progress bar
 *   - Poll job status every 3 seconds
 *   - Auto-render the result card when the worker finishes
 *
 * The dropdown (DB + MS Store) lives entirely in search.js.
 * This file has zero dropdown logic — no conflict possible.
 *
 * Depends on search.js being loaded first (uses SUPABASE_URL,
 * HEADERS, rowToApp, buildResult, animateRs, setWinny,
 * buildNotFound, fetchApp, showAlternatives).
 */

const POLL_MS    = 3000;
let _pollTimer   = null;
let _activeJobId = null;

// ════════════════════════════════════════
// ENTRY POINT
// Called by the "Analyze Now" button inside buildNotFound()
// ════════════════════════════════════════
window.analyzeNow = async function(storeId, appName) {
  const wrap  = document.getElementById('results');
  const inner = document.getElementById('resultsInner');
  wrap.style.display = 'block';

  _renderProgressCard(appName, 0, 'Submitting job…', 'queued');
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (window._winnyLaunch) window._winnyLaunch();

  // Resume if a job for this app is already in progress
  const existing = await _latestJob(storeId);
  if (existing && ['queued','downloading','extracting','analyzing'].includes(existing.status)) {
    _renderProgressCard(appName, existing.progress || 0, existing.message || '…', existing.status);
    _startPolling(existing.job_id, storeId, appName);
    return;
  }

  // Create a new job row in Supabase
  const job = await _createJob(storeId, appName);
  if (!job) {
    inner.innerHTML = `
      <div class="result-card" style="text-align:center;padding:48px 32px;">
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <div style="font-family:var(--font-display);font-size:20px;font-weight:700;margin-bottom:10px;">
          Could not queue job
        </div>
        <div style="color:var(--muted);font-size:14px;">
          Database connection failed. Please try again.
        </div>
      </div>`;
    return;
  }

  _renderProgressCard(appName, 0, 'Queued — waiting for worker…', 'queued');
  _startPolling(job.job_id, storeId, appName);

  if (window._winnyShowBubble)
    window._winnyShowBubble(
      `Job submitted! Scanning <strong>${appName}</strong> now — give me ~2 minutes 🚀`,
      5000
    );
};

// ════════════════════════════════════════
// PROGRESS CARD
// ════════════════════════════════════════
function _renderProgressCard(appName, pct, message, status) {
  const statusLabel = {
    queued:      '⏳ Queued',
    downloading: '📥 Downloading',
    extracting:  '🔬 Extracting',
    analyzing:   '📊 Scoring',
    completed:   '✅ Done',
    failed:      '❌ Failed',
  }[status] || status;

  const steps = [
    { icon: '📥', label: 'Download', threshold: 20 },
    { icon: '🔬', label: 'Extract',  threshold: 55 },
    { icon: '📊', label: 'Score',    threshold: 72 },
    { icon: '☁️', label: 'Upload',   threshold: 95 },
  ];

  const stepsHtml = steps.map(s => {
    const done   = pct >= s.threshold;
    const border = done ? '1px solid var(--safe)' : '1px solid var(--border)';
    const opacity= done ? '1' : '0.35';
    return `<div style="display:flex;align-items:center;gap:5px;padding:5px 12px;
                         border-radius:20px;border:${border};opacity:${opacity};
                         font-size:12px;font-weight:600;">
      ${s.icon} ${s.label}
    </div>`;
  }).join('');

  document.getElementById('resultsInner').innerHTML = `
    <div class="result-card" id="progressCard" style="text-align:center;padding:48px 32px;">

      <div style="font-size:52px;margin-bottom:16px;animation:pulse 2s infinite;">🔬</div>

      <div style="font-family:var(--font-display);font-size:22px;font-weight:700;margin-bottom:8px;">
        Analyzing <span style="color:var(--accent);">${_esc(appName)}</span>
      </div>

      <div style="display:inline-flex;align-items:center;gap:8px;
                  background:rgba(79,143,255,0.1);border:1px solid rgba(79,143,255,0.25);
                  padding:6px 16px;border-radius:30px;font-size:13px;font-weight:600;
                  color:var(--accent);margin-bottom:28px;">
        ${statusLabel}
      </div>

      <!-- Progress bar -->
      <div style="max-width:500px;margin:0 auto 16px;">
        <div style="background:var(--surface2);border-radius:8px;height:10px;overflow:hidden;">
          <div id="progressFill"
               style="height:100%;width:${pct}%;border-radius:8px;
                      background:linear-gradient(90deg,var(--accent),var(--accent2));
                      transition:width 0.6s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;">
          <span id="progressMsg" style="font-size:12px;color:var(--muted);">${_esc(message)}</span>
          <span id="progressPct" style="font-size:12px;font-weight:700;color:var(--accent);">${pct}%</span>
        </div>
      </div>

      <!-- Step indicators -->
      <div style="display:flex;justify-content:center;gap:8px;margin-bottom:28px;flex-wrap:wrap;">
        ${stepsHtml}
      </div>

      <!-- Winny comment -->
      <div class="winny-comment" style="text-align:left;max-width:500px;margin:0 auto 24px;">
        <svg width="36" height="36" viewBox="0 0 36 36" style="flex-shrink:0">
          <rect width="36" height="36" rx="10" fill="rgba(79,143,255,0.15)"/>
          <path d="M18 7l-7 3.5v5c0 4.4 2.8 8.5 7 9.5 4.2-1 7-5.1 7-9.5v-5L18 7z" fill="#4f8fff"/>
          <path d="M15 17.5l2.5 2.5 5-5" stroke="white" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p style="font-size:13px;line-height:1.7;">
          Hang tight! I'm downloading the package, extracting APIs and permissions,
          then computing the Risk Score. Usually done in <strong>~2 minutes</strong>. 🔍
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
    fill.style.width = `${pct}%`;
    fill.style.background = status === 'failed'
      ? '#ef4444'
      : 'linear-gradient(90deg,var(--accent),var(--accent2))';
  }
  if (msg)   msg.textContent   = message || '';
  if (pctEl) pctEl.textContent = `${pct}%`;
}

window._cancelPolling = function() {
  if (_pollTimer) clearInterval(_pollTimer);
  _pollTimer = _activeJobId = null;
  document.getElementById('results').style.display = 'none';
};

// ════════════════════════════════════════
// POLLING LOOP
// ════════════════════════════════════════
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
      await _onComplete(storeId, appName);

    } else if (job.status === 'failed') {
      clearInterval(_pollTimer);
      _pollTimer = _activeJobId = null;
      _onFailed(appName, job.message || job.error_detail || 'Unknown error');
    }
  }, POLL_MS);
}

async function _onComplete(storeId, appName) {
  // 1. Try exact match by microsoft_store_id
  let appData = null;
  try {
    const res  = await fetch(
      `${SUPABASE_URL}/rest/v1/app_analysis?microsoft_store_id=eq.${encodeURIComponent(storeId)}&limit=1&select=*`,
      { headers: HEADERS }
    );
    const rows = await res.json();
    if (rows?.length) appData = rowToApp(rows[0]);
  } catch {}

  // 2. Fallback: fuzzy name match (existing fetchApp from search.js)
  if (!appData) appData = await fetchApp(appName);

  const inner = document.getElementById('resultsInner');
  if (appData) {
    inner.innerHTML = buildResult(appData);
    animateRs(appData.rs);
    setWinny('done', appData.name, appData.verdict);
    if (appData.verdict === 'highrisk')
      showAlternatives(appData.rawCategory, appData.rawName, inner);
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
        <strong style="color:var(--text);">${_esc(appName)}</strong>.
      </div>
      <code style="display:block;font-size:11px;background:var(--surface2);
                   padding:8px 16px;border-radius:8px;max-width:420px;
                   margin:0 auto 24px;word-break:break-word;color:var(--muted);">
        ${_esc(errorMsg)}
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

// ════════════════════════════════════════
// SUPABASE JOB HELPERS
// Reuses SUPABASE_URL + HEADERS from search.js
// ════════════════════════════════════════
async function _createJob(storeId, appName) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/analysis_jobs`, {
      method:  'POST',
      headers: { ...HEADERS, 'Prefer': 'return=representation' },
      body:    JSON.stringify({
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

// ════════════════════════════════════════
// UTIL
// ════════════════════════════════════════
function _esc(s) {
  return String(s || '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])
  );
}
