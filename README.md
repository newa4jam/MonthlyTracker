# SaveTrack Web — local-only PWA

SaveTrack is a responsive, gamified personal finance tracker for iPhone and modern browsers. It tracks monthly income, ordinary expenses, automatically recurring fixed expenses, payment methods, savings allocations and six-month trends.

## Included features

- Monthly income and expense ledger
- Fixed monthly expenses applied automatically from their start month
- Payment method: Bank account, Credit card, Cash or Other
- Monthly remainder: `income − all expenses`
- Monthly allocation: credit-card payment, NISA, cash reserve/use and other
- Net savings: `remainder − all allocations`
- Six-month savings chart and category/payment-method breakdowns
- Levels, XP, score and monthly missions
- IndexedDB on-device storage
- JSON backup/restore and 12-month CSV export
- Installable PWA and offline app shell
- No external JavaScript, fonts, analytics, account or backend

## Important: opening the ZIP is not enough for iPhone installation

A PWA must be served from a secure web address (HTTPS) for installation and offline features. Upload the contents of this folder to any static HTTPS host. The host serves only the app files; SaveTrack does not send the financial records to it.

## Easiest free publishing route: GitHub Pages

1. Create a free GitHub account, then create a repository such as `savetrack-web`.
2. Upload **the contents of this folder** to the repository root. Keep `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `sw.js` and the `icons` folder together.
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose the `main` branch and `/ (root)`, then save.
6. Wait for GitHub to show the HTTPS site address. It normally follows the pattern `https://YOUR-USERNAME.github.io/savetrack-web/`.
7. Open that address in Safari on the iPhone.
8. Tap Safari's **Share** button → **Add to Home Screen** → **Add**.
9. Open SaveTrack from its new Home Screen icon. Add one test entry, close it, reopen it and confirm the entry remains.
10. In **Settings**, export a JSON backup after entering important records.

> If the repository is public, the app's source files are public, but your entered financial data is not stored in the repository. It remains in that iPhone browser's local IndexedDB. Do not place backup JSON or CSV files in the repository.

## Alternative hosting

The same folder can be deployed to any static HTTPS hosting service. No server-side language, database, build command or package installation is required.

## Test locally on a computer

From this folder, run:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. `localhost` is accepted for development; iPhone installation should use an HTTPS address.

## Updating

Replace the hosted app files with the new version. Do not change the website address if you want the existing browser database to remain associated with the same origin. The service worker refreshes the static app shell while financial records remain in IndexedDB.

## Data safety

This design intentionally has no cloud sync. Clearing Safari website data, deleting the Home Screen app, switching phones, or browser/OS cleanup can remove locally stored data. Use **Settings → Export JSON backup** regularly. Restoring a backup replaces the current local database after confirmation.
