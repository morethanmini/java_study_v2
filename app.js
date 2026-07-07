(function () {
  /* ============ 현재 챕터 상태 ============ */
  var currentCh = 1;
  var chCollapsed = false;
  var SERVER_URL = "http://localhost:3000/run";
  var serverAvailable = false;

  function checkServer() {
    fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: 'public class Main { public static void main(String[] args) { System.out.println("ok"); } }',
      }),
      signal: AbortSignal.timeout(2000),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        serverAvailable = d.output === "ok";
        updateServerBadge();
      })
      .catch(function () {
        serverAvailable = false;
        updateServerBadge();
      });
  }

  function updateServerBadge() {
    var badge = document.getElementById("server-badge");
    if (!badge) return;
    badge.textContent = serverAvailable
      ? "● 실행 채점"
      : "● regex 채점 (서버 꺼짐)";
    badge.style.color = serverAvailable ? "#4caf50" : "#aaa";
  }

  function buildJavaCode(q, userInput) {
    var lines = [];
    lines.push("import java.io.*;");
    lines.push("import java.util.*;");
    lines.push("import java.util.stream.*;");
    lines.push("import java.util.function.*;");
    lines.push("import java.lang.annotation.*;");
    (q.topLevel || []).forEach(function (l) { lines.push(l); });
    if (q.userInputAtTopLevel) {
      userInput.split("\n").forEach(function (l) { lines.push(l); });
    }
    lines.push("public class Main {");
    (q.classLevel || []).forEach(function (l) {
      var line = /^\s*class\s/.test(l) ? "static " + l.trim() : l;
      lines.push("  " + line);
    });
    if (q.userInputAtClassLevel) {
      userInput.split("\n").forEach(function (l, i) {
        if (i === 0 && /^\s*class\s/.test(l)) {
          lines.push("  static " + l.trim());
        } else {
          lines.push("  " + l);
        }
      });
    }
    if (q.methodWrapper) {
      q.methodWrapper.forEach(function (l) {
        if (l === "~~~") {
          userInput.split("\n").forEach(function (ul) {
            lines.push("    " + ul);
          });
        } else {
          lines.push("  " + l);
        }
      });
    }
    lines.push(
      "  public static void main(String[] args) throws Exception {",
    );
    (q.before || []).forEach(function (l) {
      lines.push("    " + l);
    });
    if (!q.userInputAtClassLevel && !q.methodWrapper && !q.userInputAtTopLevel) {
      userInput.split("\n").forEach(function (l) {
        lines.push("    " + l);
      });
    }
    (q.after || []).forEach(function (l) {
      lines.push("    " + l);
    });
    lines.push("  }");
    lines.push("}");
    return lines.join("\n");
  }

  function getUserInputStartLine(q) {
    var n = 4; // imports
    n += (q.topLevel || []).length;
    if (q.userInputAtTopLevel) return n + 1;
    n += 1; // public class Main {
    n += (q.classLevel || []).length;
    if (q.userInputAtClassLevel) return n + 1;
    n += 1; // public static void main
    if (q.methodWrapper) {
      for (var i = 0; i < q.methodWrapper.length; i++) {
        if (q.methodWrapper[i] === '~~~') break;
        n += 1;
      }
      return n + 1;
    }
    n += (q.before || []).length;
    return n + 1;
  }

  function parseErrorLines(errText) {
    var lines = [];
    var re = /Main\.java:(\d+):/g;
    var m;
    while ((m = re.exec(errText)) !== null) {
      var ln = parseInt(m[1], 10);
      if (lines.indexOf(ln) === -1) lines.push(ln);
    }
    return lines;
  }

  function gradeByExecution(q, input) {
    return fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: buildJavaCode(q, input) }),
      signal: AbortSignal.timeout(5000),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        var out = d.output ? d.output.trim() : "";
        var err = d.error ? d.error.trim() : "";
        if (!out && err)
          return { pass: false, output: "⚠ " + err, errorLines: parseErrorLines(err) };
        return { pass: out === String(q.expected).trim(), output: out, errorLines: [] };
      })
      .catch(function () {
        return null;
      });
  }
  var LEVELS = CHAPTER_DATA[1].levels;
  var QUESTIONS = CHAPTER_DATA[1].questions;
  var STORAGE_KEY = CHAPTER_DATA[1].storageKey;
  var BOOKMARK_KEY = CHAPTER_DATA[1].bookmarkKey;

  /* ============ 전체개요 버튼 SVG 물결 (동기 초기화) ============ */
  (function () {
    var btn = document.querySelector('.ch-btn[data-ch="0"]');
    if (!btn) return;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'ov-wave-svg');
    svg.setAttribute('preserveAspectRatio', 'none');
    var wavePath = document.createElementNS(ns, 'path');
    wavePath.setAttribute('fill', 'rgba(77,163,212,0.45)');
    svg.appendChild(wavePath);
    btn.insertBefore(svg, btn.firstChild);
    var phase = 0;
    function tick() {
      var W = btn.offsetWidth, H = btn.offsetHeight;
      var pctStr = btn.style.getPropertyValue('--ch-pct');
      var pctVal = parseFloat(pctStr) || 0;
      if (pctVal === 0) { wavePath.setAttribute('d', ''); return; }
      var fillX = W * pctVal / 100;
      var amp = 5, period = H * 1.6, steps = 30;
      var d = 'M0,0 L' + fillX + ',0 ';
      for (var i = 0; i <= steps; i++) {
        var y = (i / steps) * H;
        var x = fillX + Math.sin((y / period) * Math.PI * 2 + phase) * amp;
        d += 'L' + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
      }
      d += 'L0,' + H + ' Z';
      wavePath.setAttribute('d', d);
      phase -= 0.04;
    }
    setInterval(tick, 16);
  })();

  /* ============ 앱 상태 ============ */
  var state = {
    loaded: false,
    progress: {},
    inputs: {},
    revealed: {},
    bookmarks: {},
    level: 0,
    index: 0,
    log: [],
    reviewMode: false,
    bookmarkMode: false,
  };

  /* ============ 저장소 ============ */
  var store = {
    get: function (key) {
      if (window.storage && window.storage.get) {
        return window.storage.get(key, false).then(function (res) {
          return res && res.value ? res.value : null;
        });
      }
      return Promise.resolve(localStorage.getItem(key));
    },
    set: function (key, val) {
      if (window.storage && window.storage.set)
        return window.storage.set(key, val, false);
      try {
        localStorage.setItem(key, val);
      } catch (e) {}
      return Promise.resolve();
    },
  };

  async function loadProgress() {
    try {
      var v = await store.get(STORAGE_KEY);
      if (v) state.progress = JSON.parse(v) || {};
    } catch (e) {
      state.progress = {};
    }
    try {
      var b = await store.get(BOOKMARK_KEY);
      if (b) state.bookmarks = JSON.parse(b) || {};
    } catch (e) {
      state.bookmarks = {};
    }
    state.loaded = true;
  }
  async function saveProgress() {
    try {
      await store.set(STORAGE_KEY, JSON.stringify(state.progress));
    } catch (e) {}
    updateChDoneBadges();
  }
  function savePosition() {
    try {
      localStorage.setItem(
        "java_study_pos",
        JSON.stringify({
          mode: isOverview ? 'overview' : isDailyMode ? 'daily' : isStatsMode ? 'stats' : 'chapter',
          ch: currentCh,
          level: state.level,
          index: state.index,
          dailyIndex: dailyState.index,
        }),
      );
    } catch (e) {}
  }
  function loadPosition() {
    try {
      var pos = JSON.parse(localStorage.getItem("java_study_pos"));
      if (!pos) return;
      if (pos.mode === 'overview') { renderOverview(); return; }
      if (pos.mode === 'daily') { enterDailyMode(); return; }
      if (pos.mode === 'stats') { renderStats(); return; }
      if (!CHAPTER_DATA[pos.ch]) return;
      if (pos.ch !== currentCh) switchChapter(pos.ch);
      state.level = pos.level || 0;
      state.index = pos.index || 0;
    } catch (e) {}
  }
  async function saveBookmarks() {
    try {
      await store.set(BOOKMARK_KEY, JSON.stringify(state.bookmarks));
    } catch (e) {}
  }

  /* ============ 데일리 모드 ============ */
  var isDailyMode = false;
  var isStatsMode = false;
  var DAILY_HISTORY_KEY = 'java_daily_history';
  var DAILY_SET_KEY = 'java_daily_set';
  var DAILY_COUNT = 10;

  // 데일리에서 작성한 코드/정답 상태는 챕터 모드와 완전히 분리된 저장소를 사용
  function dailyStorageKey(ch) {
    return CHAPTER_DATA[ch].storageKey + '_daily';
  }
  var SRS_INTERVALS = [1, 3, 7, 14, 30];

  var dailyState = {
    questions: [],   // [{ch, q}]
    index: 0,
    qNavPage: 0,
    inputs: {},
    revealed: {},
    log: {},         // qid -> {pass, output}
    chProgress: {},  // ch -> progress object
    lastErrorLines: [],
  };

  function getToday() {
    var _override = new URLSearchParams(location.search).get('testDate');
    return _override ? new Date(_override) : new Date();
  }
  function todayStr() {
    var d = getToday();
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
  }
  /* ============ 오답 로그 ============ */
  var WRONG_LOG_KEY = 'java_wrong_log';

  function loadWrongLog() {
    try { return JSON.parse(localStorage.getItem(WRONG_LOG_KEY)) || {}; } catch(e) { return {}; }
  }

  function saveWrongLog(w) {
    try { localStorage.setItem(WRONG_LOG_KEY, JSON.stringify(w)); } catch(e) {}
  }

  function recordWrongLog(ch, q, pass, output, input) {
    var log = loadWrongLog();
    var entry = log[q.id] || { ch: ch, wrongCount: 0 };
    entry.ch = ch;
    if (pass) {
      entry.wrongCount = Math.max(0, (entry.wrongCount || 0) - 1);
    } else {
      entry.wrongCount = (entry.wrongCount || 0) + 1;
      entry.lastWrongAt = todayStr();
      entry.lastExpected = String(q.expected);
      entry.lastActual = output || '';
      entry.lastInput = input || '';
    }
    log[q.id] = entry;
    saveWrongLog(log);
  }

  /* ============ 잔디 ============ */
  var GRASS_KEY = 'java_study_grass';
  var GRASS_SEEN_KEY = 'java_study_grass_seen';

  function loadGrass() {
    try { return JSON.parse(localStorage.getItem(GRASS_KEY)) || {}; } catch(e) { return {}; }
  }

  function saveGrass(g) {
    try { localStorage.setItem(GRASS_KEY, JSON.stringify(g)); } catch(e) {}
  }

  // 오늘 이미 잔디에 기여한 qid 목록 (초기화 후 같은 날 재정답해도 중복 집계 방지)
  function loadGrassSeenToday() {
    try {
      var data = JSON.parse(localStorage.getItem(GRASS_SEEN_KEY));
      return (data && data.date === todayStr()) ? (data.qids || {}) : {};
    } catch(e) { return {}; }
  }

  function markGrassSeen(qid) {
    var seen = loadGrassSeenToday();
    seen[qid] = true;
    try { localStorage.setItem(GRASS_SEEN_KEY, JSON.stringify({ date: todayStr(), qids: seen })); } catch(e) {}
  }

  function recordGrass(qid) {
    var seen = loadGrassSeenToday();
    if (seen[qid]) return;
    markGrassSeen(qid);
    var g = loadGrass();
    var today = todayStr();
    g[today] = (g[today] || 0) + 1;
    saveGrass(g);
    renderGrass();
  }

  function renderGrass() {
    var grid = document.getElementById('grass-grid');
    if (!grid) return;
    var g = loadGrass();
    var today = todayStr();

    // 10주, 일요일 기준 시작
    var WEEKS = 10;
    var todayDate = getToday();
    var startDate = new Date(todayDate);
    startDate.setDate(startDate.getDate() - WEEKS * 7 + 1);
    var dow = startDate.getDay();
    startDate.setDate(startDate.getDate() - dow);

    var maxVal = 0;
    for (var k in g) { if (g[k] > maxVal) maxVal = g[k]; }

    // 날짜 목록 수집 (열 단위)
    var cols = [];
    var cur = new Date(startDate);
    var endDate = new Date(todayDate);
    endDate.setHours(23, 59, 59);
    var colDates = [];
    while (cur <= endDate) {
      var yyyy = cur.getFullYear();
      var mm = String(cur.getMonth() + 1).padStart(2, '0');
      var dd = String(cur.getDate()).padStart(2, '0');
      colDates.push({ ds: yyyy+'-'+mm+'-'+dd, d: cur.getDate(), m: cur.getMonth()+1, dow: cur.getDay() });
      cur.setDate(cur.getDate() + 1);
    }

    // 그리드 셀 렌더 (7행 순수 셀만, 레이블 행 없음)
    var gridHtml = '';
    var totalCols = Math.ceil(colDates.length / 7);
    for (var i = 0; i < colDates.length; i++) {
      var info = colDates[i];
      var val = g[info.ds] || 0;
      var level = 0;
      if (val >= 1) level = 1;
      if (val >= 3) level = 2;
      if (val >= 6) level = 3;
      if (val >= 10) level = 4;
      var isToday = info.ds === today;
      gridHtml += '<div class="grass-cell lv' + level + (isToday ? ' grass-today' : '') +
        '" data-date="' + info.ds + '" data-count="' + val + '"></div>';
    }
    grid.innerHTML = gridHtml;

    // X축 레이블: 각 열 좌측 기준 절대 위치 (셀 10px + gap 2px = 12px per col)
    var xAxis = document.getElementById('grass-x-axis');
    if (xAxis) {
      var xHtml = '';
      var prevMonth = colDates.length > 0 ? colDates[0].m : -1;
      for (var c = 0; c < totalCols; c++) {
        var cellIdx = c * 7;
        if (cellIdx >= colDates.length) break;
        var ci = colDates[cellIdx];
        if (ci.m !== prevMonth) {
          prevMonth = ci.m;
          var left = c * 14;
          xHtml += '<span class="grass-x-lbl" style="left:' + left + 'px">' + ci.m + '월</span>';
        }
      }
      xAxis.innerHTML = xHtml;
    }

    // 툴팁 이벤트 (최초 1회만 등록)
    var tooltip = document.getElementById('grass-tooltip');
    if (tooltip && !grid._grassTooltipBound) {
      grid._grassTooltipBound = true;
      grid.addEventListener('mouseover', function(e) {
        var cell = e.target.closest('.grass-cell');
        if (!cell) return;
        var ds = cell.dataset.date;
        var cnt = parseInt(cell.dataset.count, 10) || 0;
        tooltip.textContent = ds + ' · ' + (cnt > 0 ? cnt + '문제 정답' : '풀이 없음');
        tooltip.classList.add('show');
      });
      grid.addEventListener('mouseout', function(e) {
        if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('#grass-grid')) {
          tooltip.classList.remove('show');
        }
      });
    }
  }

  function addDays(dateStr, n) {
    var parts = dateStr.split('-');
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    d.setDate(d.getDate() + n);
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
  }
  function loadDailyHistory() {
    try { return JSON.parse(localStorage.getItem(DAILY_HISTORY_KEY)) || {}; } catch(e) { return {}; }
  }
  function saveDailyHistory(h) {
    try { localStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(h)); } catch(e) {}
  }
  function nextSRSInterval(h, pass) {
    if (!pass) return 1;
    if (!h || !h.correct) return 3;
    var idx = SRS_INTERVALS.indexOf(h.interval);
    return SRS_INTERVALS[Math.min(idx < 0 ? 1 : idx + 1, SRS_INTERVALS.length - 1)];
  }

  function pickDailyQuestions() {
    var today = todayStr();
    try {
      var saved = JSON.parse(localStorage.getItem(DAILY_SET_KEY));
      if (saved && saved.date === today && Array.isArray(saved.questions) && saved.questions.length) {
        var restored = saved.questions.map(function(ref) {
          var chData = CHAPTER_DATA[ref.ch];
          if (!chData) return null;
          var q = chData.questions.find(function(q) { return q.id === ref.id; });
          return q ? { ch: ref.ch, q: q } : null;
        }).filter(Boolean);
        if (restored.length > 0) return restored;
      }
    } catch(e) {}

    var history = loadDailyHistory();
    var allDue = [], allNotDue = [];

    [1, 2, 3, 4, 5].forEach(function(ch) {
      var chData = CHAPTER_DATA[ch];
      if (!chData) return;
      chData.questions.forEach(function(q) {
        var h = history[q.id];
        var due, priority;
        if (!h) {
          due = true; priority = 1;
        } else if (!h.correct) {
          due = addDays(h.lastSeen, h.interval) <= today;
          priority = 0;
        } else {
          due = addDays(h.lastSeen, h.interval) <= today;
          priority = 2;
        }
        var entry = { ch: ch, q: q, priority: priority, h: h || null };
        (due ? allDue : allNotDue).push(entry);
      });
    });

    var byChapter = {};
    allDue.forEach(function(e) {
      if (!byChapter[e.ch]) byChapter[e.ch] = [];
      byChapter[e.ch].push(e);
    });
    [1,2,3,4,5].forEach(function(ch) {
      if (!byChapter[ch]) return;
      byChapter[ch].sort(function(a, b) {
        if (a.priority !== b.priority) return a.priority - b.priority;
        var aDate = a.h ? a.h.lastSeen : '0000-00-00';
        var bDate = b.h ? b.h.lastSeen : '0000-00-00';
        return aDate < bDate ? -1 : 1;
      });
    });

    var picked = [], chIdx = 0, chapters = [1,2,3,4,5];
    while (picked.length < DAILY_COUNT) {
      var found = false;
      for (var i = 0; i < chapters.length; i++) {
        var ch = chapters[(chIdx + i) % chapters.length];
        if (byChapter[ch] && byChapter[ch].length > 0) {
          picked.push(byChapter[ch].shift());
          chIdx = (chIdx + i + 1) % chapters.length;
          found = true;
          break;
        }
      }
      if (!found) break;
    }

    if (picked.length < DAILY_COUNT) {
      allNotDue.sort(function(a, b) {
        var aNext = a.h ? addDays(a.h.lastSeen, a.h.interval) : '9999-99-99';
        var bNext = b.h ? addDays(b.h.lastSeen, b.h.interval) : '9999-99-99';
        return aNext < bNext ? -1 : 1;
      });
      picked = picked.concat(allNotDue.slice(0, DAILY_COUNT - picked.length));
    }

    // Fisher-Yates 셔플
    for (var si = picked.length - 1; si > 0; si--) {
      var sj = Math.floor(Math.random() * (si + 1));
      var tmp = picked[si]; picked[si] = picked[sj]; picked[sj] = tmp;
    }

    try {
      localStorage.setItem(DAILY_SET_KEY, JSON.stringify({
        date: today,
        questions: picked.map(function(e) { return { ch: e.ch, id: e.q.id }; })
      }));
    } catch(e) {}

    return picked.map(function(e) { return { ch: e.ch, q: e.q }; });
  }

  function updateDailyBadge() {
    var badge = document.querySelector('.daily-badge');
    if (!badge) return;
    var today = todayStr();
    try {
      var saved = JSON.parse(localStorage.getItem(DAILY_SET_KEY));
      if (saved && saved.date === today && Array.isArray(saved.questions)) {
        var history = loadDailyHistory();
        var correct = saved.questions.filter(function(ref) {
          var h = history[ref.id];
          return h && h.lastSeen === today && h.correct;
        }).length;
        var total = saved.questions.length;
        badge.textContent = correct > 0 ? ' ' + correct + '/' + total : '';
        return;
      }
    } catch(e) {}
    badge.textContent = '';
  }

  async function enterDailyMode() {
    isDailyMode = true;
    isOverview = false;
    isStatsMode = false;
    document.querySelectorAll('.ch-btn').forEach(function(b) {
      b.classList.toggle('ch-active', b.getAttribute('data-ch') === '-1');
    });
    var lnav = document.getElementById('level-nav');
    lnav.innerHTML = '';
    lnav.style.display = 'none';
    lnav.classList.add('lnav-collapsed');

    document.getElementById('app').innerHTML = '<div class="loading">데일리 문제를 준비 중...</div>';

    dailyState.questions = pickDailyQuestions();
    try {
      var savedPos = JSON.parse(localStorage.getItem('java_study_pos'));
      dailyState.index = (savedPos && savedPos.mode === 'daily' && savedPos.dailyIndex) ? Math.min(savedPos.dailyIndex, dailyState.questions.length - 1) : 0;
    } catch(e) { dailyState.index = 0; }
    dailyState.qNavPage = Math.floor(dailyState.index / 6);
    dailyState.inputs = {};
    dailyState.revealed = {};
    dailyState.log = {};
    dailyState.lastErrorLines = [];
    dailyState.chProgress = {};

    var chapters = [];
    dailyState.questions.forEach(function(e) {
      if (chapters.indexOf(e.ch) === -1) chapters.push(e.ch);
    });

    await Promise.all(chapters.map(function(ch) {
      return store.get(dailyStorageKey(ch)).then(function(raw) {
        try { dailyState.chProgress[ch] = JSON.parse(raw) || {}; } catch(e) { dailyState.chProgress[ch] = {}; }
      });
    }));

    savePosition();

    // 오늘 데일리에서 직접 푼 기록만 복원
    var history = loadDailyHistory();
    var today = todayStr();
    dailyState.questions.forEach(function(e) {
      var h = history[e.q.id];
      if (h && h.lastSeen === today) {
        dailyState.log[e.q.id] = { pass: h.correct, output: null };
        // input도 오늘 데일리에서 푼 경우에만 복원
        var cp = dailyState.chProgress[e.ch];
        if (cp && cp[e.q.id] && cp[e.q.id].input) {
          dailyState.inputs[e.q.id] = cp[e.q.id].input;
        }
      }
    });

    renderDaily();
  }

  var DAILY_CH_COLORS = { 1: '#D98C3D', 2: '#6B9FD4', 3: '#6FD9A0', 4: '#C77DFF', 5: '#FF9A3C' };
  var DAILY_CH_NAMES  = { 1: 'Ch1 기본문법', 2: 'Ch2 OOP', 3: 'Ch3 컬렉션', 4: 'Ch4 자료구조', 5: 'Ch5 람다·IO' };

  function renderDailyDone() {
    var history = loadDailyHistory();
    var html = '';
    html += '<div style="padding-top:32px;margin-bottom:24px;">';
    html += '<div class="brand-eyebrow">$ java --daily complete</div>';
    html += '<h1 class="brand-title">오늘의 데일리 완료!</h1>';
    html += '<div class="brand-sub">오늘 세트를 모두 풀었습니다. 내일 또 돌아오세요.</div>';
    html += '</div>';
    html += '<div class="card" style="padding:24px;">';
    html += '<div class="card-title" style="margin-bottom:16px;">오늘 결과</div>';
    dailyState.questions.forEach(function(e, i) {
      var log = dailyState.log[e.q.id];
      var pass = log && log.pass;
      var h = history[e.q.id];
      var nextDue = h ? addDays(h.lastSeen, h.interval) : '-';
      var color = DAILY_CH_COLORS[e.ch] || '#888';
      html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">';
      html += '<span style="font-family:var(--mono);font-size:12px;color:var(--muted);width:20px;">' + (i+1) + '</span>';
      html += '<span style="font-size:11px;padding:2px 6px;border-radius:4px;background:' + color + '22;color:' + color + ';">' + (DAILY_CH_NAMES[e.ch]||'') + '</span>';
      html += '<span style="flex:1;font-size:13px;">' + esc(e.q.title) + '</span>';
      html += '<span style="font-size:12px;' + (pass ? 'color:var(--pass)' : log ? 'color:var(--fail)' : 'color:var(--muted)') + ';">';
      html += pass ? '✓ PASS' : (log ? '✗ FAIL' : '미풀이');
      html += '</span>';
      if (h) html += '<span style="font-size:11px;color:var(--muted);width:80px;text-align:right;">다음: ' + nextDue + '</span>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div style="margin-top:16px;display:flex;gap:10px;">';
    html += '<button class="btn btn-ghost" data-action="daily-restart">다시 풀기</button>';
    html += '</div>';
    document.getElementById('app').innerHTML = html;
  }

  function renderDaily() {
    var app = document.getElementById('app');
    if (!dailyState.questions.length) {
      app.innerHTML = '<div class="card" style="text-align:center;padding:50px 24px;"><div class="card-title">오늘 풀 문제가 없습니다</div></div>';
      return;
    }

    var entry = dailyState.questions[dailyState.index];
    var ch = entry.ch, q = entry.q;
    var total = dailyState.questions.length;
    var history = loadDailyHistory();
    var h = history[q.id];
    var gradedCount = dailyState.questions.filter(function(e) { return !!dailyState.log[e.q.id]; }).length;
    var correctCount = dailyState.questions.filter(function(e) { var l = dailyState.log[e.q.id]; return l && l.pass; }).length;

    var html = '';

    // Topbar
    html += '<div class="topbar">';
    html += '<div class="topbar-main"><div class="topbar-left">';
    html += '<div class="brand-eyebrow">$ java --daily ' + todayStr() + '</div>';
    html += '<h1 class="brand-title">데일리 문제</h1>';
    html += '<div class="brand-sub">오늘의 10문제를 풀어보세요. <span id="server-badge" style="font-size:0.85em;">● regex 채점 (서버 꺼짐)</span></div>';
    html += '</div>';
    html += '<div class="top-stats-box">';
    html += '<div class="progress-wrap"><div class="progress-label"><span>오늘 진행</span><b>' + correctCount + ' / ' + total + '</b></div>';
    html += '<div class="progress-track"><div class="progress-fill" style="width:' + Math.round(correctCount / total * 100) + '%"></div></div></div>';
    html += '</div></div>';

    // Q-nav dots (페이지네이션, 6개씩)
    var D_PAGE = 6;
    if (dailyState.index < dailyState.qNavPage * D_PAGE ||
        dailyState.index >= dailyState.qNavPage * D_PAGE + D_PAGE) {
      dailyState.qNavPage = Math.floor(dailyState.index / D_PAGE);
    }
    var maxDPage = Math.max(0, Math.ceil(total / D_PAGE) - 1);
    if (dailyState.qNavPage > maxDPage) dailyState.qNavPage = maxDPage;
    var dDotStart = dailyState.qNavPage * D_PAGE;

    var qNavHtml = '<div class="q-nav">';
    qNavHtml += '<button class="q-nav-arrow" data-action="daily-qnav-prev"' + (dailyState.qNavPage === 0 ? ' disabled' : '') + '>&#8249;</button>';
    qNavHtml += '<div class="q-nav-dots">';
    for (var ddi = dDotStart; ddi < dDotStart + D_PAGE; ddi++) {
      if (ddi < total) {
        var de2 = dailyState.questions[ddi];
        var dlog = dailyState.log[de2.q.id];
        var ddst = dlog ? (dlog.pass ? 'pass' : 'fail') : '';
        var dcls = 'dot' + (ddi === dailyState.index ? ' current' : '') + (ddst ? ' ' + ddst : '');
        qNavHtml += '<div class="' + dcls + '" data-action="daily-jump" data-index="' + ddi + '" title="' + esc(de2.q.id) + '">' + (ddi+1) + '</div>';
      } else {
        qNavHtml += '<div class="dot dot-empty"></div>';
      }
    }
    qNavHtml += '</div>';
    qNavHtml += '<button class="q-nav-arrow" data-action="daily-qnav-next"' + (dailyState.qNavPage >= maxDPage ? ' disabled' : '') + '>&#8250;</button>';
    qNavHtml += '</div>';

    html += '<div class="topbar-bottom">';
    html += '<div class="kbd-hint"><div><kbd>Ctrl/Cmd</kbd>+<kbd>Enter</kbd> 채점 · <kbd>←</kbd><kbd>→</kbd> 이전/다음 · <kbd>R</kbd> 정답 보기</div><div><kbd>Esc</kbd> 입력창 빠져나오기 · <kbd>Enter</kbd> 입력창 포커스</div></div>';
    html += '<div class="top-qnav">' + qNavHtml + '</div>';
    html += '</div></div>';

    // Card
    html += '<div class="layout"><div class="content"><div class="card">';

    var color = DAILY_CH_COLORS[ch] || '#888';
    var srsLabel = h ? (h.correct ? ' · ✓ ' + h.interval + '일 간격' : ' · ✗ 복습 중') : ' · 첫 풀이';
    html += '<div class="card-eyebrow" style="display:flex;align-items:center;gap:8px;">';
    html += '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:' + color + '22;color:' + color + ';">' + (DAILY_CH_NAMES[ch]||'') + '</span>';
    html += '<span>' + esc(q.id) + srsLabel + ' · ' + (dailyState.index + 1) + ' / ' + total + '</span>';
    html += '</div>';

    html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">';
    html += '<h2 class="card-title" style="margin:0;">' + esc(q.title) + '</h2>';
    html += '</div>';

    html += '<div class="concept"><b>핵심 개념</b> — ' + esc(q.concept) + '</div>';

    // Code box
    html += '<div class="codebox">';
    html += '<button class="codebox-copy-btn" data-action="copy-code" title="전체 코드 복사">';
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>';

    var userInputStart = getUserInputStartLine(q);
    var beforeStart = userInputStart - (q.before || []).length;
    q.before.forEach(function(l, i) {
      html += '<div class="cl muted" data-codeline="' + (beforeStart + i) + '">' + esc(l) + '</div>';
    });
    q.placeholder.forEach(function(l) {
      html += '<div class="cl muted">' + esc(l) + '</div>';
    });

    var savedInput = dailyState.inputs[q.id] !== undefined ? dailyState.inputs[q.id] : '';
    var errLines = dailyState.lastErrorLines || [];
    var userLineCount = savedInput ? savedInput.split('\n').length : 0;
    var taErrLines = errLines.filter(function(ln) {
      return ln >= userInputStart && ln < userInputStart + userLineCount;
    }).map(function(ln) { return ln - userInputStart + 1; });

    html += '<textarea class="blank' + (taErrLines.length ? ' textarea-has-error' : '') + '" id="ans-input" rows="' + (q.rows || 5) + '" placeholder="여기에 코드를 입력하세요"></textarea>';
    if (taErrLines.length) {
      html += '<div class="textarea-error-hint">↑ 내 코드 ' + taErrLines.map(function(n){ return n + '번째 줄'; }).join(', ') + '에 오류</div>';
    }
    var afterStart = userInputStart + userLineCount;
    q.after.forEach(function(l, i) {
      html += '<div class="cl muted" data-codeline="' + (afterStart + i) + '">' + esc(l) + '</div>';
    });
    html += '</div>';
    html += '<div class="expected">기대 출력: <code>' + esc(q.expected) + '</code></div>';

    // Feedback
    var log = dailyState.log[q.id];
    var fbClass = '', fbText = '';
    if (log && log.pass) {
      fbClass = 'pass show'; fbText = '✓ PASS — 정답입니다.';
    } else if (log && !log.pass) {
      fbClass = 'fail show';
      fbText = (log.output && log.output.indexOf('⚠') === 0)
        ? '✗ FAIL — 문법을 다시 확인해보세요.'
        : '✗ FAIL — 출력값이 다릅니다.';
    }

    // Output diff
    var outputHtml = '';
    if (log && log.output !== null && log.output !== undefined) {
      var isErrOutput = log.output.indexOf('⚠') === 0;
      if (isErrOutput) {
        var displayOutput = log.output.replace(/^⚠ /, '').replace(/\/[^\s]*Main\.java:(\d+):/g, function(_, n) {
          var rel = parseInt(n, 10) - userInputStart + 1;
          return '[' + (rel > 0 ? '내 코드 ' + rel + '번째 줄' : '전체 ' + n + '번째 줄') + ']';
        });
        outputHtml = '<div class="output-box"><span class="output-label">출력</span><pre class="output-val output-val-error">' + esc(displayOutput) + '</pre></div>';
      } else {
        var actualLines = log.output.split('\n');
        var expectedLines = String(q.expected).trim().split('\n');
        var maxLen = Math.max(actualLines.length, expectedLines.length);
        var diffRows = '';
        for (var dli = 0; dli < maxLen; dli++) {
          var aLine = actualLines[dli] !== undefined ? actualLines[dli] : '';
          var eLine = expectedLines[dli] !== undefined ? expectedLines[dli] : '';
          var isMatch = aLine === eLine;
          diffRows += '<div class="' + (isMatch ? 'diff-row diff-match' : 'diff-row diff-mismatch') + '">' +
            '<span class="diff-cell diff-expected">' + esc(eLine) + '</span>' +
            '<span class="diff-cell diff-actual">' + esc(aLine) + '</span>' +
            '</div>';
        }
        outputHtml = '<div class="output-box output-box-diff"><div class="diff-header"><span class="output-label">기대 출력</span><span class="output-label">실제 출력</span></div><div class="diff-body">' + diffRows + '</div></div>';
      }
    }

    html += '<div class="actions"><button class="btn btn-grade" data-action="daily-grade">채점</button>';
    html += '<button class="btn btn-ghost" data-action="daily-reveal">' + (dailyState.revealed[q.id] ? '정답 숨기기' : '정답 보기') + '</button>';
    if (gradedCount === total) {
      html += '<button class="btn btn-ghost" style="margin-left:auto;" data-action="daily-results">결과 보기 →</button>';
    }
    html += '</div>';
    html += '<div class="feedback ' + fbClass + '" id="fb-msg">' + fbText + '</div>';
    html += outputHtml;

    html += '<div class="answer-box' + (dailyState.revealed[q.id] ? ' show' : '') + '">';
    html += '<div class="lbl">🔍 정답</div>';
    q.answer.forEach(function(l) { html += '<div class="al">' + esc(l) + '</div>'; });
    if (q.note) html += '<div class="note">' + esc(q.note) + '</div>';
    html += '</div>';
    html += getMemoHtml(q.id);

    html += '<div class="nav-row">';
    html += '<button class="btn btn-nav" data-action="daily-prev"' + (dailyState.index === 0 ? ' disabled' : '') + '>← 이전</button>';
    html += '<span class="pos">' + (dailyState.index + 1) + ' / ' + total + '</span>';
    html += '<button class="btn btn-nav" data-action="daily-next"' + (dailyState.index >= total - 1 ? ' disabled' : '') + '>다음 →</button>';
    html += '</div></div></div></div>';

    app.innerHTML = html;
    attachMemoEvents(q.id);
    updateServerBadge();

    if (dailyState.lastErrorLines && dailyState.lastErrorLines.length) {
      dailyState.lastErrorLines.forEach(function(ln) {
        var el = app.querySelector('[data-codeline="' + ln + '"]');
        if (el) el.classList.add('cl-error');
      });
    }

    var ta = document.getElementById('ans-input');
    if (ta) {
      function autoResize() { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
      ta.value = savedInput;
      autoResize();
      pushUndo(q, ta);
      ta.addEventListener('input', function() {
        dailyState.inputs[q.id] = ta.value;
        scheduleUndo(q, ta);
        autoResize();
      });
      ta.addEventListener('keydown', function(e) { handleEditorKeydown(e, ta, q); });
    }
  }

  async function doGradeDaily() {
    var entry = dailyState.questions[dailyState.index];
    if (!entry) return;
    var q = entry.q, ch = entry.ch;
    var ta = document.getElementById('ans-input');
    var val = ta ? ta.value : '';

    var gradeBtn = document.querySelector('[data-action="daily-grade"]');
    if (gradeBtn) { gradeBtn.disabled = true; gradeBtn.textContent = '채점 중...'; }

    var executionOutput = null;
    var pass;
    dailyState.lastErrorLines = [];

    if (serverAvailable) {
      var result = await gradeByExecution(q, val);
      if (result !== null) {
        pass = result.pass;
        executionOutput = result.output;
        dailyState.lastErrorLines = result.errorLines || [];
      } else {
        pass = gradeQuestion(q, val);
      }
    } else {
      pass = gradeQuestion(q, val);
    }

    if (gradeBtn) { gradeBtn.disabled = false; gradeBtn.textContent = '채점'; }

    if (!dailyState.chProgress[ch]) dailyState.chProgress[ch] = {};
    var wasAlreadyPassed = dailyState.chProgress[ch][q.id] && dailyState.chProgress[ch][q.id].status === 'pass';
    dailyState.chProgress[ch][q.id] = { status: pass ? 'pass' : 'fail', input: val };
    store.set(dailyStorageKey(ch), JSON.stringify(dailyState.chProgress[ch]));

    dailyState.log[q.id] = { pass: pass, output: executionOutput };
    recordWrongLog(ch, q, pass, executionOutput, val);
    if (pass && !wasAlreadyPassed) recordGrass(q.id);

    var history = loadDailyHistory();
    var h = history[q.id];
    history[q.id] = { lastSeen: todayStr(), correct: pass, interval: nextSRSInterval(h, pass) };
    saveDailyHistory(history);
    updateDailyBadge();

    renderDaily();
  }

  /* ============ 오답 통계 페이지 ============ */
  var WRONG_PROMPT_LIMIT = 15;

  function frequentlyWrongList() {
    var wrongLog = loadWrongLog();
    return Object.keys(wrongLog).map(function(qid) {
      var e = wrongLog[qid];
      var chData = CHAPTER_DATA[e.ch];
      var q = chData ? chData.questions.find(function(qq) { return qq.id === qid; }) : null;
      if (!q) return null;
      return {
        qid: qid, ch: e.ch, q: q, wrongCount: e.wrongCount,
        lastWrongAt: e.lastWrongAt, lastExpected: e.lastExpected,
        lastActual: e.lastActual, lastInput: e.lastInput,
      };
    }).filter(function(x) { return x && x.wrongCount > 0; })
      .sort(function(a, b) { return b.wrongCount - a.wrongCount; });
  }

  function statCardHtml(label, value, color) {
    return '<div class="card" style="flex:1;min-width:120px;padding:16px 20px;align-items:center;text-align:center;">' +
      '<div style="font-size:26px;font-weight:700;color:' + color + ';">' + value + '</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:2px;">' + esc(label) + '</div>' +
      '</div>';
  }

  function buildQidChapterMap() {
    var map = {};
    [1, 2, 3, 4, 5].forEach(function(ch) {
      CHAPTER_DATA[ch].questions.forEach(function(q) { map[q.id] = ch; });
    });
    return map;
  }

  // 오답 로그 도입 이전에 이미 데일리에서 틀려있던 문제를 소급 반영
  function backfillWrongLogFromHistory() {
    var history = loadDailyHistory();
    var log = loadWrongLog();
    var qidChMap = buildQidChapterMap();
    var changed = false;
    Object.keys(history).forEach(function(qid) {
      var h = history[qid];
      if (h.correct === false && !log[qid]) {
        var ch = qidChMap[qid];
        if (!ch) return;
        log[qid] = { ch: ch, wrongCount: 1, lastWrongAt: h.lastSeen, lastExpected: '', lastActual: '', lastInput: '' };
        changed = true;
      }
    });
    if (changed) saveWrongLog(log);
  }

  function renderStats() {
    isStatsMode = true;
    isOverview = false;
    isDailyMode = false;
    savePosition();
    document.querySelectorAll('.ch-btn').forEach(function(b) {
      b.classList.toggle('ch-active', b.getAttribute('data-ch') === '-2');
    });
    var lnav = document.getElementById('level-nav');
    lnav.innerHTML = '';
    lnav.style.display = 'none';
    lnav.classList.add('lnav-collapsed');

    renderStatsContent();
  }

  function renderStatsContent() {
    backfillWrongLogFromHistory();
    var wrongList = frequentlyWrongList();
    var topWrong = wrongList.slice(0, WRONG_PROMPT_LIMIT);

    // 데일리 히스토리 기준 집계 (챕터 학습 중 오답은 집계하지 않음)
    var history = loadDailyHistory();
    var qidChMap = buildQidChapterMap();
    var chAgg = { 1: {pass:0,fail:0}, 2: {pass:0,fail:0}, 3: {pass:0,fail:0}, 4: {pass:0,fail:0}, 5: {pass:0,fail:0} };
    var totalSeen = 0, totalPass = 0, totalFail = 0;
    Object.keys(history).forEach(function(qid) {
      var ch = qidChMap[qid];
      if (!ch) return;
      totalSeen++;
      if (history[qid].correct) { totalPass++; chAgg[ch].pass++; }
      else { totalFail++; chAgg[ch].fail++; }
    });
    var chStats = [1, 2, 3, 4, 5].map(function(ch) {
      var a = chAgg[ch];
      return { ch: ch, total: a.pass + a.fail, pass: a.pass, fail: a.fail };
    });

    var html = '';
    html += '<div style="padding-top:32px;margin-bottom:24px;">';
    html += '<div class="brand-eyebrow">$ java --stats</div>';
    html += '<h1 class="brand-title">오답 통계</h1>';
    html += '<div class="brand-sub">데일리 복습에서 자주 틀리는 문제를 모아 확인하고, AI에게 물어볼 프롬프트로 내보낼 수 있어요.</div>';
    html += '</div>';

    html += '<div style="display:flex;gap:14px;margin-bottom:20px;flex-wrap:wrap;">';
    html += statCardHtml('데일리 학습 문제', totalSeen, 'var(--text)');
    html += statCardHtml('정답', totalPass, 'var(--pass)');
    html += statCardHtml('오답', totalFail, 'var(--fail)');
    html += statCardHtml('자주 틀리는 문제', wrongList.length, '#C77DFF');
    html += '</div>';

    html += '<div class="card" style="padding:24px;margin-bottom:20px;">';
    html += '<div class="card-title" style="margin-bottom:16px;">챕터별 데일리 정답률</div>';
    chStats.forEach(function(cs) {
      var pct = cs.total > 0 ? Math.round((cs.pass / cs.total) * 100) : 0;
      var color = DAILY_CH_COLORS[cs.ch] || '#888';
      html += '<div style="margin-bottom:14px;">';
      html += '<div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;">';
      html += '<span>' + esc(DAILY_CH_NAMES[cs.ch] || ('Ch' + cs.ch)) + '</span>';
      html += '<span style="color:var(--muted);">' + (cs.total > 0 ? (cs.pass + ' / ' + cs.total + ' (' + pct + '%)') : '아직 데일리에 안 나옴') + '</span>';
      html += '</div>';
      html += '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%;background:' + color + ';"></div></div>';
      html += '</div>';
    });
    html += '</div>';

    html += '<div class="card" style="padding:24px;margin-bottom:20px;">';
    html += '<div class="card-title" style="margin-bottom:16px;">자주 틀리는 문제 Top ' + WRONG_PROMPT_LIMIT + '</div>';
    if (topWrong.length === 0) {
      html += '<div style="color:var(--muted);font-size:13px;">아직 반복해서 틀린 문제가 없어요.</div>';
    } else {
      topWrong.forEach(function(w, i) {
        var color = DAILY_CH_COLORS[w.ch] || '#888';
        html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">';
        html += '<span style="font-family:var(--mono);font-size:12px;color:var(--muted);width:20px;">' + (i + 1) + '</span>';
        html += '<span style="font-size:11px;padding:2px 6px;border-radius:4px;background:' + color + '22;color:' + color + ';">' + esc(DAILY_CH_NAMES[w.ch] || '') + '</span>';
        html += '<span style="flex:1;font-size:13px;">' + esc(w.q.title) + '</span>';
        html += '<span style="font-size:12px;color:var(--fail);">' + w.wrongCount + '회 오답</span>';
        html += '</div>';
      });
    }
    html += '</div>';

    html += '<div class="actions">';
    html += '<button class="btn btn-grade" data-action="export-wrong-prompt"' + (topWrong.length === 0 ? ' disabled' : '') + '>📋 AI 프롬프트로 복사</button>';
    html += '<button class="btn btn-ghost" data-action="reset-wrong-log">🗑 오답 로그 초기화</button>';
    html += '</div>';

    document.getElementById('app').innerHTML = html;
  }

  function doResetWrongLog() {
    if (!window.confirm('오답 로그를 전부 초기화할까요? 되돌릴 수 없습니다.')) return;
    saveWrongLog({});
    renderStats();
    showToast('오답 로그를 초기화했어요.');
  }

  function doExportWrongPrompt() {
    var memos = loadMemos();
    var list = frequentlyWrongList().slice(0, WRONG_PROMPT_LIMIT);
    if (!list.length) { showToast('아직 반복해서 틀린 문제가 없어요.', true); return; }

    var lines = [];
    lines.push('아래는 Java 학습 중 자주 틀리는 문제들입니다. 각 문제에서 왜 이런 실수를 반복하는지 패턴을 짚어주고, 개념 설명과 연습 방향을 제안해주세요.');
    lines.push('');
    list.forEach(function(w, i) {
      lines.push('[' + (i + 1) + '] ' + (DAILY_CH_NAMES[w.ch] || '') + ' — ' + w.q.title + ' (누적 ' + w.wrongCount + '회 오답)');
      if (w.q.concept) lines.push('개념: ' + String(w.q.concept).replace(/\s+/g, ' ').trim());
      if (w.q.answer) lines.push('정답 코드:\n' + [].concat(w.q.answer).join('\n'));
      lines.push('기대 출력: ' + (w.lastExpected != null ? w.lastExpected : String(w.q.expected)));
      if (w.lastInput) lines.push('내가 마지막으로 작성한 코드: ' + w.lastInput);
      if (w.lastActual) lines.push('마지막 제출 시 실제 출력: ' + w.lastActual);
      var memo = memos[w.qid];
      if (memo) lines.push('내 메모: ' + memo);
      lines.push('');
    });

    var text = lines.join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function() {
        showToast('프롬프트를 클립보드에 복사했어요!');
      }).catch(function() {
        showToast('복사에 실패했어요.', true);
      });
    } else {
      showToast('클립보드 복사를 지원하지 않는 환경이에요.', true);
    }
  }

  /* ============ 개요 페이지 ============ */
  var isOverview = false;

  var OV_INFO = [
    {
      ch: 1,
      color: "#D98C3D",
      keywords: [
        "기본형 · 참조형",
        "형 변환 (캐스팅)",
        "String 메서드",
        "예외처리 (try-catch-finally)",
        "제어 흐름 · Math · 삼항",
        "배열 (1D / 2D)",
      ],
    },
    {
      ch: 2,
      color: "#6B9FD4",
      keywords: [
        "클래스 · 생성자 · overloading",
        "상속 (extends) · overriding",
        "인터페이스 · abstract class",
        "캡슐화 · equals · toString",
        "Comparator · enum",
        "접근 제어자 · import · 동적 바인딩",
        "사용자 정의 예외",
        "Generic · 와일드카드 · PECS",
      ],
    },
    {
      ch: 3,
      color: "#6FD9A0",
      keywords: [
        "배열 · ArrayList (List 계열)",
        "HashSet (Set 계열)",
        "HashMap (Map 계열)",
        "정렬 · 탐색 · 집합 연산",
        "오토박싱 · 빈도수 카운팅",
        "TreeMap · copyOfRange · computeIfAbsent",
      ],
    },
    {
      ch: 4,
      color: "#C77DFF",
      keywords: [
        "Stack — LIFO · 괄호검사",
        "Queue — FIFO · BFS",
        "Deque — 슬라이딩 윈도우",
        "PriorityQueue — 힙 · 다익스트라",
      ],
    },
    {
      ch: 5,
      color: "#FF9A3C",
      keywords: [
        "Lambda · @FunctionalInterface",
        "Predicate · Function · Consumer",
        "Stream API (filter·map·collect)",
        "Scanner · BufferedReader (표준입력)",
        "FileWriter · BufferedReader (파일)",
        "Files.readAllLines · try-with-resources",
      ],
    },
  ];

  function renderOverview() {
    isOverview = true;
    isDailyMode = false;
    isStatsMode = false;
    savePosition();
    document.querySelectorAll(".ch-btn").forEach(function (b) {
      b.classList.toggle("ch-active", b.getAttribute("data-ch") === "0");
    });
    var lnavOv = document.getElementById("level-nav");
    lnavOv.innerHTML = "";
    lnavOv.style.display = "none";
    lnavOv.classList.add("lnav-collapsed");
    var html = "";
    html += '<div style="padding-top:24px;margin-bottom:24px;">';
    html +=
      '<div class="brand-eyebrow">$ java --curriculum overview</div>';
    html += '<h1 class="brand-title">Java 커리큘럼 전체 개요</h1>';
    html +=
      '<div class="brand-sub">각 챕터의 학습 주제와 키워드를 한눈에 확인하세요. 카드를 클릭하면 해당 챕터로 이동합니다.</div>';
    html += "</div>";

    html += '<div class="ov-flow">';
    var flowNames = [
      "기본 문법",
      "OOP 기초",
      "컬렉션",
      "자료구조",
      "람다·IO",
    ];
    flowNames.forEach(function (name, i) {
      if (i > 0) html += '<span class="ov-arrow">→</span>';
      html +=
        '<span class="ov-flow-item">Ch' +
        (i + 1) +
        ". " +
        name +
        "</span>";
    });
    html += "</div>";
    html +=
      '<div class="ov-notice">Java 파트 커리큘럼 순서 (XML 챕터 제외)</div>';

    html += '<div style="height:20px;"></div>';
    html += '<div class="ov-grid">';
    OV_INFO.forEach(function (info) {
      var chData = CHAPTER_DATA[info.ch];
      var totalQs = chData.questions.length;
      var totalLevels = chData.levels.length;
      html +=
        '<div class="ov-card" data-action="go-chapter" data-ch="' +
        info.ch +
        '">';
      html +=
        '<div class="ov-card-head" style="border-bottom-color:' +
        info.color +
        ';">';
      html +=
        '<span class="ov-ch-label" style="color:' +
        info.color +
        ';">Ch' +
        info.ch +
        "</span>";
      html +=
        '<span class="ov-ch-title">' +
        esc(chData.brandTitle.replace(" 자동채점", "")) +
        "</span>";
      html +=
        '<span class="ov-ch-stats">' +
        totalQs +
        "문제 · " +
        totalLevels +
        "장</span>";
      html += "</div>";
      html += '<ul class="ov-kw-list">';
      info.keywords.forEach(function (kw) {
        html += "<li>" + esc(kw) + "</li>";
      });
      html += "</ul>";
      html += '<div class="ov-card-footer">학습 시작 →</div>';
      html += "</div>";
    });
    html += "</div>";

    document.getElementById("app").innerHTML = html;
  }

  /* ============ lv-btn 커스텀 툴팁 ============ */
  (function () {
    var tooltip = document.getElementById('lv-tooltip');
    var showTimer = null;

    document.addEventListener('mouseover', function (e) {
      var btn = e.target.closest('.lv-btn');
      if (!btn) return;
      clearTimeout(showTimer);
      showTimer = setTimeout(function () {
        var textEl = btn.querySelector('.ch-text') || btn;
        tooltip.textContent = textEl.textContent.trim();
        var rect = btn.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.top = rect.top + 'px';
        tooltip.style.minWidth = rect.width + 'px';
        tooltip.getBoundingClientRect();
        tooltip.classList.add('visible');
      }, 40);
    });

    document.addEventListener('mouseout', function (e) {
      var btn = e.target.closest('.lv-btn, .ch-btn');
      if (!btn) return;
      clearTimeout(showTimer);
      tooltip.classList.remove('visible');
    });
  })();

  /* ============ level-nav 열기/닫기 애니메이션 ============ */
  function setLnavCollapsed(lnav, collapsed) {
    if (collapsed) {
      lnav.classList.add('lnav-collapsed');
      lnav.addEventListener('transitionend', function handler() {
        lnav.removeEventListener('transitionend', handler);
        if (lnav.classList.contains('lnav-collapsed')) lnav.style.display = 'none';
      });
    } else {
      lnav.style.display = '';
      lnav.getBoundingClientRect();
      lnav.classList.remove('lnav-collapsed');
    }
  }

  /* ============ 챕터 전환 ============ */
  function switchChapter(ch) {
    chCollapsed = false;
    isDailyMode = false;
    isStatsMode = false;
    var lnavReset = document.getElementById('level-nav');
    if (lnavReset) {
      lnavReset.style.display = 'none';
      lnavReset.classList.add('lnav-collapsed');
    }
    currentCh = ch;
    LEVELS = CHAPTER_DATA[ch].levels;
    QUESTIONS = CHAPTER_DATA[ch].questions;
    STORAGE_KEY = CHAPTER_DATA[ch].storageKey;
    BOOKMARK_KEY = CHAPTER_DATA[ch].bookmarkKey;
    state = {
      loaded: false,
      progress: {},
      inputs: {},
      revealed: {},
      bookmarks: {},
      level: 0,
      index: 0,
      qNavPage: 0,
      log: [],
      reviewMode: false,
      bookmarkMode: false,
    };
    document.querySelectorAll(".ch-btn").forEach(function (b) {
      b.classList.toggle(
        "ch-active",
        parseInt(b.getAttribute("data-ch")) === ch,
      );
    });
    render();
    loadProgress().then(function () { render(); updateChDoneBadges(); });
  }

  var EXPORT_KEYS = [
    'ds_quiz_progress_v1_basic', 'ds_quiz_bookmarks_v1_basic', 'ds_quiz_progress_v1_basic_daily',
    'ds_quiz_progress_v2_oop', 'ds_quiz_bookmarks_v2_oop', 'ds_quiz_progress_v2_oop_daily',
    'ds_quiz_progress_v3_collections', 'ds_quiz_bookmarks_v3_collections', 'ds_quiz_progress_v3_collections_daily',
    'ds_quiz_progress_v4_ds', 'ds_quiz_bookmarks_v4_ds', 'ds_quiz_progress_v4_ds_daily',
    'ds_quiz_progress_v5_lambda', 'ds_quiz_bookmarks_v5_lambda', 'ds_quiz_progress_v5_lambda_daily',
    'java_study_pos', 'java_study_grass', 'java_study_grass_seen', 'java_daily_history', 'java_daily_set', 'sidebar_pinned',
    'java_study_memo', 'java_wrong_log'
  ];

  var MEMO_KEY = 'java_study_memo';
  function loadMemos() {
    try { return JSON.parse(localStorage.getItem(MEMO_KEY)) || {}; } catch(e) { return {}; }
  }
  function saveMemo(qid, text) {
    var memos = loadMemos();
    if (text) memos[qid] = text;
    else delete memos[qid];
    localStorage.setItem(MEMO_KEY, JSON.stringify(memos));
  }
  function getMemoHtml(qid) {
    var memos = loadMemos();
    var val = memos[qid] || '';
    return '<div class="memo-wrap">' +
      '<button class="memo-toggle" data-action="toggle-memo" data-qid="' + qid + '">' +
      '📝 메모' + (val ? ' <span class="memo-dot"></span>' : '') + '</button>' +
      '<div class="memo-body" id="memo-body-' + qid + '" style="display:none;">' +
      '<textarea class="memo-input" id="memo-input-' + qid + '" placeholder="이 문제에 대한 메모를 남겨보세요..." rows="3">' + esc(val) + '</textarea>' +
      '</div></div>';
  }
  function attachMemoEvents(qid) {
    var toggleBtn = document.querySelector('[data-action="toggle-memo"][data-qid="' + qid + '"]');
    var body = document.getElementById('memo-body-' + qid);
    var ta = document.getElementById('memo-input-' + qid);
    if (!toggleBtn || !body || !ta) return;
    toggleBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var open = body.style.display === 'none';
      body.style.display = open ? 'block' : 'none';
      if (open) ta.focus();
    });
    var saveTimer;
    ta.addEventListener('input', function() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function() {
        saveMemo(qid, ta.value.trim());
        var dot = toggleBtn.querySelector('.memo-dot');
        if (ta.value.trim()) {
          if (!dot) { var s = document.createElement('span'); s.className = 'memo-dot'; toggleBtn.appendChild(s); }
        } else {
          if (dot) dot.remove();
        }
      }, 500);
    });
  }

  function doExportData() {
    Promise.all(EXPORT_KEYS.map(function(key) {
      return store.get(key).then(function(val) {
        return { key: key, val: val };
      });
    })).then(function(results) {
      var data = {};
      results.forEach(function(r) { if (r.val !== null) data[r.key] = r.val; });
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'java_study_data_' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function doImportData(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        var keys = Object.keys(data).filter(function(k) { return EXPORT_KEYS.indexOf(k) !== -1; });
        Promise.all(keys.map(function(key) {
          return store.set(key, data[key]);
        })).then(function() {
          showToast('데이터를 가져왔어요! 새로고침합니다.');
          setTimeout(function() { location.reload(); }, 1200);
        });
      } catch(err) {
        showToast('파일을 읽을 수 없어요. 올바른 JSON 파일인지 확인해 주세요.', true);
      }
    };
    reader.readAsText(file);
  }

  function showToast(msg, isError) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:' +
      (isError ? '#c0392b' : '#27ae60') + ';color:#fff;padding:10px 20px;border-radius:8px;' +
      'font-size:13px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,.3);pointer-events:none;';
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 3000);
  }

  document.getElementById('import-file-input').addEventListener('change', function(e) {
    if (e.target.files[0]) doImportData(e.target.files[0]);
    e.target.value = '';
  });

  document
    .getElementById("sidebar")
    .addEventListener("click", function (e) {
      if (e.target.closest("[data-action='export-data']")) {
        doExportData();
        return;
      }
      if (e.target.closest("[data-action='import-data']")) {
        document.getElementById('import-file-input').click();
        return;
      }
      if (e.target.closest("[data-action='reset-all']")) {
        doResetAll();
        return;
      }
      var btn = e.target.closest(".ch-btn");
      if (!btn) return;
      var ch = parseInt(btn.getAttribute("data-ch"));
      if (ch === 0) {
        renderOverview();
        return;
      }
      if (ch === -1) {
        enterDailyMode();
        return;
      }
      if (ch === -2) {
        renderStats();
        return;
      }
      if (isOverview || isDailyMode || isStatsMode || ch !== currentCh) {
        isOverview = false;
        chCollapsed = false;
        switchChapter(ch);
      } else {
        chCollapsed = !chCollapsed;
        var lnav = document.getElementById('level-nav');
        if (lnav) setLnavCollapsed(lnav, chCollapsed);
      }
    });

  /* ============ ch-done 뱃지 ============ */
  function updateChDoneBadges() {
    var buttons = Array.from(document.querySelectorAll(".ch-btn[data-ch]")).filter(function (btn) {
      var ch = parseInt(btn.getAttribute("data-ch"));
      return ch && CHAPTER_DATA[ch];
    });
    var promises = buttons.map(function (btn) {
      var ch = parseInt(btn.getAttribute("data-ch"));
      return store.get(CHAPTER_DATA[ch].storageKey).then(function (raw) {
        var progress = {};
        try { if (raw) progress = JSON.parse(raw) || {}; } catch (e) {}
        var qs = CHAPTER_DATA[ch].questions;
        var passed = qs.filter(function (q) {
          return progress[q.id] && progress[q.id].status === 'pass';
        }).length;
        return { btn: btn, ch: ch, qs: qs.length, passed: passed };
      });
    });
    Promise.all(promises).then(function (results) {
      var totalAll = 0, passedAll = 0;
      results.forEach(function (r) {
        totalAll += r.qs;
        passedAll += r.passed;
        var done = r.qs > 0 && r.passed === r.qs;
        r.btn.classList.toggle('ch-done', done);
      });
      var ovBtn = document.querySelector('.ch-btn[data-ch="0"]');
      if (ovBtn) {
        var pct = totalAll > 0 ? Math.round(passedAll / totalAll * 1000) / 10 : 0;
        ovBtn.style.setProperty('--ch-pct', pct + '%');
        var pctEl = ovBtn.querySelector('.ov-pct');
        if (pctEl) pctEl.textContent = pct > 0 ? pct.toFixed(1) + '%' : '';
      }
    });
  }

  /* ============ 유틸 ============ */
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function questionsOfLevel(lv) {
    return QUESTIONS.filter(function (q) {
      return q.level === lv;
    });
  }
  function failedQuestions() {
    return QUESTIONS.filter(function (q) {
      return (
        state.progress[q.id] && state.progress[q.id].status === "fail"
      );
    });
  }
  function bookmarkedQuestions() {
    return QUESTIONS.filter(function (q) {
      return !!state.bookmarks[q.id];
    });
  }
  function activeQuestionList() {
    if (state.reviewMode) return failedQuestions();
    if (state.bookmarkMode) return bookmarkedQuestions();
    return questionsOfLevel(state.level);
  }
  function totalPassed() {
    var n = 0;
    Object.keys(state.progress).forEach(function (k) {
      if (state.progress[k] && state.progress[k].status === "pass") n++;
    });
    return n;
  }
  function levelPassed(lv) {
    var n = 0;
    questionsOfLevel(lv).forEach(function (q) {
      if (state.progress[q.id] && state.progress[q.id].status === "pass")
        n++;
    });
    return n;
  }

  /* ============ 채점 ============ */
  function gradeQuestion(q, input) {
    return q.regex.every(function (r) {
      return r.test(input);
    });
  }
  async function gradeQuestionSmart(q, input) {
    if (serverAvailable) {
      var result = await gradeByExecution(q, input);
      if (result !== null) return result;
    }
    return gradeQuestion(q, input);
  }
  function pushLog(qid, pass, output) {
    state.log.push({
      cmd: "check " + qid,
      pass: pass,
      output: output || null,
    });
    if (state.log.length > 40) state.log.shift();
  }

  /* ============ 에디터 보조 ============ */
  var BRACKET_OPEN_CLOSE = { "(": ")", "[": "]", "{": "}" };
  var BRACKET_CLOSE_CHARS = { ")": true, "]": true, "}": true };
  var QUOTE_CHARS = { '"': true, "'": true };
  var INDENT_UNIT = "    ";
  function lineBoundsOf(v, s, e) {
    var ls = v.lastIndexOf("\n", s - 1) + 1,
      le = v.indexOf("\n", e);
    if (le === -1) le = v.length;
    return { lineStart: ls, lineEnd: le };
  }
  function indentSelection(ta, q) {
    var v = ta.value,
      s = ta.selectionStart,
      e = ta.selectionEnd;
    if (s === e) {
      ta.value = v.slice(0, s) + INDENT_UNIT + v.slice(s);
      ta.selectionStart = ta.selectionEnd = s + INDENT_UNIT.length;
      state.inputs[q.id] = ta.value;
      return;
    }
    var b = lineBoundsOf(v, s, e),
      lines = v.slice(b.lineStart, b.lineEnd).split("\n"),
      ind = lines
        .map(function (l) {
          return INDENT_UNIT + l;
        })
        .join("\n");
    ta.value = v.slice(0, b.lineStart) + ind + v.slice(b.lineEnd);
    ta.selectionStart = s + INDENT_UNIT.length;
    ta.selectionEnd = e + INDENT_UNIT.length * lines.length;
    state.inputs[q.id] = ta.value;
  }
  function outdentSelection(ta, q) {
    var v = ta.value,
      s = ta.selectionStart,
      e = ta.selectionEnd,
      b = lineBoundsOf(v, s, e),
      lines = v.slice(b.lineStart, b.lineEnd).split("\n"),
      removed = [],
      out = lines
        .map(function (l) {
          var m = l.match(/^( {1,4}|\t)/),
            n = m ? m[0].length : 0;
          removed.push(n);
          return l.slice(n);
        })
        .join("\n");
    ta.value = v.slice(0, b.lineStart) + out + v.slice(b.lineEnd);
    var fr = removed[0] || 0,
      tr = removed.reduce(function (a, c) {
        return a + c;
      }, 0);
    ta.selectionStart = Math.max(b.lineStart, s - fr);
    ta.selectionEnd = Math.max(ta.selectionStart, e - tr);
    state.inputs[q.id] = ta.value;
  }
  function autoIndentNewline(ta, q) {
    var v = ta.value,
      pos = ta.selectionStart,
      ls = v.lastIndexOf("\n", pos - 1) + 1,
      cur = v.slice(ls, pos),
      im = cur.match(/^[ \t]*/),
      ind = im ? im[0] : "",
      lns = v.slice(0, pos).replace(/\s+$/, "").slice(-1),
      ex = lns === "{" ? INDENT_UNIT : "",
      ins = "\n" + ind + ex;
    ta.value = v.slice(0, pos) + ins + v.slice(pos);
    var np = pos + ins.length;
    ta.selectionStart = ta.selectionEnd = np;
    state.inputs[q.id] = ta.value;
  }
  function handleBracketKeydown(e, ta, q) {
    var key = e.key;
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (BRACKET_OPEN_CLOSE[key]) {
      var s = ta.selectionStart,
        en = ta.selectionEnd,
        v = ta.value,
        cl = BRACKET_OPEN_CLOSE[key];
      if (s !== en) {
        var sel = v.slice(s, en);
        ta.value = v.slice(0, s) + key + sel + cl + v.slice(en);
        ta.selectionStart = s + 1;
        ta.selectionEnd = en + 1;
      } else {
        ta.value = v.slice(0, s) + key + cl + v.slice(s);
        ta.selectionStart = ta.selectionEnd = s + 1;
      }
      state.inputs[q.id] = ta.value;
      e.preventDefault();
      return true;
    }
    if (QUOTE_CHARS[key]) {
      var s = ta.selectionStart,
        en = ta.selectionEnd,
        v = ta.value;
      if (s !== en) {
        var sel = v.slice(s, en);
        ta.value = v.slice(0, s) + key + sel + key + v.slice(en);
        ta.selectionStart = s + 1;
        ta.selectionEnd = en + 1;
        state.inputs[q.id] = ta.value;
        e.preventDefault();
        return true;
      }
      if (v[s] === key) {
        ta.selectionStart = ta.selectionEnd = s + 1;
        e.preventDefault();
        return true;
      }
      ta.value = v.slice(0, s) + key + key + v.slice(s);
      ta.selectionStart = ta.selectionEnd = s + 1;
      state.inputs[q.id] = ta.value;
      e.preventDefault();
      return true;
    }
    if (BRACKET_CLOSE_CHARS[key]) {
      var p = ta.selectionStart;
      if (ta.selectionStart === ta.selectionEnd && ta.value[p] === key) {
        ta.selectionStart = ta.selectionEnd = p + 1;
        e.preventDefault();
        return true;
      }
      return false;
    }
    if (key === "Backspace") {
      var ss = ta.selectionStart,
        se = ta.selectionEnd;
      if (ss === se && ss > 0) {
        var pc = ta.value[ss - 1],
          nc = ta.value[ss];
        if (
          (BRACKET_OPEN_CLOSE[pc] && BRACKET_OPEN_CLOSE[pc] === nc) ||
          (QUOTE_CHARS[pc] && pc === nc)
        ) {
          ta.value = ta.value.slice(0, ss - 1) + ta.value.slice(ss + 1);
          ta.selectionStart = ta.selectionEnd = ss - 1;
          state.inputs[q.id] = ta.value;
          e.preventDefault();
          return true;
        }
      }
      return false;
    }
    return false;
  }
  /* ============ undo 스택 ============ */
  var undoStack = {};
  var undoPointer = {};
  var undoTimer = null;

  function pushUndo(q, ta) {
    var id = q.id;
    if (!undoStack[id]) {
      undoStack[id] = [];
      undoPointer[id] = -1;
    }
    var stack = undoStack[id];
    stack.splice(undoPointer[id] + 1);
    stack.push({
      value: ta.value,
      ss: ta.selectionStart,
      se: ta.selectionEnd,
    });
    if (stack.length > 100) stack.shift();
    undoPointer[id] = stack.length - 1;
  }

  function doUndo(q, ta) {
    var id = q.id;
    if (!undoStack[id] || undoPointer[id] <= 0) return;
    undoPointer[id]--;
    var snap = undoStack[id][undoPointer[id]];
    ta.value = snap.value;
    ta.selectionStart = snap.ss;
    ta.selectionEnd = snap.se;
    state.inputs[id] = ta.value;
  }

  function scheduleUndo(q, ta) {
    clearTimeout(undoTimer);
    undoTimer = setTimeout(function () {
      pushUndo(q, ta);
    }, 300);
  }

  function handleEditorKeydown(e, ta, q) {
    if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      doUndo(q, ta);
      return;
    }
    if (e.key === "Tab" && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      pushUndo(q, ta);
      if (e.shiftKey) outdentSelection(ta, q);
      else indentSelection(ta, q);
      return;
    }
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      pushUndo(q, ta);
      autoIndentNewline(ta, q);
      return;
    }
    handleBracketKeydown(e, ta, q);
  }

  /* ============ 렌더링 ============ */
  function renderEmptySpecial() {
    var app = document.getElementById("app"),
      passed = totalPassed(),
      isB = state.bookmarkMode;
    var title = isB
      ? "🔖 아직 즐겨찾기한 문제가 없습니다"
      : "🎉 지금은 틀린 문제가 없습니다";
    var failCount = failedQuestions().length,
      bmCount = Object.keys(state.bookmarks).filter(function (k) {
        return state.bookmarks[k];
      }).length;
    var lnav = document.getElementById("level-nav"),
      lhtml = "";
    LEVELS.forEach(function (lv) {
      var p = levelPassed(lv.id),
        qs = questionsOfLevel(lv.id).length;
      var isDone = p === qs && qs > 0;
      lhtml +=
        '<button class="lv-btn' +
        (isDone ? " lv-done" : "") +
        '" data-action="select-level" data-level="' +
        lv.id +
        '">' +
        esc(lv.name) +
        ' <span style="font-family:var(--mono);font-size:10px;opacity:.7;">' +
        p +
        "/" +
        qs +
        "</span></button>";
    });
    lhtml += '<div class="lv-sep"></div>';
    lhtml +=
      '<button class="lv-btn lv-special' +
      (state.reviewMode ? " lv-on" : "") +
      '" data-action="toggle-review">📌 오답노트 <span style="font-family:var(--mono);font-size:10px;opacity:.7;">' +
      failCount +
      "</span></button>";
    lhtml +=
      '<button class="lv-btn lv-special' +
      (state.bookmarkMode ? " lv-on" : "") +
      '" data-action="toggle-bookmark-mode">🔖 즐겨찾기 <span style="font-family:var(--mono);font-size:10px;opacity:.7;">' +
      bmCount +
      "</span></button>";
    lnav.innerHTML = lhtml;
    (function () {
      var activeChBtn = document.querySelector('#chapter-nav .ch-btn[data-ch="' + currentCh + '"]');
      if (activeChBtn) activeChBtn.parentNode.insertBefore(lnav, activeChBtn.nextSibling);
      var alreadyOpen = lnav.style.display !== 'none' && !lnav.classList.contains('lnav-collapsed');
      if (chCollapsed) {
        lnav.style.display = 'none';
        lnav.classList.add('lnav-collapsed');
      } else if (alreadyOpen) {
        lnav.classList.remove('lnav-collapsed');
      } else {
        lnav.style.display = 'none';
        lnav.classList.add('lnav-no-transition', 'lnav-collapsed');
        lnav.getBoundingClientRect();
        lnav.classList.remove('lnav-no-transition');
        setLnavCollapsed(lnav, false);
      }
    })();
    var html = "";
    html +=
      '<div class="topbar"><div class="topbar-left"><div class="brand-eyebrow">$ run --suite ' +
      CHAPTER_DATA[currentCh].suite +
      '</div><h1 class="brand-title">' +
      CHAPTER_DATA[currentCh].brandTitle +
      "</h1></div>";
    html +=
      '<div class="top-stats"><button class="reset-btn" data-action="reset">진행 초기화</button></div></div>';
    html +=
      '<div class="card" style="text-align:center;padding:50px 24px;"><div class="card-title">' +
      title +
      "</div>";
    html +=
      '<p style="color:var(--muted);font-size:13.5px;margin:10px 0 18px;">전체 진행: ' +
      passed +
      " / " +
      QUESTIONS.length +
      "</p>";
    html +=
      '<button class="btn btn-grade" data-action="exit-review">전체 문제로 돌아가기</button></div>';
    app.innerHTML = html;
    updateServerBadge();
  }

  function render() {
    var app = document.getElementById("app");
    if (!state.loaded) {
      app.innerHTML =
        '<div class="loading">진행 상황 불러오는 중...</div>';
      return;
    }
    var levelQs = activeQuestionList();
    if (
      (state.reviewMode || state.bookmarkMode) &&
      levelQs.length === 0
    ) {
      renderEmptySpecial();
      return;
    }
    if (state.index >= levelQs.length) state.index = 0;
    // auto-adjust qNavPage to keep current dot visible
    var Q_PAGE_SIZE = 6;
    if (!state.qNavPage) state.qNavPage = 0;
    if (state.index < state.qNavPage * Q_PAGE_SIZE ||
        state.index >= state.qNavPage * Q_PAGE_SIZE + Q_PAGE_SIZE) {
      state.qNavPage = Math.floor(state.index / Q_PAGE_SIZE);
    }
    var maxQPage = Math.max(0, Math.ceil(levelQs.length / Q_PAGE_SIZE) - 1);
    if (state.qNavPage > maxQPage) state.qNavPage = maxQPage;

    var q = levelQs[state.index],
      passed = totalPassed(),
      html = "";

    // Build dot-nav HTML (always 6 fixed slots)
    var qNavHtml = '<div class="q-nav">';
    qNavHtml += '<button class="q-nav-arrow" data-action="prev"' +
      (state.index === 0 ? ' disabled' : '') + '>&#8249;</button>';
    qNavHtml += '<div class="q-nav-dots">';
    var dotStart = state.qNavPage * Q_PAGE_SIZE;
    for (var di = dotStart; di < dotStart + Q_PAGE_SIZE; di++) {
      if (di < levelQs.length) {
        var dq = levelQs[di];
        var dst = state.progress[dq.id] && state.progress[dq.id].status;
        var dcls = 'dot' +
          (di === state.index ? ' current' : '') +
          (!state.bookmarkMode && dst === 'pass' ? ' pass' : !state.bookmarkMode && dst === 'fail' ? ' fail' : '') +
          (!state.bookmarkMode && state.bookmarks[dq.id] ? ' bookmarked' : '');
        qNavHtml += '<div class="' + dcls + '" data-action="jump" data-index="' + di +
          '" title="' + esc(dq.id) + '">' + (di + 1) + '</div>';
      } else {
        qNavHtml += '<div class="dot dot-empty"></div>';
      }
    }
    qNavHtml += '</div>';
    qNavHtml += '<button class="q-nav-arrow" data-action="next"' +
      (state.index >= levelQs.length - 1 ? ' disabled' : '') + '>&#8250;</button>';
    qNavHtml += '</div>';

    // stats HTML (우상단)
    var statsHtml = '<div class="top-stats-box">';
    statsHtml += '<div class="progress-wrap"><div class="progress-label"><span>전체 진행</span><b>' +
      passed + ' / ' + QUESTIONS.length + '</b></div>';
    statsHtml += '<div class="progress-track"><div class="progress-fill" style="width:' +
      Math.round((passed / QUESTIONS.length) * 100) + '%"></div></div></div>';
    statsHtml += '<button class="reset-btn" data-action="reset-level">현재 장 초기화</button>';
    statsHtml += '</div>';

    html += '<div class="topbar">';
    html += '<div class="topbar-main"><div class="topbar-left">';
    html += '<div class="brand-eyebrow">$ run --suite ' + CHAPTER_DATA[currentCh].suite + '</div>';
    html += '<h1 class="brand-title">' + CHAPTER_DATA[currentCh].brandTitle + '</h1>';
    html += '<div class="brand-sub">코드를 입력하고 채점 버튼을 누르세요. <span id="server-badge" style="font-size:0.85em;">● regex 채점 (서버 꺼짐)</span></div>';
    html += '</div>' + statsHtml + '</div>';
    html += '<div class="topbar-bottom">';
    html += '<div class="kbd-hint"><div><kbd>Ctrl/Cmd</kbd>+<kbd>Enter</kbd> 채점 · <kbd>←</kbd><kbd>→</kbd> 이전/다음 문제 · <kbd>R</kbd> 정답 보기</div><div><kbd>Esc</kbd> 입력창 빠져나오기 · <kbd>Enter</kbd> 입력창 포커스</div></div>';
    html += '<div class="top-qnav">' + qNavHtml + '</div>';
    html += '</div>';
    html += '</div>';

    /* --- level nav bar --- */
    var failCount = failedQuestions().length,
      bmCount = Object.keys(state.bookmarks).filter(function (k) {
        return state.bookmarks[k];
      }).length;
    var lnav = document.getElementById("level-nav"),
      lhtml = "";
    LEVELS.forEach(function (lv) {
      var p = levelPassed(lv.id),
        qs = questionsOfLevel(lv.id).length;
      var isActive =
        !state.reviewMode && !state.bookmarkMode && state.level === lv.id;
      var isDone = p === qs && qs > 0;
      lhtml +=
        '<button class="lv-btn' +
        (isDone ? " lv-done" : "") +
        (isActive ? " lv-active" : "") +
        '" data-action="select-level" data-level="' +
        lv.id +
        '">' +
        esc(lv.name) +
        ' <span style="font-family:var(--mono);font-size:10px;opacity:.7;">' +
        p +
        "/" +
        qs +
        "</span></button>";
    });
    lhtml += '<div class="lv-sep"></div>';
    lhtml +=
      '<button class="lv-btn lv-special' +
      (state.reviewMode ? " lv-on" : "") +
      '" data-action="toggle-review">📌 오답노트 <span style="font-family:var(--mono);font-size:10px;opacity:.7;">' +
      failCount +
      "</span></button>";
    lhtml +=
      '<button class="lv-btn lv-special' +
      (state.bookmarkMode ? " lv-on" : "") +
      '" data-action="toggle-bookmark-mode">🔖 즐겨찾기 <span style="font-family:var(--mono);font-size:10px;opacity:.7;">' +
      bmCount +
      "</span></button>";
    lhtml += '<button class="lv-reset-btn" data-action="reset-chapter">장 전체 초기화</button>';
    lnav.innerHTML = lhtml;
    (function () {
      var activeChBtn = document.querySelector('#chapter-nav .ch-btn[data-ch="' + currentCh + '"]');
      if (activeChBtn) activeChBtn.parentNode.insertBefore(lnav, activeChBtn.nextSibling);
      var alreadyOpen = lnav.style.display !== 'none' && !lnav.classList.contains('lnav-collapsed');
      if (chCollapsed) {
        lnav.style.display = 'none';
        lnav.classList.add('lnav-collapsed');
      } else if (alreadyOpen) {
        lnav.classList.remove('lnav-collapsed');
      } else {
        lnav.style.display = 'none';
        lnav.classList.add('lnav-no-transition', 'lnav-collapsed');
        lnav.getBoundingClientRect();
        lnav.classList.remove('lnav-no-transition');
        setLnavCollapsed(lnav, false);
      }
    })();

    html += '<div class="layout">';

    html += '<div class="content"><div class="card">';
    var eyebrow;
    if (state.reviewMode) {
      eyebrow = "📌 오답 노트 (복습 모드)";
    } else if (state.bookmarkMode) {
      var lvIdx = questionsOfLevel(q.level).indexOf(q) + 1;
      var lvName2 = LEVELS[q.level] ? LEVELS[q.level].name : '';
      var lvChNum = lvName2.match(/^(\d+)장/);
      var lvLabel = lvChNum ? (lvChNum[1] + "장") : lvName2;
      eyebrow = "🔖 즐겨찾기 · " + lvLabel + " " + lvIdx + "번";
    } else {
      eyebrow = esc(LEVELS[state.level].name);
    }
    html +=
      '<div class="card-eyebrow">' +
      eyebrow +
      " · 문항 " +
      (state.index + 1) +
      " / " +
      levelQs.length +
      (state.bookmarkMode ? "" : " · " + esc(q.id)) +
      "</div>";
    html +=
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">';
    html +=
      '<h2 class="card-title" style="margin:0;">' +
      esc(q.title) +
      "</h2>";
    html +=
      '<button class="btn btn-ghost" style="padding:5px 10px;font-size:12px;white-space:nowrap;" data-action="toggle-bookmark" data-qid="' +
      esc(q.id) +
      '">' +
      (state.bookmarks[q.id] ? "🔖 즐겨찾기 해제" : "☆ 즐겨찾기 추가") +
      "</button></div>";
    if (state.reviewMode || state.bookmarkMode)
      html +=
        '<button class="btn btn-ghost" style="align-self:flex-start;padding:5px 10px;font-size:12px;" data-action="exit-review">← 전체 문제로 돌아가기</button>';
    html +=
      '<div class="concept"><b>핵심 개념</b> — ' +
      esc(q.concept) +
      "</div>";
    html += '<div class="codebox">' +
      '<button class="codebox-copy-btn" data-action="copy-code" title="전체 코드 복사">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
      '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
      '</svg></button>';
    var userInputStart = getUserInputStartLine(q);
    var beforeStart = userInputStart - (q.before || []).length;
    q.before.forEach(function (l, i) {
      html += '<div class="cl muted" data-codeline="' + (beforeStart + i) + '">' + esc(l) + "</div>";
    });
    q.placeholder.forEach(function (l) {
      html += '<div class="cl muted">' + esc(l) + "</div>";
    });
    var savedInput =
      state.inputs[q.id] !== undefined
        ? state.inputs[q.id]
        : (state.progress[q.id] && state.progress[q.id].input) || "";
    var errLines = state.lastErrorLines || [];
    var userLineCount = savedInput ? savedInput.split('\n').length : 0;
    var taErrLines = errLines.filter(function (ln) {
      return ln >= userInputStart && ln < userInputStart + userLineCount;
    }).map(function (ln) { return ln - userInputStart + 1; });
    html +=
      '<textarea class="blank' + (taErrLines.length ? ' textarea-has-error' : '') + '" id="ans-input" rows="' +
      (q.rows || 5) +
      '" placeholder="여기에 코드를 입력하세요"></textarea>';
    if (taErrLines.length) {
      html += '<div class="textarea-error-hint">↑ 내 코드 ' + taErrLines.map(function(n){ return n + '번째 줄'; }).join(', ') + '에 오류</div>';
    }
    var afterStart = userInputStart + userLineCount;
    q.after.forEach(function (l, i) {
      html += '<div class="cl muted" data-codeline="' + (afterStart + i) + '">' + esc(l) + "</div>";
    });
    html += "</div>";
    html +=
      '<div class="expected">기대 출력: <code>' +
      esc(q.expected) +
      "</code></div>";
    var fb = state.progress[q.id],
      fbClass = "",
      fbText = "";
    var lastLog = state.log.filter(function (l) {
      return l.cmd === "check " + q.id;
    });
    var lastOutput = lastLog.length
      ? lastLog[lastLog.length - 1].output
      : null;
    if (fb && fb.status === "pass") {
      fbClass = "pass show";
      fbText = "✓ PASS — 정답입니다.";
    } else if (fb && fb.status === "fail") {
      fbClass = "fail show";
      var isCompileError = lastOutput && lastOutput.indexOf('⚠') === 0;
      fbText = isCompileError
        ? "✗ FAIL — 문법을 다시 확인해보세요."
        : "✗ FAIL — 출력값이 다릅니다.";
    }
    var outputHtml = "";
    if (lastOutput !== null && lastOutput !== undefined) {
      var isErrOutput = lastOutput.indexOf('⚠') === 0;
      if (isErrOutput) {
        var userInputStart2 = getUserInputStartLine(q);
        var displayOutput = lastOutput.replace(/^⚠ /, '').replace(/\/[^\s]*Main\.java:(\d+):/g, function (_, n) {
          var fullLine = parseInt(n, 10);
          var rel = fullLine - userInputStart2 + 1;
          return '[' + (rel > 0 ? '내 코드 ' + rel + '번째 줄' : '전체 ' + fullLine + '번째 줄') + ']';
        });
        outputHtml =
          '<div class="output-box">' +
          '<span class="output-label">출력</span>' +
          '<pre class="output-val output-val-error">' + esc(displayOutput) + '</pre>' +
          '</div>';
      } else {
        var actualLines = lastOutput.split('\n');
        var expectedLines = String(q.expected).trim().split('\n');
        var maxLen = Math.max(actualLines.length, expectedLines.length);
        var diffRows = '';
        for (var di = 0; di < maxLen; di++) {
          var aLine = actualLines[di] !== undefined ? actualLines[di] : '';
          var eLine = expectedLines[di] !== undefined ? expectedLines[di] : '';
          var match = aLine === eLine;
          var rowCls = match ? 'diff-row diff-match' : 'diff-row diff-mismatch';
          diffRows +=
            '<div class="' + rowCls + '">' +
            '<span class="diff-cell diff-expected">' + esc(eLine) + '</span>' +
            '<span class="diff-cell diff-actual">' + esc(aLine) + '</span>' +
            '</div>';
        }
        outputHtml =
          '<div class="output-box output-box-diff">' +
          '<div class="diff-header">' +
          '<span class="output-label">기대 출력</span>' +
          '<span class="output-label">실제 출력</span>' +
          '</div>' +
          '<div class="diff-body">' + diffRows + '</div>' +
          '</div>';
      }
    }
    html +=
      '<div class="actions"><button class="btn btn-grade" data-action="grade">채점</button>';
    html +=
      '<button class="btn btn-ghost" data-action="reveal">' +
      (state.revealed[q.id] ? "정답 숨기기" : "정답 보기") +
      "</button></div>";
    html +=
      '<div class="feedback ' +
      fbClass +
      '" id="fb-msg">' +
      fbText +
      "</div>";
    html += outputHtml;
    html +=
      '<div class="answer-box' +
      (state.revealed[q.id] ? " show" : "") +
      '">';
    html += '<div class="lbl">🔍 정답</div>';
    q.answer.forEach(function (l) {
      html += '<div class="al">' + esc(l) + "</div>";
    });
    if (q.note) html += '<div class="note">' + esc(q.note) + "</div>";
    html += "</div>";
    html += getMemoHtml(q.id);
    html += '<div class="nav-row">';
    html +=
      '<button class="btn btn-nav" data-action="prev" ' +
      (state.index === 0 ? "disabled" : "") +
      ">← 이전</button>";
    html +=
      '<span class="pos">' +
      (state.index + 1) +
      " / " +
      levelQs.length +
      "</span>";
    html +=
      '<button class="btn btn-nav" data-action="next" ' +
      (state.index === levelQs.length - 1 ? "disabled" : "") +
      ">다음 →</button>";
    html += "</div></div></div>";

    app.innerHTML = html;
    attachMemoEvents(q.id);
    updateServerBadge();
    if (state.lastErrorLines && state.lastErrorLines.length) {
      state.lastErrorLines.forEach(function (ln) {
        var el = app.querySelector('[data-codeline="' + ln + '"]');
        if (el) el.classList.add('cl-error');
      });
    }
    var ta = document.getElementById("ans-input");
    if (ta) {
      function autoResize() {
        ta.style.height = "auto";
        ta.style.height = ta.scrollHeight + "px";
      }
      ta.value = savedInput;
      autoResize();
      pushUndo(q, ta);
      ta.addEventListener("input", function () {
        state.inputs[q.id] = ta.value;
        scheduleUndo(q, ta);
        autoResize();
      });
      ta.addEventListener("keydown", function (e) {
        handleEditorKeydown(e, ta, q);
      });
    }
  }

  /* ============ 액션 ============ */
  function doSelectLevel(lv) {
    state.reviewMode = false;
    state.bookmarkMode = false;
    state.level = lv;
    state.index = 0;
    savePosition();
    render();
  }
  function doToggleReview() {
    state.reviewMode = !state.reviewMode;
    if (state.reviewMode) state.bookmarkMode = false;
    state.index = 0;
    render();
  }
  function doToggleBookmarkMode() {
    state.bookmarkMode = !state.bookmarkMode;
    if (state.bookmarkMode) state.reviewMode = false;
    state.index = 0;
    render();
  }
  function doExitSpecialMode() {
    state.reviewMode = false;
    state.bookmarkMode = false;
    state.index = 0;
    render();
  }
  function doJump(i) {
    state.index = i;
    state.qNavPage = Math.floor(i / 6);
    savePosition();
    render();
  }
  function doQNavPrev() {
    if (state.qNavPage > 0) { state.qNavPage--; render(); }
  }
  function doQNavNext() {
    var lq = activeQuestionList();
    var maxPage = Math.max(0, Math.ceil(lq.length / 6) - 1);
    if (state.qNavPage < maxPage) { state.qNavPage++; render(); }
  }
  function doPrev() {
    if (state.index > 0) {
      state.index--;
      savePosition();
      render();
    }
  }
  function doNext() {
    var lq = activeQuestionList();
    if (state.index < lq.length - 1) {
      state.index++;
      savePosition();
      render();
    }
  }
  function doCopyCode() {
    var q;
    if (isDailyMode) {
      var de = dailyState.questions[dailyState.index];
      if (!de) return;
      q = de.q;
    } else {
      q = activeQuestionList()[state.index];
      if (!q) return;
    }
    var ta = document.getElementById('ans-input');
    var userInput = ta ? ta.value : '';
    var fullCode = buildJavaCode(q, userInput);
    var btn = document.querySelector('[data-action="copy-code"]');
    var origHTML = btn ? btn.innerHTML : '';
    var checkSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullCode).then(function () {
        if (btn) { btn.innerHTML = checkSVG; setTimeout(function () { btn.innerHTML = origHTML; }, 1500); }
      });
    } else {
      var ta2 = document.createElement('textarea');
      ta2.value = fullCode;
      ta2.style.position = 'fixed'; ta2.style.opacity = '0';
      document.body.appendChild(ta2);
      ta2.select();
      document.execCommand('copy');
      document.body.removeChild(ta2);
      if (btn) { btn.innerHTML = checkSVG; setTimeout(function () { btn.innerHTML = origHTML; }, 1500); }
    }
  }
  function doReveal() {
    var lq = activeQuestionList(),
      q = lq[state.index];
    if (!q) return;
    state.revealed[q.id] = !state.revealed[q.id];
    render();
  }
  function doToggleBookmark(qid) {
    if (!qid) return;
    if (state.bookmarks[qid]) delete state.bookmarks[qid];
    else state.bookmarks[qid] = true;
    saveBookmarks();
    render();
  }
  async function doGrade() {
    var lq = activeQuestionList(),
      q = lq[state.index];
    if (!q) return;
    var ta = document.getElementById("ans-input"),
      val = ta ? ta.value : "";
    var gradeBtn = document.querySelector('[data-action="grade"]');
    if (gradeBtn) {
      gradeBtn.disabled = true;
      gradeBtn.textContent = "채점 중...";
    }
    var executionOutput = null;
    var pass;
    state.lastErrorLines = [];
    if (serverAvailable) {
      var result = await gradeByExecution(q, val);
      if (result !== null) {
        pass = result.pass;
        executionOutput = result.output;
        state.lastErrorLines = result.errorLines || [];
      } else {
        pass = gradeQuestion(q, val);
      }
    } else {
      pass = gradeQuestion(q, val);
    }
    if (gradeBtn) {
      gradeBtn.disabled = false;
      gradeBtn.textContent = "채점";
    }
    var wasAlreadyPassed = state.progress[q.id] && state.progress[q.id].status === "pass";
    state.progress[q.id] = { status: pass ? "pass" : "fail", input: val };
    pushLog(q.id, pass, executionOutput);
    saveProgress();
    if (pass && !wasAlreadyPassed) recordGrass(q.id);
    render();
  }
  function doResetLevel() {
    var lvName = LEVELS[state.level] ? LEVELS[state.level].name : '현재 장';
    if (!window.confirm('"' + lvName + '" 문제를 모두 초기화할까요? 되돌릴 수 없습니다.')) return;
    questionsOfLevel(state.level).forEach(function (q) {
      delete state.progress[q.id];
      delete state.inputs[q.id];
      delete state.revealed[q.id];
    });
    state.index = 0;
    state.reviewMode = false;
    saveProgress();
    render();
  }
  function doResetChapter() {
    var chName = CHAPTER_DATA[currentCh] ? CHAPTER_DATA[currentCh].brandTitle : '현재 챕터';
    if (!window.confirm('"' + chName + '" 전체 장을 초기화할까요? 되돌릴 수 없습니다.')) return;
    state.progress = {};
    state.inputs = {};
    state.revealed = {};
    state.log = [];
    state.index = 0;
    state.reviewMode = false;
    saveProgress();
    render();
  }
  function doResetAll() {
    if (!window.confirm('모든 챕터의 진행 상황을 초기화할까요? 되돌릴 수 없습니다.')) return;
    Object.values(CHAPTER_DATA).forEach(function (chData) {
      if (chData.storageKey) store.set(chData.storageKey, '{}');
      if (chData.bookmarkKey) store.set(chData.bookmarkKey, '{}');
    });
    state.progress = {};
    state.inputs = {};
    state.revealed = {};
    state.log = [];
    state.index = 0;
    state.reviewMode = false;
    saveProgress();
    render();
  }
  function focusAnswerInput() {
    var ta = document.getElementById("ans-input");
    if (ta) ta.focus();
  }

  /* ============ 이벤트 ============ */
  function handleAction(el) {
    var action = el.getAttribute("data-action");
    if (action === "select-level")
      doSelectLevel(parseInt(el.getAttribute("data-level"), 10));
    else if (action === "toggle-review") doToggleReview();
    else if (action === "toggle-bookmark-mode") doToggleBookmarkMode();
    else if (action === "exit-review") doExitSpecialMode();
    else if (action === "jump")
      doJump(parseInt(el.getAttribute("data-index"), 10));
    else if (action === "prev") doPrev();
    else if (action === "next") doNext();
    else if (action === "qnav-prev") doQNavPrev();
    else if (action === "qnav-next") doQNavNext();
    else if (action === "reveal") doReveal();
    else if (action === "toggle-bookmark")
      doToggleBookmark(el.getAttribute("data-qid"));
    else if (action === "copy-code") doCopyCode();
    else if (action === "grade") doGrade();
    else if (action === "reset-level") doResetLevel();
    else if (action === "reset-chapter") doResetChapter();
    else if (action === "daily-grade") doGradeDaily();
    else if (action === "daily-prev") {
      if (dailyState.index > 0) { dailyState.index--; savePosition(); renderDaily(); }
    }
    else if (action === "daily-next") {
      if (dailyState.index < dailyState.questions.length - 1) { dailyState.index++; savePosition(); renderDaily(); }
    }
    else if (action === "daily-qnav-prev") {
      if (dailyState.qNavPage > 0) { dailyState.qNavPage--; renderDaily(); }
    }
    else if (action === "daily-qnav-next") {
      var maxDP = Math.max(0, Math.ceil(dailyState.questions.length / 6) - 1);
      if (dailyState.qNavPage < maxDP) { dailyState.qNavPage++; renderDaily(); }
    }
    else if (action === "daily-jump") {
      dailyState.index = parseInt(el.getAttribute("data-index"), 10);
      savePosition(); renderDaily();
    }
    else if (action === "daily-reveal") {
      var de = dailyState.questions[dailyState.index];
      if (de) { dailyState.revealed[de.q.id] = !dailyState.revealed[de.q.id]; renderDaily(); }
    }
    else if (action === "daily-results") renderDailyDone();
    else if (action === "daily-restart") {
      dailyState.index = 0;
      dailyState.log = {};
      dailyState.revealed = {};
      dailyState.inputs = {};
      renderDaily();
    }
    else if (action === "go-chapter") {
      var ch = parseInt(el.getAttribute("data-ch"), 10);
      isOverview = false;
      switchChapter(ch);
    }
    else if (action === "export-wrong-prompt") doExportWrongPrompt();
    else if (action === "reset-wrong-log") doResetWrongLog();
  }
  document
    .getElementById("level-nav")
    .addEventListener("click", function (e) {
      var el = e.target.closest("[data-action]");
      if (!el) return;
      handleAction(el);
    });
  document.getElementById("app").addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    handleAction(el);
  });

  document.addEventListener("keydown", function (e) {
    var ta = document.getElementById("ans-input"),
      taf = document.activeElement === ta,
      activeEl = document.activeElement,
      isEditable = activeEl && (activeEl.tagName === "TEXTAREA" || activeEl.tagName === "INPUT" || activeEl.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (isDailyMode) doGradeDaily(); else doGrade();
      return;
    }
    if (taf) {
      if (e.key === "Escape") {
        e.preventDefault();
        ta.blur();
      }
      return;
    }
    if (isEditable) {
      if (e.key === "Escape") {
        e.preventDefault();
        activeEl.blur();
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      focusAnswerInput();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (isDailyMode) { if (dailyState.index > 0) { dailyState.index--; dailyState.qNavPage = Math.floor(dailyState.index / 6); savePosition(); renderDaily(); } } else doPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (isDailyMode) { if (dailyState.index < dailyState.questions.length - 1) { dailyState.index++; dailyState.qNavPage = Math.floor(dailyState.index / 6); savePosition(); renderDaily(); } } else doNext();
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      if (isDailyMode) {
        var de = dailyState.questions[dailyState.index];
        if (de) { dailyState.revealed[de.q.id] = !dailyState.revealed[de.q.id]; renderDaily(); }
      } else doReveal();
    }
  });

  /* ============ 사이드바 핀 ============ */
  (function () {
    var sidebar = document.getElementById('sidebar');
    var pinBtn = document.getElementById('sidebar-pin');
    function applyPinned(pinned) {
      sidebar.classList.toggle('pinned', pinned);
      pinBtn.title = pinned ? '사이드바 고정 해제' : '사이드바 고정';
    }
    if (localStorage.getItem('sidebar_pinned') === '1') applyPinned(true);
    pinBtn.addEventListener('click', function () {
      var next = !sidebar.classList.contains('pinned');
      applyPinned(next);
      localStorage.setItem('sidebar_pinned', next ? '1' : '0');
    });
  })();

  /* ============ 시작 ============ */
  // progress 로드 완료 후 위치 복원 → 렌더링 (타이밍 race condition 방지)
  render();
  renderGrass();
  loadProgress().then(function () {
    loadPosition();
    if (!isDailyMode && !isOverview && !isStatsMode) render();
    updateChDoneBadges();
    updateDailyBadge();
  });
  checkServer();
})();
