import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';

const BRANCHES = [
  { name: 'Mumbai Main', code: 'MUM001', city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.877 },
  { name: 'Delhi CP', code: 'DEL001', city: 'Delhi', state: 'Delhi', lat: 28.632, lng: 77.219 },
  { name: 'Bangalore MG', code: 'BLR001', city: 'Bangalore', state: 'Karnataka', lat: 12.975, lng: 77.580 },
  { name: 'Chennai Anna Nagar', code: 'CHN001', city: 'Chennai', state: 'Tamil Nadu', lat: 13.085, lng: 80.270 },
  { name: 'Kolkata Park Street', code: 'KOL001', city: 'Kolkata', state: 'West Bengal', lat: 22.556, lng: 88.362 },
  { name: 'Hyderabad Banjara', code: 'HYD001', city: 'Hyderabad', state: 'Telangana', lat: 17.415, lng: 78.448 },
  { name: 'Pune FC Road', code: 'PUN001', city: 'Pune', state: 'Maharashtra', lat: 18.520, lng: 73.856 },
  { name: 'Ahmedabad SG', code: 'AHM001', city: 'Ahmedabad', state: 'Gujarat', lat: 23.022, lng: 72.571 },
  { name: 'Jaipur MI Road', code: 'JAI001', city: 'Jaipur', state: 'Rajasthan', lat: 26.912, lng: 75.787 },
  { name: 'Lucknow Hazratganj', code: 'LKO001', city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.847, lng: 80.946 },
];

const CATEGORIES = ['UPI/Digital Payment', 'ATM Services', 'Internet Banking', 'Credit Card', 'Loan/EMI', 'Account Operations', 'Customer Service', 'Fraud Alert', 'Net Banking', 'Mobile App'];
const PRODUCTS = ['Savings Account', 'Current Account', 'Credit Card', 'Home Loan', 'Personal Loan', 'Fixed Deposit', 'UPI Service', 'ATM Card', 'Mobile Banking', 'Internet Banking'];
const SOURCES = ['Mobile App', 'Internet Banking', 'Branch', 'Email', 'Call Center', 'Social Media', 'WhatsApp'];
const SEVERITIES: Array<'Low' | 'Medium' | 'High' | 'Critical'> = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES: Array<'Open' | 'In Progress' | 'Escalated' | 'Resolved' | 'Closed'> = ['Open', 'In Progress', 'Escalated', 'Resolved', 'Closed'];
const SENTIMENTS = ['Positive', 'Neutral', 'Negative', 'Very Negative'];
const AGENT_NAMES = ['Priya Sharma', 'Rahul Verma', 'Anita Patel', 'Suresh Kumar', 'Deepika Nair', 'Amit Singh', 'Kavya Reddy', 'Vikram Joshi'];
const CUSTOMER_NAMES = ['Rajesh Kumar', 'Sunita Devi', 'Amit Patel', 'Priya Singh', 'Vikram Sharma', 'Neha Gupta', 'Rohit Verma', 'Anjali Joshi', 'Sanjay Mehta', 'Kavitha Nair', 'Ramesh Babu', 'Lakshmi Rao', 'Mohammed Khan', 'Geeta Desai', 'Arun Nair'];

const COMPLAINT_TEXTS = [
  'UPI transaction failed but amount of ₹15,000 was debited from my account. Transaction ID: UPI2024031500234. Please resolve urgently.',
  'ATM at Andheri branch did not dispense cash but ₹10,000 was deducted. Machine showed Transaction Successful. Need immediate reversal.',
  'Unable to login to internet banking for last 3 days. Getting error code 500. Have tried password reset multiple times without success.',
  'Credit card was declined at POS terminal despite sufficient balance. This caused embarrassment at a business meeting.',
  'Loan EMI of ₹45,000 was deducted twice this month. Extra amount must be reversed immediately as it has caused overdraft.',
  'Suspicious transaction of ₹2,50,000 detected on my account. I did not authorize this. Possible fraud - block my card immediately.',
  'NEFT transfer of ₹75,000 sent 2 days ago has not been credited to beneficiary account. Please check and process.',
  'Mobile banking app crashing repeatedly on iPhone 14. Updated to latest version but problem persists since last week.',
  'Account frozen without prior notice. Unable to access funds for emergency medical treatment. Very urgent!',
  'Interest rate on home loan increased without notification. Contract said fixed rate. Need explanation and rollback.',
  'KYC documents submitted 2 weeks ago but account still not activated. Visited branch 3 times - no resolution.',
  'Wrong bank statement showing transactions I never made. Possible data breach or system error.',
  'Pension credit delayed by 15 days. Unable to pay rent and medical bills. Senior citizen - need priority resolution.',
  'Fixed deposit maturity amount not credited to savings account. FD matured 5 days ago. Need immediate credit.',
  'Auto-debit for insurance premium failed causing policy lapse. Very serious issue - need immediate resolution.',
];

const ROOT_CAUSES = ['System outage', 'Network timeout', 'Data entry error', 'Policy mismatch', 'Third-party failure', 'Unauthorized access attempt', 'Processing delay', 'Gateway failure', 'Server maintenance', 'Configuration error'];

function randomFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function seed() {
  console.log('🌱 Seeding database...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ──── Clean existing data ──────────────────────────────────
    console.log('  🧹 Cleaning existing data...');
    await client.query('TRUNCATE audit_logs, ai_logs, complaint_tags, complaints, incidents, accounts, users, branches CASCADE');

    // ──── Seed Branches ─────────────────────────────────────────
    console.log('  📍 Seeding branches...');
    const branchIds: string[] = [];
    for (const b of BRANCHES) {
      const res = await client.query(
        `INSERT INTO branches (name, code, city, state, latitude, longitude) 
         VALUES ($1,$2,$3,$4,$5,$6) 
         ON CONFLICT (name) DO UPDATE SET city = EXCLUDED.city 
         RETURNING id`,
        [b.name, b.code, b.city, b.state, b.lat, b.lng]
      );
      branchIds.push(res.rows[0].id);
    }

    // ──── Seed Users ────────────────────────────────────────────
    console.log('  👤 Seeding users...');
    const passwordHash = await bcrypt.hash('ComplaintIQ@2024', 10);
    const users = [
      { name: 'Dr. Arvind Kapoor', email: 'admin@unionbank.in', password: 'ComplaintIQ@2024', role: 'Admin' },
      { name: 'Meena Krishnan', email: 'supervisor@unionbank.in', password: 'Super@2024', role: 'Supervisor' },
      { name: 'Rahul Verma', email: 'agent@unionbank.in', password: 'Agent@2024', role: 'Agent' },
      { name: 'Sanjay Iyer', email: 'compliance@unionbank.in', password: 'Comply@2024', role: 'Compliance Officer' },
    ];

    const agentIds: string[] = [];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role, branch_id) 
         VALUES ($1,$2,$3,$4::user_role,$5) 
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name 
         RETURNING id`,
        [u.name, u.email, hash, u.role, branchIds[0]]
      );
      if (u.role === 'Agent') agentIds.push(res.rows[0].id);
    }

    // Seed additional agents
    for (const agentName of AGENT_NAMES) {
      const email = `${agentName.split(' ')[0].toLowerCase()}@unionbank.in`;
      const hash = await bcrypt.hash('Agent@2024', 10);
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role, branch_id) 
         VALUES ($1,$2,$3,'Agent'::user_role,$4) 
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name 
         RETURNING id`,
        [agentName, email, hash, randomFrom(branchIds)]
      );
      agentIds.push(res.rows[0].id);
    }

    // ──── Seed Accounts ─────────────────────────────────────────
    console.log('  🏦 Seeding accounts...');
    const accountNumbers: string[] = [];
    for (let i = 0; i < 30; i++) {
      const accNo = `UBI${randomInt(10000000, 99999999)}`;
      accountNumbers.push(accNo);
      await client.query(
        `INSERT INTO accounts (account_number, customer_name, branch_id, mobile_number, email, account_type) VALUES ($1,$2,$3,$4,$5,$6::account_type) ON CONFLICT (account_number) DO NOTHING`,
        [accNo, randomFrom(CUSTOMER_NAMES), randomFrom(branchIds), `+91${randomInt(7000000000, 9999999999)}`, `${randomFrom(CUSTOMER_NAMES).toLowerCase().replace(' ', '.')}@gmail.com`, randomFrom(['Savings', 'Current', 'NRI', 'Salary'])]
      );
    }

    // ──── Seed Incidents ────────────────────────────────────────
    console.log('  🔗 Seeding incidents...');
    const incidentIds: string[] = [];
    const incidents = [
      { title: 'UPI Gateway Outage - Multiple Transaction Failures', category: 'UPI/Digital Payment' },
      { title: 'ATM Network Down - Cash Dispense Failures', category: 'ATM Services' },
      { title: 'Internet Banking Login System Error', category: 'Internet Banking' },
      { title: 'Suspicious Unauthorized Transactions Pattern', category: 'Fraud Alert' },
    ];
    for (let i = 0; i < incidents.length; i++) {
      const incidentCode = `INC-2024-${String(i + 1).padStart(4, '0')}`;
      const res = await client.query(
        `INSERT INTO incidents (incident_id, incident_title, category, status) 
         VALUES ($1,$2,$3,$4::incident_status) 
         ON CONFLICT (incident_id) DO UPDATE SET incident_title = EXCLUDED.incident_title 
         RETURNING id`,
        [incidentCode, incidents[i].title, incidents[i].category, i === 3 ? 'Investigating' : 'Open']
      );
      incidentIds.push(res.rows[0].id);
    }

    // ──── Seed Complaints ───────────────────────────────────────
    console.log('  📋 Seeding complaints (50+)...');
    const year = new Date().getFullYear();
    for (let i = 0; i < 55; i++) {
      const severity = randomFrom(SEVERITIES);
      const status = randomFrom(STATUSES);
      const daysAgo = randomInt(0, 30);
      const createdAt = new Date(Date.now() - daysAgo * 86400000 - randomInt(0, 86400000));
      const slaHours = severity === 'Critical' ? 4 : severity === 'High' ? 12 : severity === 'Medium' ? 24 : 48;
      const slaDeadline = new Date(createdAt.getTime() + slaHours * 3600000);
      const sentimentScore = parseFloat((Math.random() * 2 - 1).toFixed(2));
      const sentiment = sentimentScore > 0.3 ? 'Positive' : sentimentScore > -0.2 ? 'Neutral' : sentimentScore > -0.6 ? 'Negative' : 'Very Negative';
      const fraudRisk = severity === 'Critical' ? 'High' : severity === 'High' ? 'Medium' : 'Low';
      const isDuplicate = Math.random() < 0.1;
      const incidentId = isDuplicate || Math.random() < 0.15 ? randomFrom(incidentIds) : null;
      const complaintId = `CIQ-${year}-${String(1200 + i).padStart(4, '0')}`;

      // Compute priority score inline
      const sevWeight = severity === 'Critical' ? 40 : severity === 'High' ? 30 : severity === 'Medium' ? 20 : 10;
      const fraudWeight = fraudRisk === 'High' ? 30 : fraudRisk === 'Medium' ? 15 : 5;
      const sentWeight = Math.max(0, (1 - sentimentScore) * 10);
      const hoursRemaining = (slaDeadline.getTime() - Date.now()) / 3600000;
      const slaWeight = hoursRemaining < 0 ? 20 : hoursRemaining < 4 ? 15 : hoursRemaining < 12 ? 10 : hoursRemaining < 24 ? 5 : 0;
      const priorityScore = parseFloat((sevWeight + fraudWeight + sentWeight + slaWeight).toFixed(2));

      await client.query(
        `INSERT INTO complaints (complaint_id, customer_name, account_number, branch, category, product, source, severity, status, sentiment, sentiment_score, fraud_risk, duplicate_flag, incident_id, description, root_cause, resolution_suggestion, assigned_agent, priority_score, created_at, sla_deadline) 
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::severity_level,$9::complaint_status,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
        [
          complaintId, randomFrom(CUSTOMER_NAMES), randomFrom(accountNumbers), randomFrom(BRANCHES.map(b => b.name)),
          randomFrom(CATEGORIES), randomFrom(PRODUCTS), randomFrom(SOURCES),
          severity, status, sentiment, sentimentScore, fraudRisk, isDuplicate, incidentId,
          COMPLAINT_TEXTS[i % COMPLAINT_TEXTS.length], randomFrom(ROOT_CAUSES),
          'Based on analysis, initiate immediate reversal process and send confirmation to customer. Escalate to technical team if not resolved within 4 hours.',
          randomFrom(agentIds), priorityScore, createdAt, slaDeadline
        ]
      );

      // Add tags
      const tags = [randomFrom(['urgent', 'vip-customer', 'repeat-complaint', 'fraud-suspected', 'regulatory', 'media-risk'])];
      for (const tag of tags) {
        const complaintUuid = (await client.query('SELECT id FROM complaints WHERE complaint_id = $1', [complaintId])).rows[0]?.id;
        if (complaintUuid) {
          await client.query('INSERT INTO complaint_tags (complaint_id, tag) VALUES ($1, $2)', [complaintUuid, tag]);
        }
      }
    }

    // Update incident complaint counts
    await client.query(`
      UPDATE incidents SET complaint_count = (
        SELECT COUNT(*) FROM complaints WHERE complaints.incident_id = incidents.id
      )
    `);

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully!');
    console.log('   - 10 branches');
    console.log('   - 12 users (4 core + 8 agents)');
    console.log('   - 30 accounts');
    console.log('   - 4 incidents');
    console.log('   - 55 complaints with tags');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

seed();
