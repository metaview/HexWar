// ============================================================
//  INTERNATIONALISATION
// ============================================================
let currentLang = localStorage.getItem('hexwar_lang') || 'de';

const TRANSLATIONS = {
  de: {
    // Unit labels
    unit_cavalry:  'Reiter',
    unit_spear:    'Speerkämpfer',
    unit_archer:   'Bogenschütze',
    unit_sword:    'Schwertträger',
    unit_catapult: 'Katapult',

    // Terrain labels
    terrain_sand:     'Sand',
    terrain_grass:    'Grasland',
    terrain_forest:   'Wald',
    terrain_mountain: 'Gebirge',
    terrain_river:    'Fluss (unpassierbar)',
    terrain_lake:     'See (unpassierbar)',
    terrain_bridge:   'Brücke',
    terrain_swamp:    'Sumpf (1 Feld/Zug)',

    // Combat log
    log_turn_player:   '— Zug {0}: Spieler —',
    log_turn_ai:       '— Zug {0}: KI —',
    log_ai_thinking:   '— KI am Zug —',
    log_zone_player:   'Zone: Spieler +1 (Waage: {0})',
    log_zone_ai:       'Zone: KI +1 (Waage: {0})',
    log_combat:        '{0} → {1}: {2} Schaden',
    log_counter:       '↩ Gegenschaden: {0}',
    log_destroyed:     '{0} vernichtet!',
    dice_crit:         ' 💥Krit!',
    dice_blocked:      ' 💨Abgewehrt',
    zone_note:         ' (Zone!)',

    // End conditions
    msg_win_title:        'Sieg! 🎉',
    msg_lose_title:       'Niederlage!',
    msg_units_destroyed:  '{0} hat alle Einheiten vernichtet!',
    msg_zone_player_win:  'Spieler kontrolliert die Zone (Waage: +{0})!',
    msg_zone_ai_win:      'KI kontrolliert die Zone (Waage: {0})!',
    winner_player:        'Spieler',
    winner_ai:            'KI',

    // UI / phases
    zone_neutral:   '⬜ Neutral',
    zone_player:    '🔵 Spieler',
    zone_ai:        '🔴 KI',
    turn_player:    'Zug {0} — Spieler',
    turn_ai:        'Zug {0} — KI',
    phase_select:   'Einheit auswählen',
    phase_move:     'Bewegen oder Angreifen',
    phase_attack:   'Angriffsziel wählen (Esc=skip)',
    phase_ai:       'KI am Zug…',

    // Unit info popup
    popup_hp:       'HP',
    popup_atk:      'Angriff',
    popup_def:      'Verteidigung',
    popup_mov:      'Bewegung',
    popup_range:    'Reichweite',
    popup_exp:      'Erfahrung',
    popup_melee:    'Nahkampf',
    popup_tiles:    '{0} Felder',
    status_done:    '✓ Zug beendet',
    status_moved:   '✓ Bewegt',
    status_attacked:'✓ Angegriffen',

    // Debug
    debug_player:   'Spieler',
    debug_ai:       'KI',

    // Prompt
    prompt_seed: 'Seed eingeben (leer lassen für zufällige Karte):',

    // HTML static
    html_btn_end_turn:   'Zug beenden',
    html_btn_new_game:   'Neues Spiel',
    html_btn_debug:      'Debug-Pfade anzeigen',
    html_army:           'Armee',
    html_ctrl_zone:      'Kontrollzone',
    html_zone_owner:     'Besitzer',
    html_zone_hint:      'Einheiten in der Zone: kein Angriff, halbe Verteidigung',
    html_terrain_legend: 'Gelände-Legende',
    html_units_legend:   'Einheiten',
    html_unit_desc:      '♞ Reiter – schnell (5), schwach<br>⛨ Speerkämpfer – robust, langsam<br>⚔ Schwertträger – stark &amp; zäh<br>🏹 Bogenschütze – Fernkampf (3)<br>💣 Katapult – Artillerie (4), sehr langsam',
    html_log:            'Kampflog',
    html_hint:           'Klick: Einheit wählen / Ziel anklicken<br>Rechtsklick / Esc: Abwählen<br>Pfeiltasten / Maus ziehen: Karte scrollen',
    html_minimap:        'Minimap',
    html_msg_btn:        'Neues Spiel',
    html_balance_ai:     'KI',
    html_balance_player: 'Spieler',
    html_lang_btn:       'EN',
  },

  en: {
    // Unit labels
    unit_cavalry:  'Cavalry',
    unit_spear:    'Spearman',
    unit_archer:   'Archer',
    unit_sword:    'Swordsman',
    unit_catapult: 'Catapult',

    // Terrain labels
    terrain_sand:     'Sand',
    terrain_grass:    'Grassland',
    terrain_forest:   'Forest',
    terrain_mountain: 'Mountains',
    terrain_river:    'River (impassable)',
    terrain_lake:     'Lake (impassable)',
    terrain_bridge:   'Bridge',
    terrain_swamp:    'Swamp (1 tile/turn)',

    // Combat log
    log_turn_player:   '— Turn {0}: Player —',
    log_turn_ai:       '— Turn {0}: AI —',
    log_ai_thinking:   '— AI thinking —',
    log_zone_player:   'Zone: Player +1 (balance: {0})',
    log_zone_ai:       'Zone: AI +1 (balance: {0})',
    log_combat:        '{0} → {1}: {2} damage',
    log_counter:       '↩ Counter-damage: {0}',
    log_destroyed:     '{0} destroyed!',
    dice_crit:         ' 💥Crit!',
    dice_blocked:      ' 💨Deflected',
    zone_note:         ' (Zone!)',

    // End conditions
    msg_win_title:        'Victory! 🎉',
    msg_lose_title:       'Defeat!',
    msg_units_destroyed:  '{0} destroyed all units!',
    msg_zone_player_win:  'Player controls the zone (balance: +{0})!',
    msg_zone_ai_win:      'AI controls the zone (balance: {0})!',
    winner_player:        'Player',
    winner_ai:            'AI',

    // UI / phases
    zone_neutral:   '⬜ Neutral',
    zone_player:    '🔵 Player',
    zone_ai:        '🔴 AI',
    turn_player:    'Turn {0} — Player',
    turn_ai:        'Turn {0} — AI',
    phase_select:   'Select unit',
    phase_move:     'Move or attack',
    phase_attack:   'Select attack target (Esc=skip)',
    phase_ai:       'AI thinking…',

    // Unit info popup
    popup_hp:       'HP',
    popup_atk:      'Attack',
    popup_def:      'Defense',
    popup_mov:      'Movement',
    popup_range:    'Range',
    popup_exp:      'Experience',
    popup_melee:    'Melee',
    popup_tiles:    '{0} tiles',
    status_done:    '✓ Turn done',
    status_moved:   '✓ Moved',
    status_attacked:'✓ Attacked',

    // Debug
    debug_player:   'Player',
    debug_ai:       'AI',

    // Prompt
    prompt_seed: 'Enter seed (leave blank for random map):',

    // HTML static
    html_btn_end_turn:   'End Turn',
    html_btn_new_game:   'New Game',
    html_btn_debug:      'Show Debug Paths',
    html_army:           'Army',
    html_ctrl_zone:      'Control Zone',
    html_zone_owner:     'Owner',
    html_zone_hint:      'Units in zone: no attacking, half defense',
    html_terrain_legend: 'Terrain Legend',
    html_units_legend:   'Units',
    html_unit_desc:      '♞ Cavalry – fast (5), fragile<br>⛨ Spearman – sturdy, slow<br>⚔ Swordsman – strong &amp; tough<br>🏹 Archer – ranged (3)<br>💣 Catapult – artillery (4), very slow',
    html_log:            'Combat Log',
    html_hint:           'Click: select unit / click target<br>Right-click / Esc: deselect<br>Arrow keys / drag: scroll map',
    html_minimap:        'Minimap',
    html_msg_btn:        'New Game',
    html_balance_ai:     'AI',
    html_balance_player: 'Player',
    html_lang_btn:       'DE',
  },
};

/** Translate a key, replacing {0}, {1}, … with args */
function t(key, ...args) {
  let s = (TRANSLATIONS[currentLang] || TRANSLATIONS.de)[key];
  if (s === undefined) return key;
  args.forEach((a, i) => { s = s.replace(`{${i}}`, a); });
  return s;
}

/** Update all DOM elements that carry data-i18n / data-i18n-html attributes */
function applyI18nHTML() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  const btn = document.getElementById('btnLang');
  if (btn) btn.textContent = t('html_lang_btn');
  document.documentElement.lang = currentLang;
}

/** Toggle language and persist choice */
function toggleLang() {
  currentLang = currentLang === 'de' ? 'en' : 'de';
  localStorage.setItem('hexwar_lang', currentLang);
  applyI18nHTML();
  if (typeof updateUI !== 'undefined') updateUI();
  if (typeof redraw !== 'undefined') redraw();
}
