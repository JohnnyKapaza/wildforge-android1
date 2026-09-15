# Wildforge: Hearts of the Hollow

Original Android landscape roguelike deckbuilder.

## v0.6.2
- Fixes the cinematic background layer that covered the complete title interface on real phones
- Boot validation now rejects a running-but-invisible menu instead of reporting a false ready state
- Visible title-shell regression test added before every APK release

## v0.6.1
- Native-feeling loading screen that stays visible until the game engine is ready
- Startup error boundary with **Herstel & herstart** and **Start veilig**
- Automatic cleanup of stale WebView service-worker caches after an update
- Android WebView startup state reported by the native activity
- Real launch smoke test on an Android 15 emulator before release
- Versioned permanent APK release so a broken build is never published silently

## v0.6
- Vier volledig nieuwe speelbare helden: Vexa, Myr, Korr en Zhar
- Handgeschilderde transparante helden- en vijandensprites
- Premium kaarten met eigen aanval-, vaardigheid- en krachtillustraties
- Zichtbare hero lunges, casts, enemy strikes en impact-reacties
- Zwevende schade-, Block-, Gif-, Kracht- en genezingsfeedback
- Geanimeerde speler- en vijandenbeurten met veilige invoerblokkering
- Vier basisenergie en duidelijke huidige/maximale energieweergave
- Cinematische polish voor HUD, intents, health bars en kaart-hand
- Geoptimaliseerd voor liggende Android-schermen, waaronder Galaxy S23 Ultra

De v0.6-bronlaag staat in `v6-overlay/`. De GitHub Action bouwt die boven op de bewaarde v0.5 Android-bron en controleert dat alle nieuwe assets werkelijk in de APK zitten.

## v0.5
- Vertical landscape combat hierarchy optimized for Samsung Galaxy S23 Ultra
- HUD → enemy row → centered hero → combat piles → full hand
- Drag attack cards upward to a chosen enemy; AOE highlights the complete row
- Draw, energy, discard and functioning Exhaust pile stay visible
- Compact per-enemy intent, HP, Block and status panels without overlap
- In-combat sound settings and touch feedback

## v0.4
- Encounters with one to four enemies at once
- 72 enemy variants and 12 new original monster designs
- Striker, guard, poisoner, healer, buffer, debuffer, summoner and exploder AI
- Individual enemy intents, HP, block, strength and poison
- Target selection, AOE cards, Exhaust and potions
- Procedural combat sound effects
- 228 cards, four heroes, three acts, branching map, elites, shops, events, rest sites, bosses, relics and 21 Wildheid levels
