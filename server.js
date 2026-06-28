const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");
const {
    authenticateUser,
    checkDatabase,
    createUser,
    findUserByEmail,
    initializeDatabase,
    updateUserName
} = require("./database");

const PORT = process.env.PORT || 4173;
const ROOT = __dirname;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_ATTEMPT_LIMIT = 10;
const authAttempts = new Map();
const securityHeaders = {
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data: https://images.unsplash.com; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
};

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

function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, {
        ...securityHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'"
    });
    response.end(JSON.stringify(payload));
}

function getClientAddress(request) {
    const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();

    return forwarded || request.socket.remoteAddress || "unknown";
}

function consumeAuthAttempt(request, response) {
    const key = getClientAddress(request);
    const now = Date.now();
    const entry = authAttempts.get(key);

    if (authAttempts.size > 10_000) {
        for (const [storedKey, storedEntry] of authAttempts) {
            if (now - storedEntry.startedAt >= AUTH_WINDOW_MS) {
                authAttempts.delete(storedKey);
            }
        }
    }

    if (!entry || now - entry.startedAt >= AUTH_WINDOW_MS) {
        authAttempts.set(key, { count: 1, startedAt: now });
        return true;
    }

    if (entry.count >= AUTH_ATTEMPT_LIMIT) {
        const retryAfter = Math.ceil((AUTH_WINDOW_MS - (now - entry.startedAt)) / 1000);

        response.setHeader("Retry-After", String(retryAfter));
        sendJson(response, 429, { ok: false, message: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
        return false;
    }

    entry.count += 1;
    return true;
}

function clearAuthAttempts(request) {
    authAttempts.delete(getClientAddress(request));
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
        await checkDatabase();
        sendJson(response, 200, { ok: true, app: "ShapeHub", database: "postgresql" });
        return;
    }

    if (request.method !== "POST") {
        sendJson(response, 405, { ok: false, message: "Método não permitido." });
        return;
    }

    if (!consumeAuthAttempt(request, response)) {
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

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validName = name.length >= 2 && name.length <= 120;
    const validPassword = password.length >= 8 && password.length <= 128;

    if (!validEmail || email.length > 320 || !validPassword || (pathname === "/api/register" && !validName)) {
        sendJson(response, 400, { ok: false, message: "Preencha nome, e-mail e senha corretamente." });
        return;
    }

    const existingUser = await findUserByEmail(email);

    if (pathname === "/api/register") {
        if (existingUser) {
            sendJson(response, 409, { ok: false, message: "Já existe uma conta com esse e-mail." });
            return;
        }

        let user;

        try {
            user = await createUser({
                id: crypto.randomUUID(),
                name,
                email,
                password
            });
        } catch (error) {
            if (error.code === "23505") {
                sendJson(response, 409, { ok: false, message: "Já existe uma conta com esse e-mail." });
                return;
            }

            throw error;
        }

        clearAuthAttempts(request);
        sendJson(response, 201, { ok: true, user: publicUser(user) });
        return;
    }

    if (pathname === "/api/login") {
        if (!existingUser) {
            sendJson(response, 404, { ok: false, message: "Não encontramos uma conta com esse e-mail. Crie uma conta para poder entrar." });
            return;
        }

        if (!(await authenticateUser(existingUser, password))) {
            sendJson(response, 401, { ok: false, message: "Senha incorreta. Tente novamente." });
            return;
        }

        if (name && existingUser.name !== name) {
            if (!validName) {
                sendJson(response, 400, { ok: false, message: "Informe um nome válido." });
                return;
            }

            Object.assign(existingUser, await updateUserName(existingUser.id, name));
        }

        clearAuthAttempts(request);
        sendJson(response, 200, { ok: true, user: publicUser(existingUser) });
        return;
    }

    sendJson(response, 404, { ok: false, message: "Rota não encontrada." });
}

function serveStatic(request, response, pathname) {
    const requestedPath = pathname === "/" ? "login.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(ROOT, requestedPath);

    if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
        response.writeHead(403);
        response.end("Acesso negado.");
        return;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (path.extname(filePath).toLowerCase() === ".html") {
                fs.readFile(path.join(ROOT, "login.html"), (fallbackError, fallbackContent) => {
                    if (fallbackError) {
                        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
                        response.end("Página não encontrada.");
                        return;
                    }

                    response.writeHead(200, {
                        ...securityHeaders,
                        "Content-Type": mimeTypes[".html"],
                        "Cache-Control": "no-store"
                    });
                    response.end(fallbackContent);
                });
                return;
            }

            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Página não encontrada.");
            return;
        }

        const extension = path.extname(filePath).toLowerCase();
        response.writeHead(200, {
            ...securityHeaders,
            "Content-Type": mimeTypes[extension] || "application/octet-stream",
            "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=3600"
        });
        response.end(content);
    });
}

const server = http.createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
        handleApi(request, response, url.pathname).catch((error) => {
            console.error("Erro na API:", error.message);
            sendJson(response, 500, { ok: false, message: "Erro interno no servidor." });
        });
        return;
    }

    serveStatic(request, response, decodeURIComponent(url.pathname));
});

initializeDatabase()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`ShapeHub rodando em http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Não foi possível iniciar o banco PostgreSQL:", error.message);
        process.exit(1);
    });
