import dotenv from 'dotenv'
import {Pool} from 'pg'

dotenv.config()

const pool = new Pool({
    host: process.env.DB_HOST,
    port:Number(process.env.DB_PORT) ,
    user: process.env.DB_USER,
    password:process.env.DB_PASSWORD ,
    database: process.env.DB_NAME,
    ssl: false,

})

// console.log(process.env.DB_USER)
// console.log(process.env.DB_PASSWORD)
// console.log(process.env.DB_PORT)
// console.log(process.env.DB_HOST)






export default pool



