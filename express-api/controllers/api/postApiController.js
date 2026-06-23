const postModel = require("../../models/postModel")

async function index(req, res) {
    try{
       const posts = await postModel.getAllPosts()
        res.json({
            success: true,
            data: posts
        }) 
    } catch{
        console.log(error)
        res.json({
            success: false,
            message: "Lỗi khi lấy danh sách bài viết"
        })
    }
}
module.exports = { index }