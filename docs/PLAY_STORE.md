# Google Play listing and declarations

Everything here reflects the actual implementation as of version 1.0.0: a fully offline game with no backend, where the only data collection comes from the Google Mobile Ads SDK. If you add any SDK (analytics, crash reporting, cloud saves), update the Data Safety answers before the next release.

## Store listing

**App name:** VOLTRING

**Short description (max 80 chars):**
> One tap. One ring. Hit the gate, build your combo, beat your best score.

**Full description:**

> A spark races around a neon ring. Tap when it crosses the glowing gate. That's it.
>
> Easy to learn in seconds, hard to master. Every hit speeds the ring up and tightens the gates. Chain hits to grow your multiplier up to x8, land the white core for PERFECT double points, and catch rare gold gates for triple. Miss three times and the run is over, so go again.
>
> FEATURES
> - One-tap controls, playable with one hand
> - Runs from 30 seconds to as long as you can hold on
> - Combo multiplier, perfect hits and gold gates for score chasers
> - Your top 10 runs saved as personal records
> - Plays fully offline, no account or login
> - Clean retro neon look with original synth sound effects and music
>
> Sound, music and haptics can each be switched off in Settings.

**Category:** Game > Arcade
**Tags (pick up to 5 in the Console):** Arcade, Casual, Reflex, Single player, Offline
**Contact email:** sarmadsuper3@gmail.com
**Privacy policy URL:** https://sarmadcodes.github.io/voltring/

## Graphics checklist

| Asset | Spec | Status |
|---|---|---|
| App icon | 512 x 512 PNG, 32-bit | Done: `assets/images/play-store-icon.png` |
| Feature graphic | 1024 x 500 PNG/JPG, no alpha | Done: `assets/store/feature-graphic.png` (`npm run gen:feature`) |
| Phone screenshots | 2 to 8, 16:9 or 9:16, min 320 px side | **To do** from the real app on a phone: home, gameplay mid-combo, PERFECT feedback, game over with a new high score, records. |
| Tablet screenshots | Optional | Skip (phone-first, portrait). |

Screenshots must show the real UI from real play.

## Data Safety form

### What the app itself does
VOLTRING has no backend and no account. Scores, records and settings never leave the device. The app makes no network requests of its own; all network traffic comes from the Google Mobile Ads SDK.

### Overview answers

- Does the app collect or share any of the required user data types? **Yes** (through the Google Mobile Ads SDK only)
- Is all user data encrypted in transit? **Yes** (the AdMob SDK uses TLS)
- Do you provide a way for users to request that their data is deleted? **No.** The app stores nothing about the user on any server you control; advertising data is managed by Google, and users can reset or delete their advertising ID in Android settings. (Play accepts "No" here when there's no account and no developer-held data.)

### Data types (all collected by the Google Mobile Ads SDK)

| Data type (Play category) | Collected | Shared | Optional? | Purposes |
|---|---|---|---|---|
| Device or other IDs (advertising ID) | Yes | Yes (Google) | Required | Advertising or marketing, Analytics, Fraud prevention, security and compliance |
| Location > Approximate location (from IP) | Yes | Yes (Google) | Required | Advertising or marketing, Fraud prevention, security and compliance |
| App activity > App interactions (ad impressions/clicks) | Yes | Yes (Google) | Required | Advertising or marketing, Analytics |
| App info and performance > Diagnostics | Yes | Yes (Google) | Required | Analytics, Fraud prevention, security and compliance |

Data stored only on the device (best score, records, settings) is not "collected" under Play's definitions, because it is never transmitted off the device.

Confirm the AdMob rows against Google's current guidance before submitting: <https://developers.google.com/admob/android/privacy/play-data-disclosure>.

### Advertising ID declaration

App content > Advertising ID: **Yes, the app uses advertising ID**, for **Advertising or marketing** (the AdMob SDK adds the `AD_ID` permission).

## Content rating (IARC questionnaire)

- Category: Game
- Violence, fear, sexuality, language, controlled substances, gambling: **None**
- User interaction / user-generated content / chat: **No**
- Shares the user's location with other users: **No**
- Digital purchases: **No**
- Ads: **Yes**

Expected result: Everyone / PEGI 3 (or local equivalent).

## Target audience and content

- **Target age groups: 13 and over** (13-15, 16-17, 18+). Don't select under-13 groups: the app uses the standard AdMob SDK with personalised ads subject to consent, which isn't set up for the Families Policy.
- Ads: **Contains ads**.
- News app: No. Government app: No. Financial features: None. Health: No.
- Account deletion: not applicable (no accounts).

## Permissions in the final manifest

Expected after an EAS build:
- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE` (AdMob)
- `com.google.android.gms.permission.AD_ID` (AdMob)
- `android.permission.VIBRATE` (haptics)
- `android.permission.WAKE_LOCK` and the Google Play services/AdMob receivers added by the SDK at build time

Explicitly blocked in `app.config.ts`: RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, storage, SYSTEM_ALERT_WINDOW, FOREGROUND_SERVICE*.
