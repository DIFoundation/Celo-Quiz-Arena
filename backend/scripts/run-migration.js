import "dotenv/config"
import { pool } from "../src/db.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function runMigration() {
  const client = await pool.connect()

  try {
    console.log("📦 Starting database migration...\n")

    // Read and execute the SQL migration file
    const sqlPath = path.join(__dirname, "002_create_questions_table.sql")
    const sql = fs.readFileSync(sqlPath, "utf-8")

    console.log("🔨 Creating questions table...")
    await client.query(sql)
    console.log("✅ Questions table created successfully!\n")

    // Verify the table was created
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'questions'
      );
    `)

    if (result.rows[0].exists) {
      console.log("✓ Verification: questions table exists in database")

      // Show table structure
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'questions'
        ORDER BY ordinal_position;
      `)

      console.log("\n📋 Table structure:")
      columns.rows.forEach((col) => {
        console.log(
          `  - ${col.column_name}: ${col.data_type} ${col.is_nullable === "NO" ? "(NOT NULL)" : "(nullable)"}`,
        )
      })

      console.log("\n✨ Migration completed successfully!")
    } else {
      throw new Error("Table verification failed")
    }
  } catch (error) {
    console.error("❌ Migration failed:", error.message)
    console.error(error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
