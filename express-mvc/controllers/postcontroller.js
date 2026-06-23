const postModel = require("../models/postModel");

async function index(req, res) {
    try {
        const posts = await postModel.getAllPosts();
        res.render("posts/index", { posts });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách bài viết:", error);
        res.status(500).send("Lỗi khi lấy danh sách bài viết");
    }
}

async function show(req, res) {
    try {
        const id = req.params.id;
        const post = await postModel.getPostById(id);
        if (!post) {
            return res.status(404).send("Không tìm thấy bài viết");
        }
        res.render("posts/show", { post });
    } catch (error) {
        console.error("Lỗi Database:", error);
        res.status(500).send("Lỗi khi xem chi tiết bài viết");
    }
}

async function search(req, res) {
    try {
        const keyword = req.query.keyword || "";
        const posts = await postModel.searchPost(keyword);
        res.render("posts/index", { posts });
    } catch (error) {
        console.error("Lỗi Database khi tìm kiếm:", error);
        res.status(500).send("Lỗi khi tìm kiếm bài viết");
    }
}

function create(req, res) {
    res.render("posts/create");
}

async function store(req, res) {
    try {
        // Rút gọn cách lấy dữ liệu từ form
        const { title, description } = req.body; 
        
        await postModel.createPost(title, description);
        res.redirect("/news");
    } catch (error) {
        console.error("Lỗi Database khi thêm bài viết:", error);
        res.status(500).send("Lỗi khi thêm bài viết");
    }
}

async function edit(req, res) {
    try {
        const id = req.params.id;
        const post = await postModel.getPostById(id);
        
        if (!post) {
            return res.status(404).send("Không tìm thấy bài viết");
        }
        
        res.render("posts/edit", { post });
    } catch (error) {
        console.error("Lỗi mở form sửa:", error);
        res.status(500).send("Lỗi khi mở form sửa");
    }
}

async function update(req, res) {
    try {
        const id = req.params.id;
        const { title, description } = req.body;
        
        await postModel.updatePost(id, title, description);
        res.redirect("/news");
    } catch (error) {
        console.error("Lỗi Database khi cập nhật bài viết:", error);
        res.status(500).send("Lỗi khi cập nhật bài viết");
    }
}

async function destroy(req, res) {
    try {
        const id = req.params.id;
        await postModel.deletePost(id);
        res.redirect("/news");
    } catch (error) {
        console.error("Lỗi Database khi xóa bài viết:", error);
        res.status(500).send("Lỗi khi xóa bài viết");
    }
}

// Xuất các hàm ra để Route sử dụng
module.exports = { index, show, search, create, store, edit, update, destroy};