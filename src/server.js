import express from "express"
import log from "loglevel"
import rateLimit from "express-rate-limit";
import storage from "./storage.js";

log.setDefaultLevel("DEBUG")

const app = express()
app.use(express.json())

const db = storage(process.env.STORAGEFILE || "storage.json", process.env.SAVEINTERVAL || 60*1000)

const apiRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,
})

app.get("/status",(req,res)=>{
    res.json({
        "status":"ok"
    })
})

app.use("/enter",apiRateLimit)
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

app.listen(process.env.PORT || 80,()=>{
    log.info("server is running")
})