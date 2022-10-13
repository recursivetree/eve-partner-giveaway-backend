import {writeFile, readFile, copyFile} from "fs/promises"
import log from "loglevel"
import * as path from "path";
import dateFormat from "dateformat";

export default (path, saveInterval)=>{
    return new Storage(path,saveInterval)
}

class Storage {
    constructor(path, saveInterval) {
        this.path = path
        this.data = {}
        this.dirty = false

        log.debug("data save interval: ", saveInterval)
        log.debug("data path: ", path)

        this.#load_from_disk().then(()=>{
            setInterval(()=>this.#save_to_disk(),saveInterval) // save once a minute
        })
    }

    writeData(cb){
        const modified = cb(this.data)
        this.dirty = true
    }

    readData(cb){
        return cb(this.data)
    }

    async backup(){
        await this.#save_to_disk()

        const backupPath = path.parse(this.path)
        backupPath.base = undefined
        backupPath.name = `${backupPath.name}_${dateFormat(Date.now(),"dd-mm-yyyy_HH-MM")}`

        const out = path.format(backupPath)

        await copyFile(this.path, out)
        log.debug("backed up data as "+out)
    }

    async #save_to_disk(){
        if (this.dirty){
            try {
                await writeFile(this.path, JSON.stringify(this.data))
                this.dirty = false
                log.debug(`saved db to disk`)
            } catch (e) {
                log.error("Failed to save data",e)
            }
        }
    }

    async #load_from_disk(){
        try {
            this.data = JSON.parse(await readFile(this.path))
            log.debug(`loaded db disk`)
        } catch (e) {
            log.error("Could not read existing db, starting with a new and empty file")
        }
    }
}