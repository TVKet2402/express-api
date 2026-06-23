const db = require("../config/db")

async function findUserByUsernameAndPassword(username, password) {
    const [users] = await db.query(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [username, password]
    );
    return users[0]||null
}
module.exports = {findUserByUsernameAndPassword}