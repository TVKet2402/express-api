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
async function show(req, res) {   
    try { 
        const id = req.params.id 
        const post = await postModel.getPostById(id) 
        if (!post) { 
            return res.status(404).json({         
                success: false, 
                message: "Không tìm thấy bài viết" 
            }) 
        }      
        res.json({       
            success: true,       
            data: post     
        }) 
    } catch (error) {     
        console.log(error) 
        res.status(500).json({       
            success: false, 
            message: "Lỗi khi lấy chi tiết bài viết" 
        }) 
    } 
}

module.exports = { index, show }