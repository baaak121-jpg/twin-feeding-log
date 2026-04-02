(function () {
  'use strict';

  /* ============================
     디버그 로그 (화면에 표시)
     ============================ */
  var errorBanner = document.getElementById('error-banner');
  var debugLines = [];
  function debugLog(msg) {
    debugLines.push(msg);
    if (errorBanner) {
      errorBanner.style.display = 'block';
      errorBanner.style.color = '#555';
      errorBanner.style.textAlign = 'left';
      errorBanner.style.fontSize = '0.75rem';
      errorBanner.style.whiteSpace = 'pre-wrap';
      errorBanner.textContent = debugLines.join('\n');
    }
  }
  function showError(msg) {
    if (errorBanner) {
      errorBanner.textContent = msg;
      errorBanner.style.display = 'block';
      errorBanner.style.color = '#c44';
    }
  }

  debugLog('[1] app.js 시작');
  debugLog('[2] firebase: ' + (typeof firebase));
  debugLog('[3] window.db: ' + (typeof window.db));

  /* ============================
     Firebase 확인
     ============================ */
  if (typeof firebase === 'undefined' || !window.db) {
    showError('Firebase 연결 실패. firebase=' + (typeof firebase) + ', db=' + (typeof window.db));
    return;
  }
  var db = window.db;
  debugLog('[4] db 연결 OK');

  /* ============================
     DOM 요소
     ============================ */
  var dateInput = document.getElementById('log-date');
  var hourSelect = document.getElementById('feeding-hour');
  var minuteSelect = document.getElementById('feeding-minute');
  var babyBtns = document.querySelectorAll('.baby-btn');
  var btnAdd = document.getElementById('btn-add');
  var listEl = document.getElementById('feeding-list');
  var emptyMsg = document.getElementById('empty-msg');
  var nameFirst = document.getElementById('name-first');
  var nameSecond = document.getElementById('name-second');
  var viewBtns = document.querySelectorAll('.view-btn');
  var viewList = document.getElementById('view-list');
  var viewSplit = document.getElementById('view-split');
  var titleFirst = document.getElementById('title-first');
  var titleSecond = document.getElementById('title-second');
  var splitTbody = document.getElementById('split-tbody');
  var emptySplit = document.getElementById('empty-split');
  var totalFirstEl = document.getElementById('total-first');
  var totalSecondEl = document.getElementById('total-second');
  var volumeInput = document.getElementById('feeding-volume');
  var poopCheckbox = document.getElementById('feeding-poop');

  var selectedBaby = '1';

  /* ============================
     Firebase 참조
     ============================ */
  var logsRef = db.ref('logs');
  var namesRef = db.ref('names');

  /* ============================
     로컬 캐시
     ============================ */
  var allLogs = {};
  var babyNames = { first: '', second: '' };

  /* ============================
     유틸
     ============================ */
  function todayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    if (m.length < 2) m = '0' + m;
    var day = String(d.getDate());
    if (day.length < 2) day = '0' + day;
    return y + '-' + m + '-' + day;
  }

  function currentDate() {
    return dateInput.value || todayStr();
  }

  function pad2(n) {
    var s = String(n);
    return s.length < 2 ? '0' + s : s;
  }

  /* ============================
     이름
     ============================ */
  function getDisplayNames() {
    var f = babyNames.first ? babyNames.first.trim() : '';
    var s = babyNames.second ? babyNames.second.trim() : '';
    return {
      first: f || '첫째',
      second: s || '둘째'
    };
  }

  function babyLabel(baby) {
    var names = getDisplayNames();
    if (baby === '1') return names.first;
    if (baby === '2') return names.second;
    return '둘 다';
  }

  function updateBabyButtonLabels() {
    var names = getDisplayNames();
    var labels = document.querySelectorAll('.baby-btn-label');
    if (labels.length > 0) labels[0].textContent = names.first;
    if (labels.length > 1) labels[1].textContent = names.second;
  }

  function initNamesUI() {
    nameFirst.value = babyNames.first;
    nameSecond.value = babyNames.second;
    updateBabyButtonLabels();
  }

  nameFirst.addEventListener('input', function () {
    namesRef.update({ first: nameFirst.value });
  });
  nameSecond.addEventListener('input', function () {
    namesRef.update({ second: nameSecond.value });
  });

  /* ============================
     로그 조회 (로컬 캐시)
     ============================ */
  function getLogsForDate(dateStr) {
    var dateObj = allLogs[dateStr] || {};
    var keys = Object.keys(dateObj);
    var result = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var log = dateObj[k];
      result.push({
        time: log.time,
        baby: log.baby,
        volume: log.volume != null ? log.volume : null,
        poop: !!log.poop,
        _key: k
      });
    }
    result.sort(function (a, b) {
      return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
    });
    return result;
  }

  /* ============================
     쓰기
     ============================ */
  function addLog(dateStr, time, baby, volume, poop) {
    var vol = (volume !== '' && volume !== undefined && volume !== null) ? Number(volume) : null;
    var entry = { time: time, baby: baby, poop: !!poop };
    if (vol !== null && !isNaN(vol)) entry.volume = vol;
    logsRef.child(dateStr).push(entry);
  }

  function removeLog(dateStr, key, fromBaby) {
    var logRef = logsRef.child(dateStr).child(key);
    var dateObj = allLogs[dateStr] || {};
    var log = dateObj[key];
    if (!log) return;
    if (log.baby === 'both' && fromBaby) {
      logRef.update({ baby: fromBaby === '1' ? '2' : '1' });
    } else {
      logRef.remove();
    }
  }

  /* ============================
     합계
     ============================ */
  function getDailyVolumeTotals(dateStr) {
    var logs = getLogsForDate(dateStr);
    var first = 0;
    var second = 0;
    for (var i = 0; i < logs.length; i++) {
      var vol = logs[i].volume != null ? logs[i].volume : 0;
      if (logs[i].baby === '1' || logs[i].baby === 'both') first += vol;
      if (logs[i].baby === '2' || logs[i].baby === 'both') second += vol;
    }
    return { first: first, second: second };
  }

  function updateDailyTotal() {
    var dateStr = currentDate();
    var totals = getDailyVolumeTotals(dateStr);
    var names = getDisplayNames();
    if (totalFirstEl) totalFirstEl.textContent = names.first + ' 합계: ' + totals.first + 'ml';
    if (totalSecondEl) totalSecondEl.textContent = names.second + ' 합계: ' + totals.second + 'ml';
  }

  /* ============================
     렌더링: 목록 보기
     ============================ */
  function renderList() {
    var dateStr = currentDate();
    var logs = getLogsForDate(dateStr);
    var html = '';

    for (var i = 0; i < logs.length; i++) {
      var log = logs[i];
      var volText = log.volume != null ? log.volume + 'ml' : '-';
      var poopText = log.poop ? ' 💩' : '';
      var badgeClass = log.baby === 'both' ? 'both' : '';
      html += '<li>'
        + '<span class="time">' + log.time + '</span>'
        + '<span class="baby-badge ' + badgeClass + '">' + babyLabel(log.baby) + '</span>'
        + '<span class="volume">' + volText + poopText + '</span>'
        + '<button type="button" class="btn-delete" data-key="' + log._key + '" data-date="' + dateStr + '">삭제</button>'
        + '</li>';
    }

    listEl.innerHTML = html;
    emptyMsg.classList.toggle('visible', logs.length === 0);
    updateDailyTotal();

    var deleteBtns = listEl.querySelectorAll('.btn-delete');
    for (var j = 0; j < deleteBtns.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          removeLog(btn.getAttribute('data-date'), btn.getAttribute('data-key'));
        });
      })(deleteBtns[j]);
    }
  }

  /* ============================
     렌더링: 통합 보기
     ============================ */
  function formatLogItem(log) {
    var s = log.volume != null ? log.volume + 'ml' : '';
    if (log.poop) s += (s ? ' ' : '') + '💩';
    return s || '—';
  }

  function renderSplitView() {
    var names = getDisplayNames();
    titleFirst.textContent = names.first;
    titleSecond.textContent = names.second;
    updateDailyTotal();

    var dateStr = currentDate();
    var logs = getLogsForDate(dateStr);

    var timeMap = {};
    for (var i = 0; i < logs.length; i++) {
      timeMap[logs[i].time] = true;
    }
    var sortedTimes = Object.keys(timeMap).sort();

    function getCellItems(time, babyFilter) {
      var items = [];
      for (var k = 0; k < logs.length; k++) {
        var l = logs[k];
        if (l.time === time && (l.baby === babyFilter || l.baby === 'both')) {
          items.push(l);
        }
      }
      items.sort(function (a, b) {
        var aV = a.volume != null ? 0 : 1;
        var bV = b.volume != null ? 0 : 1;
        return aV - bV;
      });
      return items;
    }

    function cellHtml(time, babyFilter) {
      var items = getCellItems(time, babyFilter);
      if (items.length === 0) return '—';
      var h = '';
      for (var k = 0; k < items.length; k++) {
        var log = items[k];
        h += '<span class="cell-item" data-key="' + log._key + '" data-baby="' + babyFilter + '" data-date="' + dateStr + '">'
          + '<span class="cell-content">' + formatLogItem(log) + '</span>'
          + '<button type="button" class="btn-delete-cell" title="삭제" aria-label="삭제">×</button>'
          + '</span>';
      }
      return h;
    }

    var tbody = '';
    for (var t = 0; t < sortedTimes.length; t++) {
      var time = sortedTimes[t];
      tbody += '<tr>'
        + '<td class="cell-td">' + cellHtml(time, '1') + '</td>'
        + '<td class="col-time">' + time + '</td>'
        + '<td class="cell-td">' + cellHtml(time, '2') + '</td>'
        + '</tr>';
    }
    splitTbody.innerHTML = tbody;

    var cellDeleteBtns = splitTbody.querySelectorAll('.btn-delete-cell');
    for (var d = 0; d < cellDeleteBtns.length; d++) {
      (function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var item = btn.parentElement;
          while (item && !item.classList.contains('cell-item')) {
            item = item.parentElement;
          }
          if (item) {
            removeLog(
              item.getAttribute('data-date'),
              item.getAttribute('data-key'),
              item.getAttribute('data-baby')
            );
          }
        });
      })(cellDeleteBtns[d]);
    }

    emptySplit.classList.toggle('visible', sortedTimes.length === 0);
  }

  /* ============================
     Firebase 실시간 리스너
     ============================ */
  debugLog('[5] 리스너 등록 시작');

  logsRef.on('value', function (snap) {
    debugLog('[L] logs 수신: ' + JSON.stringify(snap.val()).substring(0, 80));
    allLogs = snap.val() || {};
    renderList();
    renderSplitView();
  }, function (err) {
    debugLog('[L-ERR] logs 에러: ' + err.message);
  });

  namesRef.on('value', function (snap) {
    debugLog('[N] names 수신: ' + JSON.stringify(snap.val()));
    var val = snap.val() || {};
    babyNames.first = val.first || '';
    babyNames.second = val.second || '';
    initNamesUI();
    renderList();
    renderSplitView();
  }, function (err) {
    debugLog('[N-ERR] names 에러: ' + err.message);
  });

  debugLog('[6] 리스너 등록 완료');

  /* ============================
     날짜 변경
     ============================ */
  dateInput.value = todayStr();
  dateInput.addEventListener('change', function () {
    renderList();
    renderSplitView();
  });

  /* ============================
     보기 전환
     ============================ */
  for (var v = 0; v < viewBtns.length; v++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        for (var b = 0; b < viewBtns.length; b++) viewBtns[b].classList.remove('active');
        btn.classList.add('active');
        var view = btn.getAttribute('data-view');
        if (view === 'list') {
          viewList.classList.remove('hidden');
          viewSplit.classList.add('hidden');
        } else {
          viewList.classList.add('hidden');
          viewSplit.classList.remove('hidden');
          renderSplitView();
        }
      });
    })(viewBtns[v]);
  }

  /* ============================
     아기 선택
     ============================ */
  for (var bb = 0; bb < babyBtns.length; bb++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        for (var b = 0; b < babyBtns.length; b++) babyBtns[b].classList.remove('active');
        btn.classList.add('active');
        selectedBaby = btn.getAttribute('data-baby');
      });
    })(babyBtns[bb]);
  }

  /* ============================
     시간 피커
     ============================ */
  function getTimeFromInputs() {
    var h = hourSelect.value;
    var m = minuteSelect.value;
    return (h !== '' && m !== '') ? (h + ':' + m) : null;
  }

  function setTimeToNow() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    var m5 = Math.round(m / 5) * 5;
    if (m5 === 60) { m = 0; h = (h + 1) % 24; } else { m = m5; }
    hourSelect.value = pad2(h);
    minuteSelect.value = pad2(m);
  }

  function initTimePicker() {
    var i, opt;
    for (i = 0; i < 24; i++) {
      opt = document.createElement('option');
      opt.value = pad2(i);
      opt.textContent = pad2(i) + '시';
      hourSelect.appendChild(opt);
    }
    for (i = 0; i < 60; i += 5) {
      opt = document.createElement('option');
      opt.value = pad2(i);
      opt.textContent = pad2(i) + '분';
      minuteSelect.appendChild(opt);
    }
    setTimeToNow();
  }

  /* ============================
     기록 추가
     ============================ */
  btnAdd.addEventListener('click', function () {
    debugLog('[ADD] 버튼 클릭!');
    var dateStr = currentDate();
    var time = getTimeFromInputs();
    if (!time) { setTimeToNow(); time = getTimeFromInputs(); }
    if (!time) { debugLog('[ADD] 시간 없음'); return; }
    var volume = volumeInput.value;
    var poop = poopCheckbox.checked;
    debugLog('[ADD] date=' + dateStr + ' time=' + time + ' baby=' + selectedBaby + ' vol=' + volume + ' poop=' + poop);
    if (!volume && !poop) { debugLog('[ADD] 입력 없음, 무시'); return; }
    if (volume) {
      addLog(dateStr, time, selectedBaby, volume, false);
    }
    if (poop) {
      addLog(dateStr, time, selectedBaby, '', true);
    }
    poopCheckbox.checked = false;
  });

  /* ============================
     초기화
     ============================ */
  initTimePicker();

})();
