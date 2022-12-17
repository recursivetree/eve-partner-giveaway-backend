import express from "express"
import log from "loglevel"
import rateLimit from "express-rate-limit";
import storage from "./storage.js";

log.setDefaultLevel("DEBUG")

const app = express()
app.set('view engine', 'pug')
app.set('views', 'src/views');
app.use(express.json())
app.use(express.urlencoded())

const db = await storage(process.env.STORAGEFILE || "storage_db.json", process.env.SAVEINTERVAL || 60*1000)
const AUTH_TOKEN = process.env.AUTHTOKEN || "mal's sexy voice"

db.writeData((db)=>{
    if (!db.entries) {
        db.entries = []
    }

    if(db.reset_cycle===undefined){
        db.reset_cycle = 0
    }
})

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
    const reset_cycle = db.readData(data=>data.reset_cycle)
    res.json({
        "status":"ok",
        "reset_cycle":reset_cycle
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

    if (character_id > Number.MAX_SAFE_INTEGER){
        res.status(500)
        return
    }

    const already_entered = db.readData((data)=>{
        return data.entries.includes(character_id)
    })

    if (already_entered){
        res.status(400)
            .json({
                success: false,
                message: "you already entered with this character"
            })
        return
    }

    db.writeData((data)=>{
        data.entries.push(character_id)
    })

    log.debug(`added character ${character_id}`)

    res.json({
        success: true,
        message: "successfully added character!"
    })
})

const admin = express.Router()
admin.use(adminRateLimit)

admin.get("/",(req,res)=>{
    const reset_cycle = db.readData(data=>data.reset_cycle)
    res.render('panel', {reset_cycle})
})
admin.post("/",async (req, res) => {
    let reset_cycle = db.readData(data=>{
        return db.reset_cycle
    })

    const auth_token = req.body.auth_token
    if (auth_token !== AUTH_TOKEN) {
        res.render('panel', {
            auth_token,
            error: "Invalid authentication token",
            reset_cycle,
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
                error: "You need to provide a number of winners",
                reset_cycle
            })
            return
        }

        try {
            draft_count = parseInt(draft_count)
        } catch (e) {
            res.render('panel', {
                auth_token,
                error: "You need to provide a valid number of winners",
                reset_cycle
            })
            return
        }

        participants = db.readData((data)=>data.entries)
            .map(value => ({value, sort: Math.random()}))
            .sort((a, b) => a.sort - b.sort)
            .map(({value}) => value)
            .slice(0, draft_count)
    }

    if (req.body.reset || req.body.reset === '') {
        await db.backup()
        db.writeData(data=>{
            data.reset_cycle++
            data.entries = []
        })
        log.debug("cleared participants")
    }

    reset_cycle = db.readData(data=>data.reset_cycle)

    res.render('panel', {
        auth_token,
        draft_count,
        participants,
        reset_cycle
    })
})

app.use("/admin",admin)

app.listen(process.env.PORT || 80,()=>{
    log.info("server is running")
})