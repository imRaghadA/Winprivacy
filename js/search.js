// ── WinPrivacy Search Engine ──
// Replaces the remote API call with a local search over APPS_DB (from data/apps.js)
// This file must be loaded AFTER data/apps.js in index.html

// Searches APPS_DB by matching query against search_keys, name, publisher, category
function findApp(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // 1. Exact match on search_keys (highest priority)
  const exact = APPS_DB.find(app =>
    app.search_keys.some(k => k === q)
  );
  if (exact) return exact;

  // 2. Partial match on search_keys
  const keyMatch = APPS_DB.find(app =>
    app.search_keys.some(k => k.includes(q) || q.includes(k))
  );
  if (keyMatch) return keyMatch;

  // 3. Partial match on name or publisher
  const nameMatch = APPS_DB.find(app =>
    app.name.toLowerCase().includes(q) ||
    app.publisher.toLowerCase().includes(q)
  );
  return nameMatch || null;
}

// Converts a local DB entry into the shape index.html's buildResult() expects
function rowToApp(row) {
  return {
    name:      row.name,
    publisher: row.publisher,
    version:   row.version,
    cat:       { en: row.category_en, ar: row.category_ar },
    date:      row.date_reviewed,
    ser:       row.ser,
    safety:    row.safety,
    exposure:  row.exposure,
    risk:      row.risk,
    verdict:   row.verdict,
    label:     { en: row.label_en, ar: row.label_ar },
    perms:     (row.permissions || []).map(p => ({
      name:  { en: p.name_en, ar: p.name_ar },
      icon:  p.icon,
      level: p.level,
      risk:  p.risk
    })),
    comment:   { en: row.comment_en, ar: row.comment_ar }
  };
}

// Override fetchApp() from index.html — same function name, now reads locally
async function fetchApp(name) {
  // Simulate a tiny delay so Winny's animation has time to play
  await new Promise(r => setTimeout(r, 600));
  const row = findApp(name);
  return row ? rowToApp(row) : null;
}
