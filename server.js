import express from "express"
import log from "loglevel"
import storage from "./storage.js";

log.setDefaultLevel("DEBUG")

const app = express()
app.use(express.json())

const db = storage("storage.json")

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

app.listen(8000,()=>{
    log.info("server is running")
})