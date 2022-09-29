import express from "express"
import log from "loglevel"
import rateLimit from "express-rate-limit";
import storage from "./storage.js";
import * as path from "path";

log.setDefaultLevel("DEBUG")

const app = express()
app.set('view engine', 'pug')
app.set('views', 'src/views');
app.use(express.json())
app.use(express.urlencoded())

const db = storage(process.env.STORAGEFILE || "storage.json", process.env.SAVEINTERVAL || 60*1000)
const AUTH_TOKEN = process.env.AUTHTOKEN || "mal's sexy voice"

const apiRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // max 100 requests
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,
})

const adminRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 25, // max 100 requests
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,
})

app.get("/status",(req,res)=>{
    res.json({
        "status":"ok"
    })
})

app.use("/enter", apiRateLimit)
app.post("/enter",(req,res)=>{
    const eve_character = req.body["character_id"]

    if (!eve_character){
        res.status(400)
            .json({
                success: false,
                message: "no character included"
            })
        return
    }

    if(!/^\d+$/.test(eve_character)){
        res.status(400)
            .json({
                success: false,
                message: "invalid character id"
            })
        return
    }

    let character_id = parseInt(eve_character)

    if (db.contains(character_id)){
        res.status(400)
            .json({
                success: false,
                message: "you already entered with this character"
            })
        return
    }

    db.save(character_id)

    log.debug(`added character ${character_id}`)

    res.json({
        success: true,
        message: "successfully added character!"
    })
})

const admin = express.Router()
admin.use(adminRateLimit)

admin.get("/",(req,res)=>{
    res.render('panel', {})
})
admin.post("/",async (req, res) => {
    const auth_token = req.body.auth_token
    if (auth_token !== AUTH_TOKEN) {
        res.render('panel', {
            auth_token,
            error: "Invalid authentication token"
        })
        return
    }

    let participants = null
    let draft_count = null
    if (req.body.draft || req.body.draft === '') {
        draft_count = req.body.participants
        if (!draft_count) {
            res.render('panel', {
                auth_token,
                error: "You need to provide a number of winners"
            })
            return
        }

        try {
            draft_count = parseInt(draft_count)
        } catch (e) {
            res.render('panel', {
                auth_token,
                error: "You need to provide a valid number of winners"
            })
            return
        }

        participants = db.getData()
            .map(value => ({value, sort: Math.random()}))
            .sort((a, b) => a.sort - b.sort)
            .map(({value}) => value)
            .slice(0, draft_count)
    }

    if (req.body.reset || req.body.reset === '') {
        await db.backup()
        db.clear()
        log.debug("cleared participants")
    }

    res.render('panel', {
        auth_token,
        draft_count,
        participants
    })
})

app.use("/admin",admin)

app.listen(process.env.PORT || 80,()=>{
    log.info("server is running")
})