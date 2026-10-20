# VOLTRING

A one-tap retro neon arcade game for Android. A spark circles a ring; tap anywhere while it is inside the glowing gate. Hits chain into a combo multiplier, the ring speeds up, gates shrink, and you have three lives.

**Fully client-side:** there is no backend, no account and no login. Best score, your top 10 runs and settings are saved on the device only. The only network traffic is Google AdMob.

Built with Expo SDK 57, React Native 0.86, Expo Router, Reanimated 4 and Google AdMob.

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
- A rewarded "continue" updates the same run's entry instead of adding a second one, and doesn't count as an extra game.
- Corrupt or edited storage is sanitised on load (falls back to defaults, never crashes).
- Settings > Reset records clears everything.

---

## Project layout

```
src/
  app/             Expo Router screens: index (home), game, records, settings, about
  components/      UI kit (GameButton, NeonText, Backdrop, RecordRow, ...) and game/ (Ring, Hud, Overlays)
  game/            rules.ts (scoring/difficulty), engine.ts (worklet simulation)
  services/        storage, ads (+adPolicy, web stub), audio, haptics
  state/store.ts   small external store for persistent app data
  config/env.ts    EXPO_PUBLIC_* configuration (AdMob units, URLs)
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

AdMob is a native module that **Expo Go does not include**. The app detects Expo Go and disables ads, so Expo Go (SDK 57) is fine for gameplay/UI work:

```bash
npm start
```

To test ads and the consent form, use a development build:

```bash
npm run build:dev          # EAS cloud build of the dev client (APK); install it on the phone
npm run start:dev-client   # then open the project from the dev client
```

### Checks

```bash
npm run typecheck
npm run lint
npm test          # Jest: engine, scoring, difficulty, fairness, local records, persistence, ad policy
npm run check     # all of the above + expo-doctor
```

---

## Environment variables

Everything here is public by design (it's bundled into the app). There are no secrets.

| Variable | Needed for | Notes |
|---|---|---|
| `EXPO_PUBLIC_APP_ENV` | all | `development` / `preview` / `production`. Set automatically by EAS profiles. |
| `ADMOB_ANDROID_APP_ID` | production | `ca-app-pub-...~...` (build-time only, goes into the manifest) |
| `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` | production | ad unit ID |
| `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID` | production | ad unit ID |
| `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID` | production | ad unit ID |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | production | shown in Settings |
| `EXPO_PUBLIC_TERMS_URL` | optional | shown in Settings if set |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | optional | "Contact support" in Settings |

Development and preview builds **always** use Google's official test ad units. Production builds **refuse to build** (`app.config.ts` throws) if any AdMob ID or the privacy URL is missing, or if the Google test app ID would be used.

Set production values as EAS environment variables, for example:

```bash
npx eas-cli env:create --environment production --name EXPO_PUBLIC_PRIVACY_POLICY_URL --value "https://..." --visibility plaintext
```

---

## AdMob

- `app.config.ts` injects the App ID through the `react-native-google-mobile-ads` config plugin.
- `src/services/ads.ts` runs the **Google UMP consent flow** (`AdsConsent.gatherConsent`) at launch, before the SDK initialises, and only requests ads when `canRequestAds` is true. Settings shows **Ad privacy choices** whenever UMP says it's required, so users can change or withdraw consent.
- The max ad content rating is PG.
- Placement (`src/services/adPolicy.ts`, easy to tune):
  - **Home**: an anchored adaptive banner at the bottom, never over controls.
  - **Gameplay**: no ads, ever.
  - **Interstitial**: only when leaving the game-over screen (Play Again / Home). Never in the first 3 games, at most every 4 games, at least 3 minutes apart, and never within 2 minutes of a rewarded ad.
  - **Rewarded**: an optional "Continue" on game over, once per run, restores one life. It only appears if an ad is loaded, and the player can always skip it.
- Every ad failure resolves to "no ad", with a hard 60/120 s safety timeout.

In AdMob you also need to create the app and 3 ad units, and publish a **GDPR consent message** (plus the US state regulations message) under Privacy & messaging.

---

## Building and releasing

```bash
npm run build:preview              # internal APK with test ads, for QA on real phones
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
