const express = require("express");
const path = require("path");
const db = require("./config/db"); 
const session = require("express-session"); 

const app = express();
const port = 3000;

// ==========================================
// 1. KHU VỰC CẤU HÌNH & MIDDLEWARE TOÀN CỤC
// ==========================================
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); 

app.use(session({  
    secret: "mysecretkey",  
    resave: false,
    saveUninitialized: false  
}));

// Truyền biến user ra mọi giao diện
app.use((req, res, next) => { 
    res.locals.user = req.session.user || null;   
    next(); 
});

app.set("view engine", "ejs"); 
app.set("views", path.join(__dirname, "views")); 

// Ghi log đường dẫn
function logger(req, res, next) {   
    console.log(req.method, req.url);   
    next(); 
}  
app.use(logger); 

// Trạm kiểm soát bảo mật
function requireLogin(req, res, next) {   
    if (!req.session.user) {     
        return res.redirect("/login"); 
    }   
    next(); 
} 

// ==========================================
// 2. NHÓM ROUTE CÔNG KHAI (Ai cũng xem được)
// ==========================================
app.get("/", (req, res) => {   
    res.render("home"); 
}); 

// Tìm kiếm tin tức (Đã gỡ bỏ requireLogin để khách lạ có thể tìm kiếm)
app.get("/news/search", async (req, res) => {
    try {
        const keyword = req.query.keyword || "";
        const [posts] = await db.query( 
            "SELECT * FROM posts WHERE title LIKE ? OR description LIKE ? ORDER BY id DESC", 
            [`%${keyword}%`, `%${keyword}%`] 
        );
        res.render("news-list", { posts: posts });
    } catch (error) {
        console.error("Lỗi Database khi tìm kiếm:", error); 
        res.status(500).send("Lỗi khi tìm kiếm bài viết");
    } 
});

// Danh sách tin tức
app.get("/news", async (req, res) => {
    try {
        const [posts] = await db.query("SELECT * FROM posts ORDER BY id DESC");
        res.render("news-list", { posts: posts });
    } catch (error) {
        console.error("Lỗi Database khi lấy danh sách:", error);
        res.status(500).send("Lỗi khi lấy danh sách bài viết");
    }
});

// Đăng nhập / Đăng xuất
app.get("/login", (req, res) => {   
    res.render("login", { error: null }); 
}); 

app.post("/login", async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        const [users] = await db.query(
            "SELECT * FROM users WHERE username = ? AND password = ?",
            [username, password]
        );
        if (users.length === 0) {
            return res.render("login", { error: "Sai username hoặc password" });
        }
        req.session.user = { username: username };
        return res.redirect("/news");
    } catch (error) {
        console.error("Lỗi Database khi đăng nhập:", error);
        res.status(500).send("Lỗi khi xử lý đăng nhập");
    }
});

app.get("/logout", (req, res) => {   
    req.session.destroy(() => {     
        res.redirect("/"); 
    }); 
}); 

// ==========================================
// 3. NHÓM ROUTE BẢO MẬT ADMIN (Bắt buộc đăng nhập)
// ==========================================

// THÊM BÀI (Đã bổ sung requireLogin và gom chung GET/POST)
app.get("/news/add", requireLogin, (req, res) => {
    res.render("add-post"); 
});

app.post("/news/add", requireLogin, async (req, res) => {
    try {
        const title = req.body.title; 
        const description = req.body.description;
        await db.query( 
            "INSERT INTO posts(title, description) VALUES (?, ?)", 
            [title, description]
        );
        res.redirect("/news");  
    } catch (error) {
        console.error("Lỗi Database khi thêm bài viết:", error); 
        res.status(500).send("Lỗi khi thêm bài viết");
    } 
});

// SỬA BÀI
app.get("/news/:id/edit", requireLogin, async (req, res) => {
    try { 
        const id = req.params.id;
        const [rows] = await db.query("SELECT * FROM posts WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).send("Không tìm thấy bài viết");
        }
        res.render("edit-post", { post: rows[0] }); 
    } catch (error) {
        console.error("Lỗi mở form sửa:", error); 
        res.status(500).send("Lỗi khi mở form sửa");
    }
});

app.post("/news/:id/edit", requireLogin, async (req, res) => {
    try { 
        const id = req.params.id;
        const title = req.body.title; 
        const description = req.body.description;
        await db.query( 
            "UPDATE posts SET title = ?, description = ? WHERE id = ?", 
            [title, description, id] 
        );
        res.redirect("/news");
    } catch (error) {
        console.error("Lỗi Database khi cập nhật bài viết:", error); 
        res.status(500).send("Lỗi khi cập nhật bài viết");
    }
});

// XÓA BÀI
app.post("/news/:id/delete", requireLogin, async (req, res) => {
    try { 
        const id = req.params.id;
        await db.query("DELETE FROM posts WHERE id = ?", [id]);    
        res.redirect("/news");   
    } catch (error) {
        console.error("Lỗi Database khi xóa bài viết:", error); 
        res.status(500).send("Lỗi khi xóa bài viết"); 
    } 
});

// ==========================================
// 4. ROUTE ĐỘNG BỊ BẮT LỖI CUỐI CÙNG
// ==========================================
// Chi tiết bài viết (Phải đặt tuốt dưới cùng để không tranh giành /news/add)
app.get("/news/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const [rows] = await db.query("SELECT * FROM posts WHERE id = ?", [id]);
        if (rows.length === 0) { 
            return res.status(404).send("Không tìm thấy bài viết"); 
        }
        res.render("news-detail", { post: rows[0] }); 
    } catch (error) {
        console.error("Lỗi Database:", error);
        res.status(500).send("Lỗi khi xem chi tiết bài viết");
    }
});

// Chạy Server
app.listen(port, () => { 
    console.log(`Server is running at http://localhost:${port}`); 
});