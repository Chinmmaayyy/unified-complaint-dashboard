import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/authRoutes';
import accountRoutes from './routes/accountRoutes';
import complaintRoutes from './routes/complaintRoutes';
import incidentRoutes from './routes/incidentRoutes';
import aiRoutes from './routes/aiRoutes';
import chatbotRoutes from './routes/chatbotRoutes';
import emailRoutes from './routes/emailRoutes';
import analyticsRoutes from './routes/analyticsRoutes';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Global Middleware ────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${req.method}] ${req.path} → ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// ─── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ComplaintIQ Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/analytics', analyticsRoutes);

// ─── Error Handling ───────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🏦 ComplaintIQ Backend Server');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  ✅ Server running on port ${PORT}`);
  console.log(`  📡 API Base URL: http://localhost:${PORT}/api`);
  console.log(`  🔑 Health Check: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('  📋 Routes:');
  console.log('    POST /api/auth/login');
  console.log('    POST /api/accounts/verify');
  console.log('    GET  /api/complaints');
  console.log('    GET  /api/complaints/:id');
  console.log('    POST /api/complaints/create');
  console.log('    GET  /api/incidents');
  console.log('    POST /api/ai/analyze');
  console.log('    POST /api/ai/duplicate');
  console.log('    POST /api/ai/generate-response');
  console.log('    POST /api/chatbot/message');
  console.log('    POST /api/email/send');
  console.log('    GET  /api/analytics/complaints-trend');
  console.log('    GET  /api/analytics/category-distribution');
  console.log('    GET  /api/analytics/sentiment');
  console.log('    GET  /api/analytics/sla-compliance');
  console.log('    GET  /api/analytics/fraud-alerts');
  console.log('    GET  /api/analytics/dashboard');
  console.log('');
  console.log('  🤖 AI: Groq (primary) → Gemini (fallback)');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});

export default app;
