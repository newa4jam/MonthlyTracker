# SaveTrack privacy design

SaveTrack is a local-only static web app.

- No user account or sign-in
- No backend or cloud database
- No analytics, advertising, tracking pixels, external fonts, or third-party JavaScript
- Financial records are stored in IndexedDB in the browser on the device where they were entered
- The service worker stores only the app's static files so the installed app can load offline
- Backup and CSV files are created only when the user taps an export button

## Important local-storage limitation

Deleting browser website data, deleting the installed Home Screen web app, using private browsing, changing devices, or an operating-system/browser cleanup may remove local records. Export a JSON backup regularly and store it somewhere you control.
