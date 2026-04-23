// ── WinPrivacy Search Engine ──
// Reads directly from APPS_DB in data/apps.js

function findApp(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // 1. Exact match on search_keys
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
  return APPS_DB.find(app =>
    app.name.toLowerCase().includes(q) ||
    app.publisher.toLowerCase().includes(q)
  ) || null;
}

// Override fetchApp() — returns the row directly, no transformation needed
async function fetchApp(name) {
  await new Promise(r => setTimeout(r, 700));
  return findApp(name);
}
