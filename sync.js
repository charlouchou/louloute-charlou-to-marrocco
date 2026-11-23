/* Synchro de la checklist à deux, via Supabase.
   Tant que SUPABASE_URL est vide, rien ne change : les cases restent mémorisées sur l'appareil.
   La clé ci-dessous est la clé PUBLIQUE de Supabase (faite pour être visible) :
   sans le code secret, elle ne permet ni de lire ni d'écrire quoi que ce soit. */
(function () {
  var SUPABASE_URL = '';   // ex. https://abcdefgh.supabase.co
  var SUPABASE_KEY = '';   // clé « publishable » (sb_publishable_…) ou « anon »

  var btn = document.getElementById('sync-status');
  if (!SUPABASE_URL || !SUPABASE_KEY || !btn || !window.tripChecklist) return;

  var CODE_KEY = 'maroc-code', FIRST_KEY = 'maroc-sync-first-done';
  var code = null;
  try { code = localStorage.getItem(CODE_KEY); } catch (e) {}

  function rpc(name, args) {
    var headers = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY };
    if (SUPABASE_KEY.indexOf('eyJ') === 0) headers.Authorization = 'Bearer ' + SUPABASE_KEY;
    return fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, { method: 'POST', headers: headers, body: JSON.stringify(args) })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.status === 204 ? null : r.json();
      });
  }

  function status(text, title) { btn.hidden = false; btn.textContent = text; btn.title = title || ''; }

  function askCode() {
    var c = prompt('Code secret pour partager la sélection à deux :');
    if (!c) return;
    rpc('trip_check', { p_code: c.trim() }).then(function (ok) {
      if (!ok) { alert('Code incorrect.'); return; }
      code = c.trim();
      try { localStorage.setItem(CODE_KEY, code); } catch (e) {}
      pull(true);
    }).catch(function () { alert('Impossible de joindre le serveur. Réessayer plus tard.'); });
  }

  function pull(first) {
    if (!code) return;
    rpc('trip_get', { p_code: code }).then(function (rows) {
      var remote = (rows || []).map(function (r) { return typeof r === 'string' ? r : r.trip_get; });
      var done = false;
      try { done = !!localStorage.getItem(FIRST_KEY); } catch (e) {}
      if (first && !done) {
        // première connexion de cet appareil : on envoie aussi ce qui était déjà coché ici
        var local = window.tripChecklist.picked();
        local.forEach(function (id) { if (remote.indexOf(id) === -1) { remote.push(id); rpc('trip_set', { p_code: code, p_item: id, p_picked: true }); } });
        try { localStorage.setItem(FIRST_KEY, '1'); } catch (e) {}
      }
      window.tripChecklist.apply(remote);
      status('🔄 Partagé à deux', 'Sélection synchronisée. Cliquer pour changer de code.');
    }).catch(function (e) {
      if (String(e).indexOf('HTTP 4') !== -1) { code = null; try { localStorage.removeItem(CODE_KEY); } catch (x) {} status('🔒 Partager à deux', 'Entrer le code secret'); }
      else status('⚠️ Hors ligne', 'Pas de connexion : les cases restent sur cet appareil.');
    });
  }

  btn.addEventListener('click', askCode);

  window.tripSync = {
    set: function (id, on) {
      if (!code) return;
      rpc('trip_set', { p_code: code, p_item: id, p_picked: on }).catch(function () { status('⚠️ Hors ligne', 'Le changement n\'a pas été envoyé.'); });
    },
    clear: function () {
      if (code) rpc('trip_clear', { p_code: code }).catch(function () {});
    }
  };

  if (code) { status('🔄 Connexion…'); pull(true); } else status('🔒 Partager à deux', 'Entrer le code secret');

  // On récupère les changements de l'autre toutes les 15 s et au retour sur la page
  setInterval(function () { if (!document.hidden) pull(false); }, 15000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) pull(false); });
})();
