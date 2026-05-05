// ============================================================
//  WinPrivacy — Live Analysis Job Tracker
//  Bridges: Frontend (GitHub) ↔ analysis_jobs (Supabase) ↔ Worker (Windows PC)
// ============================================================

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 200; // ~10 minutes

// ── Supabase REST helper ─────────────────────────────────────

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }
  return res.json();
}

// ── Submit a new analysis job ────────────────────────────────

/**
 * Creates a job in analysis_jobs and returns the job_id.
 * Called when search returns no results for a Store ID.
 *
 * @param {string} microsoftStoreId  e.g. "9NBLGGH4NNS1"
 * @param {string} appName           Display name from user / store listing
 * @returns {Promise<string>}        UUID job_id
 */
export async function submitAnalysisJob(microsoftStoreId, appName) {
  const existing = await sbFetch(
    `analysis_jobs?microsoft_store_id=eq.${microsoftStoreId}&status=neq.error&select=job_id,status&limit=1`
  );

  if (existing.length > 0) {
    // Already queued or done — reuse
    return existing[0].job_id;
  }

  const rows = await sbFetch("analysis_jobs", {
    method: "POST",
    body: JSON.stringify({
      microsoft_store_id: microsoftStoreId,
      app_name: appName,
      status: "queued",
      progress: 0,
      message: "Waiting in queue…",
    }),
  });

  return rows[0].job_id;
}

// ── Fetch current job row ────────────────────────────────────

/**
 * @param {string} jobId
 * @returns {Promise<JobRow|null>}
 */
export async function fetchJobStatus(jobId) {
  const rows = await sbFetch(
    `analysis_jobs?job_id=eq.${jobId}&select=job_id,status,progress,message,error_detail,completed_at&limit=1`
  );
  return rows[0] || null;
}

// ── Poll until terminal state ────────────────────────────────

/**
 * Polls analysis_jobs every POLL_INTERVAL_MS.
 * Calls onProgress(job) on every tick.
 * Resolves when status is "complete" or "error".
 *
 * @param {string}   jobId
 * @param {Function} onProgress  (job: JobRow) => void
 * @returns {Promise<JobRow>}
 */
export async function watchJob(jobId, onProgress) {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const job = await fetchJobStatus(jobId);

        if (!job) {
          reject(new Error("Job not found: " + jobId));
          return;
        }

        onProgress(job);

        if (job.status === "complete" || job.status === "error") {
          resolve(job);
          return;
        }

        attempts++;
        if (attempts >= MAX_POLL_ATTEMPTS) {
          reject(new Error("Polling timeout — worker may be offline."));
          return;
        }

        setTimeout(tick, POLL_INTERVAL_MS);
      } catch (err) {
        reject(err);
      }
    };

    tick();
  });
}

// ── UI Integration ───────────────────────────────────────────
//  Call this from search.js when fetchApp() returns null.
//  Replaces the "not found" panel with a live progress card.

/**
 * High-level entry point for search.js
 *
 * @param {string} microsoftStoreId
 * @param {string} appName
 * @param {HTMLElement} container   Where to render the progress UI
 * @param {Function} onComplete     (appData) => void   called when worker finishes
 */
export async function startLiveAnalysis(microsoftStoreId, appName, container, onComplete) {
  renderProgressCard(container, {
    status: "queued",
    progress: 0,
    message: "Submitting request…",
  });

  let jobId;
  try {
    jobId = await submitAnalysisJob(microsoftStoreId, appName);
  } catch (err) {
    renderError(container, "Failed to queue analysis: " + err.message);
    return;
  }

  try {
    const finalJob = await watchJob(jobId, (job) => {
      renderProgressCard(container, job);
    });

    if (finalJob.status === "complete") {
      // Fetch the newly saved app from app_analysis and hand to caller
      await onComplete(microsoftStoreId);
    } else {
      renderError(container, finalJob.error_detail || "Analysis failed.");
    }
  } catch (err) {
    renderError(container, err.message);
  }
}

// ── Progress Card Renderer ───────────────────────────────────

const STAGE_LABELS = {
  queued:     { icon: "⏳", label: "Waiting in queue" },
  downloading:{ icon: "📥", label: "Downloading app" },
  extracting: { icon: "📦", label: "Extracting package" },
  scanning:   { icon: "🔍", label: "Scanning permissions & APIs" },
  scoring:    { icon: "📊", label: "Calculating risk score" },
  saving:     { icon: "💾", label: "Saving results" },
  complete:   { icon: "✅", label: "Analysis complete!" },
  error:      { icon: "❌", label: "Analysis failed" },
};

function renderProgressCard(container, job) {
  const stage = STAGE_LABELS[job.status] || STAGE_LABELS.queued;
  const pct   = Math.min(100, Math.max(0, job.progress || 0));
  const isErr = job.status === "error";

  container.innerHTML = `
    <div class="analysis-job-card" data-status="${job.status}">
      <div class="ajc-header">
        <span class="ajc-icon">${stage.icon}</span>
        <div class="ajc-info">
          <span class="ajc-stage">${stage.label}</span>
          <span class="ajc-msg">${escHtml(job.message || "")}</span>
        </div>
        <span class="ajc-pct">${pct}%</span>
      </div>

      <div class="ajc-bar-track">
        <div class="ajc-bar-fill ${isErr ? "err" : ""}" style="width:${pct}%"></div>
      </div>

      ${isErr && job.error_detail ? `
        <div class="ajc-error-detail">${escHtml(job.error_detail)}</div>
      ` : ""}

      <div class="ajc-steps">
        ${Object.entries(STAGE_LABELS)
          .filter(([k]) => k !== "error")
          .map(([k, v]) => `
            <span class="ajc-step ${stepClass(k, job.status)}">
              ${v.icon}
            </span>
          `).join("")}
      </div>
    </div>
  `;
}

function stepClass(key, current) {
  const order = Object.keys(STAGE_LABELS).filter(k => k !== "error");
  const ki = order.indexOf(key);
  const ci = order.indexOf(current);
  if (ki < ci)  return "done";
  if (ki === ci) return "active";
  return "pending";
}

function renderError(container, msg) {
  renderProgressCard(container, { status: "error", progress: 0, message: msg, error_detail: msg });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── CSS (inject once) ────────────────────────────────────────

(function injectStyles() {
  if (document.getElementById("ajc-styles")) return;
  const s = document.createElement("style");
  s.id = "ajc-styles";
  s.textContent = `
    .analysis-job-card {
      font-family: 'DM Sans', 'Tajawal', sans-serif;
      background: var(--bg-card, #1a1a2e);
      border: 1px solid var(--border, rgba(255,255,255,0.08));
      border-radius: 16px;
      padding: 20px 24px;
      margin: 24px 0;
      transition: border-color 0.3s;
    }
    .analysis-job-card[data-status="complete"] { border-color: rgba(29,158,117,0.4); }
    .analysis-job-card[data-status="error"]    { border-color: rgba(216,90,48,0.4); }

    .ajc-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .ajc-icon { font-size: 22px; line-height: 1; }
    .ajc-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .ajc-stage {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary, #e8e8f0);
    }
    .ajc-msg {
      font-size: 12px;
      color: var(--text-muted, #888);
    }
    .ajc-pct {
      font-size: 13px;
      font-weight: 600;
      color: var(--accent, #1d9e75);
      min-width: 36px;
      text-align: right;
    }

    .ajc-bar-track {
      background: rgba(255,255,255,0.06);
      border-radius: 100px;
      height: 6px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    .ajc-bar-fill {
      height: 100%;
      border-radius: 100px;
      background: linear-gradient(90deg, #1d9e75, #5dcaa5);
      transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
    }
    .ajc-bar-fill.err { background: linear-gradient(90deg, #d85a30, #f09975); }

    .ajc-error-detail {
      font-size: 12px;
      color: #d85a30;
      background: rgba(216,90,48,0.08);
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 12px;
    }

    .ajc-steps {
      display: flex;
      gap: 8px;
      justify-content: center;
    }
    .ajc-step { font-size: 18px; transition: opacity 0.3s, transform 0.3s; }
    .ajc-step.pending { opacity: 0.2; }
    .ajc-step.active  { opacity: 1; transform: scale(1.2); }
    .ajc-step.done    { opacity: 0.6; }
  `;
  document.head.appendChild(s);
})();
