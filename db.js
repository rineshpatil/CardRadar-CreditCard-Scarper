const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cardradar:password123@localhost:5432/cardradar_auth',
});

// Initialize database tables
const initDB = async () => {
  try {
    // Connect to the DB and create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create session table for connect-pg-simple if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      ) WITH (OIDS=FALSE);
    `);

    // Add Constraints that might fail if they already exist, so we catch them
    try {
      await pool.query(`ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;`);
    } catch (e) { /* constraint already exists */ }
    
    try {
      await pool.query(`CREATE INDEX "IDX_session_expire" ON "session" ("expire");`);
    } catch (e) { /* index already exists */ }

    console.log('✅ PostgreSQL Database connected and initialized');
  } catch (error) {
    console.error('⚠️ Database initialization error:', error.message);
  }
};

module.exports = { pool, initDB };
