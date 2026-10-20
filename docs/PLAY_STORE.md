# Google Play listing and declarations

Everything here reflects the actual implementation as of version 1.0.0: a fully offline game with **no backend, no ads, no analytics and no data collection**. If you add any SDK later (AdMob, analytics, crash reporting, cloud saves), update the Data Safety answers, content rating (ads) and privacy policy before that release.

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
> - Plays fully offline: no ads, no account, no login
> - Clean retro neon look with original synth sound effects and music
>
> Sound, music and haptics can each be switched off in Settings.

**Category:** Game > Arcade (free, no ads, no in-app purchases)
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

VOLTRING has no backend, no account, no ads and no analytics. Scores, records and settings never leave the device, and the app makes no network requests.

- Does the app collect or share any of the required user data types? **No**
- (The form then skips the remaining questions.) Data stored only on the device is not "collected" under Play's definitions, because it is never transmitted off the device.

### Advertising ID declaration

App content > Advertising ID: **No, the app does not use advertising ID** (the `AD_ID` permission is not in the manifest).

## Content rating (IARC questionnaire)

- Category: Game
- Violence, fear, sexuality, language, controlled substances, gambling: **None**
- User interaction / user-generated content / chat: **No**
- Shares the user's location with other users: **No**
- Digital purchases: **No**
- Ads: **No**

Expected result: Everyone / PEGI 3 (or local equivalent).

## Target audience and content

- **Target age groups: 13 and over** (13-15, 16-17, 18+). The game would also suit younger players, but selecting under-13 groups opts you into the Families Policy and extra review; keep 13+ unless you specifically want that.
- Ads: **No ads**.
- News app: No. Government app: No. Financial features: None. Health: No.
- Account deletion: not applicable (no accounts).

## Permissions in the final manifest

Verified with `expo prebuild`:
- `android.permission.INTERNET` (React Native default; the app makes no network requests)
- `android.permission.VIBRATE` (haptics)

Explicitly blocked in `app.config.ts`: RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, storage, SYSTEM_ALERT_WINDOW, FOREGROUND_SERVICE*.
