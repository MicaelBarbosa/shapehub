const fs = require("fs/promises");
const path = require("path");
const { hashPassword, verifyPassword } = require("./password");

const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const emptyDatabase = { users: [] };
let writeQueue = Promise.resolve();

async function initializeDatabase() {
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
        await fs.access(DB_PATH);
    } catch (error) {
        await saveDatabase(emptyDatabase);
    }
}

async function readDatabase() {
    await initializeDatabase();

    const content = await fs.readFile(DB_PATH, "utf8");
    const database = JSON.parse(content || "{}");

    if (!Array.isArray(database.users)) {
        return { users: [] };
    }

    return database;
}

async function saveDatabase(database) {
    writeQueue = writeQueue.then(() => fs.writeFile(DB_PATH, JSON.stringify(database, null, 2)));
    return writeQueue;
}

async function checkDatabase() {
    await readDatabase();
}

async function findUserByEmail(email) {
    const database = await readDatabase();

    return database.users.find((user) => user.email === email) || null;
}

async function createUser({ id, name, email, password }) {
    const database = await readDatabase();

    if (database.users.some((user) => user.email === email)) {
        const error = new Error("E-mail já cadastrado.");
        error.code = "USER_EXISTS";
        throw error;
    }

    const user = {
        id,
        name,
        email,
        password_hash: await hashPassword(password),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    database.users.push(user);
    await saveDatabase(database);

    return user;
}

async function authenticateUser(user, password) {
    return verifyPassword(password, user.password_hash);
}

async function updateUserName(id, name) {
    const database = await readDatabase();
    const user = database.users.find((currentUser) => currentUser.id === id);

    if (!user) {
        return null;
    }

    user.name = name;
    user.updated_at = new Date().toISOString();
    await saveDatabase(database);

    return user;
}

module.exports = {
    authenticateUser,
    checkDatabase,
    createUser,
    findUserByEmail,
    initializeDatabase,
    updateUserName
};
