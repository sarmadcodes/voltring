# Release checklist (Google Play)

Status legend: [x] done in the codebase and verified, [ ] needs you (credentials, accounts, a device or a Play Console action).

## Code and configuration
- [x] Package ID `com.sarmad.voltring`, version 1.0.0, versionCode managed by EAS (auto-increment)
- [x] compile/target SDK 36 (Play requirement from 31 Aug 2026)
- [x] Production profile builds an AAB (`eas.json`)
- [x] Production build refuses test AdMob IDs, missing ad units, missing Supabase config or a missing privacy URL
- [x] Dev and preview builds use Google's official test ad units only
- [x] No secrets in the repo; only public `EXPO_PUBLIC_*` values are bundled; `.env`, keystores and `credentials.json` are git-ignored
- [x] Unneeded permissions blocked (microphone, storage, overlay, foreground service)
- [x] Supabase migration: RLS on, no table privileges for anon, validated SECURITY DEFINER RPCs (32 checks in `npm run test:db`)
- [x] TypeScript, ESLint, 53 Jest tests, expo-doctor all passing (`npm run check`)
- [x] Icons and splash generated (`assets/images`)

## You need to provide
- [ ] Supabase project: run the migration, set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] AdMob: app + banner, interstitial and rewarded units; set `ADMOB_ANDROID_APP_ID` and the three `EXPO_PUBLIC_ADMOB_*` vars as EAS production env vars
- [ ] AdMob Privacy & messaging: publish a GDPR message (and a US state regulations message)
- [ ] Privacy policy hosted (see `docs/PRIVACY_POLICY.md`); set `EXPO_PUBLIC_PRIVACY_POLICY_URL`
- [ ] Support email; set `EXPO_PUBLIC_SUPPORT_EMAIL`
- [ ] `npx eas-cli login` + `npx eas-cli init`
- [ ] Feature graphic (1024 x 500) and 4 to 8 real phone screenshots

## On real devices (preview build: `npm run build:preview`)
- [ ] Fresh install: name prompt, consent form (test from an EEA VPN or with UMP debug geography), first game
- [ ] Gameplay smoothness on a low-end/mid-range phone; tap timing feels instant
- [ ] Sound, music and haptics toggles; music pauses when the app is backgrounded
- [ ] Background the app mid-run: it pauses; resume restarts the countdown
- [ ] Android back: in play it pauses; paused/game over goes home; home exits
- [ ] Offline (airplane mode): play, new best saved locally, friendly leaderboard message; back online: score syncs
- [ ] Leaderboard: your row highlighted, rank shown, retry works
- [ ] Rename (24 h cooldown), duplicate name rejected, delete leaderboard data
- [ ] Interstitial only after 3+ games, then at most every 4 games / 3 min; rewarded continue works once per run; ads failing (airplane mode) never block
- [ ] Small (5"), standard and tall (20:9) screens
- [ ] App update over an existing install keeps best score and name

## Play Console
- [ ] Create app, Game > Arcade, free, contains ads
- [ ] Store listing (`docs/PLAY_STORE.md`)
- [ ] Data Safety form (`docs/PLAY_STORE.md`)
- [ ] Advertising ID declaration: yes
- [ ] Content rating questionnaire
- [ ] Target audience 13+
- [ ] Play App Signing enrolled
- [ ] `npm run build:prod` then `npm run submit:prod` (internal track) and test the Play-installed build
- [ ] Closed testing (new personal developer accounts must run a closed test with at least 12 testers for 14 days before production access)
- [ ] Link the AdMob app to the Play listing after publishing
