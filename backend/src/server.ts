import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load env
dotenv.config();

// Routes
import authRoutes from './routes/authRoutes';
import accountRoutes from './routes/accountRoutes';
import complaintRoutes from './routes/complaintRoutes';
import incidentRoutes from './routes/incidentRoutes';
import aiRoutes from './routes/aiRoutes';
import chatbotRoutes from './routes/chatbotRoutes';
import emailRoutes from './routes/emailRoutes';
import analyticsRoutes from './routes/analyticsRoutes';

// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

// ✅ FIXED: Convert PORT to number
const PORT = Number(process.env.PORT) || 5000;

// ─── Middleware ─────────────────────────

// ✅ CORS (ALLOW YOUR VERCEL FRONTEND)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://unified-complaint-dashboard-uthc.vercel.app'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Dev logging
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`[${req.method}] ${req.path} → ${res.statusCode} (${Date.now() - start}ms)`);
    });
    next();
  });
}

// ─── Health Route ───────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ComplaintIQ Backend',
    time: new Date().toISOString()
  });
});

// ─── Routes ─────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/analytics', analyticsRoutes);

// ─── Error Handling ─────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ───────────────────────

// ✅ CRITICAL for Render
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 ComplaintIQ Backend Running');
  console.log(`🌍 Env: ${process.env.NODE_ENV}`);
  console.log(`📡 Port: ${PORT}`);
});

export default app;