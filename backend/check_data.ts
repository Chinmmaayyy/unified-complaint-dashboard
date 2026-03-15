import pool from './src/config/database';

async function checkData() {
  try {
    const client = await pool.connect();
    console.log('Connected to DB');
    
    // Check tables
    const res = await client.query('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = $1', ['public']);
    console.log('Tables in public schema:', res.rows.map(r => r.tablename));
    
    if (res.rows.find(r => r.tablename === 'users')) {
      const users = await client.query('SELECT count(*) FROM users');
      console.log('User count:', users.rows[0].count);
    }
    
    if (res.rows.find(r => r.tablename === 'complaints')) {
      const complaints = await client.query('SELECT count(*) FROM complaints');
      console.log('Complaint count:', complaints.rows[0].count);
    }

    client.release();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkData();
