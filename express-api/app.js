const express = require("express");
const path = require("path");
const session = require("express-session");

// Import Middleware và Route
const { requireLogin, usesession } = require("./middlewares/authMiddlewares");
const postRoute = require("./routes/postRoute");
const authRoute = require("./routes/authRoute")
const postApiRoutes = require("./routes/api/postApiRoute") 

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); 
app.use(session({  
    secret: "mysecretkey",  
    resave: false,
    saveUninitialized: false  
}));

app.use(usesession); 

app.set("view engine", "ejs"); 
app.set("views", path.join(__dirname, "views")); 

app.use("/api/posts", postApiRoutes) 
// ==========================================
// ĐIỀU HƯỚNG ROUTE
// ==========================================
app.get("/", (req, res) => {   
    res.render("home"); 
}); 

app.use("/news", postRoute);

app.use("/", authRoute)

app.listen(port, () => { 
    console.log(`Server is running at http://localhost:${port}`); 
});