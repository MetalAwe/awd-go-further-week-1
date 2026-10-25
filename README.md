# Bun Static File Server (`static.ts`)

A lightweight, zero-dependency HTTP static file server written in TypeScript for the [Bun](https://bun.sh) runtime. Built purely with native Bun and Node.js built-ins (`Bun.serve`, `node:path`, `node:fs/promises`) without third-party frameworks.

---

## Features

- **Root & Index Mapping:** Maps requests to local files within `./public` (e.g., `/` maps to `public/index.html`, `/css/site.css` maps to `public/css/site.css`).
- **Custom MIME Type Detection:** Handcrafted mapping for common media extensions (`.html`, `.css`, `.js`, `.json`, `.svg`, `.png`, `.jpg`, `.webp`, `.txt`). Unknown types fallback to `application/octet-stream`. Text types include `charset=utf-8`.
- **Strict Method Guarding:** Accepts only `GET` and `HEAD` requests. Any other HTTP verb triggers a `405 Method Not Allowed` response with the `Allow: GET, HEAD` header.
- **Directory Traversal Protection:** Decodes percent-encoded characters (like `%2f`) and verifies that the resolved path stays strictly inside `./public`. Attempts to break out return `403 Forbidden`.
- **No Directory Listings:** Protects directory privacy; pointing to a directory without an index mapping responds with `404 Not Found`.
- **HTTP Caching & Conditional Requests:**
  - Emits `Content-Length` and `Last-Modified` headers.
  - Adds `Cache-Control: public, max-age=60` to `.css` and `.js` files.
  - Validates `If-Modified-Since` requests and replies with `304 Not Modified` when files have not changed.

---

## Project Structure

```text
.
├── public/               # Static assets directory
│   ├── index.html        # Default landing page
│   ├── css/
│   │   └── site.css
│   └── js/
│       └── app.js
├── static.ts             # Server entry point
├── package.json
└── README.md
```

---

## Prerequisites

- [Bun](https://bun.sh) (v1.0 or newer) installed on your system.

To check your installation:
```bash
bun --version
```

---

## Getting Started

1. **Create the public folder and sample files:**
   ```bash
   mkdir -p public/css public/js
   echo "<h1>Hello from Bun Static Server</h1>" > public/index.html
   echo "body { font-family: sans-serif; }" > public/css/site.css
   ```

2. **Run the server:**
   ```bash
   bun run static.ts
   ```

3. **Visit the page:**
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## Verification & Testing (`curl`)

You can verify all behavior from the terminal using `curl`:

### 1. Basic File Fetch (`GET`)
```bash
curl -i http://localhost:3000/
```
*Expected: `200 OK`, `Content-Type: text/html; charset=utf-8`, and file contents.*

### 2. Header-Only Request (`HEAD`)
```bash
curl -I http://localhost:3000/css/site.css
```
*Expected: `200 OK` with `Content-Length`, `Last-Modified`, and `Cache-Control`, but no body.*

### 3. Unsupported HTTP Methods
```bash
curl -i -X POST http://localhost:3000/
```
*Expected: `405 Method Not Allowed` with `Allow: GET, HEAD`.*

### 4. Directory Traversal Attack Attempt
```bash
curl -i http://localhost:3000/..%2f..%2f..%2fetc%2fpasswd
```
*Expected: `403 Forbidden`.*

### 5. Conditional Caching (`304 Not Modified`)
```bash
curl -i -H 'If-Modified-Since: Sun, 25 Oct 2026 12:00:00 GMT' http://localhost:3000/css/site.css
```
*Expected: `304 Not Modified` (empty response body).*

---

## Understanding Network Status Codes

When monitoring requests in browser DevTools (Network tab):

| Status Code | Meaning | When It Happens |
| :--- | :--- | :--- |
| **`200 OK`** | Standard Success | First-time download of any asset. |
| **`200 (from cache)`** | Local Cache Hit | Navigating pages within the 60-second `max-age` window for CSS/JS. |
| **`304 Not Modified`** | Revalidation Match | Reloading the page; browser sends `If-Modified-Since` and the server confirms the file is unchanged. |
| **`403 Forbidden`** | Access Denied | Path traversal attempts escaping `./public`. |
| **`404 Not Found`** | Missing Resource | The file does not exist, or a directory is requested directly. |
| **`405 Method Not Allowed`** | Invalid Verb | Any non-`GET` or non-`HEAD` request (e.g., `POST`, `PUT`, `DELETE`). |

---

## License

MIT