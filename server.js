const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 4173;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const mimeTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".webp": "image/webp"
};

function ensureDatabase() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));
    }
}

function readDatabase() {
    ensureDatabase();
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDatabase(database) {
    ensureDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2));
}

function hashPassword(password) {
    return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    });
    response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";

        request.on("data", (chunk) => {
            body += chunk;

            if (body.length > 1_000_000) {
                request.destroy();
                reject(new Error("Payload muito grande."));
            }
        });

        request.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(new Error("JSON inválido."));
            }
        });
    });
}

function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email
    };
}

async function handleApi(request, response, pathname) {
    if (request.method === "GET" && pathname === "/api/health") {
        sendJson(response, 200, { ok: true, app: "ShapeHub" });
        return;
    }

    if (request.method !== "POST") {
        sendJson(response, 405, { ok: false, message: "Método não permitido." });
        return;
    }

    let body;

    try {
        body = await readJsonBody(request);
    } catch (error) {
        sendJson(response, 400, { ok: false, message: error.message });
        return;
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password || (pathname === "/api/register" && !name)) {
        sendJson(response, 400, { ok: false, message: "Preencha nome, e-mail e senha corretamente." });
        return;
    }

    const database = readDatabase();
    const existingUser = database.users.find((user) => user.email === email);

    if (pathname === "/api/register") {
        if (existingUser) {
            sendJson(response, 409, { ok: false, message: "Já existe uma conta com esse e-mail." });
            return;
        }

        const user = {
            id: crypto.randomUUID(),
            name,
            email,
            passwordHash: hashPassword(password),
            createdAt: new Date().toISOString()
        };

        database.users.push(user);
        writeDatabase(database);
        sendJson(response, 201, { ok: true, user: publicUser(user) });
        return;
    }

    if (pathname === "/api/login") {
        if (!existingUser) {
            sendJson(response, 404, { ok: false, message: "Não encontramos uma conta com esse e-mail. Crie uma conta para poder entrar." });
            return;
        }

        if (existingUser.passwordHash !== hashPassword(password)) {
            sendJson(response, 401, { ok: false, message: "Senha incorreta. Tente novamente." });
            return;
        }

        if (name && existingUser.name !== name) {
            existingUser.name = name;
            writeDatabase(database);
        }

        sendJson(response, 200, { ok: true, user: publicUser(existingUser) });
        return;
    }

    sendJson(response, 404, { ok: false, message: "Rota não encontrada." });
}

function serveStatic(request, response, pathname) {
    const requestedPath = pathname === "/" ? "/login.html" : pathname;
    const filePath = path.normalize(path.join(ROOT, requestedPath));

    if (!filePath.startsWith(ROOT)) {
        response.writeHead(403);
        response.end("Acesso negado.");
        return;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Página não encontrada.");
            return;
        }

        const extension = path.extname(filePath).toLowerCase();
        response.writeHead(200, {
            "Content-Type": mimeTypes[extension] || "application/octet-stream",
            "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=3600"
        });
        response.end(content);
    });
}

const server = http.createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
        handleApi(request, response, url.pathname).catch(() => {
            sendJson(response, 500, { ok: false, message: "Erro interno no servidor." });
        });
        return;
    }

    serveStatic(request, response, decodeURIComponent(url.pathname));
});

server.listen(PORT, () => {
    console.log(`ShapeHub rodando em http://localhost:${PORT}`);
});
