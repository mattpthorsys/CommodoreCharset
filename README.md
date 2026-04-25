# Commodore 64 VIC-II Multicolour Charset Editor

Local TypeScript + Vite web app for drawing Commodore 64 VIC-II multicolour character sets and composing tiles.

## Run locally (Windows 11 / Node.js)

1. Install Node.js LTS (includes npm).
2. In this folder run:

```bash
npm install
npm run dev
```

Then open the Vite URL shown in terminal (normally `http://localhost:5173`).

## Build and test

```bash
npm test
npm run build
```

## Notes

- No backend; all data stays in browser local storage.
- Project JSON import/export is available in the toolbar.
- Exports include raw charset binary, colour metadata, tile formats, and Oscar64-friendly C output.
