const express = require("express") 
const router = express.Router() 
const postController = require("../controllers/postcontroller") 
const { requireLogin, usesession} = require("../middlewares/authMiddlewares") 
 
router.get("/", postController.index) 
router.get("/search", postController.search) 
router.get("/add", requireLogin, postController.create) 
router.post("/add", requireLogin, postController.store) 
router.get("/:id", postController.show) 
router.get("/:id/edit", requireLogin, postController.edit) 
router.post("/:id/edit", requireLogin, postController.update) 
router.post("/:id/delete", requireLogin, postController.destroy) 
 
module.exports = router 
