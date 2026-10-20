# VOLTRING

A one-tap retro neon arcade game for Android. A spark circles a ring; tap anywhere while it is inside the glowing gate. Hits chain into a combo multiplier, the ring speeds up, gates shrink, and you have three lives.

**Fully client-side:** there is no backend, no account, no login and no ads. Best score, your top 10 runs and settings are saved on the device only. The app makes no network requests.

Built with Expo SDK 57, React Native 0.86, Expo Router and Reanimated 4.

---

## Gameplay rules (source of truth: `src/game/rules.ts`)

| Mechanic | Rule |
|---|---|
| Hit | Tap while the spark is inside the gate (plus 4 degrees of latency forgiveness). |
| PERFECT | Hit the white core (34% of the gate). Double points. |
| Gold gate | From hit 15, about 12% of gates are gold: 40% narrower, triple points. |
| Multiplier | +1 every 4 consecutive hits, max x8. Any miss resets it. |
| Points | `(10 + level) x perfect(2) x gold(3) x multiplier`, level = hits / 10 (max +20). |
| Difficulty | Speed 120 deg/s rising to 430 deg/s; gate half-width 26 deg shrinking to 10 deg. Drifting gates from hit 30. Direction reverses after hits (always early, 80% later). |
| Fairness | A new gate always spawns at least 0.35 s of travel ahead and never more than 165 deg away. A simulated perfect-timing bot survives 300 hits on every tested seed (`engine.test.ts`). |
| Lives | 3. Tapping early or letting the spark pass costs one. |

The simulation is a single plain object stepped on the UI thread (`useFrameCallback`). Input is read on raw touch-down (`Gesture.Manual().onTouchesDown`) and judged on the UI thread too. Only discrete events (hit, miss, game over) cross to React, so the HUD re-renders a few times per second, never per frame.

## Local records

`src/state/store.ts` + `src/services/storage.ts` (AsyncStorage):

- **Best score**, best combo and games played.
- **Top 10 runs** (score, combo, hits, date), shown on the Records screen and ranked on game over ("TOP 10 #3").
- Corrupt or edited storage is sanitised on load (falls back to defaults, never crashes).
- Settings > Reset records clears everything.

---

## Project layout

```
src/
  app/             Expo Router screens: index (home), game, records, settings, about
  components/      UI kit (GameButton, NeonText, Backdrop, RecordRow, ...) and game/ (Ring, Hud, Overlays)
  game/            rules.ts (scoring/difficulty), engine.ts (worklet simulation)
  services/        storage, audio, haptics
  state/store.ts   small external store for persistent app data
  config/env.ts    EXPO_PUBLIC_* configuration (privacy URL, support email)
  __tests__/       Jest tests for real logic
scripts/           generate-audio.mjs, generate-icons.mjs, generate-feature-graphic.py
docs/              Play Store listing, Data Safety, privacy policy (+ hostable page), release checklist
```

---

## Setup

```bash
npm install
```

### Run it

Everything works in Expo Go (SDK 57):

```bash
npm start
```

### Checks

```bash
npm run typecheck
npm run lint
npm test          # Jest: engine, scoring, difficulty, fairness, local records, persistence
npm run check     # all of the above + expo-doctor
```

---

## Environment variables

Everything here is public by design. There are no secrets.

| Variable | Needed for | Notes |
|---|---|---|
| `EXPO_PUBLIC_APP_ENV` | all | `development` / `preview` / `production`. Set automatically by EAS profiles. |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | production | shown in Settings; the production build refuses to run without it. Set in EAS. |
| `EXPO_PUBLIC_TERMS_URL` | optional | shown in Settings if set |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | optional | "Contact support" in Settings. Set in EAS. |

The privacy policy is published from the `gh-pages` branch to https://sarmadcodes.github.io/voltring/ (source: `docs/privacy/index.html`).

---

## Ads

Version 1 ships with **no ads**. To add AdMob later: install `react-native-google-mobile-ads`, add its config plugin with the app ID, gather consent with the UMP SDK before requesting ads, and update the privacy policy, Data Safety form and content rating ("contains ads") before releasing that update. `src/game/engine.ts` still has `revive()` ready for an optional rewarded "continue".

---

## Building and releasing

```bash
npm run build:preview              # internal APK for QA on real phones
npm run build:prod                 # Android App Bundle (.aab) for Google Play
npm run submit:prod                # uploads to the Play internal track as a draft (needs a service account)
```

- EAS project: `@sarmadcodess/voltring` (already linked in `app.config.ts`).
- Signing: let EAS generate and manage the upload keystore on the first production build. Enroll in **Play App Signing**.
- Versions: `version` in `app.config.ts` is the user-visible version (1.0.0). `versionCode` is managed remotely by EAS and auto-increments on production builds.
- Target SDK 36 (required by Google Play from 31 Aug 2026).

See `docs/RELEASE_CHECKLIST.md` and `docs/PLAY_STORE.md`.

---

## Known limitations

- Records are per device: uninstalling the app or clearing its data erases them (there's no cloud backup by design).
- The music loop is AAC, so Android may leave a few milliseconds of gap at the loop point.
- iOS is not configured for release.
- `npm audit` reports issues in Expo/Metro build tooling, which is not shipped in the app. Don't run `npm audit fix --force`; it downgrades Expo.

## Licensing

All code, graphics, sounds and music are original (generated by `scripts/`). Fonts: Orbitron and Chakra Petch, under the SIL Open Font License 1.1 (via `@expo-google-fonts`).
