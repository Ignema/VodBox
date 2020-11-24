

require('dotenv').config()

const jwt = require('jsonwebtoken')

// Never do this!
let users = {
    admin: {password: process.env.ADMIN_PWD},
    user: {password: process.env.USER_PWD}
}

exports.login = function(req, res){

    let username = req.body.username
    let password = req.body.password
    
    // Neither do this!
    if (!username || !password || !users[username] || users[username].password !== password){
        return res.status(401).redirect("/");
    }

    //use the payload to store information about the user such as username, user role, etc.
    let payload = {username: username}

    //create the access token with the shorter lifespan
    let accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        algorithm: "HS256",
        expiresIn: process.env.ACCESS_TOKEN_LIFE
    })

    //create the refresh token with the longer lifespan
    let refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
        algorithm: "HS256",
        expiresIn: process.env.REFRESH_TOKEN_LIFE
    })

    //store the refresh token in the user array
    users[username].refreshToken = refreshToken

    //send the access token to the client inside a cookie
    res.cookie("jwt", accessToken, {secure: true, httpOnly: true})
    res.redirect("/panel")
}

exports.refresh = function (req, res){

    let accessToken = req.cookies.jwt

    if (!accessToken){
        return res.status(403).send()
    }

    let payload
    try{
        payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)
    }
    catch(e){
        return res.status(401).send()
    }

    // retrieve the refresh token from the users array
    let refreshToken = users[payload.username].refreshToken

    //verify the refresh token
    try{
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
    }
    catch(e){
        return res.status(401).send()
    }

    let newToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, 
    {
        algorithm: "HS256",
        expiresIn: process.env.ACCESS_TOKEN_LIFE
    })

    res.cookie("jwt", newToken, {secure: true, httpOnly: true})
    res.send()
}

exports.verify = function(req, res, next){
    let accessToken = req.cookies.jwt

    //if there is no token stored in cookies, the request is unauthorized
    if (!accessToken){
        return res.status(403).send()
    }
    
    let payload
    try{
        //use the jwt.verify method to verify the access token
        //throws an error if the token has expired or has a invalid signature
        payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)
        next()
    }
    catch(e){
        //if an error occured return request unauthorized error
        return res.status(401).send()
    }
    // next();
}

// TODO make skip function work to skip admin login if user is already connected

exports.skip = function(req, res, next){
    let accessToken = req.cookies.jwt
    console.log("We entered skip middleware")
    //if there is no token stored in cookies, the request is unauthorized
    if (!accessToken){
        console.log("no access token buddy")
        next();
    }
    
    let payload
    try{
        //use the jwt.verify method to verify the access token
        //throws an error if the token has expired or has a invalid signature
        console.log("verifying the token")
        payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)
        console.log("redirecting...")
        res.redirect("/panel")
    }
    catch(e){
        //if an error occured return request unauthorized error
        console.log("Bad token my friend")
        next();
    }
}