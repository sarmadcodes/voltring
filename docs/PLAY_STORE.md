# Google Play listing and declarations

Everything here reflects the actual implementation as of version 1.0.0. If the code changes (new SDK, analytics, crash reporting), update the Data Safety answers before the next release.

## Store listing

**App name:** VOLTRING

**Short description (max 80 chars):**
> One tap. One ring. Hit the gate, build your combo, climb the global leaderboard.

**Full description:**

> A spark races around a neon ring. Tap when it crosses the glowing gate. That's it.
>
> Easy to learn in seconds, hard to master. Every hit speeds the ring up and tightens the gates. Chain hits to grow your multiplier up to x8, land the white core for PERFECT double points, and catch rare gold gates for triple. Miss three times and the run is over, so go again.
>
> FEATURES
> - One-tap controls, playable with one hand
> - Runs from 30 seconds to as long as you can hold on
> - Combo multiplier, perfect hits and gold gates for score chasers
> - Global leaderboard: see the top players and your own rank
> - Plays fully offline; your best score syncs when you're back online
> - Clean retro neon look with original synth sound effects and music
> - No account, no login: just pick a player name
>
> Sound, music and haptics can each be switched off in Settings.

**Category:** Game > Arcade
**Tags (pick up to 5 in the Console):** Arcade, Casual, Reflex, Single player, Offline
**Contact email:** _your support email (required)_
**Website / Privacy policy URL:** _must be live before submission_

## Graphics checklist

| Asset | Spec | Status |
|---|---|---|
| App icon | 512 x 512 PNG, 32-bit | Done: `assets/images/play-store-icon.png` |
| Feature graphic | 1024 x 500 PNG/JPG, no alpha | **To do.** Suggested: the ring mark on the left, "VOLTRING" in Orbitron on the right, on the #06060B background. |
| Phone screenshots | 2 to 8, 16:9 or 9:16, min 320 px side | **To do** from the real app on a device or emulator: home, gameplay mid-combo, PERFECT feedback, game over with a new high score, leaderboard. |
| Tablet screenshots | Optional | Skip (phone-first, portrait). |

Screenshots must show the real UI. Don't add fake scores or leaderboard names that never existed. Using your own real test runs is fine.

## Data Safety form

### Overview answers

- Does the app collect or share any of the required user data types? **Yes**
- Is all user data encrypted in transit? **Yes** (HTTPS to Supabase; the AdMob SDK uses TLS)
- Do you provide a way for users to request that their data is deleted? **Yes**: Settings > Delete leaderboard data removes the player's server record immediately. Also provide the support email for requests.

### Data types

| Data type (Play category) | What it is in VOLTRING | Collected | Shared | Optional? | Purposes |
|---|---|---|---|---|---|
| Personal info > **Name** | The player name chosen on first launch (a nickname, displayed publicly on the leaderboard) | Yes | No | Required | App functionality |
| Personal info > **User IDs** | A random player ID and a random per-install secret (stored only as a hash), used to authorise score updates | Yes | No | Required | App functionality, Fraud prevention/security |
| App activity > **Other actions** | Best score, best combo, run duration and hit count submitted for the leaderboard | Yes | No | Required | App functionality, Fraud prevention/security |
| Device or other IDs | Advertising ID, collected by the Google Mobile Ads SDK | Yes | Yes (Google) | Required (users can reset or delete it in Android settings) | Advertising, Analytics, Fraud prevention |
| Location > **Approximate location** | Derived by Google from IP address for ads | Yes | Yes (Google) | Required | Advertising, Fraud prevention |
| App activity > **App interactions** | Ad impressions and clicks, collected by the Google Mobile Ads SDK | Yes | Yes (Google) | Required | Advertising, Analytics |
| App info and performance > **Diagnostics** | Ad SDK performance data | Yes | Yes (Google) | Required | Analytics, Fraud prevention |

Notes:
- Supabase acts as a service provider (data processor) on your behalf, so sending data to it is not "sharing" under Play's definitions. Google AdMob is a third party, so its data is "shared".
- The app itself does not collect email, phone, real name, contacts, precise location, photos, or files, and adds no analytics or crash reporting SDK.
- Confirm the AdMob rows against Google's current guidance before submitting: <https://developers.google.com/admob/android/privacy/play-data-disclosure>.

### Advertising ID declaration

App content > Advertising ID: **Yes, the app uses advertising ID**, for **Advertising or marketing** (the AdMob SDK adds the `AD_ID` permission).

## Content rating (IARC questionnaire)

- Category: Game
- Violence, fear, sexuality, language, controlled substances, gambling: **None**
- User interaction: **Yes, users can interact**: player names are publicly visible on the leaderboard. There is no chat, messaging, or other user-generated content.
- Shares the user's location with other users: **No**
- Digital purchases: **No**
- Ads: **Yes**

Expected result: Everyone / PEGI 3 (or local equivalent).

## Target audience and content

- **Target age groups: 13 and over** (13-15, 16-17, 18+). Don't select under-13 groups. The app isn't designed for the Families Policy (its ads use the standard SDK with personalised ads subject to consent, and there's a public username).
- Appeals to children? Answer honestly: the retro neon style isn't child-directed. If Play's review asks, the content isn't aimed at kids.
- Ads: **Contains ads**.
- News app: No. Government app: No. Financial features: None. Health: No.
- Data deletion URL (if requested): your privacy policy page section describing in-app deletion plus the support email.

## Permissions in the final manifest

Expected after `expo prebuild` / EAS build:
- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`
- `com.google.android.gms.permission.AD_ID`
- `android.permission.VIBRATE` (haptics)
- `android.permission.WAKE_LOCK` and the Google Play services/AdMob receivers added by the SDK at build time

Explicitly blocked in `app.config.ts`: RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, storage, SYSTEM_ALERT_WINDOW, FOREGROUND_SERVICE*. Verify with `npx expo prebuild --platform android --clean` and inspect `android/app/src/main/AndroidManifest.xml` (then delete `android/`; it's generated and git-ignored).
