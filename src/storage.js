import {writeFile, readFile} from "fs/promises"
import log from "loglevel"

export default (path)=>{
    return new Storage(path)
}

class Storage {
    constructor(path) {
        this.path = path
        this.data = []
        this.dirty = false

        this.#load_from_disk().then(()=>{
            setInterval(()=>this.#save_to_disk(),10*1000) // save once a minute
        })
    }

    save(data){
        this.data.push(data)
        this.dirty = true
    }

    contains(data){
        return this.data.includes(data)
    }

    async #save_to_disk(){
        if (this.dirty){
            try {
                await writeFile(this.path, JSON.stringify(this.data))
                this.dirty = false
                log.debug(`saved ${this.data.length} entries to disk`)
            } catch (e) {
                log.error("Failed to save data",e)
            }
        }
    }

    async #load_from_disk(){
        try {
            this.data  = JSON.parse(await readFile(this.path))
            log.debug(`loaded ${this.data.length} entries to disk`)
        } catch (e) {
            log.error("Could not read existing storage entries, starting with a new and empty file")
        }
    }
}