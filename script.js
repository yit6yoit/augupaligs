function getPlants() {
  return JSON.parse(localStorage.getItem('plants') || '[]');
}

function savePlants(list) {
  localStorage.setItem('plants', JSON.stringify(list));
}

function getApiKey() {
  return localStorage.getItem('or_api_key') || '';
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('nav button').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'plants') renderPlants();
  if (name === 'calendar') renderCalendar();
  if (name === 'settings') refreshSettings();
}

function showToast(msg, duration) {
  if (!duration) duration = 3000;
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(function() { t.style.display = 'none'; }, duration);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function nextWateringDate(plant) {
  if (!plant.last_watered || !plant.frequency) return null;
  var d = new Date(plant.last_watered);
  d.setDate(d.getDate() + plant.frequency);
  return d.toISOString().split('T')[0];
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function renderPlants() {
  var plants = getPlants();
  var container = document.getElementById('plants-list');
  var today = todayStr();

  if (plants.length === 0) {
    container.innerHTML = '<div class="card" style="color:#666;text-align:center;padding:30px;"><p>Vel nav pievienots neviens augs. Dodies uz <strong>Pievienot Augu</strong>, lai saktu!</p></div>';
    return;
  }

  var html = '';
  for (var i = 0; i < plants.length; i++) {
    var p = plants[i];
    var next = nextWateringDate(p);
    var badgeClass, badgeText;

    if (!next) {
      badgeClass = 'badge-ok';
      badgeText = 'Nav iestatits grafiks';
    } else if (next < today) {
      badgeClass = 'badge-overdue';
      badgeText = 'Nokavets! Bija jalais ' + next;
    } else if (next === today) {
      badgeClass = 'badge-today';
      badgeText = 'Laistit sodien!';
    } else {
      badgeClass = 'badge-ok';
      badgeText = 'Nakama: ' + next;
    }

    var metaItems = '';
    if (p.frequency) metaItems += '<div class="meta-item">Ik pec <span>' + p.frequency + ' dienam</span></div>';
    if (p.temp_min || p.temp_max) metaItems += '<div class="meta-item">Temp: <span>' + (p.temp_min || '?') + '-' + (p.temp_max || '?') + ' C</span></div>';
    if (p.humidity) metaItems += '<div class="meta-item">Mitrums: <span>' + escHtml(p.humidity) + '</span></div>';
    if (p.sunlight) metaItems += '<div class="meta-item">Gaisma: <span>' + escHtml(p.sunlight) + '</span></div>';
    if (p.soil) metaItems += '<div class="meta-item">Augsne: <span>' + escHtml(p.soil) + '</span></div>';
    if (p.fertilize) metaItems += '<div class="meta-item">Meslosana: <span>' + escHtml(p.fertilize) + '</span></div>';
    if (p.toxicity) metaItems += '<div class="meta-item">Toksicitate: <span>' + escHtml(p.toxicity) + '</span></div>';

    html += '<div class="card">'
      + '<div class="plant-header">'
      + '<div><h3>' + escHtml(p.name) + '</h3>'
      + (p.sci_name ? '<em style="font-size:12px;color:#888;">' + escHtml(p.sci_name) + '</em>' : '')
      + '<br><span class="badge ' + badgeClass + '">' + badgeText + '</span></div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
      + '<button class="btn btn-green btn-small" onclick="markWatered(' + i + ')">Laistits</button>'
      + '<button class="btn btn-blue btn-small" onclick="openEditModal(' + i + ')">Rediget</button>'
      + '<button class="btn btn-red btn-small" onclick="deletePlant(' + i + ')">Dzest</button>'
      + '</div></div>'
      + (metaItems ? '<div class="plant-meta">' + metaItems + '</div>' : '')
      + (p.notes ? '<p class="plant-notes">' + escHtml(p.notes) + '</p>' : '')
      + (p.last_watered ? '<p style="font-size:12px;color:#aaa;margin-top:6px;">Pedejo reizi laistits: ' + p.last_watered + '</p>' : '')
      + '</div>';
  }
  container.innerHTML = html;
}

function markWatered(index) {
  var plants = getPlants();
  plants[index].last_watered = todayStr();
  savePlants(plants);
  renderPlants();
  showToast('Atzimets ka laistits sodien!');
}

function deletePlant(index) {
  if (!confirm('Dzest so augu?')) return;
  var plants = getPlants();
  plants.splice(index, 1);
  savePlants(plants);
  renderPlants();
  showToast('Augs dzests.');
}

function doAiLookup() {
  var name = document.getElementById('ai-name').value.trim();
  var apiKey = getApiKey();
  var status = document.getElementById('ai-status');

  if (!name) {
    status.innerHTML = '<p class="msg-error">Ludzu ievadi auga nosaukumu.</p>';
    return;
  }
  if (!apiKey) {
    status.innerHTML = '<p class="msg-error">Nav atrasta API atslega. Vispirms pievienojiet to Iestatijumos.</p>';
    return;
  }

  status.innerHTML = '<p class="msg-info">Mekle auga informaciju, ludzu uzgaidi...</p>';

  var prompt = 'Tu esi augu kopsanas eksperts. Atgriez informaciju par augu ar nosaukumu "' + name + '" tikai JSON formata. Nekadas citas atbildes, skaidrojumus vai markdown - tikai neapstradats JSON.\n\n'
    + 'Ja augs ir reals un identificejams, izmanto sadu strukturu:\n'
    + '{\n'
    + '  "valid": true,\n'
    + '  "name": "Auga parastais nosaukums latviesu valoda",\n'
    + '  "scientific_name": "Zinatniskais nosaukums",\n'
    + '  "watering_frequency_days": <vesels skaitlis>,\n'
    + '  "temperature_min_c": <vesels skaitlis>,\n'
    + '  "temperature_max_c": <vesels skaitlis>,\n'
    + '  "humidity": "<viens no: low, medium, high>",\n'
    + '  "sunlight": "<viens no: Full Sun, Partial Shade, Indirect Light, Low Light>",\n'
    + '  "soil_type": "<augsnes apraksts latviesu valoda>",\n'
    + '  "fertilizing_frequency": "<meslosanas biezums latviesu valoda>",\n'
    + '  "toxicity": "<viens no: Dross majdzivniekiem, Toksisks majdzivniekiem, Toksisks kakiem, Toksisks suniiem, Nezinams>",\n'
    + '  "notes": "<1-2 teikumi ar galvenajiem kopsanas padomiem latviesu valoda>"\n'
    + '}\n\n'
    + 'Ja ievade nav reals auga nosaukums vai to nevar identificet, atgrieziet tiesi:\n'
    + '{"valid": false}\n\n'
    + 'Atbilde tikai JSON. Nekadas papildu rindas.';

  var PREFERRED = [
    'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free',
    'openai/gpt-oss-120b:free',
    'openai/gpt-oss-20b:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'cognitivecomputations/dolphin-mistral-24b-venice-edition:free'
  ];

  var SKIP_KEYWORDS = [
    'reasoning','thinking','omni',
    'ocr','vision','vl','image','audio',
    'embed','speech','tts','clip','lyria',
    'coder','code',
    'nano','1.2b','1b-','2b-','3b-','9b-',
    'baidu','minimax','z-ai','liquid',
    'cobuddy','owl-alpha'
  ];

  function isGoodModel(id) {
    var lower = id.toLowerCase();
    for (var k = 0; k < SKIP_KEYWORDS.length; k++) {
      if (lower.indexOf(SKIP_KEYWORDS[k]) !== -1) return false;
    }
    return true;
  }

  status.innerHTML = '<p class="msg-info">Iegust pieejamo modelu sarakstu...</p>';

  fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Authorization': 'Bearer ' + apiKey }
  })
  .then(function(res) { return res.json(); })
  .then(function(modelsData) {
    var allModels = modelsData.data || [];

    var freePassing = [];
    for (var m = 0; m < allModels.length; m++) {
      var mod = allModels[m];
      var pr = mod.pricing || {};
      var isFree = (parseFloat(pr.prompt) === 0 && parseFloat(pr.completion) === 0);
      if (isFree && isGoodModel(mod.id)) {
        freePassing.push(mod.id);
      }
    }

    var MODELS = [];
    var freeSet = {};
    for (var f = 0; f < freePassing.length; f++) freeSet[freePassing[f]] = true;

    for (var p = 0; p < PREFERRED.length; p++) {
      if (freeSet[PREFERRED[p]]) {
        MODELS.push(PREFERRED[p]);
        delete freeSet[PREFERRED[p]];
      }
    }

    var rest = [];
    for (var id in freeSet) rest.push(id);
    for (var i = rest.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = rest[i]; rest[i] = rest[j]; rest[j] = tmp;
    }
    MODELS = MODELS.concat(rest);

    if (MODELS.length === 0) {
      status.innerHTML = '<p class="msg-error">Nav atrasts neviens piemerots bezmaksas modelis.</p>';
      return;
    }

    function tryModel(modelIndex) {
      if (modelIndex >= MODELS.length) {
        status.innerHTML = '<p class="msg-error">Visi modeli ir parslogoti. Megini pec dazam minutem.</p>';
        return;
      }

      var model = MODELS[modelIndex];
      var requestBody = {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096
      };

      status.innerHTML = '<p class="msg-info">Megina: ' + model + ' (' + (modelIndex+1) + '/' + MODELS.length + ')...</p>';

      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
          'HTTP-Referer': window.location.href,
          'X-Title': 'Augu Laistisanas Kalendars'
        },
        body: JSON.stringify(requestBody)
      })
      .then(function(res) {
        return res.json().then(function(data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function(result) {
        if (result.status === 429 || result.status === 404 || result.status === 400) {
          var retryAfter = 0;
          if (result.status === 429) {
            var meta = result.data && result.data.error && result.data.error.metadata;
            retryAfter = (meta && meta.retry_after_seconds) ? Math.ceil(meta.retry_after_seconds * 1000) : 0;
          }
          setTimeout(function() { tryModel(modelIndex + 1); }, retryAfter);
          return;
        }

        if (!result.ok) {
          var errMsg = (result.data && result.data.error && result.data.error.message) ? result.data.error.message : 'Nezinama kluda';
          status.innerHTML = '<p class="msg-error">API kluda ' + result.status + ': ' + escHtml(errMsg) + '</p>';
          return;
        }

        var choice = result.data && result.data.choices && result.data.choices[0];
        var raw = (choice && choice.message && choice.message.content) || '';

        if (!raw.trim()) {
          status.innerHTML = '<p class="msg-error">AI atbilde bija tuksa. Megini velreiz.</p>';
          return;
        }

        var cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();

        var braceIndex = cleaned.indexOf('{');
        if (braceIndex > 0) cleaned = cleaned.substring(braceIndex);

        var lastBrace = cleaned.lastIndexOf('}');
        if (lastBrace !== -1 && lastBrace < cleaned.length - 1) {
          cleaned = cleaned.substring(0, lastBrace + 1);
        }

        var plant;
        try {
          plant = JSON.parse(cleaned);
        } catch(parseErr) {
          var repaired = cleaned;
          var quoteCount = (repaired.match(/"/g) || []).length;
          if (quoteCount % 2 !== 0) repaired += '"';
          if (repaired.trim().slice(-1) !== '}') repaired += '}';

          try {
            plant = JSON.parse(repaired);
          } catch(repairErr) {
            status.innerHTML = '<p class="msg-error">Nevareja nolasit AI atbildi. Megini velreiz.</p>';
            return;
          }
        }

        if (!plant.valid) {
          status.innerHTML = '<p class="msg-error">Augs nav atrasts vai ievadits nepareizs nosaukums.</p>';
          return;
        }

        document.getElementById('f-name').value = plant.name || name;
        document.getElementById('f-sci').value = plant.scientific_name || '';
        document.getElementById('f-freq').value = plant.watering_frequency_days || '';
        document.getElementById('f-tmin').value = plant.temperature_min_c || '';
        document.getElementById('f-tmax').value = plant.temperature_max_c || '';
        document.getElementById('f-soil').value = plant.soil_type || '';
        document.getElementById('f-fert').value = plant.fertilizing_frequency || '';
        document.getElementById('f-notes').value = plant.notes || '';
        setSelectValue('f-hum', humLabel(plant.humidity));
        setSelectValue('f-sun', plant.sunlight || '');
        setSelectValue('f-tox', plant.toxicity || '');

        status.innerHTML = '<p class="msg-success">Informacija ieladeta! Parbaudi formu zemak un saglaba.</p>';
      })
      .catch(function(err) {
        tryModel(modelIndex + 1);
      });
    }

    tryModel(0);
  })
  .catch(function(err) {
    status.innerHTML = '<p class="msg-error">Nevareja iegut modelu sarakstu: ' + escHtml(err.message) + '</p>';
  });
}

function humLabel(val) {
  if (!val) return '';
  var v = val.toLowerCase();
  if (v === 'low') return 'Zems (zem 40%)';
  if (v === 'medium') return 'Videjs (40-60%)';
  if (v === 'high') return 'Augsts (virs 60%)';
  return '';
}

function setSelectValue(id, val) {
  if (!val) return;
  var sel = document.getElementById(id);
  for (var i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === val) { sel.value = val; return; }
  }
  var lower = val.toLowerCase();
  for (var j = 0; j < sel.options.length; j++) {
    if (sel.options[j].value.toLowerCase().indexOf(lower) !== -1) { sel.value = sel.options[j].value; return; }
  }
}

function savePlant() {
  var name = document.getElementById('f-name').value.trim();
  var freq = parseInt(document.getElementById('f-freq').value);
  var status = document.getElementById('form-status');

  if (!name) { status.innerHTML = '<p class="msg-error">Auga nosaukums ir obligats.</p>'; return; }
  if (!freq || freq < 1) { status.innerHTML = '<p class="msg-error">Laistisanas biezums ir obligats.</p>'; return; }

  var plant = {
    id: Date.now(),
    name: name,
    sci_name: document.getElementById('f-sci').value.trim(),
    frequency: freq,
    last_watered: document.getElementById('f-last').value || todayStr(),
    temp_min: document.getElementById('f-tmin').value,
    temp_max: document.getElementById('f-tmax').value,
    humidity: document.getElementById('f-hum').value,
    sunlight: document.getElementById('f-sun').value,
    soil: document.getElementById('f-soil').value.trim(),
    fertilize: document.getElementById('f-fert').value.trim(),
    toxicity: document.getElementById('f-tox').value,
    notes: document.getElementById('f-notes').value.trim()
  };

  var plants = getPlants();
  plants.push(plant);
  savePlants(plants);
  status.innerHTML = '<p class="msg-success">Augs saglabats!</p>';
  clearForm();
  setTimeout(function() { status.innerHTML = ''; }, 3000);
  showToast(name + ' pievienots!');
}

function clearForm() {
  var fields = ['f-name','f-sci','f-freq','f-tmin','f-tmax','f-soil','f-fert','f-notes','f-last'];
  for (var i = 0; i < fields.length; i++) document.getElementById(fields[i]).value = '';
  var selects = ['f-hum','f-sun','f-tox'];
  for (var j = 0; j < selects.length; j++) document.getElementById(selects[j]).value = '';
  document.getElementById('ai-name').value = '';
  document.getElementById('ai-status').innerHTML = '';
  document.getElementById('f-last').value = todayStr();
}

function openEditModal(index) {
  var plants = getPlants();
  var p = plants[index];
  document.getElementById('edit-id').value = index;
  document.getElementById('e-name').value = p.name || '';
  document.getElementById('e-sci').value = p.sci_name || '';
  document.getElementById('e-freq').value = p.frequency || '';
  document.getElementById('e-last').value = p.last_watered || '';
  document.getElementById('e-tmin').value = p.temp_min || '';
  document.getElementById('e-tmax').value = p.temp_max || '';
  document.getElementById('e-soil').value = p.soil || '';
  document.getElementById('e-fert').value = p.fertilize || '';
  document.getElementById('e-notes').value = p.notes || '';
  setSelectValue('e-hum', p.humidity || '');
  setSelectValue('e-sun', p.sunlight || '');
  setSelectValue('e-tox', p.toxicity || '');
  document.getElementById('edit-status').innerHTML = '';
  document.getElementById('edit-modal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('open');
}

function saveEdit() {
  var index = parseInt(document.getElementById('edit-id').value);
  var name = document.getElementById('e-name').value.trim();
  var freq = parseInt(document.getElementById('e-freq').value);
  var status = document.getElementById('edit-status');

  if (!name) { status.innerHTML = '<p class="msg-error">Nosaukums ir obligats.</p>'; return; }
  if (!freq || freq < 1) { status.innerHTML = '<p class="msg-error">Biezumam jabut vismaz 1 diena.</p>'; return; }

  var plants = getPlants();
  var old = plants[index];
  plants[index] = {
    id: old.id,
    name: name,
    sci_name: document.getElementById('e-sci').value.trim(),
    frequency: freq,
    last_watered: document.getElementById('e-last').value || old.last_watered,
    temp_min: document.getElementById('e-tmin').value,
    temp_max: document.getElementById('e-tmax').value,
    humidity: document.getElementById('e-hum').value,
    sunlight: document.getElementById('e-sun').value,
    soil: document.getElementById('e-soil').value.trim(),
    fertilize: document.getElementById('e-fert').value.trim(),
    toxicity: document.getElementById('e-tox').value,
    notes: document.getElementById('e-notes').value.trim()
  };

  savePlants(plants);
  closeEditModal();
  renderPlants();
  showToast('Izmainas saglabatas!');
}

var calYear = new Date().getFullYear();
var calMonth = new Date().getMonth();

var MONTH_NAMES = ['Janvaris','Februaris','Marts','Aprilis','Maijs','Junijs',
                   'Julijs','Augusts','Septembris','Oktobris','Novembris','Decembris'];
var DAY_NAMES = ['Sv','Pr','Ot','Tr','Ce','Pk','Se'];

function calPrev() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }
function calNext() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); }

function buildWateringMap(year, month) {
  var plants = getPlants();
  var map = {};
  var first = new Date(year, month, 1);
  var last = new Date(year, month + 1, 0);

  for (var i = 0; i < plants.length; i++) {
    var plant = plants[i];
    if (!plant.last_watered || !plant.frequency) continue;

    var d = new Date(plant.last_watered);
    while (d > first) d.setDate(d.getDate() - plant.frequency);
    while (d < first) d.setDate(d.getDate() + plant.frequency);

    while (d <= last) {
      if (d.getMonth() === month && d.getFullYear() === year) {
        var key = d.toISOString().split('T')[0];
        if (!map[key]) map[key] = [];
        map[key].push(plant.name);
      }
      d.setDate(d.getDate() + plant.frequency);
    }
  }
  return map;
}

function renderCalendar() {
  document.getElementById('cal-title').textContent = MONTH_NAMES[calMonth] + ' ' + calYear;

  var waterMap = buildWateringMap(calYear, calMonth);
  var today = todayStr();
  var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  var firstDow = new Date(calYear, calMonth, 1).getDay();

  var html = '';
  for (var n = 0; n < DAY_NAMES.length; n++) {
    html += '<div class="cal-day-name">' + DAY_NAMES[n] + '</div>';
  }

  for (var e = 0; e < firstDow; e++) {
    html += '<div class="cal-cell empty"></div>';
  }

  for (var day = 1; day <= daysInMonth; day++) {
    var dateStr = calYear + '-' + pad2(calMonth + 1) + '-' + pad2(day);
    var isToday = dateStr === today;
    var dayPlants = waterMap[dateStr];
    var hasWater = dayPlants && dayPlants.length > 0;
    var dots = '';
    if (hasWater) {
      dots = '<div class="cal-dots">';
      for (var d = 0; d < dayPlants.length; d++) dots += '<span class="cal-dot"></span>';
      dots += '</div>';
    }
    var safeArr = hasWater ? JSON.stringify(dayPlants).replace(/"/g, '&quot;') : '[]';
    html += '<div class="cal-cell' + (isToday ? ' today' : '') + (hasWater ? ' has-water' : '') + '"'
          + ' onclick="showDayDetail(\'' + dateStr + '\',' + safeArr + ')">'
          + '<div>' + day + '</div>' + dots + '</div>';
  }

  document.getElementById('cal-grid').innerHTML = html;
  document.getElementById('day-detail').innerHTML = '';
}

function showDayDetail(dateStr, plantsArr) {
  var det = document.getElementById('day-detail');
  if (!plantsArr || plantsArr.length === 0) {
    det.innerHTML = '<div class="card" style="color:#666;">' + dateStr + ': Nevienam augam nav jabut laistitam.</div>';
  } else {
    var items = '';
    for (var i = 0; i < plantsArr.length; i++) {
      items += '<li>' + escHtml(plantsArr[i]) + '</li>';
    }
    det.innerHTML = '<div class="card"><strong>' + dateStr + ' - Laistit sos augus:</strong>'
      + '<ul style="margin-top:8px;padding-left:20px;line-height:1.8;">' + items + '</ul></div>';
  }
}

function refreshSettings() {
  updateNotifDisplay();
}

function updateNotifDisplay() {
  var el = document.getElementById('notif-perm-display');
  if (!('Notification' in window)) {
    el.textContent = 'netiek atbalstits';
  } else {
    var lv = { granted: 'atlauts', denied: 'liegts', default: 'nav izvelets' };
    el.textContent = lv[Notification.permission] || Notification.permission;
  }
}

function requestNotifPerm() {
  if (!('Notification' in window)) {
    document.getElementById('notif-status').innerHTML = '<p class="msg-error">Si parlukprogramma neatbalsta pazinojumus.</p>';
    return;
  }
  Notification.requestPermission().then(function(perm) {
    updateNotifDisplay();
    if (perm === 'granted') {
      document.getElementById('notif-status').innerHTML = '<p class="msg-success">Pazinojumi iespejoti!</p>';
      checkAndNotify();
    } else if (perm === 'denied') {
      document.getElementById('notif-status').innerHTML = '<p class="msg-error">Atlauja liegta.</p>';
    } else {
      document.getElementById('notif-status').innerHTML = '<p class="msg-info">Atlauja vel nav pieskirts.</p>';
    }
  });
}

function clearAllData() {
  if (!confirm('Tiks dzesti VISI augi. Vai esi parliecinats?')) return;
  localStorage.removeItem('plants');
  renderPlants();
  showToast('Visi augi dzesti.');
}

function playRemindSound() {
  var audio = new Audio('./remind.mp3');
  audio.play().catch(function() {});
}

function checkAndNotify() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  var plants = getPlants();
  var today = todayStr();
  var fired = false;
  for (var i = 0; i < plants.length; i++) {
    var plant = plants[i];
    var next = nextWateringDate(plant);
    if (!next) continue;
    if (next < today) {
      new Notification('Augs nokavets!', {
        body: plant.name + ' bija jalais ' + next,
        tag: 'plant-' + plant.id + '-overdue'
      });
      fired = true;
    } else if (next === today) {
      new Notification('Laisti augu!', {
        body: plant.name + ' sodien jalais.',
        tag: 'plant-' + plant.id + '-today'
      });
      fired = true;
    }
  }
  if (fired && document.hidden) {
    playRemindSound();
  }
}

window.addEventListener('load', function() {
  document.getElementById('f-last').value = todayStr();
  renderPlants();
  checkAndNotify();
  setInterval(checkAndNotify, 60 * 60 * 1000);

  fetch('./key.txt')
    .then(function(res) {
      if (!res.ok) throw new Error('nav pieejams');
      return res.text();
    })
    .then(function(text) {
      var key = text.trim();
      if (key) localStorage.setItem('or_api_key', key);
    })
    .catch(function() {});
});function getPlants() {
  return JSON.parse(localStorage.getItem('plants') || '[]');
}

function savePlants(list) {
  localStorage.setItem('plants', JSON.stringify(list));
}

function getApiKey() {
  return localStorage.getItem('or_api_key') || '';
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('nav button').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'plants') renderPlants();
  if (name === 'calendar') renderCalendar();
  if (name === 'settings') refreshSettings();
}

function showToast(msg, duration) {
  if (!duration) duration = 3000;
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(function() { t.style.display = 'none'; }, duration);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function nextWateringDate(plant) {
  if (!plant.last_watered || !plant.frequency) return null;
  var d = new Date(plant.last_watered);
  d.setDate(d.getDate() + plant.frequency);
  return d.toISOString().split('T')[0];
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function renderPlants() {
  var plants = getPlants();
  var container = document.getElementById('plants-list');
  var today = todayStr();

  if (plants.length === 0) {
    container.innerHTML = '<div class="card" style="color:#666;text-align:center;padding:30px;"><p>Vel nav pievienots neviens augs. Dodies uz <strong>Pievienot Augu</strong>, lai saktu!</p></div>';
    return;
  }

  var html = '';
  for (var i = 0; i < plants.length; i++) {
    var p = plants[i];
    var next = nextWateringDate(p);
    var badgeClass, badgeText;

    if (!next) {
      badgeClass = 'badge-ok';
      badgeText = 'Nav iestatits grafiks';
    } else if (next < today) {
      badgeClass = 'badge-overdue';
      badgeText = 'Nokavets! Bija jalais ' + next;
    } else if (next === today) {
      badgeClass = 'badge-today';
      badgeText = 'Laistit sodien!';
    } else {
      badgeClass = 'badge-ok';
      badgeText = 'Nakama: ' + next;
    }

    var metaItems = '';
    if (p.frequency) metaItems += '<div class="meta-item">Ik pec <span>' + p.frequency + ' dienam</span></div>';
    if (p.temp_min || p.temp_max) metaItems += '<div class="meta-item">Temp: <span>' + (p.temp_min || '?') + '-' + (p.temp_max || '?') + ' C</span></div>';
    if (p.humidity) metaItems += '<div class="meta-item">Mitrums: <span>' + escHtml(p.humidity) + '</span></div>';
    if (p.sunlight) metaItems += '<div class="meta-item">Gaisma: <span>' + escHtml(p.sunlight) + '</span></div>';
    if (p.soil) metaItems += '<div class="meta-item">Augsne: <span>' + escHtml(p.soil) + '</span></div>';
    if (p.fertilize) metaItems += '<div class="meta-item">Meslosana: <span>' + escHtml(p.fertilize) + '</span></div>';
    if (p.toxicity) metaItems += '<div class="meta-item">Toksicitate: <span>' + escHtml(p.toxicity) + '</span></div>';

    html += '<div class="card">'
      + '<div class="plant-header">'
      + '<div><h3>' + escHtml(p.name) + '</h3>'
      + (p.sci_name ? '<em style="font-size:12px;color:#888;">' + escHtml(p.sci_name) + '</em>' : '')
      + '<br><span class="badge ' + badgeClass + '">' + badgeText + '</span></div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
      + '<button class="btn btn-green btn-small" onclick="markWatered(' + i + ')">Laistits</button>'
      + '<button class="btn btn-blue btn-small" onclick="openEditModal(' + i + ')">Rediget</button>'
      + '<button class="btn btn-red btn-small" onclick="deletePlant(' + i + ')">Dzest</button>'
      + '</div></div>'
      + (metaItems ? '<div class="plant-meta">' + metaItems + '</div>' : '')
      + (p.notes ? '<p class="plant-notes">' + escHtml(p.notes) + '</p>' : '')
      + (p.last_watered ? '<p style="font-size:12px;color:#aaa;margin-top:6px;">Pedejo reizi laistits: ' + p.last_watered + '</p>' : '')
      + '</div>';
  }
  container.innerHTML = html;
}

function markWatered(index) {
  var plants = getPlants();
  plants[index].last_watered = todayStr();
  savePlants(plants);
  renderPlants();
  showToast('Atzimets ka laistits sodien!');
}

function deletePlant(index) {
  if (!confirm('Dzest so augu?')) return;
  var plants = getPlants();
  plants.splice(index, 1);
  savePlants(plants);
  renderPlants();
  showToast('Augs dzests.');
}

function doAiLookup() {
  var name = document.getElementById('ai-name').value.trim();
  var apiKey = getApiKey();
  var status = document.getElementById('ai-status');

  if (!name) {
    status.innerHTML = '<p class="msg-error">Ludzu ievadi auga nosaukumu.</p>';
    return;
  }
  if (!apiKey) {
    status.innerHTML = '<p class="msg-error">Nav atrasta API atslega. Vispirms pievienojiet to Iestatijumos.</p>';
    return;
  }

  status.innerHTML = '<p class="msg-info">Mekle auga informaciju, ludzu uzgaidi...</p>';

  var prompt = 'Tu esi augu kopsanas eksperts. Atgriez informaciju par augu ar nosaukumu "' + name + '" tikai JSON formata. Nekadas citas atbildes, skaidrojumus vai markdown - tikai neapstradats JSON.\n\n'
    + 'Ja augs ir reals un identificejams, izmanto sadu strukturu:\n'
    + '{\n'
    + '  "valid": true,\n'
    + '  "name": "Auga parastais nosaukums latviesu valoda",\n'
    + '  "scientific_name": "Zinatniskais nosaukums",\n'
    + '  "watering_frequency_days": <vesels skaitlis>,\n'
    + '  "temperature_min_c": <vesels skaitlis>,\n'
    + '  "temperature_max_c": <vesels skaitlis>,\n'
    + '  "humidity": "<viens no: low, medium, high>",\n'
    + '  "sunlight": "<viens no: Full Sun, Partial Shade, Indirect Light, Low Light>",\n'
    + '  "soil_type": "<augsnes apraksts latviesu valoda>",\n'
    + '  "fertilizing_frequency": "<meslosanas biezums latviesu valoda>",\n'
    + '  "toxicity": "<viens no: Dross majdzivniekiem, Toksisks majdzivniekiem, Toksisks kakiem, Toksisks suniiem, Nezinams>",\n'
    + '  "notes": "<1-2 teikumi ar galvenajiem kopsanas padomiem latviesu valoda>"\n'
    + '}\n\n'
    + 'Ja ievade nav reals auga nosaukums vai to nevar identificet, atgrieziet tiesi:\n'
    + '{"valid": false}\n\n'
    + 'Atbilde tikai JSON. Nekadas papildu rindas.';

  var PREFERRED = [
    'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free',
    'openai/gpt-oss-120b:free',
    'openai/gpt-oss-20b:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'cognitivecomputations/dolphin-mistral-24b-venice-edition:free'
  ];

  var SKIP_KEYWORDS = [
    'reasoning','thinking','omni',
    'ocr','vision','vl','image','audio',
    'embed','speech','tts','clip','lyria',
    'coder','code',
    'nano','1.2b','1b-','2b-','3b-','9b-',
    'baidu','minimax','z-ai','liquid',
    'cobuddy','owl-alpha'
  ];

  function isGoodModel(id) {
    var lower = id.toLowerCase();
    for (var k = 0; k < SKIP_KEYWORDS.length; k++) {
      if (lower.indexOf(SKIP_KEYWORDS[k]) !== -1) return false;
    }
    return true;
  }

  status.innerHTML = '<p class="msg-info">Iegust pieejamo modelu sarakstu...</p>';

  fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Authorization': 'Bearer ' + apiKey }
  })
  .then(function(res) { return res.json(); })
  .then(function(modelsData) {
    var allModels = modelsData.data || [];

    var freePassing = [];
    for (var m = 0; m < allModels.length; m++) {
      var mod = allModels[m];
      var pr = mod.pricing || {};
      var isFree = (parseFloat(pr.prompt) === 0 && parseFloat(pr.completion) === 0);
      if (isFree && isGoodModel(mod.id)) {
        freePassing.push(mod.id);
      }
    }

    var MODELS = [];
    var freeSet = {};
    for (var f = 0; f < freePassing.length; f++) freeSet[freePassing[f]] = true;

    for (var p = 0; p < PREFERRED.length; p++) {
      if (freeSet[PREFERRED[p]]) {
        MODELS.push(PREFERRED[p]);
        delete freeSet[PREFERRED[p]];
      }
    }

    var rest = [];
    for (var id in freeSet) rest.push(id);
    for (var i = rest.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = rest[i]; rest[i] = rest[j]; rest[j] = tmp;
    }
    MODELS = MODELS.concat(rest);

    if (MODELS.length === 0) {
      status.innerHTML = '<p class="msg-error">Nav atrasts neviens piemerots bezmaksas modelis.</p>';
      return;
    }

    function tryModel(modelIndex) {
      if (modelIndex >= MODELS.length) {
        status.innerHTML = '<p class="msg-error">Visi modeli ir parslogoti. Megini pec dazam minutem.</p>';
        return;
      }

      var model = MODELS[modelIndex];
      var requestBody = {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096
      };

      status.innerHTML = '<p class="msg-info">Megina: ' + model + ' (' + (modelIndex+1) + '/' + MODELS.length + ')...</p>';

      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
          'HTTP-Referer': window.location.href,
          'X-Title': 'Augu Laistisanas Atgadinajums'
        },
        body: JSON.stringify(requestBody)
      })
      .then(function(res) {
        return res.json().then(function(data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function(result) {
        if (result.status === 429 || result.status === 404 || result.status === 400) {
          var retryAfter = 0;
          if (result.status === 429) {
            var meta = result.data && result.data.error && result.data.error.metadata;
            retryAfter = (meta && meta.retry_after_seconds) ? Math.ceil(meta.retry_after_seconds * 1000) : 0;
          }
          setTimeout(function() { tryModel(modelIndex + 1); }, retryAfter);
          return;
        }

        if (!result.ok) {
          var errMsg = (result.data && result.data.error && result.data.error.message) ? result.data.error.message : 'Nezinama kluda';
          status.innerHTML = '<p class="msg-error">API kluda ' + result.status + ': ' + escHtml(errMsg) + '</p>';
          return;
        }

        var choice = result.data && result.data.choices && result.data.choices[0];
        var raw = (choice && choice.message && choice.message.content) || '';

        if (!raw.trim()) {
          status.innerHTML = '<p class="msg-error">AI atbilde bija tuksa. Megini velreiz.</p>';
          return;
        }

        var cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();

        var braceIndex = cleaned.indexOf('{');
        if (braceIndex > 0) cleaned = cleaned.substring(braceIndex);

        var lastBrace = cleaned.lastIndexOf('}');
        if (lastBrace !== -1 && lastBrace < cleaned.length - 1) {
          cleaned = cleaned.substring(0, lastBrace + 1);
        }

        var plant;
        try {
          plant = JSON.parse(cleaned);
        } catch(parseErr) {
          var repaired = cleaned;
          var quoteCount = (repaired.match(/"/g) || []).length;
          if (quoteCount % 2 !== 0) repaired += '"';
          if (repaired.trim().slice(-1) !== '}') repaired += '}';

          try {
            plant = JSON.parse(repaired);
          } catch(repairErr) {
            status.innerHTML = '<p class="msg-error">Nevareja nolasit AI atbildi. Megini velreiz.</p>';
            return;
          }
        }

        if (!plant.valid) {
          status.innerHTML = '<p class="msg-error">Augs nav atrasts vai ievadits nepareizs nosaukums.</p>';
          return;
        }

        document.getElementById('f-name').value = plant.name || name;
        document.getElementById('f-sci').value = plant.scientific_name || '';
        document.getElementById('f-freq').value = plant.watering_frequency_days || '';
        document.getElementById('f-tmin').value = plant.temperature_min_c || '';
        document.getElementById('f-tmax').value = plant.temperature_max_c || '';
        document.getElementById('f-soil').value = plant.soil_type || '';
        document.getElementById('f-fert').value = plant.fertilizing_frequency || '';
        document.getElementById('f-notes').value = plant.notes || '';
        setSelectValue('f-hum', humLabel(plant.humidity));
        setSelectValue('f-sun', plant.sunlight || '');
        setSelectValue('f-tox', plant.toxicity || '');

        status.innerHTML = '<p class="msg-success">Informacija ieladeta! Parbaudi formu zemak un saglaba.</p>';
      })
      .catch(function(err) {
        tryModel(modelIndex + 1);
      });
    }

    tryModel(0);
  })
  .catch(function(err) {
    status.innerHTML = '<p class="msg-error">Nevareja iegut modelu sarakstu: ' + escHtml(err.message) + '</p>';
  });
}

function humLabel(val) {
  if (!val) return '';
  var v = val.toLowerCase();
  if (v === 'low') return 'Zems (zem 40%)';
  if (v === 'medium') return 'Videjs (40-60%)';
  if (v === 'high') return 'Augsts (virs 60%)';
  return '';
}

function setSelectValue(id, val) {
  if (!val) return;
  var sel = document.getElementById(id);
  for (var i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === val) { sel.value = val; return; }
  }
  var lower = val.toLowerCase();
  for (var j = 0; j < sel.options.length; j++) {
    if (sel.options[j].value.toLowerCase().indexOf(lower) !== -1) { sel.value = sel.options[j].value; return; }
  }
}

function savePlant() {
  var name = document.getElementById('f-name').value.trim();
  var freq = parseInt(document.getElementById('f-freq').value);
  var status = document.getElementById('form-status');

  if (!name) { status.innerHTML = '<p class="msg-error">Auga nosaukums ir obligats.</p>'; return; }
  if (!freq || freq < 1) { status.innerHTML = '<p class="msg-error">Laistisanas biezums ir obligats.</p>'; return; }

  var plant = {
    id: Date.now(),
    name: name,
    sci_name: document.getElementById('f-sci').value.trim(),
    frequency: freq,
    last_watered: document.getElementById('f-last').value || todayStr(),
    temp_min: document.getElementById('f-tmin').value,
    temp_max: document.getElementById('f-tmax').value,
    humidity: document.getElementById('f-hum').value,
    sunlight: document.getElementById('f-sun').value,
    soil: document.getElementById('f-soil').value.trim(),
    fertilize: document.getElementById('f-fert').value.trim(),
    toxicity: document.getElementById('f-tox').value,
    notes: document.getElementById('f-notes').value.trim()
  };

  var plants = getPlants();
  plants.push(plant);
  savePlants(plants);
  status.innerHTML = '<p class="msg-success">Augs saglabats!</p>';
  clearForm();
  setTimeout(function() { status.innerHTML = ''; }, 3000);
  showToast(name + ' pievienots!');
}

function clearForm() {
  var fields = ['f-name','f-sci','f-freq','f-tmin','f-tmax','f-soil','f-fert','f-notes','f-last'];
  for (var i = 0; i < fields.length; i++) document.getElementById(fields[i]).value = '';
  var selects = ['f-hum','f-sun','f-tox'];
  for (var j = 0; j < selects.length; j++) document.getElementById(selects[j]).value = '';
  document.getElementById('ai-name').value = '';
  document.getElementById('ai-status').innerHTML = '';
  document.getElementById('f-last').value = todayStr();
}

function openEditModal(index) {
  var plants = getPlants();
  var p = plants[index];
  document.getElementById('edit-id').value = index;
  document.getElementById('e-name').value = p.name || '';
  document.getElementById('e-sci').value = p.sci_name || '';
  document.getElementById('e-freq').value = p.frequency || '';
  document.getElementById('e-last').value = p.last_watered || '';
  document.getElementById('e-tmin').value = p.temp_min || '';
  document.getElementById('e-tmax').value = p.temp_max || '';
  document.getElementById('e-soil').value = p.soil || '';
  document.getElementById('e-fert').value = p.fertilize || '';
  document.getElementById('e-notes').value = p.notes || '';
  setSelectValue('e-hum', p.humidity || '');
  setSelectValue('e-sun', p.sunlight || '');
  setSelectValue('e-tox', p.toxicity || '');
  document.getElementById('edit-status').innerHTML = '';
  document.getElementById('edit-modal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('open');
}

function saveEdit() {
  var index = parseInt(document.getElementById('edit-id').value);
  var name = document.getElementById('e-name').value.trim();
  var freq = parseInt(document.getElementById('e-freq').value);
  var status = document.getElementById('edit-status');

  if (!name) { status.innerHTML = '<p class="msg-error">Nosaukums ir obligats.</p>'; return; }
  if (!freq || freq < 1) { status.innerHTML = '<p class="msg-error">Biezumam jabut vismaz 1 diena.</p>'; return; }

  var plants = getPlants();
  var old = plants[index];
  plants[index] = {
    id: old.id,
    name: name,
    sci_name: document.getElementById('e-sci').value.trim(),
    frequency: freq,
    last_watered: document.getElementById('e-last').value || old.last_watered,
    temp_min: document.getElementById('e-tmin').value,
    temp_max: document.getElementById('e-tmax').value,
    humidity: document.getElementById('e-hum').value,
    sunlight: document.getElementById('e-sun').value,
    soil: document.getElementById('e-soil').value.trim(),
    fertilize: document.getElementById('e-fert').value.trim(),
    toxicity: document.getElementById('e-tox').value,
    notes: document.getElementById('e-notes').value.trim()
  };

  savePlants(plants);
  closeEditModal();
  renderPlants();
  showToast('Izmainas saglabatas!');
}

var calYear = new Date().getFullYear();
var calMonth = new Date().getMonth();

var MONTH_NAMES = ['Janvaris','Februaris','Marts','Aprilis','Maijs','Junijs',
                   'Julijs','Augusts','Septembris','Oktobris','Novembris','Decembris'];
var DAY_NAMES = ['Sv','Pr','Ot','Tr','Ce','Pk','Se'];

function calPrev() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }
function calNext() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); }

function buildWateringMap(year, month) {
  var plants = getPlants();
  var map = {};
  var first = new Date(year, month, 1);
  var last = new Date(year, month + 1, 0);

  for (var i = 0; i < plants.length; i++) {
    var plant = plants[i];
    if (!plant.last_watered || !plant.frequency) continue;

    var d = new Date(plant.last_watered);
    while (d > first) d.setDate(d.getDate() - plant.frequency);
    while (d < first) d.setDate(d.getDate() + plant.frequency);

    while (d <= last) {
      if (d.getMonth() === month && d.getFullYear() === year) {
        var key = d.toISOString().split('T')[0];
        if (!map[key]) map[key] = [];
        map[key].push(plant.name);
      }
      d.setDate(d.getDate() + plant.frequency);
    }
  }
  return map;
}

function renderCalendar() {
  document.getElementById('cal-title').textContent = MONTH_NAMES[calMonth] + ' ' + calYear;

  var waterMap = buildWateringMap(calYear, calMonth);
  var today = todayStr();
  var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  var firstDow = new Date(calYear, calMonth, 1).getDay();

  var html = '';
  for (var n = 0; n < DAY_NAMES.length; n++) {
    html += '<div class="cal-day-name">' + DAY_NAMES[n] + '</div>';
  }

  for (var e = 0; e < firstDow; e++) {
    html += '<div class="cal-cell empty"></div>';
  }

  for (var day = 1; day <= daysInMonth; day++) {
    var dateStr = calYear + '-' + pad2(calMonth + 1) + '-' + pad2(day);
    var isToday = dateStr === today;
    var dayPlants = waterMap[dateStr];
    var hasWater = dayPlants && dayPlants.length > 0;
    var dots = '';
    if (hasWater) {
      dots = '<div class="cal-dots">';
      for (var d = 0; d < dayPlants.length; d++) dots += '<span class="cal-dot"></span>';
      dots += '</div>';
    }
    var safeArr = hasWater ? JSON.stringify(dayPlants).replace(/"/g, '&quot;') : '[]';
    html += '<div class="cal-cell' + (isToday ? ' today' : '') + (hasWater ? ' has-water' : '') + '"'
          + ' onclick="showDayDetail(\'' + dateStr + '\',' + safeArr + ')">'
          + '<div>' + day + '</div>' + dots + '</div>';
  }

  document.getElementById('cal-grid').innerHTML = html;
  document.getElementById('day-detail').innerHTML = '';
}

function showDayDetail(dateStr, plantsArr) {
  var det = document.getElementById('day-detail');
  if (!plantsArr || plantsArr.length === 0) {
    det.innerHTML = '<div class="card" style="color:#666;">' + dateStr + ': Nevienam augam nav jabut laistitam.</div>';
  } else {
    var items = '';
    for (var i = 0; i < plantsArr.length; i++) {
      items += '<li>' + escHtml(plantsArr[i]) + '</li>';
    }
    det.innerHTML = '<div class="card"><strong>' + dateStr + ' - Laistit sos augus:</strong>'
      + '<ul style="margin-top:8px;padding-left:20px;line-height:1.8;">' + items + '</ul></div>';
  }
}

function refreshSettings() {
  updateNotifDisplay();
}

function updateNotifDisplay() {
  var el = document.getElementById('notif-perm-display');
  if (!('Notification' in window)) {
    el.textContent = 'netiek atbalstits';
  } else {
    var lv = { granted: 'atlauts', denied: 'liegts', default: 'nav izvelets' };
    el.textContent = lv[Notification.permission] || Notification.permission;
  }
}

function requestNotifPerm() {
  if (!('Notification' in window)) {
    document.getElementById('notif-status').innerHTML = '<p class="msg-error">Si parlukprogramma neatbalsta pazinojumus.</p>';
    return;
  }
  Notification.requestPermission().then(function(perm) {
    updateNotifDisplay();
    if (perm === 'granted') {
      document.getElementById('notif-status').innerHTML = '<p class="msg-success">Pazinojumi iespejoti!</p>';
      checkAndNotify();
    } else if (perm === 'denied') {
      document.getElementById('notif-status').innerHTML = '<p class="msg-error">Atlauja liegta.</p>';
    } else {
      document.getElementById('notif-status').innerHTML = '<p class="msg-info">Atlauja vel nav pieskirts.</p>';
    }
  });
}

function clearAllData() {
  if (!confirm('Tiks dzesti VISI augi. Vai esi parliecinats?')) return;
  localStorage.removeItem('plants');
  renderPlants();
  showToast('Visi augi dzesti.');
}

function playRemindSound() {
  var audio = new Audio('./remind.mp3');
  audio.play().catch(function() {});
}

function checkAndNotify() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  var plants = getPlants();
  var today = todayStr();
  var fired = false;
  for (var i = 0; i < plants.length; i++) {
    var plant = plants[i];
    var next = nextWateringDate(plant);
    if (!next) continue;
    if (next < today) {
      new Notification('Augs nokavets!', {
        body: plant.name + ' bija jalais ' + next,
        tag: 'plant-' + plant.id + '-overdue'
      });
      fired = true;
    } else if (next === today) {
      new Notification('Laisti augu!', {
        body: plant.name + ' sodien jalais.',
        tag: 'plant-' + plant.id + '-today'
      });
      fired = true;
    }
  }
  if (fired && document.hidden) {
    playRemindSound();
  }
}

window.addEventListener('load', function() {
  document.getElementById('f-last').value = todayStr();
  renderPlants();
  checkAndNotify();
  setInterval(checkAndNotify, 60 * 60 * 1000);

  fetch('./key.txt')
    .then(function(res) {
      if (!res.ok) throw new Error('nav pieejams');
      return res.text();
    })
    .then(function(text) {
      var key = text.trim();
      if (key) localStorage.setItem('or_api_key', key);
    })
    .catch(function() {});
});
