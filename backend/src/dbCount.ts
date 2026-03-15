
import { query } from './config/database';

async function check() {
  try {
    const complaints = await query('SELECT COUNT(*) FROM complaints');
    console.log('COMPLAINT_COUNT:', complaints.rows[0].count);
    const users = await query('SELECT role, COUNT(*) FROM users GROUP BY role');
    console.log('USER_COUNTS:', users.rows);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    process.exit(0);
  }
}

check();
