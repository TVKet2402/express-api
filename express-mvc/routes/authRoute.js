const express = require("express")
const router = express.Router()
const authcontrollers = require("../controllers/authcontroller")

router.get("/login", authcontrollers.showLogin); 
router.post("/login", authcontrollers.login);
router.get("/logout", authcontrollers.logout); 

module.exports = router;