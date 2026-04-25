# Commodore Charset

A browser-based Commodore 64 multicolor character and tile editor. It lets you edit a 256-character charset, compose tiles, save/load project JSON, and export binary assets for C64 workflows.

## Requirements

- Node.js 18 or newer
- npm

## Install

Install the project dependencies from the repository root:

```sh
npm install
```

## Run Locally

Start the Vite development server:

```sh
npm run dev
```

Vite will print the local URL in the terminal. With the current script, the app is hosted on `127.0.0.1`, usually at:

```text
http://127.0.0.1:5173/
```

Open that URL in your browser.

## Build

Create a production build:

```sh
npm run build
```

The compiled site is written to `dist/`.

## Run Tests

Run the encoding and export checks:

```sh
npm test
```

## Available Scripts

- `npm run dev` - start the local development server.
- `npm run build` - type-check the TypeScript project and build the production bundle.
- `npm test` - run the TypeScript test file under `tests/`.

## Using the App

- Edit individual C64 multicolor characters in the character editor.
- Select global colors for `D021`, `D022`, and `D023`.
- Compose tile definitions from the character set.
- Save and reload projects as JSON.
- Export charset bytes, visible color data, color RAM data, flat tile data, separated tile data, and an Oscar64 header.
