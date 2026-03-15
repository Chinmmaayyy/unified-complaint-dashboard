import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { 
  ComposableMap, 
  Geographies, 
  Geography, 
  Marker, 
  ZoomableGroup 
} from "react-simple-maps";

// ─── COLORS & THEME ───────────────────────────────────────────────────────────
const C = {
  navy: "#0A1628",
  navyLight: "#0F2040",
  navyMid: "#142952",
  blue: "#1A5CFF",
  blueLight: "#2E6FFF",
  cyan: "#00D4FF",
  teal: "#00B8A9",
  gold: "#F5A623",
  red: "#FF3B5C",
  green: "#00C896",
  purple: "#7B5EA7",
  gray: "#8B9CBD",
  grayLight: "#B8C5D6",
  surface: "#111E35",
  surfaceLight: "#192845",
  border: "#1E3050",
  white: "#E8EFF8",
};

// ─── API CONFIGURATION ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

// Configure interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── DEMO DATA CONSTANTS (Used for Dropdowns & Fallbacks) ─────────────────
const BRANCHES = ["Mumbai Main", "Delhi CP", "Bangalore MG", "Chennai Anna Nagar", "Kolkata Park Street", "Hyderabad Banjara", "Pune FC Road", "Ahmedabad SG", "Jaipur MI Road", "Lucknow Hazratganj"];
const CATEGORIES = ["UPI/Digital Payment", "ATM Services", "Internet Banking", "Credit Card", "Loan/EMI", "Account Operations", "Customer Service", "Fraud Alert", "Net Banking", "Mobile App"];
const PRODUCTS = ["Savings Account", "Current Account", "Credit Card", "Home Loan", "Personal Loan", "Fixed Deposit", "UPI Service", "ATM Card", "Mobile Banking", "Internet Banking"];
const SOURCES = ["Mobile App", "Internet Banking", "Branch", "Email", "Call Center", "Social Media", "WhatsApp"];
const STATUSES = ["Open", "In Progress", "Escalated", "Resolved", "Closed"];
const AGENTS = ["Priya Sharma", "Rahul Verma", "Anita Patel", "Suresh Kumar", "Deepika Nair", "Amit Singh", "Kavya Reddy", "Vikram Joshi"];
const SEVERITIES = ["Low", "Medium", "High", "Critical"];

const TREND_DATA = [
  { month: "Aug", complaints: 234, resolved: 210, breaches: 12 },
  { month: "Sep", complaints: 287, resolved: 261, breaches: 18 },
  { month: "Oct", complaints: 312, resolved: 298, breaches: 9 },
  { month: "Nov", complaints: 265, resolved: 243, breaches: 14 },
  { month: "Dec", complaints: 198, resolved: 185, breaches: 7 },
  { month: "Jan", complaints: 341, resolved: 310, breaches: 22 },
  { month: "Feb", complaints: 278, resolved: 256, breaches: 15 },
  { month: "Mar", complaints: 156, resolved: 132, breaches: 8 },
];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = {
  app: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: C.navy, minHeight: "100vh", color: C.white, display: "flex" },
  sidebar: { width: 240, minHeight: "100vh", background: C.navyLight, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 },
  sidebarLogo: { padding: "24px 20px 16px", borderBottom: `1px solid ${C.border}` },
  sidebarNav: { flex: 1, padding: "12px 0", overflowY: "auto" },
  navItem: (active) => ({ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", cursor: "pointer", borderRadius: "0 24px 24px 0", marginRight: 12, transition: "all 0.2s", background: active ? `linear-gradient(90deg, ${C.blue}22, ${C.blue}11)` : "transparent", borderLeft: active ? `3px solid ${C.blue}` : "3px solid transparent", color: active ? C.white : C.gray, fontWeight: active ? 600 : 400, fontSize: 14 }),
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  topbar: { height: 64, background: C.navyLight, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 },
  content: { flex: 1, padding: 24, overflowY: "auto" },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 },
  kpiCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 8 },
  badge: (color) => ({ background: `${color}22`, color, border: `1px solid ${color}44`, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, display: "inline-block", whiteSpace: "nowrap" }),
  btn: (color = C.blue) => ({ background: color, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "opacity 0.2s" }),
  btnOutline: { background: "transparent", color: C.grayLight, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500 },
  input: { background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.white, fontSize: 13, outline: "none", width: "100%" },
  select: { background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.white, fontSize: 13, outline: "none" },
  label: { fontSize: 11, color: C.gray, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: C.white, marginBottom: 16 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  flexBetween: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  tag: (c) => ({ background: `${c}22`, color: c, border: `1px solid ${c}33`, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700 }),
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const severityColor = (s) => ({ Critical: C.red, High: C.gold, Medium: C.blue, Low: C.green }[s] || C.gray);
const statusColor = (s) => ({ Open: C.blue, "In Progress": C.cyan, Escalated: C.red, Resolved: C.green, Closed: C.gray }[s] || C.gray);
const sentimentColor = (s) => ({ "Very Negative": C.red, Negative: C.gold, Neutral: C.gray, Positive: C.green }[s] || C.gray);

function SeverityBadge({ s }) { return <span style={styles.badge(severityColor(s))}>{s}</span>; }
function StatusBadge({ s }) { return <span style={styles.badge(statusColor(s))}>{s}</span>; }
function SentimentBadge({ s }) { return <span style={styles.badge(sentimentColor(s))}>{s}</span>; }

function SLATimer({ hours }) {
  const hNum = Number(hours);
  if (isNaN(hNum)) return <span style={{ ...styles.badge(C.gray), fontSize: 11 }}>N/A</span>;
  const color = hNum < 0 ? C.red : hNum < 4 ? C.gold : C.green;
  const text = hNum < 0 ? `Breached ${Math.abs(hNum).toFixed(1)}h ago` : `${hNum.toFixed(1)}h remaining`;
  return <span style={{ ...styles.badge(color), fontSize: 11 }}>{text}</span>;
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("admin@unionbank.in");
  const [password, setPassword] = useState("ComplaintIQ@2024");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/auth/login", { email, password });
      const { user, token } = response.data;
      localStorage.setItem("token", token);
      onLogin(user);
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.response?.data?.error || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 20% 50%, ${C.blue}11 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${C.cyan}0A 0%, transparent 50%)`, pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${C.blue}, ${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏦</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.white, letterSpacing: "-0.02em" }}>ComplaintIQ</div>
              <div style={{ fontSize: 11, color: C.cyan, fontWeight: 600, letterSpacing: "0.08em" }}>UNION BANK OF INDIA</div>
            </div>
          </div>
          <p style={{ color: C.gray, fontSize: 14 }}>Intelligent Complaint Resolution Platform</p>
        </div>
        <div style={{ ...styles.card, padding: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: C.white }}>Sign in to your account</h2>
          <p style={{ color: C.gray, fontSize: 13, marginBottom: 24 }}>Access your complaint management dashboard</p>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Email Address</label>
            <input style={styles.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="your@unionbank.in" />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••" />
          </div>
          {error && <div style={{ background: `${C.red}22`, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 14px", color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button style={{ ...styles.btn(), width: "100%", padding: "12px", fontSize: 15, marginTop: 8, background: `linear-gradient(90deg, ${C.blue}, ${C.blueLight})`, opacity: loading ? 0.7 : 1 }} onClick={handleLogin} disabled={loading}>
            {loading ? "Authenticating..." : "Sign In"}
          </button>
          <div style={{ marginTop: 20, padding: 16, background: C.navyMid, borderRadius: 8, fontSize: 12 }}>
            <div style={{ color: C.grayLight, fontWeight: 600, marginBottom: 8 }}>Demo Credentials:</div>
            {[["Admin", "admin@unionbank.in", "ComplaintIQ@2024"], ["Supervisor", "supervisor@unionbank.in", "Super@2024"], ["Agent", "agent@unionbank.in", "Agent@2024"]].map(([role, em, pw]) => (
              <div key={role} style={{ display: "flex", justifyContent: "space-between", color: C.gray, marginBottom: 4, cursor: "pointer" }} onClick={() => { setEmail(em); setPassword(pw); }}>
                <span style={{ color: C.cyan }}>{role}</span><span>{em}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", icon: "📊", label: "Dashboard", roles: ["Admin", "Supervisor", "Agent"] },
  { id: "complaints", icon: "📋", label: "Complaints", roles: ["Admin", "Supervisor", "Agent"] },
  { id: "analytics", icon: "📈", label: "Analytics", roles: ["Admin", "Supervisor"] },
  { id: "map", icon: "🗺️", label: "Geo Map", roles: ["Admin", "Supervisor", "Agent"] },
  { id: "reports", icon: "📄", label: "Reports", roles: ["Admin", "Supervisor"] },
  { id: "admin", icon: "⚙️", label: "Admin", roles: ["Admin"] },
];

function Sidebar({ active, onNav, user }) {
  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(user.role));

  return (
    <div style={styles.sidebar}>
      <div style={styles.sidebarLogo}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.blue}, ${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🏦</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.white, letterSpacing: "-0.01em" }}>ComplaintIQ</div>
            <div style={{ fontSize: 9, color: C.cyan, fontWeight: 700, letterSpacing: "0.08em" }}>UNION BANK OF INDIA</div>
          </div>
        </div>
      </div>
      <nav style={styles.sidebarNav}>
        <div style={{ padding: "8px 20px", fontSize: 10, color: C.gray, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 4 }}>MAIN MENU</div>
        {filteredNav.map(item => (
          <div key={item.id} style={styles.navItem(active === item.id)} onClick={() => onNav(item.id)}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
        <div style={{ padding: "8px 20px", fontSize: 10, color: C.gray, fontWeight: 700, letterSpacing: "0.1em", margin: "12px 0 4px" }}>ACCOUNT</div>
        <div style={styles.navItem(active === "profile")} onClick={() => onNav("profile")}>
          <span>👤</span><span>Profile</span>
        </div>
        <div style={styles.navItem(active === "notifications")} onClick={() => onNav("notifications")}>
          <span>🔔</span><span>Notifications</span>
        </div>
      </nav>
      <div style={{ padding: 16, borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
            {user.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
            <div style={{ fontSize: 10, color: C.cyan }}>{user.role}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
function Topbar({ title, user, onLogout, notifications, onNotifClick }) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={styles.topbar}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.white }}>{title}</div>
        <div style={{ fontSize: 10, color: C.cyan, fontWeight: 600 }}>v1.0.3 Build: 2026-03-14_21:35</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative" }}>
          <button style={{ ...styles.btnOutline, padding: "6px 12px", fontSize: 18 }} onClick={onNotifClick}>🔔</button>
          {unreadCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: C.red, color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{unreadCount}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.white }}>{user.name}</div>
            <div style={{ fontSize: 10, color: C.gray }}>{user.role}</div>
          </div>
          <button style={{ ...styles.btnOutline, padding: "6px 10px" }} onClick={onLogout}>↩ Exit</button>
        </div>
      </div>
    </div>
  );
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color = C.blue, trend }) {
  return (
    <div style={{ ...styles.kpiCard, borderTop: `3px solid ${color}` }}>
      <div style={styles.flexBetween}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        {trend && <span style={{ fontSize: 11, color: trend > 0 ? C.red : C.green, fontWeight: 600 }}>{trend > 0 ? "▲" : "▼"} {Math.abs(trend)}%</span>}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: C.white, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.grayLight }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.gray }}>{sub}</div>}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user }) {
  const [data, setData] = useState({
    kpis: { open: 0, resolved: 0, critical: 0, breaches: 0, fraud: 0, today: 0, avg_res: 0, compliance: 0 },
    trends: [],
    categories: [],
    sentiments: [],
    branches: []
  });
  const [loading, setLoading] = useState(true);
  const [showNewAccount, setShowNewAccount] = useState(false);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.get('/analytics/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) return <div style={{ color: C.gray, padding: 24 }}>Loading dashboard data...</div>;

  const isAdmin = user.role === 'Admin';
  const isSupervisor = user.role === 'Supervisor';
  const isAgent = user.role === 'Agent';

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white }}>
            {isAdmin ? "Strategic Command Center" : isSupervisor ? "Branch Operations Dashboard" : "Agent Workspace"}
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            {isAdmin && <button style={styles.btn(C.blueLight)} onClick={() => setShowNewAccount(true)}>👤 + New Account</button>}
            <span style={{ ...styles.badge(C.green), fontSize: 12 }}>● Live</span>
            <span style={{ color: C.gray, fontSize: 12 }}>Last updated: just now</span>
          </div>
        </div>
        <p style={{ color: C.gray, fontSize: 13 }}>
          {isAdmin ? "Enterprise-wide complaint intelligence and system health" : isSupervisor ? `Management overview for your branch performance` : "Personal performance and assigned ticket tracking"}
        </p>
      </div>

      {showNewAccount && <NewAccountModal onClose={() => setShowNewAccount(false)} onCreated={() => setShowNewAccount(false)} />}

      {/* KPI Grid */}
      <div style={styles.grid4}>
        <KpiCard 
          icon={isAgent ? "🎟️" : "📨"} 
          label={isAgent ? "My Assigned" : "Total Today"} 
          value={isAgent ? data?.kpis?.open : Number(data?.kpis?.open || 0) + Number(data?.kpis?.today || 0)} 
          sub={isAgent ? "Active tickets" : "Across all channels"} 
          color={C.blue} 
          trend={isAdmin ? 12 : null} 
        />
        <KpiCard icon="🔓" label="Open Issues" value={data?.kpis?.open || 0} sub="Awaiting resolution" color={C.gold} />
        <KpiCard icon="✅" label="Resolved" value={data?.kpis?.resolved || 0} sub="This month" color={C.green} />
        <KpiCard icon="🚨" label="SLA Breaches" value={data?.kpis?.breaches || 0} sub="Immediate action required" color={C.red} />
      </div>
      
      <div style={{ ...styles.grid4, marginTop: 16 }}>
        <KpiCard icon="⚡" label="Critical Severity" value={data?.kpis?.critical || 0} sub="High priority" color={C.red} />
        {isAdmin && <KpiCard icon="🔍" label="Fraud Alerts" value={data?.kpis?.fraud || 0} sub="Under investigation" color={C.purple} />}
        {!isAdmin && <KpiCard icon="📅" label="Today's Intake" value={data?.kpis?.today || 0} sub="New tickets" color={C.cyan} />}
        <KpiCard icon="⏱️" label="Avg. Resolution" value={`${data?.kpis?.avg_res || '0'}h`} sub="System average" color={C.teal} />
        <KpiCard icon="📊" label="SLA Compliance" value={`${data?.kpis?.compliance || '0'}%`} sub="Target: 95%" color={C.cyan} />
      </div>

      {/* Charts Row 1 */}
      <div style={{ ...styles.grid2, marginTop: 24 }}>
        <div style={styles.card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
            {isAgent ? "My Ticket Trend" : "Volume Analytics — 8 Months"}
          </div>
          <div style={{ fontSize: 12, color: C.gray, marginBottom: 16 }}>Resolved vs SLA Breaches</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.trends || []}>
              <defs>
                <linearGradient id="gblue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.blue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" stroke={C.gray} tick={{ fontSize: 11 }} />
              <YAxis stroke={C.gray} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="complaints" stroke={C.blue} fill="url(#gblue)" strokeWidth={2} name="Total" />
              <Area type="monotone" dataKey="resolved" stroke={C.green} fill="transparent" strokeWidth={2} name="Resolved" />
              <Line type="monotone" dataKey="breaches" stroke={C.red} strokeWidth={2} dot={false} name="Breach" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={styles.card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Sentiment & Distribution</div>
          <div style={{ fontSize: 12, color: C.gray, marginBottom: 16 }}>Customer feedback analysis</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ResponsiveContainer width="55%" height={220}>
              <PieChart>
                <Pie data={data?.sentiments || []} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {(data?.sentiments || []).map((e, i) => <Cell key={i} fill={e.color || C.blue} />)}
                </Pie>
                <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {(data?.sentiments || []).slice(0, 4).map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color || C.blue, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: C.grayLight }}>{d.name.split(" ")[0]}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.white }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Only show for Admin/Supervisor */}
      {(isAdmin || isSupervisor) && (
        <div style={{ marginTop: 16 }}>
          <div style={styles.card}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              {isAdmin ? "Top Branches Performance" : "Branch Category Distribution"}
            </div>
            <div style={{ fontSize: 12, color: C.gray, marginBottom: 16 }}>Activity levels by volume</div>
            <ResponsiveContainer width="100%" height={200}>
              {isAdmin ? (
                <BarChart data={data?.branches || []} barSize={16}>
                  <XAxis dataKey="branch" stroke={C.gray} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="complaints" fill={C.blue} radius={[4, 4, 0, 0]} name="Total" />
                  <Bar dataKey="resolved" fill={C.green} radius={[4, 4, 0, 0]} name="Resolved" />
                </BarChart>
              ) : (
                <BarChart data={data?.categories || []} barSize={16}>
                  <XAxis dataKey="name" stroke={C.gray} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="percentage" fill={C.cyan} radius={[4, 4, 0, 0]} name="Volume %" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* AI Insights Banner (All roles) */}
      <div style={{ marginTop: 16, background: `linear-gradient(90deg, ${C.navy}, ${C.navyMid})`, border: `1px solid ${C.blue}44`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${C.blue}44, ${C.cyan}22)`, border: `1px solid ${C.blue}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🤖</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.cyan, marginBottom: 6 }}>ComplaintIQ AI — {isAgent ? "Personal Workflow Optimization" : "Trend Intelligence Report"}</div>
            <div style={{ fontSize: 13, color: C.grayLight, lineHeight: 1.6 }}>
              {isAgent ? (
                <span>You have <strong style={{ color: C.gold }}>3 tickets</strong> approaching SLA deadline. Focus on UPI-related complaints first to maximize resolution efficiency.</span>
              ) : (
                <span>⚠️ <strong style={{ color: C.gold }}>Spike detected:</strong> UPI/Digital Payment complaints increased <strong>34%</strong> this week. <span style={{ color: C.cyan }}>Recommended: Escalate to Tech team immediately.</span></span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPLAINTS LIST ───────────────────────────────────────────────────────────
function ComplaintsList({ onView }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ category: "", severity: "", status: "", source: "" });
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    async function fetchComplaints() {
      try {
        const res = await api.get('/complaints', { params: { limit: 100 } });
        setComplaints(res.data.complaints || []);
      } catch (err) {
        console.error('Failed to load complaints:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchComplaints();
  }, []);

  // Safeguard in case complaints is somehow not an array
  const safeComplaints = Array.isArray(complaints) ? complaints : [];

  const filtered = safeComplaints.filter(c => {
    const q = search.toLowerCase();
    
    // Safely get string values
    const idStr = c.complaint_id || c.id || '';
    const custStr = c.customer_name || '';
    const catStr = c.category || '';
    
    if (q && !idStr.toLowerCase().includes(q) && !custStr.toLowerCase().includes(q) && !catStr.toLowerCase().includes(q)) return false;
    if (filters.category && c.category !== filters.category) return false;
    if (filters.severity && c.severity !== filters.severity) return false;
    if (filters.status && c.status !== filters.status) return false;
    if (filters.source && c.source !== filters.source) return false;
    return true;
  });

  if (loading) return <div style={{ color: C.gray, padding: 24 }}>Loading complaints...</div>;

  return (
    <div>
      <div style={{ ...styles.flexBetween, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Unified Complaint Inbox</h1>
          <p style={{ color: C.gray, fontSize: 13, marginTop: 2 }}>{filtered.length} complaints · AI analysis active</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.btn(C.green)} onClick={() => setShowNewModal(true)}>+ New Complaint</button>
          <button style={styles.btnOutline}>⬇ Export</button>
        </div>
      </div>

      {showNewModal && <NewComplaintModal onClose={() => setShowNewModal(false)} onCreated={() => {
        setShowNewModal(false);
        // Re-fetch complaints
        window.location.reload(); // Quickest way to refresh everything
      }} />}

      {/* Filters */}
      <div style={{ ...styles.card, marginBottom: 16, padding: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input style={{ ...styles.input, width: 220 }} placeholder="🔍 Search by ID, customer, category..." value={search} onChange={e => setSearch(e.target.value)} />
          {[["Category", "category", CATEGORIES], ["Severity", "severity", SEVERITIES], ["Status", "status", STATUSES], ["Source", "source", SOURCES]].map(([label, key, opts]) => (
            <select key={key} style={styles.select} value={filters[key]} onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}>
              <option value="">All {label}s</option>
              {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          <button style={styles.btnOutline} onClick={() => { setFilters({ category: "", severity: "", status: "", source: "" }); setSearch(""); }}>Clear</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...styles.card, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.navyMid }}>
                {["Complaint ID", "Customer", "Category", "Branch", "Severity", "Sentiment", "Agent", "SLA", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.gray, letterSpacing: "0.05em", whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}22`, transition: "background 0.15s", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.navyLight}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  onClick={() => onView(c)}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>{c.complaint_id || c.id}</div>
                    <div style={{ fontSize: 10, color: C.gray }}>{c.source}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{c.customer_name || 'N/A'}</div>
                    <div style={{ fontSize: 10, color: C.gray }}>{c.account_number}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 12, color: C.grayLight }}>{c.category}</div>
                    <div style={{ fontSize: 10, color: C.gray }}>{c.product}</div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: C.gray }}>{c.branch ? c.branch.split(" ")[0] : '-'}</td>
                  <td style={{ padding: "12px 16px" }}><SeverityBadge s={c.severity} /></td>
                  <td style={{ padding: "12px 16px" }}><SentimentBadge s={c.sentiment_score > 0.6 ? 'positive' : c.sentiment_score < 0.4 ? 'negative' : 'neutral'} /></td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: C.grayLight }}>{c.agent_name ? c.agent_name.split(" ")[0] : 'Unassigned'}</td>
                  <td style={{ padding: "12px 16px" }}><SLATimer hours={c.hours_remaining} /></td>
                  <td style={{ padding: "12px 16px" }}><StatusBadge s={c.status} /></td>
                  <td style={{ padding: "12px 16px" }}>
                    <button style={{ ...styles.btn(C.navyMid), padding: "4px 10px", border: `1px solid ${C.border}`, fontSize: 12 }} onClick={e => { e.stopPropagation(); onView(c); }}>View →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.gray }}>Showing {filtered.length} of {filtered.length} complaints</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={styles.btnOutline}>← Prev</button>
            <button style={styles.btnOutline}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPLAINT DETAIL ─────────────────────────────────────────────────────────
function ComplaintDetail({ complaint: c, onBack, user }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [tab, setTab] = useState("overview");
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState(["Escalated to technical team for root cause analysis.", "Customer called back - still unresolved. Very frustrated."]);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [emailConfig, setEmailConfig] = useState({ to: "", subject: "", message: "", cc: "supervisor@unionbank.in", priority: "High" });

  useEffect(() => {
    if (c) {
      setEmailConfig(prev => ({
        ...prev,
        to: `${(c.customer_name || "Customer").toLowerCase().replace(" ", ".")}@gmail.com`,
        subject: `Re: Complaint ${c.complaint_id || c.id} - Union Bank of India`,
        message: aiResponse || ""
      }));
    }
  }, [c, aiResponse]);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await api.get('/auth/agents');
        setAvailableAgents(res.data);
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      }
    }
    fetchAgents();
  }, []);

  async function generateAiResponse() {
    setAiLoading(true);
    setAiResponse("");
    try {
      const res = await api.post('/ai/generate-response', { complaint_id: c.complaint_id || c.id });
      setAiResponse(res.data.response);
    } catch (err) {
      console.error('Failed to generate AI response:', err);
      setAiResponse("Unable to generate response. Please try again or construct a manual response.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleReassign() {
    if (!selectedAgentId) return alert("Please select an agent");
    try {
      const res = await api.patch(`/complaints/${c.complaint_id || c.id}/assign`, { agentId: selectedAgentId });
      alert("Complaint reassigned successfully");
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.error || "Reassignment failed");
    }
  }

  async function handleStatusUpdate(newStatus) {
    try {
      const res = await api.patch(`/complaints/${c.complaint_id || c.id}/status`, { status: newStatus });
      alert(`Complaint status updated to ${newStatus}`);
      window.location.reload(); // Refresh to see changes
    } catch (err) {
      console.error("Failed to update status:", err);
      alert(err.response?.data?.error || "Status update failed");
    }
  }

  async function handleSendEmail() {
    try {
      await api.post('/email/send', {
        customer_email: emailConfig.to,
        subject: emailConfig.subject,
        message: emailConfig.message,
        complaint_id: c.id
      });
      alert("Email sent successfully!");
    } catch (err) {
      console.error("Failed to send email:", err);
      alert(err.response?.data?.error || "Failed to send email");
    }
  }

  const TABS = ["overview", "ai-insights", "response", "timeline"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button style={styles.btnOutline} onClick={onBack}>← Back</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{c.complaint_id || c.id}</h1>
          <div style={{ fontSize: 12, color: C.gray }}>{c.customer_name || 'N/A'} · {c.branch} · {c.source}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <SeverityBadge s={c.severity} />
          <StatusBadge s={c.status} />
          <SLATimer hours={c.hours_remaining} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.surface, padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ ...styles.btn(tab === t ? C.blue : "transparent"), color: tab === t ? "#fff" : C.gray, padding: "6px 16px", fontSize: 13, border: "none" }}>
            {t === "overview" ? "📋 Overview" : t === "ai-insights" ? "🤖 AI Insights" : t === "response" ? "✉️ AI Response" : "🕐 Timeline"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={styles.grid2}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={styles.card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: C.cyan }}>👤 Customer Profile</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[["Customer", c.customer_name], ["Account No.", c.account_number], ["Account Type", c.account_type || 'Savings'], ["Branch", c.branch]].map(([k, v]) => (
                  <div key={k}><div style={styles.label}>{k}</div><div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{v || 'N/A'}</div></div>
                ))}
              </div>
            </div>
            <div style={styles.card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: C.cyan }}>📝 Complaint Description</div>
              <div style={{ fontSize: 13, color: C.grayLight, lineHeight: 1.7, background: C.navyMid, padding: 14, borderRadius: 8, border: `1px solid ${C.border}` }}>{c.description}</div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={styles.tag(C.cyan)}>{c.category}</span>
                <span style={styles.tag(C.gold)}>{c.product}</span>
                {c.duplicate && <span style={styles.tag(C.red)}>⚠ Duplicate</span>}
                {c.tags.map(t => <span key={t} style={styles.tag(C.purple)}>{t}</span>)}
              </div>
            </div>
            <div style={styles.card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: C.cyan }}>📌 Internal Notes</div>
              {notes.map((n, i) => (
                <div key={i} style={{ background: C.navyMid, padding: 10, borderRadius: 8, marginBottom: 8, fontSize: 13, color: C.grayLight, borderLeft: `3px solid ${C.blue}` }}>{n}</div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input style={{ ...styles.input, flex: 1 }} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add internal note..." />
                <button style={styles.btn()} onClick={() => { if (noteText) { setNotes(n => [...n, noteText]); setNoteText(""); } }}>Add</button>
              </div>
            </div>
          </div>
          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={styles.card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: C.cyan }}>⚙️ Complaint Details</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[["Category", c.category], ["Product", c.product], ["Source", c.source], ["Assigned Agent", c.agent], ["Created", new Date(c.createdAt).toLocaleDateString()], ["Fraud Risk", c.fraudRisk]].map(([k, v]) => (
                  <div key={k} style={{ ...styles.flexBetween, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
                    <span style={{ fontSize: 12, color: C.gray }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.white }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...styles.card, borderColor: c.slaBreach ? C.red : C.border }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: c.slaBreach ? C.red : C.cyan }}>⏱️ SLA Tracking</div>
              <div style={{ textAlign: "center", padding: 16 }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: c.slaBreach ? C.red : c.hours_remaining < 4 ? C.gold : C.green }}>
                  {c.slaBreach ? `${Math.abs(c.hours_remaining)}h` : `${c.hours_remaining}h`}
                </div>
                <div style={{ fontSize: 13, color: C.gray, marginTop: 4 }}>{c.slaBreach ? "Breach Duration" : "Time Remaining"}</div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ height: 8, background: C.navyMid, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: c.slaBreach ? "100%" : `${Math.max(0, Math.min(100, (1 - c.hours_remaining / 48) * 100))}%`, background: c.slaBreach ? C.red : c.hours_remaining < 4 ? C.gold : C.green, borderRadius: 4, transition: "width 0.3s" }} />
                  </div>
                </div>
                {c.slaBreach && (
                  <button style={{ ...styles.btn(C.red), marginTop: 12, width: "100%" }}>🚨 Escalate Now</button>
                )}
              </div>
            </div>
            <div style={styles.card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: C.cyan }}>🎯 Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button style={{ ...styles.btn(C.green), textAlign: "left" }} onClick={() => handleStatusUpdate('Resolved')}>✅ Mark Resolved</button>
                <button style={{ ...styles.btn(C.red), textAlign: "left" }} onClick={() => handleStatusUpdate('Closed')}>🔒 Close Complaint</button>
                <button style={{ ...styles.btn(C.gold), textAlign: "left" }} onClick={() => handleStatusUpdate('Escalated')}>📤 Escalate to Supervisor</button>
                <button style={{ ...styles.btn(C.blue), textAlign: "left" }} onClick={() => handleStatusUpdate('In Progress')}>⏳ Mark In Progress</button>
                
                {/* Reassign Section */}
                {(user.role === 'Admin' || user.role === 'Supervisor') && (
                  <div style={{ marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <div style={styles.label}>Reassign Agent</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <select style={{ ...styles.select, flex: 1 }} value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)}>
                        <option value="">Select Agent...</option>
                        {availableAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <button style={styles.btn(C.purple)} onClick={handleReassign}>Assign</button>
                    </div>
                  </div>
                )}
                
                <button style={{ ...styles.btnOutline, textAlign: "left", marginTop: 8 }}>📎 Add Attachment</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "ai-insights" && (
        <div style={styles.grid2}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ ...styles.card, border: `1px solid ${C.blue}44`, background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 24 }}>🤖</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.cyan }}>ComplaintIQ AI Summary</div>
                  <div style={{ fontSize: 11, color: C.gray }}>Powered by Groq · llama-3.1-8b-instant</div>
                </div>
              </div>
              <div style={{ background: C.navyMid, padding: 14, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.grayLight, lineHeight: 1.7 }}>
                Customer reports a {(c.category || "").toLowerCase()} issue with their {c.product}. Sentiment detected as <strong style={{ color: sentimentColor(c.sentiment) }}>{(c.sentiment || "").toLowerCase()}</strong>. AI root cause analysis points to <strong style={{ color: C.gold }}>{(c.rootCause || "").toLowerCase()}</strong>. Severity classified as <strong style={{ color: severityColor(c.severity) }}>{c.severity}</strong> based on financial impact and urgency indicators.
              </div>
            </div>
            <div style={styles.card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📊 AI Analysis Scores</div>
              {[
                { label: "Sentiment Score", value: parseFloat(c.sentimentScore), min: -1, max: 1, color: parseFloat(c.sentimentScore) < 0 ? C.red : C.green },
                { label: "Fraud Risk Score", value: c.fraudRisk === "High" ? 0.85 : c.fraudRisk === "Medium" ? 0.45 : 0.15, min: 0, max: 1, color: c.fraudRisk === "High" ? C.red : c.fraudRisk === "Medium" ? C.gold : C.green },
                { label: "Priority Score", value: c.severity === "Critical" ? 0.95 : c.severity === "High" ? 0.75 : c.severity === "Medium" ? 0.5 : 0.25, min: 0, max: 1, color: severityColor(c.severity) },
              ].map(({ label, value, min, max, color }) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ ...styles.flexBetween, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: C.grayLight }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>{value.toFixed(2)}</span>
                  </div>
                  <div style={{ height: 6, background: C.navyMid, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${((value - min) / (max - min)) * 100}%`, background: color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "🏷️", label: "AI Detected Category", value: c.aiCategory, color: C.blue },
              { icon: "😔", label: "Customer Sentiment", value: c.sentiment, color: sentimentColor(c.sentiment) },
              { icon: "⚡", label: "Severity Level", value: c.severity, color: severityColor(c.severity) },
              { icon: "🔍", label: "Root Cause", value: c.rootCause, color: C.gold },
              { icon: "🔄", label: "Duplicate Status", value: c.duplicate ? "Possible Duplicate Detected" : "No Duplicate Found", color: c.duplicate ? C.red : C.green },
              { icon: "🚨", label: "Fraud Risk", value: c.fraudRisk + " Risk", color: c.fraudRisk === "High" ? C.red : c.fraudRisk === "Medium" ? C.gold : C.green },
            ].map(({ icon, label, value, color }) => (
              <div key={label} style={{ ...styles.card, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}22`, border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={styles.label}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
                </div>
              </div>
            ))}
            <div style={{ ...styles.card, background: `${C.teal}11`, border: `1px solid ${C.teal}44` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.teal, marginBottom: 8 }}>💡 AI Resolution Suggestion</div>
              <div style={{ fontSize: 13, color: C.grayLight, lineHeight: 1.6 }}>{c.resolutionSuggestion}</div>
            </div>
          </div>
        </div>
      )}

      {tab === "response" && (
        <div style={{ maxWidth: 800 }}>
          <div style={{ ...styles.card, marginBottom: 16 }}>
            <div style={{ ...styles.flexBetween, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>✉️ AI-Generated Customer Response</div>
                <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>Powered by Claude AI · Review before sending</div>
              </div>
              <button style={{ ...styles.btn(`linear-gradient(90deg, ${C.blue}, ${C.cyan})`), display: "flex", alignItems: "center", gap: 8 }} onClick={generateAiResponse} disabled={aiLoading}>
                {aiLoading ? "⟳ Generating..." : "🤖 Generate AI Response"}
              </button>
            </div>
            {aiResponse ? (
              <div>
                <div style={{ background: C.navyMid, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, fontFamily: "monospace", fontSize: 13, color: C.grayLight, lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 16 }}>{aiResponse}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={styles.btn(C.green)} onClick={handleSendEmail}>📤 Send via Email</button>
                  <button style={styles.btnOutline}>✏️ Edit Response</button>
                  <button style={{ ...styles.btn(C.blue) }} onClick={generateAiResponse}>🔄 Regenerate</button>
                </div>
              </div>
            ) : (
              <div style={{ background: C.navyMid, border: `2px dashed ${C.border}`, borderRadius: 8, padding: 40, textAlign: "center", color: C.gray }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>Click "Generate AI Response" to create a professional customer reply</div>
                <div style={{ fontSize: 12 }}>AI will analyze the complaint and draft an empathetic resolution email</div>
              </div>
            )}
          </div>
          <div style={styles.card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📧 Email Configuration</div>
            <div style={styles.grid2}>
              <div><label style={styles.label}>To (Customer Email)</label><input style={styles.input} value={emailConfig.to} onChange={e => setEmailConfig({...emailConfig, to: e.target.value})} /></div>
              <div><label style={styles.label}>From</label><input style={styles.input} value="complaints@unionbank.in" readOnly /></div>
              <div><label style={styles.label}>CC</label><input style={styles.input} value={emailConfig.cc} onChange={e => setEmailConfig({...emailConfig, cc: e.target.value})} /></div>
              <div><label style={styles.label}>Priority</label><select style={styles.select} value={emailConfig.priority} onChange={e => setEmailConfig({...emailConfig, priority: e.target.value})}><option>High</option><option>Normal</option><option>Low</option></select></div>
            </div>
            <div style={{marginTop: 16}}>
              <label style={styles.label}>Message Content</label>
              <textarea style={{...styles.input, minHeight: 150, fontFamily: 'monospace'}} value={emailConfig.message} onChange={e => setEmailConfig({...emailConfig, message: e.target.value})} />
            </div>
          </div>
        </div>
      )}

      {tab === "timeline" && (
        <div style={{ maxWidth: 700 }}>
          <div style={styles.card}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>🕐 Complaint Timeline</div>
            {[
              { time: "2 days ago", icon: "📨", text: `Complaint received via ${c.source}`, color: C.blue },
              { time: "2 days ago", icon: "🤖", text: "AI analysis completed — Category, severity, sentiment detected", color: C.cyan },
              { time: "2 days ago", icon: "👤", text: `Assigned to ${c.agent}`, color: C.teal },
              { time: "1 day ago", icon: "📝", text: "Agent reviewed complaint and added internal note", color: C.gold },
              { time: "1 day ago", icon: "📤", text: "Initial response sent to customer via email", color: C.green },
              { time: "8 hours ago", icon: "📞", text: "Customer called back — issue still unresolved", color: C.red },
              { time: "6 hours ago", icon: "⚡", text: "Escalated to supervisor due to SLA approaching", color: C.gold },
              { time: "Now", icon: "⏳", text: "Resolution in progress", color: C.gray },
            ].map((ev, i) => (
              <div key={i} style={{ display: "flex", gap: 16, marginBottom: 20, position: "relative" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${ev.color}22`, border: `2px solid ${ev.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{ev.icon}</div>
                  {i < 7 && <div style={{ width: 2, flex: 1, background: `${C.border}`, marginTop: 4, minHeight: 24 }} />}
                </div>
                <div style={{ paddingTop: 6 }}>
                  <div style={{ fontSize: 13, color: C.white, fontWeight: 500 }}>{ev.text}</div>
                  <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>{ev.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function Analytics() {
  const [data, setData] = useState({ hourly: [], products: [], sla: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [aiReport, setAiReport] = useState("");

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const [h, p, s, c] = await Promise.all([
          api.get('/analytics/hourly'),
          api.get('/analytics/products'),
          api.get('/analytics/sla-compliance'),
          api.get('/analytics/category-distribution')
        ]);
        setData({
          hourly: h.data.hourly || [],
          products: p.data.products || [],
          sla: s.data.monthly || [],
          categories: c.data.categories || []
        });
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  async function generateFullReport() {
    setReportLoading(true);
    setAiReport("");
    try {
      const res = await api.post('/ai/analyze-batch', { type: 'full_report' });
      setAiReport(res.data.analysis || res.data.response);
    } catch (err) {
      console.error('Failed to generate AI report:', err);
      setAiReport("Failed to generate report. Please ensure AI services are connected.");
    } finally {
      setReportLoading(false);
    }
  }

  if (loading) return <div style={{ color: C.gray, padding: 24 }}>Loading analytics...</div>;

  return (
    <div>
      <div style={{ ...styles.flexBetween, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Complaint Analytics & Trend Intelligence</h1>
          <p style={{ color: C.gray, fontSize: 13, marginTop: 2 }}>AI-powered analysis of complaint patterns and operational performance</p>
        </div>
        <button style={styles.btn()} onClick={generateFullReport} disabled={reportLoading}>
          {reportLoading ? "🧠 Analyzing..." : "✨ Generate AI Insight Report"}
        </button>
      </div>

      {aiReport && (
        <div style={{ ...styles.card, marginBottom: 20, border: `1px solid ${C.cyan}44`, background: `${C.blue}08` }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.cyan }}>Executive AI Insight Report</div>
              <div style={{ fontSize: 11, color: C.gray }}>Based on current complaint volume and sentiment trends</div>
            </div>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: C.grayLight, whiteSpace: "pre-wrap" }}>{aiReport}</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={styles.card}>
          <div style={{ ...styles.flexBetween, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Complaint Volume by Hour</h3>
            <span style={{ color: C.gray, fontSize: 11 }}>Complaints received today (24h)</span>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="hour" stroke={C.gray} fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke={C.gray} fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, color: C.white }} />
                <Bar dataKey="count" fill={C.blue} radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.card}>
          <div style={{ ...styles.flexBetween, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Product Complaint Distribution</h3>
            <span style={{ color: C.gray, fontSize: 11 }}>Top 6 products by complaint count (%)</span>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.products} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke={C.gray} fontSize={10} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, color: C.white }} />
                <Bar dataKey="value" fill={C.teal} radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={styles.card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>Resolution Time by Category</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categories}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="name" stroke={C.gray} fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke={C.gray} fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill={C.purple} radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>SLA Compliance by Month</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.sla}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="month" stroke={C.gray} fontSize={10} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} stroke={C.gray} fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="compliance_rate" stroke={C.green} strokeWidth={2} dot={{ r: 4, fill: C.green }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ ...styles.card, marginTop: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>👥 Agent Performance Overview</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.navyMid }}>
                {["Agent Name", "Resolved", "Pending", "SLA Compliance", "Rating"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.gray, letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AGENTS.map((agent, i) => (
                <tr key={agent} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>{agent}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: C.green }}>{25 + i * 2}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: C.gold }}>{4 + i}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13 }}>{92 - i}%</td>
                  <td style={{ padding: "12px 16px", color: C.gold }}>⭐ 4.8</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── GEO MAP ──────────────────────────────────────────────────────────────────
const INDIA_GEO_JSON = "/india-states.json";

function GeoMap() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await api.get('/analytics/branches');
        setBranches(res.data.branches || []);
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBranches();
  }, []);

  if (loading) return <div style={{ color: C.gray, padding: 24 }}>Loading interactive map...</div>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Geographic Complaint Distribution</h1>
        <p style={{ color: C.gray, fontSize: 13, marginTop: 2 }}>Interactive state-level visualization — Branch density and severity analysis</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        <div style={{ ...styles.card, padding: 0, overflow: "hidden", height: 600, position: "relative", background: C.navyMid }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 1000,
              center: [78.9629, 22.5937] // Center of India
            }}
            style={{ width: "100%", height: "100%" }}
          >
            <ZoomableGroup>
              <Geographies geography={INDIA_GEO_JSON}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: { fill: C.navy, stroke: C.border, strokeWidth: 0.5, outline: "none" },
                        hover: { fill: `${C.blue}44`, stroke: C.blue, strokeWidth: 1, outline: "none" },
                        pressed: { fill: C.blue, outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>
              {branches.map((b) => {
                const color = b.severity === "high" ? C.red : b.severity === "medium" ? C.gold : C.cyan;
                const isActive = hovered === b.name || selected?.name === b.name;
                return (
                  <Marker key={b.name} coordinates={[b.lng, b.lat]} onClick={() => setSelected(b)} onMouseEnter={() => setHovered(b.name)} onMouseLeave={() => setHovered(null)}>
                    <circle r={isActive ? 6 : 3} fill={color} stroke="#fff" strokeWidth={ isActive ? 2 : 0} style={{ transition: "all 0.2s", cursor: "pointer" }} />
                    <circle r={isActive ? 12 : 6} fill={color} opacity={0.2} style={{ transition: "all 0.2s", cursor: "pointer" }} />
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
          
          <div style={{ position: "absolute", bottom: 16, right: 16, background: `${C.surface}DD`, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11, color: C.gray }}>
            💡 Use mouse wheel to zoom, drag to pan
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {selected ? (
            <div style={{ ...styles.card, borderLeft: `4px solid ${selected.severity === "high" ? C.red : C.gold}` }}>
              <div style={{ ...styles.flexBetween, marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>{selected.name}</h3>
                <button style={{ ...styles.btnOutline, padding: "2px 6px", fontSize: 10 }} onClick={() => setSelected(null)}>✕ Close</button>
              </div>
              <div style={styles.grid2}>
                <div>
                  <div style={{ fontSize: 10, color: C.gray, fontWeight: 700 }}>TOTAL COMPLAINTS</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.white }}>{selected.count}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.gray, fontWeight: 700 }}>SEVERITY LEVEL</div>
                  <div style={styles.tag(selected.severity === "high" ? C.red : C.gold)}>{selected.severity.toUpperCase()}</div>
                </div>
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, color: C.grayLight, lineHeight: 1.5 }}>
                  This branch is currently experiencing a <strong>{selected.severity === "high" ? "Critical" : "Elevated"}</strong> volume of tickets. Recommended action: Increase local support staff and prioritize resolution of pending UPI issues.
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Branch Statistics</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {branches.slice(0, 10).map(b => (
                  <div key={b.name} style={{ ...styles.flexBetween, padding: "8px 12px", background: b.name === hovered ? C.navyMid : "transparent", borderRadius: 8, cursor: "pointer" }} onMouseEnter={() => setHovered(b.name)} onMouseLeave={() => setHovered(null)} onClick={() => setSelected(b)}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.white }}>{b.name}</div>
                      <div style={{ fontSize: 10, color: C.gray }}>{b.count} complaints</div>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: b.severity === "high" ? C.red : b.severity === "medium" ? C.gold : C.cyan }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
function Reports() {
  const [generating, setGenerating] = useState(null);
  const [aiReport, setAiReport] = useState("");

  async function generateReport(type) {
    setGenerating(type);
    setAiReport("");
    try {
      const res = await api.post('/ai/analyze-batch', { type });
      setAiReport(res.data.analysis || res.data.response);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setAiReport("Unable to generate report at this time. Please ensure AI services are connected.");
    } finally {
      setGenerating(null);
    }
  }

  const REPORT_TYPES = [
    { id: "Monthly Compliance Report", icon: "📋", desc: "SLA compliance, resolution rates, regulatory metrics", color: C.blue },
    { id: "Branch Performance Report", icon: "🏦", desc: "Complaint volume, resolution time by branch", color: C.teal },
    { id: "Fraud Risk Report", icon: "🚨", desc: "Fraud patterns, suspicious activity, risk indicators", color: C.red },
    { id: "Agent Performance Report", icon: "👥", desc: "Agent stats, CSAT scores, resolution efficiency", color: C.purple },
    { id: "Category Trend Report", icon: "📊", desc: "Complaint categories, product issues, trend analysis", color: C.gold },
    { id: "Executive Summary Report", icon: "📌", desc: "High-level overview for senior management", color: C.cyan },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Reports & Exports</h1>
        <p style={{ color: C.gray, fontSize: 13, marginTop: 2 }}>Generate AI-powered reports and export complaint data</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {REPORT_TYPES.map(r => (
          <div key={r.id} style={{ ...styles.card, borderTop: `3px solid ${r.color}` }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{r.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 6 }}>{r.id}</div>
            <div style={{ fontSize: 12, color: C.gray, marginBottom: 16, lineHeight: 1.5 }}>{r.desc}</div>
            <button style={{ ...styles.btn(r.color), fontSize: 12, width: "100%" }} onClick={() => generateReport(r.id)} disabled={generating === r.id}>
              {generating === r.id ? "⟳ Generating..." : "🤖 AI Generate"}
            </button>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {["CSV", "Excel", "PDF"].map(fmt => (
                <button key={fmt} style={{ ...styles.btnOutline, fontSize: 11, padding: "4px 8px", flex: 1 }}>⬇ {fmt}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {aiReport && (
        <div style={{ ...styles.card, border: `1px solid ${C.blue}44` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.cyan }}>🤖 AI Generated Report</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={styles.btn(C.green)}>⬇ Download PDF</button>
              <button style={styles.btnOutline}>📤 Share</button>
            </div>
          </div>
          <div style={{ background: C.navyMid, padding: 20, borderRadius: 8, fontSize: 13, color: C.grayLight, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{aiReport}</div>
        </div>
      )}

      <div style={{ ...styles.card, marginTop: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>⚡ Quick Data Export</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[["All Complaints", "csv"], ["SLA Breaches", "excel"], ["Fraud Cases", "pdf"], ["Open Complaints", "csv"]].map(([label, fmt]) => (
            <button key={label} style={{ ...styles.btnOutline, padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>⬇</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.white }}>{label}</div>
              <div style={{ fontSize: 10, color: C.gray, marginTop: 2 }}>.{fmt}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function Admin({ user }) {
  const [activeTab, setActiveTab] = useState("users");
  if (user.role !== "Admin") return (
    <div style={{ ...styles.card, textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.white }}>Access Restricted</div>
      <div style={{ color: C.gray, marginTop: 8 }}>Admin panel is only accessible to System Administrators.</div>
    </div>
  );

  const ADMIN_TABS = [["users", "👥 Users"], ["categories", "🏷️ Categories"], ["templates", "✉️ Templates"], ["escalation", "⚡ Escalation"], ["ai-config", "🤖 AI Config"]];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>System Administration</h1>
        <p style={{ color: C.gray, fontSize: 13, marginTop: 2 }}>Manage users, categories, templates, and AI configuration</p>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.surface, padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, width: "fit-content", flexWrap: "wrap" }}>
        {ADMIN_TABS.map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{ ...styles.btn(activeTab === id ? C.blue : "transparent"), color: activeTab === id ? "#fff" : C.gray, padding: "6px 14px", fontSize: 13, border: "none" }}>{label}</button>
        ))}
      </div>

      {activeTab === "users" && (
        <div style={styles.card}>
          <div style={{ ...styles.flexBetween, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>👥 User Management</div>
            <button style={styles.btn()}>+ Add User</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: C.navyMid }}>
              {["Name", "Email", "Role", "Branch", "Status", "Last Login", ""].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: C.gray, fontWeight: 700 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[
                ["Dr. Arvind Kapoor", "admin@unionbank.in", "Admin", "HO Mumbai", C.cyan],
                ["Meena Krishnan", "supervisor@unionbank.in", "Supervisor", "Delhi CP", C.gold],
                ...AGENTS.slice(0, 4).map(a => [a, `${a.split(" ")[0].toLowerCase()}@unionbank.in`, "Agent", randomFrom(BRANCHES), C.green]),
                ["Sanjay Iyer", "compliance@unionbank.in", "Compliance Officer", "Mumbai Main", C.purple],
              ].map(([name, email, role, branch, color], i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "10px 16px", fontWeight: 600, color: C.white, fontSize: 13 }}>{name}</td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: C.gray }}>{email}</td>
                  <td style={{ padding: "10px 16px" }}><span style={styles.badge(color)}>{role}</span></td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: C.gray }}>{branch}</td>
                  <td style={{ padding: "10px 16px" }}><span style={styles.badge(C.green)}>Active</span></td>
                  <td style={{ padding: "10px 16px", fontSize: 11, color: C.gray }}>Today</td>
                  <td style={{ padding: "10px 16px" }}><button style={{ ...styles.btnOutline, fontSize: 11, padding: "4px 10px" }}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "categories" && (
        <div style={styles.card}>
          <div style={{ ...styles.flexBetween, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>🏷️ Complaint Categories</div>
            <button style={styles.btn()}>+ Add Category</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {CATEGORIES.map((cat, i) => (
              <div key={cat} style={{ ...styles.flexBetween, background: C.navyMid, padding: "12px 16px", borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{cat}</div>
                  <div style={{ fontSize: 11, color: C.gray }}>SLA: {[4, 8, 12, 24, 48, 4, 24, 2, 12, 8][i]}h · Priority: {["Critical", "High", "Medium", "High", "Medium", "Critical", "Medium", "Critical", "High", "Medium"][i]}</div>
                </div>
                <button style={{ ...styles.btnOutline, fontSize: 11, padding: "4px 8px" }}>Edit</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "ai-config" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={styles.card}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🤖 AI Provider Configuration</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: C.navyMid, padding: 16, borderRadius: 10, border: `2px solid ${C.green}44` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: C.white }}>Primary: Groq API</div>
                  <span style={styles.badge(C.green)}>Active</span>
                </div>
                <div style={styles.label}>Model</div>
                <div style={{ fontSize: 13, color: C.cyan, marginBottom: 8 }}>llama-3.1-8b-instant</div>
                <div style={styles.label}>API Status</div>
                <div style={{ fontSize: 13, color: C.green }}>● Connected · Latency: 124ms</div>
              </div>
              <div style={{ background: C.navyMid, padding: 16, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: C.white }}>Fallback: Gemini API</div>
                  <span style={styles.badge(C.gold)}>Standby</span>
                </div>
                <div style={styles.label}>Model</div>
                <div style={{ fontSize: 13, color: C.cyan, marginBottom: 8 }}>gemini-1.5-flash</div>
                <div style={styles.label}>API Status</div>
                <div style={{ fontSize: 13, color: C.green }}>● Connected · Latency: 210ms</div>
              </div>
            </div>
          </div>
          <div style={styles.card}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>⚙️ AI Task Configuration</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {["Complaint Categorization", "Sentiment Analysis", "Severity Detection", "Duplicate Detection", "Root Cause Analysis", "Fraud Pattern Detection", "Response Generation", "Trend Analysis"].map(task => (
                <div key={task} style={{ ...styles.flexBetween, background: C.navyMid, padding: "12px 14px", borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: C.grayLight }}>{task}</span>
                  <div style={{ width: 36, height: 20, borderRadius: 10, background: C.green, display: "flex", alignItems: "center", padding: 2, cursor: "pointer", justifyContent: "flex-end" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "escalation" && (
        <div style={styles.card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>⚡ Escalation Rules</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { trigger: "SLA Breach > 2 hours", action: "Escalate to Supervisor", via: "Email + SMS", color: C.gold },
              { trigger: "SLA Breach > 6 hours", action: "Escalate to Compliance Officer", via: "Email", color: C.red },
              { trigger: "Fraud Risk = High", action: "Immediate Compliance Alert", via: "Email + Phone", color: C.red },
              { trigger: "Critical Severity", action: "Notify Branch Manager", via: "Email", color: C.purple },
              { trigger: "Duplicate > 3 similar", action: "Flag for Investigation", via: "Dashboard Alert", color: C.cyan },
            ].map((r, i) => (
              <div key={i} style={{ background: C.navyMid, padding: 16, borderRadius: 8, border: `1px solid ${r.color}33`, display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: C.gray, marginBottom: 4 }}>TRIGGER</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{r.trigger}</div>
                </div>
                <div style={{ color: C.gray, fontSize: 20 }}>→</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: C.gray, marginBottom: 4 }}>ACTION</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: r.color }}>{r.action}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: C.gray, marginBottom: 4 }}>CHANNEL</div>
                  <span style={styles.badge(r.color)}>{r.via}</span>
                </div>
                <button style={{ ...styles.btnOutline, fontSize: 11, padding: "4px 8px" }}>Edit</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <div style={styles.card}>
          <div style={{ ...styles.flexBetween, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>✉️ Response Templates</div>
            <button style={styles.btn()}>+ Add Template</button>
          </div>
          {["UPI Transaction Failure", "ATM Cash Dispense Issue", "Account Access Problem", "Credit Card Dispute"].map((t, i) => (
            <div key={t} style={{ background: C.navyMid, padding: 14, borderRadius: 8, marginBottom: 10 }}>
              <div style={{ ...styles.flexBetween, marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{t}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...styles.btn(C.blue), fontSize: 11, padding: "4px 10px" }}>Edit</button>
                  <button style={{ ...styles.btnOutline, fontSize: 11, padding: "4px 10px" }}>Preview</button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.gray, lineHeight: 1.5 }}>
                Dear Customer, We acknowledge your complaint regarding {t.toLowerCase()}. Our team will resolve this within the specified timeline...
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NEW COMPLAINT MODAL ──────────────────────────────────────────────────────
// ─── NEW COMPLAINT MODAL ──────────────────────────────────────────────────────
function NewComplaintModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ account_number: "", category: "UPI/Digital Payment", product: "Mobile Banking", source: "Branch", description: "", branch: "Mumbai" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post('/complaints/create', form);
      onCreated();
    } catch (err) {
      console.error('Failed to create complaint:', err);
      setError(err.response?.data?.error || "Failed to register complaint. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ ...styles.card, width: 500, padding: 32, position: "relative" }}>
        <button style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: C.gray, cursor: "pointer", fontSize: 20 }} onClick={onClose}>✕</button>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Register New Complaint</h2>
        <p style={{ color: C.gray, fontSize: 13, marginBottom: 24 }}>Enter customer and issue details to create a formal ticket</p>
        
        {error && <div style={{ background: `${C.red}22`, border: `1px solid ${C.red}44`, borderRadius: 8, padding: 12, color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={styles.label}>Account Number</label>
            <input style={styles.input} value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} placeholder="UBI12345678" />
          </div>
          <div>
            <label style={styles.label}>Branch</label>
            <select style={styles.select} value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}>
              {["Mumbai", "Delhi", "Bangalore", "Lucknow", "Kolkata", "Hyderabad", "Jaipur"].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={styles.label}>Category</label>
            <select style={styles.select} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>Product</label>
            <select style={styles.select} value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))}>
              {["Mobile Banking", "Internet Banking", "ATM Card", "Savings Account", "Personal Loan", "Fixed Deposit", "Credit Card"].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={styles.label}>Complaint Description</label>
          <textarea style={{ ...styles.input, height: 100, resize: "none" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Provide clear details about the customer's issue..." />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ ...styles.btnOutline, flex: 1 }} onClick={onClose} disabled={loading}>Cancel</button>
          <button style={{ ...styles.btn(), flex: 1, background: `linear-gradient(90deg, ${C.blue}, ${C.blueLight})` }} onClick={handleSubmit} disabled={loading}>
            {loading ? "Registering..." : "Submit Complaint"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NEW ACCOUNT MODAL ────────────────────────────────────────────────────────
function NewAccountModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ account_number: "", customer_name: "", branch_id: "", mobile_number: "", email: "", account_type: "Savings" });
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await api.get('/accounts/branches');
        setBranches(res.data.branches || []);
        if (res.data.branches?.length > 0) setForm(f => ({ ...f, branch_id: res.data.branches[0].id }));
      } catch (err) { console.error('Failed to load branches:', err); }
    }
    loadBranches();
  }, []);

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!form.account_number.startsWith('UBI')) {
        throw new Error("Account number must start with 'UBI' followed by digits.");
      }
      await api.post('/accounts/create', form);
      alert('Account created successfully!');
      onCreated();
    } catch (err) {
      console.error('Failed to create account:', err);
      setError(err.response?.data?.error || err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2050 }}>
      <div style={{ ...styles.card, width: 450, padding: 32, position: "relative" }}>
        <button style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: C.gray, cursor: "pointer", fontSize: 20 }} onClick={onClose}>✕</button>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Register New Account</h2>
        <p style={{ color: C.gray, fontSize: 13, marginBottom: 24 }}>Create a new customer account in the core system</p>
        
        {error && <div style={{ background: `${C.red}22`, border: `1px solid ${C.red}44`, borderRadius: 8, padding: 12, color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <div style={{ marginBottom: 16 }}>
          <label style={styles.label}>Full Customer Name</label>
          <input style={styles.input} value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="e.g. Rahul Sharma" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={styles.label}>Account Number</label>
            <input style={styles.input} value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} placeholder="UBI12345678" />
          </div>
          <div>
            <label style={styles.label}>Account Type</label>
            <select style={styles.select} value={form.account_type} onChange={e => setForm(f => ({ ...f, account_type: e.target.value }))}>
              {["Savings", "Current", "NRI", "Salary"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={styles.label}>Home Branch</label>
          <select style={styles.select} value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div>
            <label style={styles.label}>Mobile Number</label>
            <input style={styles.input} value={form.mobile_number} onChange={e => setForm(f => ({ ...f, mobile_number: e.target.value }))} placeholder="+91 9876543210" />
          </div>
          <div>
            <label style={styles.label}>Email Address</label>
            <input style={styles.input} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="rahul@example.com" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ ...styles.btnOutline, flex: 1 }} onClick={onClose} disabled={loading}>Cancel</button>
          <button style={{ ...styles.btn(C.blue), flex: 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CHATBOT ──────────────────────────────────────────────────────────────────
function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "bot", text: "Hello! I'm ComplaintIQ Assistant. I can help you register a complaint or track existing ones. How can I help you today?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef(null);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMessage() {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const response = await api.post("/chatbot/message", { message: userMsg, session_id: localStorage.getItem("chat_session") });
      const text = response.data.response || response.data.reply || "I apologize, I'm experiencing technical difficulties.";
      if (response.data.session_id) localStorage.setItem("chat_session", response.data.session_id);
      setMessages(m => [...m, { role: "bot", text }]);
    } catch {
      const responses = [
        `I understand your concern. To register your complaint, please provide your Transaction ID and account type.`,
        `I've noted your complaint. Your ticket ID is CIQ-2024-${randomInt(1300, 1400)}. Our team will contact you within 24 hours.`,
        `Thank you for providing details. I'm registering a High priority complaint for this issue. Reference: CIQ-2024-${randomInt(1300, 1400)}.`,
      ];
      setMessages(m => [...m, { role: "bot", text: randomFrom(responses) }]);
    }
    setLoading(false);
  }

  return (
    <>
      {/* Floating button */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}>
        {open && (
          <div style={{ position: "absolute", bottom: 64, right: 0, width: 360, height: 480, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, display: "flex", flexDirection: "column", boxShadow: `0 20px 60px #00000066`, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: `linear-gradient(90deg, ${C.blue}, ${C.blueLight})`, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#ffffff33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>ComplaintIQ Assistant</div>
                <div style={{ fontSize: 11, color: "#ffffff99" }}>● Online · Union Bank of India</div>
              </div>
              <button style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: 18, padding: 4 }} onClick={() => setOpen(false)}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "80%", background: m.role === "user" ? `linear-gradient(135deg, ${C.blue}, ${C.blueLight})` : C.navyMid, padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", fontSize: 13, color: C.white, lineHeight: 1.5 }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ background: C.navyMid, padding: "10px 14px", borderRadius: "16px 16px 16px 4px", color: C.gray, fontSize: 13 }}>⟳ Thinking...</div>
                </div>
              )}
              <div ref={messagesEnd} />
            </div>
            <div style={{ padding: 12, borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
              <input style={{ ...styles.input, flex: 1 }} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Type your message..." />
              <button style={{ ...styles.btn(), padding: "8px 14px" }} onClick={sendMessage} disabled={loading}>→</button>
            </div>
          </div>
        )}
        <button onClick={() => setOpen(o => !o)} style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${C.blue}, ${C.cyan})`, border: "none", cursor: "pointer", fontSize: 24, boxShadow: `0 4px 20px ${C.blue}66`, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s" }}>
          {open ? "✕" : "💬"}
        </button>
      </div>
    </>
  );
}

// ─── PROFILE VIEW ─────────────────────────────────────────────────────────────
function ProfileView({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get('/auth/profile');
        setProfile(res.data);
        setFormData({ name: res.data.name, email: res.data.email });
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleUpdate() {
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', formData);
      setProfile({ ...profile, ...res.data.user });
      setEditing(false);
      alert("Profile updated successfully!");
    } catch (err) {
      alert(err.response?.data?.error || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ color: C.gray, padding: 24 }}>Loading user profile...</div>;

  return (
    <div>
      <h1 style={styles.sectionTitle}>User Profile</h1>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
        {/* Profile Card */}
        <div style={styles.card}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 100, height: 100, borderRadius: "50%", background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 700, color: C.white, border: `4px solid ${C.navyMid}` }}>
              {profile.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{profile.name}</h2>
            <div style={{ fontSize: 13, color: C.cyan, fontWeight: 600 }}>{profile.role}</div>
            <div style={{ fontSize: 11, color: C.gray, marginTop: 4 }}>Member since: {new Date(profile.created_at).toLocaleDateString()}</div>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: C.gray, fontWeight: 700, marginBottom: 4 }}>ACCOUNT STATUS</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: profile.is_active ? C.green : C.red }} />
                <span style={{ fontSize: 13, color: C.white }}>{profile.is_active ? "Active" : "Disabled"}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.gray, fontWeight: 700, marginBottom: 4 }}>LAST LOGIN</div>
              <div style={{ fontSize: 13, color: C.white }}>{profile.last_login ? new Date(profile.last_login).toLocaleString() : "First session"}</div>
            </div>
          </div>
        </div>

        {/* Edit / Details Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={styles.card}>
            <div style={{ ...styles.flexBetween, marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Personal Information</h3>
              {!editing && <button style={styles.btnOutline} onClick={() => setEditing(true)}>✎ Edit Details</button>}
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.gray, fontWeight: 700, marginBottom: 6 }}>FULL NAME</label>
                {editing ? (
                  <input style={styles.input} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                ) : (
                  <div style={{ fontSize: 14, color: C.white }}>{profile.name}</div>
                )}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.gray, fontWeight: 700, marginBottom: 6 }}>EMAIL ADDRESS</label>
                {editing ? (
                  <input style={styles.input} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                ) : (
                  <div style={{ fontSize: 14, color: C.white }}>{profile.email}</div>
                )}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.gray, fontWeight: 700, marginBottom: 6 }}>ASSIGNED BRANCH</label>
                <div style={{ fontSize: 14, color: C.white }}>{profile.branch_name || "Enterprise-wide"}</div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: C.gray, fontWeight: 700, marginBottom: 6 }}>USER ROLE ID</label>
                <div style={{ fontSize: 14, color: C.white }}>{profile.role.toUpperCase()}</div>
              </div>
            </div>

            {editing && (
              <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
                <button style={styles.btnOutline} onClick={() => setEditing(false)}>Cancel</button>
                <button style={styles.btn(C.blue)} onClick={handleUpdate} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            )}
          </div>

          <div style={styles.card}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Security Settings</h3>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>Password Update</div>
                <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>Last changed 3 months ago</div>
              </div>
              <button style={styles.btnOutline}>Change Password</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>Two-Factor Authentication</div>
                <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>Enabled via Union Authenticator</div>
              </div>
              <button style={{ ...styles.badge(C.green), border: "none" }}>Enabled</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NOTIFICATIONS VIEW ───────────────────────────────────────────────────────
function NotificationsView({ notifications, onMarkAsRead }) {
  return (
    <div>
      <h1 style={styles.sectionTitle}>Notifications</h1>
      <div style={{ ...styles.card, padding: 0, overflow: "hidden" }}>
        {notifications.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.gray }}>No new notifications</div>
        ) : (
          notifications.map(n => (
            <div key={n.id} style={{ padding: 16, borderBottom: `1px solid ${C.border}`, background: n.read ? "transparent" : `${C.blue}0A`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ fontSize: 20 }}>{n.icon || '🔔'}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: C.grayLight, marginTop: 2 }}>{n.message}</div>
                  <div style={{ fontSize: 10, color: C.gray, marginTop: 4 }}>{n.time}</div>
                </div>
              </div>
              {!n.read && <button style={{ ...styles.btnOutline, padding: "4px 8px", fontSize: 11 }} onClick={() => onMarkAsRead(n.id)}>Mark as read</button>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
const PAGE_TITLES = { dashboard: "Dashboard", complaints: "Complaint Inbox", analytics: "Analytics", map: "Geographic Map", reports: "Reports", admin: "Admin Panel", profile: "User Profile", notifications: "Notifications" };

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "New Complaint", message: "A new high-priority complaint has been assigned to you.", time: "10m ago", icon: "🚨", read: false },
    { id: 2, title: "SLA Breach Warning", message: "Complaint #CIQ-928 is approaching SLA deadline.", time: "1h ago", icon: "⚠️", read: false },
    { id: 3, title: "System Update", message: "ComplaintIQ v1.0.3 is now live with role-based access.", time: "2h ago", icon: "⚙️", read: true },
  ]);

  if (!user) return <LoginPage onLogin={setUser} />;

  function handleViewComplaint(c) { setSelectedComplaint(c); setPage("complaint-detail"); }
  function handleBackToList() { setSelectedComplaint(null); setPage("complaints"); }
  function handleMarkAsRead(id) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  return (
    <div style={styles.app}>
      <Sidebar active={page} onNav={(p) => { setPage(p); setSelectedComplaint(null); }} user={user} />
      <div style={styles.main}>
        <Topbar 
          title={page === "complaint-detail" ? `Complaint — ${selectedComplaint?.complaint_id || selectedComplaint?.id}` : PAGE_TITLES[page]} 
          user={user} 
          onLogout={() => setUser(null)}
          notifications={notifications}
          onNotifClick={() => setPage("notifications")}
        />
        <div style={styles.content}>
          {page === "dashboard" && <Dashboard user={user} />}
          {page === "complaints" && <ComplaintsList onView={handleViewComplaint} />}
          {page === "complaint-detail" && selectedComplaint && <ComplaintDetail complaint={selectedComplaint} onBack={handleBackToList} user={user} />}
          {page === "analytics" && <Analytics />}
          {page === "map" && <GeoMap />}
          {page === "reports" && <Reports />}
          {page === "admin" && <Admin user={user} />}
          {page === "notifications" && <NotificationsView notifications={notifications} onMarkAsRead={handleMarkAsRead} />}
          {page === "profile" && <ProfileView user={user} />}
        </div>
      </div>
      <Chatbot />
    </div>
  );
}
