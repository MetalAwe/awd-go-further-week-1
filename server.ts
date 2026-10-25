import { resolve, normalize, extname, join } from "node:path";
import { stat } from "node:fs/promises";
//these are two libraries that we are going to use
//for the path manipulation and file system operations respectively.

const PUBLIC_DIR = resolve("./public");

const server = Bun.serve({
    async fetch(req) {
        const url = new URL(req.url);
        //Had to search this up, this is like an array for our content types
        const MIME_TYPES: Record<string, string> = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
            ".txt": "text/plain; charset=utf-8",
        };
        
        //SERVER SECURITY
        //Safety first: we are going to check if the pathname is valid and can be decoded. If it can't, we return a 400 Bad Request response. 
        let decodedPathname: string;
        try {
            decodedPathname = decodeURIComponent(url.pathname);
        } catch {
            return new Response("Bad Request", { status: 400 });
        }
        //Map trailing slash or root to index.html
        const relativePath = decodedPathname.endsWith("/")
        ? join(decodedPathname, "index.html")
        : decodedPathname;

        //furthermore, no sneaky tricks, it is not allowed to go outside of the public directory. 
        const safePath = normalize(resolve(PUBLIC_DIR, `.${relativePath}`));
        if (!safePath.startsWith(PUBLIC_DIR)) {
        return new Response("Forbidden", { status: 403 });
        }

        //Answer only GET and HEAD; any other method gets 405 with an Allow: GET, HEAD header.
        if (req.method !== "GET" && req.method !== "HEAD") {
            return new Response(null, {
            status: 405,
                headers: {
                    Allow: "GET, HEAD",
                    "Content-Length": "0",
                },
            });
        }

        //Now we are going to check if the file exists and is not a directory.
        //If it does not exist, we return a 404 Not Found response. 
        //If it is a directory, we also return a 404 Not Found response.
        try {
            const fileStats = await stat(safePath);

            // Block directory listing / accessing directories without an index mapping
            if (fileStats.isDirectory()) {
                return new Response("Not Found", { status: 404 });
            }
            const ext = extname(safePath).toLowerCase();
            const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
            const lastModifiedDate = new Date(fileStats.mtime);
            const lastModified = lastModifiedDate.toUTCString();
            const contentLength = fileStats.size.toString();

            //searched this up too, this is a primitive form of caching:
            const headers = new Headers({
                "Content-Type": contentType,
                "Content-Length": contentLength,
                "Last-Modified": lastModified,
            });
            if (ext === ".css" || ext === ".js") {
                headers.set("Cache-Control", "public, max-age=60");
            }

            if (req.method === "HEAD") {
                return new Response(null, { status: 200, headers });
            }

            const file = Bun.file(safePath);
            return new Response(file, { status: 200, headers });
        }catch (err: any) {
            if (err.code === "ENOENT") {
                return new Response("Not Found", { status: 404 });
            }
            return new Response("Internal Server Error", { status: 500 });
        }
    },
});
