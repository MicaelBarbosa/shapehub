const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const derivedKey = await scrypt(String(password), salt, 64);

    return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
    const parts = String(storedHash).split("$");

    if (parts.length !== 3 || parts[0] !== "scrypt") {
        return false;
    }

    const derivedKey = await scrypt(String(password), parts[1], 64);
    const expectedBuffer = Buffer.from(parts[2], "hex");

    return expectedBuffer.length === derivedKey.length && crypto.timingSafeEqual(expectedBuffer, derivedKey);
}

module.exports = {
    hashPassword,
    verifyPassword
};
