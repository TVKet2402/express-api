function requireLogin(req, res, next) {   
    if (!req.session.user) {     
        return res.redirect("/login") 
    } 
    next() 
} 
function usesession(req, res, next) {   
    res.locals.user = req.session.user || null   
    next() 
} 
module.exports = {requireLogin, usesession} 
