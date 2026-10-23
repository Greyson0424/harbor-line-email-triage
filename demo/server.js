const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.env.PORT || 4174);
const root = __dirname;
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const requestPath = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const filePath = path.resolve(root, `.${requestPath}`);

  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Harbor Line demo: http://127.0.0.1:${port}`);
});
