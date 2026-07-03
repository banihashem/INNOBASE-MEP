import pg from 'pg';
import fs from 'fs';

const connectionString = "postgres://mep_app:TaVlvwnl7OlZjStLUV2e1LwiOq3i0yTUr0JIZ9aE@35.189.72.143:5432/mep_production";

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    await client.connect();
    const sql = fs.readFileSync('backend/migrations/003_assessment_state_persistence.sql', 'utf8');
    await client.query(sql);
    console.log("Migration 003 applied successfully!");
    
    // Check if it was applied
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='assessment_sessions' AND column_name='state_snapshot'");
    console.log("Columns matching 'state_snapshot':", res.rows);
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

runMigration();
