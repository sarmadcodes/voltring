# Privacy policy: requirements and draft

Google Play and AdMob require a public privacy policy URL (not a PDF, not geo-blocked, not editable by others). Host the text below on a page you control, fill in the bracketed fields, and set `EXPO_PUBLIC_PRIVACY_POLICY_URL`.

Before publishing, check that the policy covers:

- [ ] Who you are, and a contact email
- [ ] Player name: collected, public on the leaderboard, how to change or delete it
- [ ] Scores and gameplay stats sent to the leaderboard
- [ ] Random player ID / install secret (not linked to identity)
- [ ] Data stored on the device (settings, best score)
- [ ] Supabase as the leaderboard host (processor) and where data is stored
- [ ] Google AdMob: advertising ID, IP-based approximate location, ad interactions, diagnostics; link to Google's policy
- [ ] Consent (GDPR/UK via Google UMP, US state privacy), and how to change choices in-app
- [ ] No analytics or crash reporting SDK (update if you add one)
- [ ] Children: not directed at under-13s
- [ ] Data retention and deletion (in-app + email)
- [ ] Security (HTTPS, hashed secret, restricted database access)
- [ ] Effective date and how changes are announced

---

## Draft

**VOLTRING Privacy Policy**
Effective: [DATE]

VOLTRING ("the game") is developed by [YOUR NAME OR STUDIO] ("we"). This policy explains what data the game handles and why. Contact: [SUPPORT EMAIL].

**What you give us**
- *Player name.* You choose a player name on first launch. It appears publicly on the global leaderboard next to your best score. Don't use your real name or anything that identifies you.

**What the game creates and sends**
- *Leaderboard data.* When you set a new personal best and are online, the game sends your player name, best score, best combo, run duration and number of hits to our leaderboard server so it can rank you and check that scores are plausible.
- *Random player ID and install key.* The game generates a random ID and a random secret key on your device. They let only your device update your own leaderboard entry. They aren't linked to your identity, and the server stores only a one-way hash of the key.

We don't collect your email, phone number, real name, contacts, precise location, photos or files. We don't use analytics or crash-reporting tools.

**Stored on your device**
Your settings (sound, music, haptics), best score, player name and the keys above are stored locally on your phone. Uninstalling the game removes them.

**Leaderboard hosting**
Leaderboard data is stored with Supabase ([REGION]), which processes it on our behalf. Your player name and best score are visible to everyone who opens the leaderboard. Internal IDs and keys are never shown.

**Advertising**
The game shows ads through Google AdMob. Google may collect and process your device's advertising ID, approximate location derived from your IP address, ad interactions and diagnostic information to serve, personalise (where you consent) and measure ads and to prevent fraud. See how Google uses data: https://policies.google.com/technologies/partner-sites. You can reset or delete your advertising ID in Android Settings > Privacy > Ads.

**Your consent choices**
Where required by law (for example in the EEA, the UK and some US states), the game asks for your consent through Google's consent tool before showing personalised ads. You can review or change your choice at any time in Settings > Ad privacy choices (shown where applicable). If you decline, you may still see non-personalised ads.

**Deleting your data**
Settings > Delete leaderboard data removes your player name and scores from our server immediately. You can also email [SUPPORT EMAIL] and we'll delete them within 30 days. Data held by Google for advertising is governed by Google's policies.

**Retention**
We keep your leaderboard entry until you delete it or we retire the leaderboard. We keep no other history of your games.

**Children**
VOLTRING isn't directed at children under 13, and we don't knowingly collect personal data from them. If you believe a child has provided data, contact us and we'll delete it.

**Security**
All network traffic uses HTTPS. The leaderboard database blocks direct access; changes go only through server functions that verify your install key and validate scores.

**Changes**
If this policy changes, we'll update this page and the effective date above.
