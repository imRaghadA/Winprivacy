// ================================================================
//  search.js — Integration patch for Live Analysis
//  Add these imports at the top and replace buildNotFound()
// ================================================================

// ── 1. Add this import at the TOP of search.js ──────────────────
import { startLiveAnalysis } from "./jobTracker.js";


// ── 2. Replace your existing buildNotFound() with this ──────────

function buildNotFound(query, storeId) {
  // storeId: pass the Microsoft Store Product ID if you have it,
  //          otherwise we use the search query as a fallback key.
  const msStoreId = storeId || deriveStoreId(query);

  const wrapper = document.createElement("div");
  wrapper.className = "not-found-wrapper";
  wrapper.innerHTML = `
    <div class="nf-header">
      <span class="nf-icon">🤖</span>
      <div>
        <div class="nf-title" data-en="Not in our database yet" data-ar="غير موجود في قاعدة بياناتنا بعد">
          Not in our database yet
        </div>
        <div class="nf-sub" data-en="Winny can analyse it live!" data-ar="ويني يمكنه تحليله الآن!">
          Winny can analyse it live!
        </div>
      </div>
    </div>

    <div id="analysis-progress-zone"></div>

    <button class="btn-analyse" id="btn-start-analysis">
      <span data-en="Analyse now" data-ar="تحليل الآن">Analyse now</span>
    </button>
  `;

  const btn  = wrapper.querySelector("#btn-start-analysis");
  const zone = wrapper.querySelector("#analysis-progress-zone");

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Starting…";

    await startLiveAnalysis(
      msStoreId,          // microsoft_store_id
      query,              // app_name shown to user
      zone,               // DOM element for progress card
      async (finishedStoreId) => {
        // Worker is done — re-run the search to show results
        const app = await fetchAppByRaw(finishedStoreId);
        if (app) {
          showAppResult(app);   // your existing result renderer
        } else {
          zone.innerHTML = `<p style="color:var(--text-muted)">
            Analysis saved! Search again to see results.
          </p>`;
        }
      }
    );
  });

  return wrapper;
}


// ── 3. Helper: derive a Store ID from the search query ──────────
//  If your search already returns a microsoft_store_id, pass it directly.
//  Otherwise this creates a stable key from the app name.

function deriveStoreId(query) {
  // If you have the real MS Store Product ID (e.g. "9NBLGGH4NNS1"),
  // make sure to pass it from your fetchApp() response instead.
  // This fallback just normalizes the name for the DB key.
  return query.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 64);
}


// ── 4. How your search flow calls buildNotFound ──────────────────
//  (This shows the pattern — adjust to match your existing liveSearch())

async function handleSearch(query) {
  const app = await fetchApp(query);

  if (app) {
    showAppResult(app);
    return;
  }

  // App not in DB — check if MS Store ID was returned in the "not found" response
  // If your API returns a store_id hint, pass it here:
  const storeId = null; // replace with e.g. result?.store_id if available

  const notFoundEl = buildNotFound(query, storeId);
  document.getElementById("result-container").innerHTML = "";
  document.getElementById("result-container").appendChild(notFoundEl);
}
