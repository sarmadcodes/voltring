# VOLTRING

A one-tap retro neon arcade game for Android. A spark circles a ring; tap anywhere while it is inside the glowing gate. Hits chain into a combo multiplier, the ring speeds up, gates shrink, and you have three lives. Global leaderboard, fully playable offline.

Built with Expo SDK 57, React Native 0.86, Expo Router, Reanimated 4, Supabase (leaderboard only) and Google AdMob.

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

---

## Project layout

```
src/
  app/             Expo Router screens: index (home), game, leaderboard, settings, name, about
  components/      UI kit (GameButton, NeonText, Backdrop, ...) and game/ (Ring, Hud, Overlays)
  game/            rules.ts (scoring/difficulty), engine.ts (worklet simulation)
  services/        api, player, leaderboard(+Cache), sync, storage, ads(+adPolicy), audio, haptics
  state/store.ts   small external store for persistent app data
  config/env.ts    all EXPO_PUBLIC_* configuration
  __tests__/       Jest tests for real logic
supabase/
  migrations/      database schema, RLS, RPC functions
  tests/           in-process Postgres (PGlite) test of the migration
scripts/           generate-audio.mjs, generate-icons.mjs (all assets are generated, original)
docs/              Play Store listing, Data Safety, privacy policy requirements, release checklist
```

---

## Setup

```bash
npm install
cp .env.example .env
```

Fill `.env` (everything is optional for local play; see "Environment variables").

### Run it

AdMob is a native module that **Expo Go does not include**. The app detects Expo Go and disables ads, so Expo Go is fine for gameplay/UI work:

```bash
npx expo start
```

To test ads, consent and the full native build, use a development build:

```bash
npm run build:dev          # EAS cloud build of the dev client (APK); install it on the phone
npm run start:dev-client   # then open the project from the dev client
```

Or build locally with Android Studio installed: `npx expo run:android`.

`npx expo export --platform web` also works (ads are stubbed on web), which is handy for quick UI QA in a browser. Web is not a shipping target.

### Checks

```bash
npm run typecheck
npm run lint
npm test          # 53 Jest tests: engine, scoring, difficulty, sync/dedupe, persistence, ad policy
npm run test:db   # 32 checks of the Supabase migration in a real Postgres (PGlite)
npm run check     # all of the above + expo-doctor
```

---

## Environment variables

Everything prefixed `EXPO_PUBLIC_` is bundled into the app and is public by design. **Never put the Supabase service-role key, signing keys or any secret in `.env` or app config.**

| Variable | Needed for | Notes |
|---|---|---|
| `EXPO_PUBLIC_APP_ENV` | all | `development` / `preview` / `production`. Set automatically by EAS profiles. |
| `EXPO_PUBLIC_SUPABASE_URL` | leaderboard | `https://<ref>.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | leaderboard | anon / publishable key only |
| `ADMOB_ANDROID_APP_ID` | production | `ca-app-pub-...~...` (build-time only, goes into the manifest) |
| `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` | production | ad unit ID |
| `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID` | production | ad unit ID |
| `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID` | production | ad unit ID |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | production | shown in Settings |
| `EXPO_PUBLIC_TERMS_URL` | optional | shown in Settings if set |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | optional | "Contact support" in Settings |

Development and preview builds **always** use Google's official test ad units, whatever is set. Production builds **refuse to build** (`app.config.ts` throws) if any AdMob ID, Supabase value or the privacy URL is missing, or if the Google test app ID would be used.

For EAS builds, store these as EAS environment variables (Expo dashboard > Project > Environment variables, or `npx eas-cli env:create`) for the `preview` and `production` environments instead of committing them.

---

## Supabase (global leaderboard)

1. Create a project at supabase.com.
2. Open **SQL Editor**, paste `supabase/migrations/20261006000000_voltring_init.sql`, and run it. (Or with the CLI: `supabase link`, then `supabase db push`.)
3. Copy the **Project URL** and the **anon / publishable key** into `.env` and the EAS env vars.

No Supabase Auth setup is needed.

### How it works

- One table, `voltring_players`: id, username, best score/combo, timestamps, hashed install secret. No emails, device IDs or IPs are stored.
- **RLS is enabled with zero policies**, and all table privileges are revoked from `anon`/`authenticated`, so the public key cannot read or write the table at all.
- Clients call five `SECURITY DEFINER` RPCs: `voltring_register_player`, `voltring_submit_score`, `voltring_get_leaderboard`, `voltring_rename_player`, `voltring_delete_player`.
- Each install generates a random 256-bit secret on first launch, and only its SHA-256 hash is stored. Writes require `(player_id, secret)`, so nobody can modify another player's row.
- Leaderboard: top 100 by `best_score desc, best_at asc, id` (the earlier achiever wins ties) through a partial index, plus the caller's own rank in the same response. Rank is computed server-side with a count, never by downloading players.

### Score validation (server-side, in SQL)

The client is treated as untrusted. `voltring_submit_score` rejects a run when:

- the score exceeds the theoretical maximum for its hit count (`voltring_max_score_for_hits`: every hit perfect + gold + max combo). This is mirrored by `maxScoreForHits` in `rules.ts`, and a test checks that the two match;
- hits exceed what is physically possible in the reported duration (one hit per 250 ms);
- max combo exceeds hits, values are negative, or durations are absurd;
- a different run is submitted within 5 seconds of the previous one (rate limit);
- the secret does not match.

Duplicate protection: each run has a UUID. Re-sending the same run (a retry after a lost response, or after a rewarded continue) is idempotent. The client only queues a run if it beats the best already synced or queued, so a player produces at most one write per personal best. Concurrent callers share one in-flight request, and failures back off exponentially (15 s up to 10 min).

Honest limitation: there is no server-side replay, so a determined cheater can still forge a plausible run within the bounds. For a casual game this is the standard trade-off; you can always delete rows from the Supabase dashboard.

---

## AdMob

- `app.config.ts` injects the App ID through the `react-native-google-mobile-ads` config plugin.
- `src/services/ads.ts` runs the **Google UMP consent flow** (`AdsConsent.gatherConsent`) before the SDK initialises, and only requests ads when `canRequestAds` is true. Settings shows **Ad privacy choices** whenever UMP says a privacy options entry point is required, so users can change or withdraw consent.
- The max ad content rating is PG.
- Placement (`src/services/adPolicy.ts`, easy to tune):
  - **Home**: an anchored adaptive banner at the bottom, never over controls.
  - **Gameplay**: no ads, ever.
  - **Interstitial**: only when leaving the game-over screen (Play Again / Home). Never in the first 3 games, at most every 4 games, at least 3 minutes apart, and never within 2 minutes of a rewarded ad.
  - **Rewarded**: an optional "Continue" on game over, once per run, restores one life. It only appears if an ad is loaded, and the player can always skip it.
- Every ad failure resolves to "no ad". Nothing waits longer than the SDK's own callbacks, with a hard 60/120 s safety timeout.

In AdMob you also need to: create the app, create the 3 ad units, link the app to the Play listing once it's published, and configure the **GDPR consent message** (plus the US state regulations message) under Privacy & messaging. Without a published message, the UMP form will not appear in the EEA/UK.

---

## Building and releasing

```bash
npx eas-cli@latest login
npx eas-cli@latest init            # links the project, writes the EAS projectId into app config
npm run build:preview              # internal APK with test ads, for QA on real phones
npm run build:prod                 # Android App Bundle (.aab) for Google Play
npm run submit:prod                # uploads to the Play internal track as a draft (needs a service account)
```

- Signing: let EAS generate and manage the upload keystore on the first production build (`credentials.json` and `*.keystore` are git-ignored). Enroll in **Play App Signing** in the Play Console.
- Versions: `version` in `app.config.ts` is the user-visible version (1.0.0). `versionCode` is managed remotely by EAS (`appVersionSource: remote` plus `autoIncrement` in the production profile), so every production build gets a higher code automatically.
- Target SDK: compile and target SDK 36. Google Play requires API 36 for new apps and updates from 31 Aug 2026.
- Updating: bump `version` in `app.config.ts`, run `npm run check`, `npm run build:prod` and `npm run submit:prod`, then promote the release in the Play Console.

See `docs/RELEASE_CHECKLIST.md` for the full pre-submission list, and `docs/PLAY_STORE.md` for the listing, Data Safety and content-rating answers.

---

## Known limitations

- Score validation is plausibility-based (see above), not full replay verification.
- Username registration has no per-IP rate limit (Supabase RPCs don't see client IPs without an Edge Function). Names are first come, first served; reserved names are blocked.
- The music loop is AAC, so Android may leave a few milliseconds of gap at the loop point.
- iOS is not configured for release (this is an Android-only build).
- `npm audit` reports issues in Expo/Metro build tooling, which is not shipped in the app. Don't run `npm audit fix --force`; it downgrades Expo.

## Licensing

All code, graphics, sounds and music are original (generated by `scripts/`). Fonts: Orbitron and Chakra Petch, under the SIL Open Font License 1.1 (via `@expo-google-fonts`).
