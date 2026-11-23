/* Compte à rebours, étape du jour et météo — page Itinéraire */
(function () {
  /* ---------- Le programme jour par jour ---------- */
  // Pour tester un autre jour : ajouter ?date=2027-01-03 à la fin de l'adresse
  var DAYS = {
    '2026-12-30': ['essaouira'],
    '2026-12-31': ['essaouira'],
    '2027-01-01': ['essaouira'],
    '2027-01-02': ['essaouira'],
    '2027-01-03': ['essaouira', 'casablanca'],
    '2027-01-04': ['casablanca', 'rabat'],
    '2027-01-05': ['rabat'],
    '2027-01-06': ['meknes', 'fes'],
    '2027-01-07': ['fes'],
    '2027-01-08': ['chefchaouen', 'tetouan', 'tanger'],
    '2027-01-09': ['sete'],
    '2027-01-10': ['sete', 'paris']
  };
  var FIRST = '2026-12-30', LAST = '2027-01-10', TOTAL = 12;

  var NAMES = { essaouira: 'Essaouira', casablanca: 'Casablanca', rabat: 'Rabat', meknes: 'Meknès', fes: 'Fès',
                chefchaouen: 'Chefchaouen', tetouan: 'Tétouan', tanger: 'Tanger', sete: 'Sète', paris: 'Paris' };

  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], p[1] - 1, +p[2]); }
  function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }

  var forced = new URLSearchParams(location.search).get('date');
  var now = forced ? parse(forced) : new Date();
  var today = iso(now);

  /* ---------- Bandeau en haut ---------- */
  var box = document.getElementById('countdown');
  if (box) {
    if (today < FIRST) {
      var ms = parse(FIRST) - now;
      var d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24;
      box.innerHTML = '<span class="big">J-' + (d + (h > 0 ? 1 : 0)) + '</span>' +
        '<span class="small">avant le départ pour Essaouira, le mercredi 30 décembre' +
        (d < 3 ? ' · encore ' + d + ' j et ' + h + ' h' : '') + '</span>';
    } else if (today <= LAST) {
      var n = daysBetween(FIRST, today) + 1;
      var here = DAYS[today] || [];
      var label = today === '2027-01-09' ? 'En mer vers Sète ⛴️' : here.map(function (id) { return NAMES[id]; }).join(' → ');
      box.innerHTML = '<span class="big">Jour ' + n + ' / ' + TOTAL + '</span>' +
        '<span class="small">Aujourd\'hui : <b>' + label + '</b></span>' +
        (here[0] ? '<a href="#' + here[here.length > 1 && here[0] === 'essaouira' ? 1 : 0] + '">Voir l\'étape du jour ↓</a>' : '') +
        '<span class="bar"><i style="width:' + Math.round(n / TOTAL * 100) + '%"></i></span>';
      here.forEach(function (id) {
        var sec = document.getElementById(id);
        if (!sec) return;
        sec.classList.add('today');
        var h2 = sec.querySelector('h2');
        var b = document.createElement('span'); b.className = 'today-badge'; b.textContent = 'Aujourd\'hui';
        h2.appendChild(b);
      });
    } else {
      box.innerHTML = '<span class="big">Voyage terminé</span><span class="small">Bon retour à la maison 🏡</span>';
    }
    box.hidden = false;
  }

  /* ---------- Météo des 7 prochains jours (Open-Meteo, gratuit, sans clé) ---------- */
  var COORDS = {
    essaouira: [31.5085, -9.7595], casablanca: [33.5731, -7.5898], rabat: [34.0209, -6.8416],
    meknes: [33.8935, -5.5473], fes: [34.0181, -5.0078], chefchaouen: [35.1688, -5.2636],
    tetouan: [35.5785, -5.3684], tanger: [35.7595, -5.8340]
  };
  // Jours prévus dans chaque ville (pour les entourer dans la météo)
  var STAY = {};
  Object.keys(DAYS).forEach(function (day) { DAYS[day].forEach(function (id) { (STAY[id] = STAY[id] || []).push(day); }); });

  function icon(code) {
    if (code === 0) return ['☀️', 'Soleil'];
    if (code <= 2) return ['🌤️', 'Peu nuageux'];
    if (code === 3) return ['☁️', 'Couvert'];
    if (code <= 48) return ['🌫️', 'Brouillard'];
    if (code <= 57) return ['🌦️', 'Bruine'];
    if (code <= 67) return ['🌧️', 'Pluie'];
    if (code <= 77) return ['🌨️', 'Neige'];
    if (code <= 82) return ['🌦️', 'Averses'];
    if (code <= 86) return ['🌨️', 'Averses de neige'];
    return ['⛈️', 'Orage'];
  }
  var JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

  var ids = Object.keys(COORDS).filter(function (id) { return document.getElementById(id); });
  var url = 'https://api.open-meteo.com/v1/forecast' +
    '?latitude=' + ids.map(function (id) { return COORDS[id][0]; }).join(',') +
    '&longitude=' + ids.map(function (id) { return COORDS[id][1]; }).join(',') +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&timezone=Africa%2FCasablanca&forecast_days=7';

  fetch(url).then(function (r) { return r.json(); }).then(function (data) {
    var list = Array.isArray(data) ? data : [data];
    list.forEach(function (res, i) {
      var id = ids[i], sec = document.getElementById(id), dd = res.daily;
      if (!sec || !dd) return;
      var html = '<div class="wtitle">Météo des 7 prochains jours' +
        ((STAY[id] || []).some(function (day) { return dd.time.indexOf(day) !== -1; }) ? ' · jours sur place entourés' : '') + '</div><div class="days">';
      dd.time.forEach(function (t, k) {
        var ic = icon(dd.weather_code[k]);
        var rain = dd.precipitation_probability_max ? dd.precipitation_probability_max[k] : null;
        html += '<div class="day' + ((STAY[id] || []).indexOf(t) !== -1 ? ' here' : '') + '" title="' + ic[1] + '">' +
          JOURS[parse(t).getDay()] + '<span class="ico">' + ic[0] + '</span>' +
          '<span class="max">' + Math.round(dd.temperature_2m_max[k]) + '°</span> ' +
          '<span class="min">' + Math.round(dd.temperature_2m_min[k]) + '°</span>' +
          (rain >= 30 ? '<div class="rain">💧' + rain + '%</div>' : '') + '</div>';
      });
      html += '</div>';
      var w = document.createElement('div'); w.className = 'weather'; w.innerHTML = html;
      var anchor = sec.querySelector('.rating');
      anchor.parentNode.insertBefore(w, anchor.nextSibling);
    });
  }).catch(function () { /* pas de réseau : on n'affiche simplement pas la météo */ });
})();
