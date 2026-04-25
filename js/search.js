// ── WinPrivacy Search Engine ──
// Queries directly from Supabase app_analysis table

const SUPABASE_URL = 'https://mthksiaihxgyesvxxtbt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10aGtzaWFpaHhneWVzdnh4dGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzg2OTEsImV4cCI6MjA5MjUxNDY5MX0.STu8JYCABANBUkJtKQYYAIg_TVQF5GV-GrsPB2fSI3w';

async function fetchApp(name) {
  const q = name.trim();
  if (!q) return null;

  // Search by app_name using case-insensitive pattern match
  const url = `${SUPABASE_URL}/rest/v1/app_analysis?app_name=ilike.*${encodeURIComponent(q)}*&limit=1&select=*`;

  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows || rows.length === 0) return null;

  // Map Supabase row → shape index.html expects
  return rowToApp(rows[0]);
}

function rowToApp(row) {
  // Map final_decision → verdict key
  const verdictMap = {
    'safe':      'safe',
    'Safe':      'safe',
    'normal':    'normal',
    'Normal':    'normal',
    'Normal+':   'normal',
    'normal+':   'normal',
    'anomaly':   'anomaly',
    'Anomaly':   'anomaly',
    'high risk': 'highrisk',
    'High Risk': 'highrisk',
    'High risk': 'highrisk',
  };

  // Map rs_level → rsLevelKey
  const levelMap = {
    'low':          'Low',
    'Low':          'Low',
    'safe':         'Safe/Very Low',
    'Safe':         'Safe/Very Low',
    'very low':     'Safe/Very Low',
    'Very Low':     'Safe/Very Low',
    'medium':       'Medium',
    'Medium':       'Medium',
    'high':         'High',
    'High':         'High',
    'very high':    'Very High',
    'Very High':    'Very High',
  };

  const verdict    = verdictMap[row.final_decision] || 'normal';
  const rsLevelKey = levelMap[row.rs_level] || 'Medium';

  // Build permission list from effective_permissions string
  // e.g. "microphone, webcam, broadFileSystemAccess, internetClient"
  const permIcons = {
    microphone:                   { icon: '🎙️', risk: 'high'   },
    webcam:                       { icon: '📷', risk: 'high'   },
    privatenetworkclientserver:   { icon: '🔒', risk: 'high'   },
    sharedusercertificates:       { icon: '🔑', risk: 'high'   },
    documentslibrary:             { icon: '📄', risk: 'high'   },
    enterpriseauthentication:     { icon: '🏢', risk: 'high'   },
    videoslibrary:                { icon: '🎬', risk: 'high'   },
    musiclibrary:                 { icon: '🎵', risk: 'medium' },
    removablestorage:             { icon: '💾', risk: 'high'   },
    broadfilesystemaccess:        { icon: '📁', risk: 'high'   },
    internetclient:               { icon: '🌐', risk: 'low'    },
    internetclientserver:         { icon: '🔗', risk: 'medium' },
    runfulltrust:                 { icon: '⚙️', risk: 'medium' },
    systemmanagement:             { icon: '🖥️', risk: 'medium' },
    location:                     { icon: '📍', risk: 'medium' },
    appointments:                 { icon: '📅', risk: 'medium' },
    usernotificationlistener:     { icon: '🔔', risk: 'high'   },
    backgroundmediaplayback:      { icon: '🎵', risk: 'medium' },
    contacts:                     { icon: '👤', risk: 'medium' },
    phonecall:                    { icon: '📞', risk: 'high'   },
    camera:                       { icon: '📷', risk: 'high'   },
  };

  const riskLevels = { high: 85, medium: 55, low: 25 };

  const permissions = row.effective_permissions
    ? row.effective_permissions
        .split(',')
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => {
          const key = p.toLowerCase().replace(/[^a-z]/g, '');
          const meta = permIcons[key] || { icon: '🔧', risk: 'medium' };
          // Format name: camelCase → Title Case words
          const name = p.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
          return {
            name: { en: name, ar: name },
            icon: meta.icon,
            risk: meta.risk,
            level: riskLevels[meta.risk]
          };
        })
    : [];

  // Build Winny comment from real data
  const anomCount = row.anomalous_count || 0;
  const permCount = row.permission_count || 0;
  const riskReason = row.risk_reason || '';
  const customFlags = row.custom_flags || '';

  let commentEn = '';
  if (verdict === 'highrisk') {
    commentEn = `⚠️ <strong>${row.app_name}</strong> is flagged HIGH RISK with ${permCount} permissions, ${anomCount} anomalous. Risk reasons: ${riskReason}. ${customFlags ? 'Custom flags: ' + customFlags + '.' : ''} <strong class="hl">Do not install.</strong>`;
  } else if (verdict === 'anomaly') {
    commentEn = `<strong>${row.app_name}</strong> has ${permCount} permissions with ${anomCount} anomalous pattern(s) detected. ${riskReason ? 'Flagged: ' + riskReason + '.' : ''} Use with awareness.`;
  } else if (verdict === 'normal') {
    commentEn = `<strong>${row.app_name}</strong> behaves normally for its category with ${permCount} permissions. ${anomCount > 0 ? anomCount + ' slightly unusual permission(s) noted.' : 'No anomalies detected.'}`;
  } else {
    commentEn = `<strong>${row.app_name}</strong> is safe — ${permCount} permissions, all within expected range. No anomalies detected. ✅`;
  }

  return {
    name:       row.app_name,
    publisher:  row.category || 'Unknown',
    version:    '—',
    cat:        { en: row.category || 'Windows App', ar: row.category || 'تطبيق ويندوز' },
    date:       '2025',
    rs:         parseFloat(row.rs) || 0,
    rsLevelKey: rsLevelKey,
    verdict:    verdict,
    permissions: permissions,
    comment:    { en: commentEn, ar: commentEn }
  };
}
