const userModel = require("../models/userModel");

function showLogin(req, res) {
    res.render("auth/login", { error: null });
}
async function login(req, res) {
    try {
        const username = req.body.username;
        const password = req.body.password;
        const user = await userModel.findUserByUsernameAndPassword(username, password);
        if (!user) {
            return res.render("auth/login", { 
                error: "Sai username hoặc password" 
            });
        }
        req.session.user = {
            id: user.id,
            username: user.username,
            fullname: user.fullname
        };
        res.redirect("/news");
    } catch (error) {
        console.error("Lỗi khi đăng nhập:", error);
        res.send("Lỗi hệ thống khi xử lý đăng nhập");
    }
}
function logout(req, res) {
    req.session.destroy(() => {
        // Xóa session xong thì đẩy về trang chủ
        res.redirect("/");
    });
}

module.exports = {showLogin, login, logout};