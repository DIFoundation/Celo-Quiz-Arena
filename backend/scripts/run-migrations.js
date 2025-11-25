import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import db from "../src/db.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Run all SQL migration files in order
 */
async function runMigrations() {
  try {
    const migrationsDir = __dirname
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort()

    console.log(`Found ${files.length} migration file(s)`)

    for (const file of files) {
      const filePath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(filePath, "utf8")

      console.log(`\n▶ Running migration: ${file}`)
      await db.query(sql)
      console.log(`✓ Completed: ${file}`)
    }

    console.log("\n✓ All migrations completed successfully!")
    process.exit(0)
  } catch (err) {
    console.error("✗ Migration failed:", err.message)
    process.exit(1)
  }
}

runMigrations()
