// ── WinPrivacy: Winny Chat Panel (Claude-powered) ──
// Save as js/winny-chat.js
// Add <script src="js/winny-chat.js"></script> after search.js in index.html
// Add <div id="winnyChatSection"></div> between #results and .how-section in index.html

(function () {
  /* ════════════════════════════════════════
     CONFIG
  ════════════════════════════════════════ */
  const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

  /* ════════════════════════════════════════
     STATE
  ════════════════════════════════════════ */
  let chatHistory = [];
  let isTyping    = false;

  /* ════════════════════════════════════════
     INJECT CSS
  ════════════════════════════════════════ */
  const css = document.createElement('style');
  css.textContent = `
  #winnyChatSection {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 40px 100px;
  }
  .chat-section-label {
    font-family: var(--font-display);
    font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1.4px;
    color: var(--accent); margin-bottom: 10px;
  }
  .chat-section-title {
    font-family: var(--font-display);
    font-size: 30px; font-weight: 800;
    letter-spacing: -0.6px; margin-bottom: 28px;
    color: var(--text);
  }
  .winny-chat-card {
    background: var(--surface);
    border: 0.5px solid var(--border2);
    border-radius: 28px;
    overflow: hidden;
    display: grid;
    grid-template-columns: 260px 1fr;
    min-height: 540px;
    box-shadow: 0 8px 48px rgba(0,0,0,0.18);
  }
  body.light .winny-chat-card { box-shadow: 0 4px 32px rgba(20,50,160,0.08); }

  /* Sidebar */
  .winny-chat-sidebar {
    background: linear-gradient(160deg, #0c1525 0%, #101e38 60%, #090f1e 100%);
    border-right: 0.5px solid var(--border);
    display: flex; flex-direction: column;
    align-items: center; padding: 32px 20px 24px;
    position: relative; overflow: hidden;
  }
  body.light .winny-chat-sidebar {
    background: linear-gradient(160deg, #dde6fb 0%, #c5d5f5 100%);
  }
  .winny-chat-sidebar::before {
    content:''; position:absolute; inset:0;
    background-image: linear-gradient(rgba(79,143,255,0.05) 1px,transparent 1px),
                      linear-gradient(90deg,rgba(79,143,255,0.05) 1px,transparent 1px);
    background-size:28px 28px; pointer-events:none;
  }
  .winny-chat-sidebar::after {
    content:''; position:absolute; top:50px; left:50%;
    transform:translateX(-50%); width:200px; height:200px;
    background:radial-gradient(circle,rgba(79,143,255,0.15) 0%,transparent 70%);
    border-radius:50%; pointer-events:none;
  }
  .sidebar-winny-svg {
    position:relative; z-index:1; margin-bottom:16px;
    filter: drop-shadow(0 8px 28px rgba(79,143,255,0.3));
    animation: sidebarBob 3.2s ease-in-out infinite;
  }
  @keyframes sidebarBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
  .sidebar-name {
    font-family:var(--font-display); font-size:20px; font-weight:800;
    color:#e8edf8; letter-spacing:-0.4px; text-align:center;
    position:relative; z-index:1; margin-bottom:4px;
  }
  body.light .sidebar-name { color:var(--text); }
  .sidebar-tagline {
    font-size:12px; color:rgba(110,140,190,0.8); text-align:center;
    position:relative; z-index:1; line-height:1.5; margin-bottom:16px; white-space:pre-line;
  }
  body.light .sidebar-tagline { color:var(--muted); }
  .sidebar-status {
    display:inline-flex; align-items:center; gap:6px;
    background:rgba(62,207,142,0.12); border:0.5px solid rgba(62,207,142,0.3);
    border-radius:20px; padding:5px 12px;
    font-size:11px; color:var(--safe); font-weight:600;
    position:relative; z-index:1; margin-bottom:24px;
  }
  .s-dot { width:6px;height:6px;border-radius:50%;background:var(--safe);animation:pulse 2s infinite; }
  .sidebar-caps { position:relative;z-index:1;width:100%;display:flex;flex-direction:column;gap:7px; }
  .cap-chip {
    background:rgba(79,143,255,0.07); border:0.5px solid rgba(79,143,255,0.16);
    border-radius:10px; padding:9px 12px;
    display:flex; align-items:center; gap:8px;
    font-size:12px; color:rgba(170,195,235,0.85); line-height:1.4;
  }
  body.light .cap-chip { background:rgba(37,99,235,0.06); border-color:rgba(37,99,235,0.15); color:var(--muted); }
  .cap-chip-icon { font-size:14px; flex-shrink:0; }

  /* Chat main */
  .winny-chat-main { display:flex; flex-direction:column; background:var(--bg); }
  .winny-chat-messages {
    flex:1; overflow-y:auto; padding:24px 20px 12px;
    display:flex; flex-direction:column; gap:12px; min-height:340px;
    scrollbar-width:thin; scrollbar-color:var(--border2) transparent;
  }
  .winny-chat-messages::-webkit-scrollbar{width:4px}
  .winny-chat-messages::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px}
  .cmsg { display:flex; gap:9px; max-width:90%; animation:msgIn 0.2s ease; }
  @keyframes msgIn { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
  .cmsg.user  { align-self:flex-end;  flex-direction:row-reverse; }
  .cmsg.winny { align-self:flex-start; }
  .cmsg-av {
    width:28px;height:28px;border-radius:8px;
    background:rgba(79,143,255,0.12);
    display:flex;align-items:center;justify-content:center;
    font-size:14px;flex-shrink:0;align-self:flex-end;
  }
  .cmsg-bubble {
    padding:10px 15px; border-radius:18px;
    font-size:14px; line-height:1.6; color:var(--text); word-break:break-word;
  }
  .cmsg.user .cmsg-bubble {
    background:var(--accent); color:#fff; border-radius:18px 18px 4px 18px;
  }
  .cmsg.winny .cmsg-bubble {
    background:var(--surface); border:0.5px solid var(--border2);
    border-radius:4px 18px 18px 18px;
  }

  /* Inline app card */
  .chat-app-card {
    margin-top:10px; background:var(--surface2);
    border:0.5px solid var(--border2); border-radius:14px; padding:14px 16px; font-size:13px;
  }
  .cac-name { font-family:var(--font-display); font-size:15px; font-weight:800; margin-bottom:8px; }
  .cac-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; color:var(--muted); font-size:12px; }
  .cac-row strong { color:var(--text); }
  .cac-bar { height:5px; border-radius:3px; background:var(--surface); margin-top:8px; overflow:hidden; }
  .cac-fill { height:100%; border-radius:3px; transition:width 0.8s ease; }
  .cac-btn {
    margin-top:10px; background:var(--accent); color:white;
    border:none; cursor:pointer; padding:7px 16px; border-radius:20px;
    font-family:inherit; font-size:12px; font-weight:600; transition:background 0.2s;
  }
  .cac-btn:hover { background:var(--accent2); }

  /* Typing */
  .tdots { display:flex;gap:5px;align-items:center;padding:4px 2px; }
  .tdots span {
    width:7px;height:7px;border-radius:50%;background:var(--muted);opacity:0.5;
    animation:tdB 1.2s infinite;
  }
  .tdots span:nth-child(2){animation-delay:.2s}
  .tdots span:nth-child(3){animation-delay:.4s}
  @keyframes tdB{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}

  /* Suggestions */
  .winny-chat-sugs { display:flex;flex-wrap:wrap;gap:6px;padding:0 20px 12px; }
  .chat-sug {
    background:rgba(79,143,255,0.07); border:0.5px solid rgba(79,143,255,0.22);
    color:var(--accent2); font-size:12px; padding:6px 13px;
    border-radius:20px; cursor:pointer; transition:all 0.18s; font-family:inherit;
  }
  .chat-sug:hover { background:rgba(79,143,255,0.16);border-color:var(--accent);color:var(--accent); }

  /* Input */
  .winny-chat-input-row {
    display:flex;gap:9px;padding:12px 18px;
    border-top:0.5px solid var(--border);background:var(--surface);align-items:flex-end;
  }
  #winnyChatInput {
    flex:1; background:var(--surface2); border:1px solid var(--border);
    border-radius:22px; padding:10px 17px; color:var(--text);
    font-family:inherit; font-size:14px; outline:none; resize:none;
    max-height:90px; overflow-y:auto; line-height:1.45; transition:border-color 0.2s;
  }
  #winnyChatInput:focus{border-color:var(--accent)}
  #winnyChatInput::placeholder{color:var(--muted)}
  #winnyChatSendBtn {
    background:var(--accent);border:none;cursor:pointer;
    width:38px;height:38px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    flex-shrink:0;transition:background 0.2s,transform 0.15s;
  }
  #winnyChatSendBtn:hover{background:var(--accent2);transform:scale(1.08)}
  #winnyChatSendBtn:disabled{background:var(--border2);cursor:not-allowed;transform:none}

  @media(max-width:860px){
    #winnyChatSection{padding:0 20px 60px}
    .winny-chat-card{grid-template-columns:1fr}
    .winny-chat-sidebar{flex-direction:row;flex-wrap:wrap;justify-content:center;padding:20px}
    .sidebar-winny-svg{width:90px;height:100px}
    .sidebar-caps{flex-direction:row;flex-wrap:wrap}
    .cap-chip{flex:1 1 120px}
  }
  `;
  document.head.appendChild(css);

  /* ════════════════════════════════════════
     BUILD UI
  ════════════════════════════════════════ */
  function build() {
    const sec = document.getElementById('winnyChatSection');
    if (!sec) return;

    sec.innerHTML = `
      <div class="chat-section-label" id="chatLbl">AI Assistant</div>
      <div class="chat-section-title" id="chatTitle">Chat with Winny</div>
      <div class="winny-chat-card">

        <!-- Sidebar -->
        <div class="winny-chat-sidebar">
          <svg class="sidebar-winny-svg" width="130" height="145" viewBox="0 0 200 220" fill="none">
            <rect x="60" y="130" width="80" height="70" rx="18" fill="#1a2540"/>
            <rect x="60" y="130" width="80" height="70" rx="18" fill="#4f8fff" fill-opacity="0.12"/>
            <path d="M100 145l-16 8v10c0 8.8 6 17 16 19 10-2 16-10.2 16-19v-10l-16-8z" fill="#4f8fff" fill-opacity="0.35"/>
            <path d="M96 163l3 3 6-6" stroke="#6eb8ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="28" y="138" width="34" height="16" rx="8" fill="#1e2d4a"/>
            <rect x="138" y="138" width="34" height="16" rx="8" fill="#1e2d4a"/>
            <circle cx="24" cy="146" r="8" fill="#4f8fff" fill-opacity="0.5"/>
            <circle cx="176" cy="146" r="8" fill="#4f8fff" fill-opacity="0.5"/>
            <rect x="52" y="30" width="96" height="104" rx="30" fill="#1a2845"/>
            <rect x="52" y="30" width="96" height="104" rx="30" fill="#4f8fff" fill-opacity="0.08" stroke="#4f8fff" stroke-width="0.8" stroke-opacity="0.3"/>
            <rect x="62" y="42" width="76" height="74" rx="12" fill="#0d1a2e"/>
            <circle cx="84" cy="65" r="11" fill="#4f8fff" fill-opacity="0.2"/>
            <circle cx="84" cy="65" r="7" fill="#6eb8ff"/>
            <circle cx="84" cy="65" r="4" fill="white"/>
            <circle cx="85.5" cy="63.5" r="1.5" fill="#0d1a2e"/>
            <circle cx="116" cy="65" r="11" fill="#4f8fff" fill-opacity="0.2"/>
            <circle cx="116" cy="65" r="7" fill="#6eb8ff"/>
            <circle cx="116" cy="65" r="4" fill="white"/>
            <circle cx="117.5" cy="63.5" r="1.5" fill="#0d1a2e"/>
            <path d="M86 82 Q100 94 114 82" stroke="#6eb8ff" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            <rect x="44" y="54" width="12" height="22" rx="6" fill="#1a2845" stroke="#4f8fff" stroke-width="0.5" stroke-opacity="0.3"/>
            <rect x="144" y="54" width="12" height="22" rx="6" fill="#1a2845" stroke="#4f8fff" stroke-width="0.5" stroke-opacity="0.3"/>
            <line x1="100" y1="30" x2="100" y2="10" stroke="#4f8fff" stroke-width="2" stroke-linecap="round"/>
            <circle cx="100" cy="8" r="5" fill="#4f8fff"/>
            <circle cx="100" cy="8" r="2.5" fill="white" fill-opacity="0.9"/>
            <rect x="72" y="196" width="22" height="20" rx="8" fill="#1a2845"/>
            <rect x="106" y="196" width="22" height="20" rx="8" fill="#1a2845"/>
            <rect x="68" y="212" width="30" height="10" rx="5" fill="#4f8fff" fill-opacity="0.5"/>
            <rect x="102" y="212" width="30" height="10" rx="5" fill="#4f8fff" fill-opacity="0.5"/>
          </svg>
          <div class="sidebar-name">Winny</div>
          <div class="sidebar-tagline" id="sbTagline">Your Windows Privacy AI\nPowered by Claude</div>
          <div class="sidebar-status"><span class="s-dot"></span><span id="sbStatus">Online · Ready</span></div>
          <div class="sidebar-caps">
            <div class="cap-chip"><span class="cap-chip-icon">🔍</span><span id="cap1">Analyze any app from chat</span></div>
            <div class="cap-chip"><span class="cap-chip-icon">🛡️</span><span id="cap2">Explain permissions & risks</span></div>
            <div class="cap-chip"><span class="cap-chip-icon">💬</span><span id="cap3">Answers in your language</span></div>
          </div>
        </div>

        <!-- Chat -->
        <div class="winny-chat-main">
          <div class="winny-chat-messages" id="winnyChatMessages"></div>
          <div class="winny-chat-sugs" id="winnyChatSugs">
            <button class="chat-sug" id="cs1">What is RS score?</button>
            <button class="chat-sug" id="cs2">Is uTorrent safe?</button>
            <button class="chat-sug" id="cs3">Analyze Discord</button>
            <button class="chat-sug" id="cs4">What is WinPrivacy?</button>
          </div>
          <div class="winny-chat-input-row">
            <textarea id="winnyChatInput" rows="1"
              placeholder="Ask Winny or type an app name to analyze…"></textarea>
            <button id="winnyChatSendBtn">
              <svg width="15" height="15" fill="none" viewBox="0 0 16 16">
                <path d="M14 8L2 2l3 6-3 6 12-6z" fill="white"/>
              </svg>
            </button>
          </div>
        </div>
      </div>`;

    // Wire suggestions
    ['cs1','cs2','cs3','cs4'].forEach(id => {
      const b = document.getElementById(id);
      if (b) b.addEventListener('click', () => sendMessage(b.textContent));
    });
    const inp = document.getElementById('winnyChatInput');
    if (inp) {
      inp.addEventListener('keydown', e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();} });
      inp.addEventListener('input', () => { inp.style.height='auto'; inp.style.height=Math.min(inp.scrollHeight,90)+'px'; });
    }
    document.getElementById('winnyChatSendBtn')?.addEventListener('click', () => sendMessage());

    // Welcome
    setTimeout(postWelcome, 500);
  }

  /* ════════════════════════════════════════
     MESSAGES
  ════════════════════════════════════════ */
  function postWelcome() {
    const isAr = document.documentElement.lang==='ar';
    appendMsg('winny', isAr
      ? 'أهلاً! أنا <strong>ويني</strong> 🤖 مساعدك لخصوصية ويندوز.<br>اسألني عن أي شيء — أو اكتب اسم تطبيق وسأحلله مباشرةً!'
      : 'Hey! I\'m <strong>Winny</strong> 🤖 your Windows privacy AI.<br>Ask me anything — or type an app name and I\'ll analyze it right here!');
  }

  function appendMsg(role, html) {
    const box = document.getElementById('winnyChatMessages');
    if (!box) return;
    const row = document.createElement('div');
    row.className = `cmsg ${role}`;
    row.innerHTML = `<div class="cmsg-av">${role==='winny'?'🤖':'👤'}</div><div class="cmsg-bubble">${html}</div>`;
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
    if (role==='user') { const s=document.getElementById('winnyChatSugs'); if(s) s.style.display='none'; }
  }

  function showTyping() {
    const box = document.getElementById('winnyChatMessages');
    if (!box) return;
    const row = document.createElement('div');
    row.className='cmsg winny'; row.id='winnyTyping';
    row.innerHTML='<div class="cmsg-av">🤖</div><div class="cmsg-bubble"><div class="tdots"><span></span><span></span><span></span></div></div>';
    box.appendChild(row); box.scrollTop=box.scrollHeight;
  }
  function hideTyping() { document.getElementById('winnyTyping')?.remove(); }

  /* ════════════════════════════════════════
     DETECT APP INTENT
  ════════════════════════════════════════ */
  function extractApp(text) {
    const pats = [
      /^analyze\s+(.+)$/i, /^check\s+(.+)$/i, /^scan\s+(.+)$/i,
      /is\s+(.+?)\s+safe/i, /tell me about\s+(.+)/i,
      /what about\s+(.+)/i, /look up\s+(.+)/i,
      /^حلل\s+(.+)$/, /^افحص\s+(.+)$/, /^ابحث عن\s+(.+)$/,
      /هل\s+(.+?)\s+(آمن|safe)/i, /ما رأيك في\s+(.+)/, /معلومات عن\s+(.+)/,
    ];
    for (const p of pats) {
      const m = text.match(p);
      if (m) return m[1].trim().replace(/[?؟.!]$/, '').trim();
    }
    return null;
  }

  /* ════════════════════════════════════════
     SEND
  ════════════════════════════════════════ */
  async function sendMessage(override) {
    if (isTyping) return;
    const inp = document.getElementById('winnyChatInput');
    const text = (override || inp?.value || '').trim();
    if (!text) return;
    if (inp && !override) { inp.value=''; inp.style.height='auto'; }

    appendMsg('user', esc(text));
    chatHistory.push({ role:'user', content:text });
    if (chatHistory.length>20) chatHistory=chatHistory.slice(-20);

    isTyping=true;
    document.getElementById('winnyChatSendBtn').disabled=true;
    if (window._winnyWave) window._winnyWave(500);

    const appQuery = extractApp(text);
    if (appQuery) await handleAppAnalysis(appQuery);
    else          await handleChat();

    isTyping=false;
    document.getElementById('winnyChatSendBtn').disabled=false;
    inp?.focus();
  }

  /* ════════════════════════════════════════
     APP ANALYSIS
  ════════════════════════════════════════ */
  async function handleAppAnalysis(appName) {
    const isAr = document.documentElement.lang==='ar';
    showTyping();
    let d = null;
    try { if (typeof fetchApp==='function') d = await fetchApp(appName); } catch(e){}
    hideTyping();

    if (d) {
      const c = vColor(d.verdict);
      const vl = vLabel(d.verdict, isAr);
      const pct = (d.rs/4*100).toFixed(0);
      const card = `<div class="chat-app-card">
        <div class="cac-name">${esc(d.name)}</div>
        <div class="cac-row"><span>${isAr?'الحكم':'Verdict'}</span><strong style="color:${c}">${vl}</strong></div>
        <div class="cac-row"><span>${isAr?'درجة الخطر':'Risk Score'}</span><strong>${d.rs.toFixed(2)} / 4</strong></div>
        <div class="cac-row"><span>${isAr?'الفئة':'Category'}</span><strong>${esc(d.cat.en)}</strong></div>
        <div class="cac-bar"><div class="cac-fill" style="width:${pct}%;background:${c}"></div></div>
        <button class="cac-btn" onclick="document.getElementById('appInput').value='${esc(d.name)}';runSearch();document.getElementById('results').scrollIntoView({behavior:'smooth'})">
          ${isAr?'🔍 عرض التحليل الكامل':'🔍 View Full Analysis'}
        </button>
      </div>`;
      appendMsg('winny', (isAr
        ? `وجدت <strong>${esc(d.name)}</strong> في قاعدة البيانات:`
        : `Found <strong>${esc(d.name)}</strong> in the database:`) + card);

      // Claude adds a brief comment
      const followUp = isAr
        ? `المستخدم سأل عن ${d.name}. حصل على ${d.rs.toFixed(2)}/4 وحكم "${vl}". ${d.comment.en} أعطه تعليقاً موجزاً بالعربية (جملتان).`
        : `User asked about ${d.name}. Scored ${d.rs.toFixed(2)}/4, verdict "${vl}". ${d.comment.en} Give a brief 2-sentence Winny-style comment.`;
      chatHistory.push({ role:'assistant', content:`[Showed analysis card for ${d.name}]` });
      await callClaude([{role:'user',content:followUp}]);
    } else {
      appendMsg('winny', isAr
        ? `لم أجد <strong>${esc(appName)}</strong> في قاعدة البيانات بعد. يمكنك طلب تحليله من شريط البحث أعلاه! 📩`
        : `I couldn't find <strong>${esc(appName)}</strong> in the database yet. Request an analysis using the search bar above! 📩`);
      chatHistory.push({role:'assistant',content:`App ${appName} not found in DB.`});
    }
  }

  /* ════════════════════════════════════════
     GENERAL CHAT
  ════════════════════════════════════════ */
  async function handleChat() { await callClaude(chatHistory); }

  /* ════════════════════════════════════════
     CLAUDE CALL
  ════════════════════════════════════════ */
  async function callClaude(messages) {
    showTyping();
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'x-api-key':'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',
          'anthropic-version':'2023-06-01',
          'anthropic-dangerous-direct-browser-access':'true'
        },
        body: JSON.stringify({ model:CLAUDE_MODEL, max_tokens:1000, system:sysPrompt(), messages })
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const reply = data?.content?.[0]?.text || '…';
      hideTyping();
      appendMsg('winny', fmt(reply));
      chatHistory.push({role:'assistant',content:reply});
    } catch(e) {
      hideTyping();
      const isAr = document.documentElement.lang==='ar';
      appendMsg('winny', isAr?'عذرًا، حدث خطأ. حاول مرة أخرى! 🔧':'Oops, something went wrong. Try again! 🔧');
    }
  }

  /* ════════════════════════════════════════
     SYSTEM PROMPT
  ════════════════════════════════════════ */
  function sysPrompt() {
    const isAr = document.documentElement.lang==='ar';
    return `You are Winny, the friendly robot mascot of WinPrivacy — a Windows application privacy checker powered by Claude AI.

PERSONALITY: Friendly, knowledgeable, slightly playful. Care about user privacy. Concise answers (2–4 sentences unless depth needed). Occasional emojis.

RS SCORE SYSTEM (0–4):
- 0–0.5 Safe/Very Low  · 0.5–1.5 Normal (Low)  · 1.5–2.5 Normal+ (Medium)
- 2.5–3.5 Anomaly Detected (High)  · 3.5–4.0 High Risk (Very High)
Score based on declared vs actual permission behavior.

CAPABILITIES: Discuss Windows app privacy, permissions (mic/webcam/location/network/etc.), cybersecurity tips, and the WinPrivacy RS system. When the user asks to analyze an app, the system fetches real DB data and shows a card — you add a brief comment. For apps not in DB, suggest using the search bar to request an analysis.

LANGUAGE RULE: Always reply in the SAME language the user writes. Arabic→Arabic, English→English. Never mix.

SCOPE: Only app privacy, Windows security, WinPrivacy topics. Off-topic: "That's outside my expertise, but happy to help with app privacy! 🛡️"
${isAr?'\nIMPORTANT: Reply fully in Arabic.':''}`;
  }

  /* ════════════════════════════════════════
     LANGUAGE SYNC
  ════════════════════════════════════════ */
  function syncLang() {
    const isAr = document.documentElement.lang==='ar';
    const s=(id,en,ar)=>{const e=document.getElementById(id);if(e)e.textContent=isAr?ar:en;};
    s('chatLbl','AI Assistant','المساعد الذكي');
    s('chatTitle','Chat with Winny','تحدث مع ويني');
    s('sbTagline','Your Windows Privacy AI\nPowered by Claude','مساعد خصوصية ويندوز\nمدعوم بـ Claude');
    s('sbStatus','Online · Ready','متصل · جاهز');
    s('cap1','Analyze any app from chat','تحليل أي تطبيق من الشات');
    s('cap2','Explain permissions & risks','شرح الأذونات والمخاطر');
    s('cap3','Answers in your language','يرد بلغتك');
    const sugs=isAr?['ما هو نظام RS؟','هل uTorrent آمن؟','حلل Discord','ما هو WinPrivacy؟']:['What is RS score?','Is uTorrent safe?','Analyze Discord','What is WinPrivacy?'];
    ['cs1','cs2','cs3','cs4'].forEach((id,i)=>{
      const b=document.getElementById(id); if(!b)return;
      b.textContent=sugs[i]; b.onclick=()=>sendMessage(sugs[i]);
    });
    const inp=document.getElementById('winnyChatInput');
    if(inp) inp.placeholder=isAr?'اسأل ويني أو اكتب اسم تطبيق للتحليل…':'Ask Winny or type an app name to analyze…';
  }

  /* ════════════════════════════════════════
     HELPERS
  ════════════════════════════════════════ */
  function vColor(v){ return v==='safe'?'#22c55e':v==='normal'?'#3b82f6':v==='normalplus'?'#eab308':v==='anomaly'?'#f97316':'#ef4444'; }
  function vLabel(v,ar){
    return ({safe:ar?'آمن':'Safe',normal:ar?'طبيعي':'Normal',normalplus:ar?'طبيعي+':'Normal+',anomaly:ar?'شذوذ مكتشف':'Anomaly Detected',highrisk:ar?'خطر مرتفع':'High Risk'})[v]||v;
  }
  function fmt(t){
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/`(.+?)`/g,'<code style="background:var(--surface2);padding:1px 5px;border-radius:4px;font-size:12px;">$1</code>')
      .replace(/\n/g,'<br>');
  }
  function esc(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ════════════════════════════════════════
     OBSERVE LANG
  ════════════════════════════════════════ */
  new MutationObserver(syncLang).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});

  /* ════════════════════════════════════════
     INIT
  ════════════════════════════════════════ */
  function init(){ build(); syncLang(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

  window._winnyChatSend = sendMessage;
})();
