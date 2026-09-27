import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const isDbConfigured = Boolean(
  process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ""
)

let poolInstance: any
let dbInstance: NodePgDatabase<typeof schema>

if (isDbConfigured) {
  try {
    const dbUrl = process.env.DATABASE_URL!
    const isLocalhost = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")
    poolInstance = new Pool({
      connectionString: dbUrl,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
    dbInstance = drizzle(poolInstance, { schema })
  } catch (err) {
    console.warn("[db] Failed to initialize Pool, using mock:", err)
  }
}

if (!poolInstance) {
  // Pure JavaScript in-memory mock pool that never crashes and never hangs
  poolInstance = {
    async query(queryConfig: any, values?: any[]) {
      return {
        rows: [],
        rowCount: 0,
        fields: [],
      }
    },
    async connect() {
      return {
        query: async (queryConfig: any, values?: any[]) => ({
          rows: [],
          rowCount: 0,
          fields: [],
        }),
        release: () => {},
      }
    },
    on() {
      return poolInstance
    },
    async end() {},
  }
  dbInstance = drizzle(poolInstance, { schema })
}

export const pool = poolInstance
export const db = dbInstance
