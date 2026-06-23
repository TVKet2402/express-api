const express = require("express") 
const router = express.Router() 
const postApiController = require("../../controllers/api/postApiController") 
router.get("/", postApiController.index) 
router.get("/:id", postApiController.show) 
module.exports = router 
