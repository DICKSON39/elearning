import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const pool = new Pool({
  
  port: Number(process.env.DB_PORT),
  connectionString: process.env.DATABASE_URL, 
  keepAlive: true,
  
  ssl: {
    rejectUnauthorized: false, // allow self-signed certs if needed
  }
});


export default pool;
