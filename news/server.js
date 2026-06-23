const http = require("http");
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const querystring = require("querystring");
const db = require("./config/db");
const crypto = require("crypto");

const sessions = {};

// ĐỌC COOKIE
function parseCookies(req) {
    const cookieHeader = req.headers.cookie;
    const cookies = {};
    if (!cookieHeader) {
        return cookies;
    }
    cookieHeader.split(";").forEach(cookie => {
        const parts = cookie.split("=");
        const key = parts[0].trim();
        const value = parts[1];
        cookies[key] = value;
    });
    return cookies;
}

// LẤY USER ĐANG ĐĂNG NHẬP
function getCurrentUser(req) {
    const cookies = parseCookies(req);
    const sessionId = cookies.sessionId;
    if (!sessionId) {
        return null;
    }
    const session = sessions[sessionId];
    if (!session) {
        return null;
    }
    return session;
}

const server = http.createServer(async (req, res) => {
    // 1. XỬ LÝ CÁC ROUTE POST/GET THỰC HIỆN HÀNH ĐỘNG (KHÔNG CẦN RENDER TĨNH)
    
    // --- ĐĂNG XUẤT (GET) ---
    if (req.url === "/logout" && req.method === "GET") {     
        const cookies = parseCookies(req);     
        const sessionId = cookies.sessionId;      
        
        if (sessionId) {          
            delete sessions[sessionId]; // Xóa session trên server
        }      
        
        res.writeHead(302, {          
            "Set-Cookie": "sessionId=; Max-Age=0; Path=/", // Xóa cookie dưới trình duyệt
            Location: "/login"      
        });        
        res.end();     
        return; 
    }

    // --- REGISTER (POST) ---
    if (req.url === "/register" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk.toString(); });
        req.on("end", async () => {
            try {
                const formData = querystring.parse(body);
                const { fullname, username, password } = formData;

                if (!username || !password) {
                    const filePath = path.join(__dirname, "views", "register.ejs");
                    const template = fs.readFileSync(filePath, "utf8");
                    const html = ejs.render(template, { message: "Vui lòng nhập username và password" });
                    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                    return res.end(html);
                }

                const [users] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
                if (users.length > 0) {
                    const filePath = path.join(__dirname, "views", "register.ejs");
                    const template = fs.readFileSync(filePath, "utf8");
                    const html = ejs.render(template, { message: "Username đã tồn tại" });
                    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                    return res.end(html);
                }

                await db.query("INSERT INTO users(username, password, fullname) VALUES (?, ?, ?)", [username, password, fullname]);
                res.writeHead(302, { Location: "/login" });
                res.end();
            } catch (err) {
                res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
                res.end("Lỗi đăng ký");
            }
        });
        return;
    }

    // --- LOGIN (POST) ---
    if (req.url === "/login" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk.toString(); });
        req.on("end", async () => {
            try {
                const formData = querystring.parse(body);
                console.log("Dữ liệu nhận được từ form login:", formData);
                const username = formData.username;
                const password = formData.password;

                // 1. Kiểm tra tài khoản trong Database
                const [users] = await db.query(
                    "SELECT * FROM users WHERE username = ? AND password = ?", 
                    [username, password]
                );
                
                // 2. Nếu SAI Username hoặc Password
                if (users.length === 0) {
                    const filePath = path.join(__dirname, "views", "login.ejs");
                    // Sử dụng readFileSync trong luồng này để đảm bảo đồng bộ, không bị đá luồng ngoài
                    const template = fs.readFileSync(filePath, "utf8");
                    const html = ejs.render(template, { message: "Sai username hoặc password" });
                    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                    return res.end(html); 
                }

                // 3. Nếu ĐÚNG -> Tạo Session & Cookie cá nhân
                const user = users[0];
                const sessionId = crypto.randomBytes(16).toString("hex");
                sessions[sessionId] = {
                    userId: user.id,
                    username: user.username,
                    fullname: user.fullname
                };

                // 4. Thiết lập Cookie lưu ở trình duyệt và chuyển hướng sang /profile
                res.writeHead(302, {
                    "Set-Cookie": `sessionId=${sessionId}; HttpOnly; Path=/`,
                    "Location": "/profile"
                });
                return res.end(); // Kết thúc hoàn toàn tại đây
            } catch (err) {
                console.error(err);
                res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
                res.end("Lỗi hệ thống đăng nhập");
            }
        });
        return; // <--- CỰC KỲ QUAN TRỌNG: Dừng hẳn, không cho Node.js chạy xuống phần đọc file bên dưới!
    }

    // --- CREATE POST (POST) ---
    if (req.url === "/create" && req.method === "POST") {
        const user = getCurrentUser(req)
        if(!user){
            res.writeHead(302,{Location: "/login"})
            res.end()
            return
       }        
        let body = "";
        req.on("data", chunk => { body += chunk.toString(); });
        req.on("end", async () => {
            try {
                const formData = querystring.parse(body);
                await db.query("INSERT INTO posts(title, description) VALUES (?, ?)", [formData.title, formData.description]);
                res.writeHead(302, { Location: "/news" });
                res.end();
            } catch (error) {
                res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
                res.end("Lỗi thêm dữ liệu");
            }
        });
        return;
    }

    // --- EDIT POST (POST) ---
    if (req.url === "/edit" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk.toString(); });
        req.on("end", async () => {
            try {
                const formData = querystring.parse(body);
                await db.query("UPDATE posts SET title = ?, description = ? WHERE id = ?", [formData.title, formData.description, formData.id]);
                res.writeHead(302, { Location: "/news/" + formData.id });
                res.end();
            } catch (error) {
                res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
                res.end("Lỗi cập nhật dữ liệu");
            }
        });
        return;
    }

    // --- DELETE POST (GET) ---
    if (req.url.startsWith("/delete") && req.method === "GET") {
        try {
            const myURL = new URL(req.url, "http://localhost:3000");
            const id = myURL.searchParams.get("id");
            await db.query("DELETE FROM posts WHERE id = ?", [id]);
            res.writeHead(302, { Location: "/news" });
            res.end();
        } catch (error) {
            res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
            res.end("Lỗi xóa dữ liệu");
        }
        return;
    }

    // 2. XÁC ĐỊNH FILEPATH CHO CÁC ROUTE RENDER GIAO DIỆN (GET)
    let filePath = "";
    if (req.url === "/") {
        filePath = path.join(__dirname, "views", "home.html");
    } else if (req.url === "/about") {
        filePath = path.join(__dirname, "views", "about.html");
    } else if (req.url === "/contact") {
        filePath = path.join(__dirname, "views", "contact.html");
    } else if (req.url.startsWith("/login")) {
        filePath = path.join(__dirname, "views", "login.ejs");
    } else if (req.url.startsWith("/register")) {
        filePath = path.join(__dirname, "views", "register.ejs");
    } else if (req.url === "/create") {
        filePath = path.join(__dirname, "views", "create.ejs");
    } else if (req.url.startsWith("/edit")) {
        filePath = path.join(__dirname, "views", "edit.ejs");
    } else if (req.url.startsWith("/search")) {
        filePath = path.join(__dirname, "views", "search.ejs");
    } else if (req.url.startsWith("/news")) {
        filePath = path.join(__dirname, "views", "news.ejs");
    } else if (req.url === "/profile") {     
        filePath = path.join(__dirname, "views", "profile.ejs"); // <-- Đã thêm ở đây
    } else {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>404 - Không tìm thấy trang</h1>");
        return;
    }

    // Tiến hành đọc file template và render giao diện
    fs.readFile(filePath, "utf8", async (err, template) => {
        if (err) {
            res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
            res.end("Lỗi server khi đọc file");
            return;
        }

        try {
            // GET /profile <-- Đã xử lý ở đây
            if (req.url === "/profile" && req.method === "GET") {     
                const user = getCurrentUser(req); 
                
                if (!user) {         
                    res.writeHead(302, { Location: "/login" });  
                    res.end();         
                    return; 
                }  
                // Đổi biến data thành template cho đúng cấu trúc hàm fs.readFile
                const html = ejs.render(template, { user: user });  
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });  
                res.end(html);     
                return; 
            }

            // GET /create
            if (req.url === "/create") {
                const user = getCurrentUser(req)
                if(!user){
                    res.writeHead(302,{Location: "/login"})
                    res.end()
                    return
                }
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                return res.end(html);
            }

            // GET /edit?id=...
            if (req.url.startsWith("/edit")) {
                const user = getCurrentUser(req)
                if(!user){
                    res.writeHead(302,{Location: "/login"})
                    res.end()
                    return
                }                
                const myURL = new URL(req.url, "http://localhost:3000");
                const id = myURL.searchParams.get("id");
                const [rows] = await db.query("SELECT * FROM posts WHERE id = ?", [id]);
                const post = rows.length > 0 ? rows[0] : null;
                const html = ejs.render(template, { post: post });
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                return res.end(html);
            }

            // GET /search?keyword=...
            if (req.url.startsWith("/search")) {
                const myURL = new URL(req.url, "http://localhost:3000");
                const keyword = myURL.searchParams.get("keyword") || "";
                const [newsList] = await db.query("SELECT * FROM posts WHERE title LIKE ? OR description LIKE ?", [`%${keyword}%`, `%${keyword}%`]);
                const html = ejs.render(template, { keyword: keyword, newsList: newsList });
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                return res.end(html);
            }

            // GET /news hoặc GET /news/:id
            if (req.url.startsWith("/news")) {
                const partPath = req.url.split("/");
                const id = partPath[2];
                let newsList = [];
                // LẤY THÔNG TIN USER ĐANG ĐĂNG NHẬP (ĐÃ THÊM)
                const user = getCurrentUser(req); 
                if (id) {
                    const [rows] = await db.query("SELECT * FROM posts WHERE id = ?", [id]);
                    if (rows.length === 0) {
                        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
                        return res.end("Không tìm thấy tin tức");
                    }
                    newsList = rows;
                } else {
                    const [rows] = await db.query("SELECT * FROM posts ORDER BY id DESC LIMIT 10");
                    newsList = rows;
                }
                // CHUYỀN THÊM BIẾN USER VÀO TEMPLATE (ĐÃ SỬA BIẾN THÀNH template VÀ html CHO ĐÚNG CODE CỦA BẠN)
                const html = ejs.render(template, { id: id || "", newsList: newsList, user: user });
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                return res.end(html);
            }

            // GET /register
            if (req.url.startsWith("/register")) {
                const html = ejs.render(template, { message: "Vui lòng nhập đầy đủ thông tin để tạo tài khoản" });
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                return res.end(html);
            }

            // GET /login
            if (req.url.startsWith("/login")) {
                const html = ejs.render(template, { message: "Vui lòng nhập username và password để đăng nhập" });
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                return res.end(html);
            }

            // CÁC TRANG TĨNH KHÁC (HOME, ABOUT, CONTACT)
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(template);

        } catch (error) {
            console.error(error);
            res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
            res.end("Lỗi hệ thống render");
        }
    });
});

server.listen(3000, () => {
    console.log("Server is running at http://localhost:3000");
});