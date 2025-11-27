// backend/db/index.js
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

// Helper function to execute queries
const query = async (text, params = []) => {
  try {
    const result = await sql(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

module.exports = { query };