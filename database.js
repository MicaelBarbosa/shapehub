const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { hashPassword, verifyPassword } = require("./password");
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL não foi configurada.");
}

const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
});

pool.on("error", (error) => {
    console.error("Erro inesperado no pool PostgreSQL:", error.message);
});

async function initializeDatabase() {
    const migration = fs.readFileSync(path.join(__dirname, "migrations", "001_create_users.sql"), "utf8");

    await pool.query(migration);
}

async function checkDatabase() {
    await pool.query("SELECT 1");
}

async function findUserByEmail(email) {
    const result = await pool.query(
        `SELECT id, name, email, password_hash, created_at
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [email]
    );

    return result.rows[0] || null;
}

async function createUser({ id, name, email, password }) {
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
        `INSERT INTO users (id, name, email, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, created_at`,
        [id, name, email, passwordHash]
    );

    return result.rows[0];
}

async function authenticateUser(user, password) {
    return verifyPassword(password, user.password_hash);
}

async function updateUserName(id, name) {
    const result = await pool.query(
        `UPDATE users
         SET name = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, name, email`,
        [name, id]
    );

    return result.rows[0];
}

module.exports = {
    authenticateUser,
    checkDatabase,
    createUser,
    findUserByEmail,
    initializeDatabase,
    updateUserName
};
