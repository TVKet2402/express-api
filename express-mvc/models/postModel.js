const db = require("../config/db") 

async function getAllPosts() { 
    const [posts] = await db.query("SELECT * FROM posts ORDER BY id DESC") 
    return posts
} 
async function getPostById(id){
    const [rows] = await db.query("SELECT * FROM posts WHERE id = ?",[id])   
    return rows[0] || null
}
async function searchPost(keyword){
    const [rows] = await db.query(
        "SELECT * FROM posts WHERE title LIKE ? OR description LIKE ? ORDER BY id DESC", 
        [`%${keyword}%`, `%${keyword}%`]
    );
    return rows;
}
async function createPost(title, description){
    await db.query( 
        "INSERT INTO posts(title, description) VALUES (?, ?)", 
        [title, description]
    );
}
async function updatePost( id, title, description) {
    await db.query( 
        "UPDATE posts SET title = ?, description = ? WHERE id = ?", 
        [title, description, id] 
    );
}
async function deletePost(id) {
    await db.query("DELETE FROM posts WHERE id = ?", [id]);  
}
module.exports = {   getAllPosts, getPostById, searchPost, createPost, updatePost, deletePost} 