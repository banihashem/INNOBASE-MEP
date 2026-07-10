import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new pg.Client({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: 'mep_staging',
  host: process.env.CLOUD_SQL_SOCKET || '/cloudsql/innobase-mep-light:europe-west2:mep-light-db',
});

const migrations = [
  '001_initial_schema.sql',
  '002_fix_id_types.sql',
  '003_assessment_state_persistence.sql',
  '004_fix_session_columns.sql',
  '005_add_demo_participant_role.sql'
];

async function runAll() {
  try {
    await client.connect();
    for (const file of migrations) {
      const sqlPath = path.join(__dirname, 'migrations', file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`Running ${file}...`);
      await client.query(sql);
      console.log(`${file} applied successfully!`);
    }
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runAll();
