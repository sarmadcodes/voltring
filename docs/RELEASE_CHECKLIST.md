# Release checklist (Google Play)

Status legend: [x] done in the codebase and verified, [ ] needs you (accounts, a device or a Play Console action).

## Code and configuration
- [x] Fully client-side: no backend, no account, scores and records saved on the device only
- [x] Package ID `com.sarmad.voltring`, version 1.0.0, versionCode managed by EAS (auto-increment)
- [x] compile/target SDK 36 (Play requirement from 31 Aug 2026)
- [x] Production profile builds an AAB (`eas.json`)
- [x] Production build refuses test AdMob IDs, missing ad units or a missing privacy URL
- [x] Dev and preview builds use Google's official test ad units only
- [x] No secrets anywhere (the app has none); `.env`, keystores and `credentials.json` are git-ignored
- [x] Unneeded permissions blocked (microphone, storage, overlay, foreground service)
- [x] TypeScript, ESLint, Jest tests, expo-doctor all passing (`npm run check`)
- [x] EAS project linked (`@sarmadcodess/voltring`)
- [x] Icons, splash, Play icon 512x512 (`assets/images/play-store-icon.png`), feature graphic 1024x500 (`assets/store/feature-graphic.png`)
- [x] Hostable privacy policy page: `docs/privacy/index.html` (replace `SUPPORT_EMAIL`)

## You need to provide
- [ ] Support email: replace `SUPPORT_EMAIL` in `docs/privacy/index.html`; set `EXPO_PUBLIC_SUPPORT_EMAIL`
- [ ] Host the privacy page (e.g. GitHub Pages) and set `EXPO_PUBLIC_PRIVACY_POLICY_URL`
- [ ] AdMob: app + banner, interstitial and rewarded units; set `ADMOB_ANDROID_APP_ID` and the three `EXPO_PUBLIC_ADMOB_*` vars as EAS production env vars
- [ ] AdMob Privacy & messaging: publish a GDPR message (and a US state regulations message)
- [ ] 4 to 8 real phone screenshots from a preview build

## On real devices (preview build: `npm run build:preview`)
- [ ] Fresh install: consent form (test from an EEA VPN or with UMP debug geography), first game
- [ ] Gameplay smoothness on a low-end/mid-range phone; tap timing feels instant
- [ ] Sound, music and haptics toggles; music pauses when the app is backgrounded
- [ ] Background the app mid-run: it pauses; resume restarts the countdown
- [ ] Android back: in play it pauses; paused/game over goes home; home exits
- [ ] Airplane mode: everything works except ads
- [ ] Records: best score and top 10 persist after force-closing the app; Reset records works
- [ ] Interstitial only after 3+ games, then at most every 4 games / 3 min; rewarded continue works once per run; ads failing never block
- [ ] Small (5"), standard and tall (20:9) screens
- [ ] App update over an existing install keeps records

## Play Console
- [ ] Create app, Game > Arcade, free, contains ads
- [ ] Store listing (`docs/PLAY_STORE.md`)
- [ ] Data Safety form (`docs/PLAY_STORE.md`: AdMob-only rows)
- [ ] Advertising ID declaration: yes
- [ ] Content rating questionnaire (no user interaction)
- [ ] Target audience 13+
- [ ] Play App Signing enrolled
- [ ] `npm run build:prod` then upload the .aab (or `npm run submit:prod`) to a closed test
- [ ] Closed testing (new personal developer accounts: at least 12 testers for 14 days before production access)
- [ ] Link the AdMob app to the Play listing after publishing
