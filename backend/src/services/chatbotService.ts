import { callGroqChat } from '../ai/groqService';
import { callGeminiChat } from '../ai/geminiService';
import { query } from '../config/database';

interface ChatSession {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  stage: 'greeting' | 'collecting' | 'verifying' | 'creating' | 'complete';
  complaintData: {
    account_number?: string;
    description?: string;
    category?: string;
  };
}

// In-memory session store (use Redis in production)
const sessions: Map<string, ChatSession> = new Map();

const SYSTEM_PROMPT = `You are ComplaintIQ Assistant for Union Bank of India. You help customers register complaints and track them.

Your flow:
1. Greet the customer warmly
2. Ask what issue they're facing (collect complaint description)
3. Ask for their account number to verify their identity
4. Confirm the details and register the complaint

Be empathetic, professional, and concise. Keep responses under 100 words.
If a customer provides their complaint description, acknowledge it and ask for their account number.
If they provide an account number (starts with UBI followed by 8 digits), confirm you'll verify it.
Never ask for passwords or PINs.`;

export async function processMessage(
  sessionId: string,
  userMessage: string
): Promise<{ response: string; ticketId?: string }> {
  // Get or create session
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      messages: [{ role: 'system', content: SYSTEM_PROMPT }],
      stage: 'greeting',
      complaintData: {},
    };
    sessions.set(sessionId, session);
  }

  // Add user message
  session.messages.push({ role: 'user', content: userMessage });

  // Check for account number pattern
  const accountMatch = userMessage.match(/UBI\d{8}/i);
  if (accountMatch) {
    session.complaintData.account_number = accountMatch[0].toUpperCase();
    session.stage = 'verifying';
  }

  // If we're verifying, check the account
  if (session.stage === 'verifying' && session.complaintData.account_number) {
    const accountResult = await query(
      'SELECT customer_name, account_number FROM accounts WHERE account_number = $1',
      [session.complaintData.account_number]
    );

    if (accountResult.rows.length > 0) {
      const account = accountResult.rows[0];

      // If we have a description, create the complaint
      if (session.complaintData.description || session.messages.length > 4) {
        session.stage = 'creating';
        const description = session.complaintData.description || 
          session.messages.filter(m => m.role === 'user').map(m => m.content).join(' ');

        // Create complaint ticket
        const year = new Date().getFullYear();
        const ticketNum = Math.floor(1000 + Math.random() * 9000);
        const ticketId = `CIQ-${year}-${String(ticketNum).padStart(4, '0')}`;

        // Get a random agent
        const agentResult = await query("SELECT id FROM users WHERE role = 'Agent' AND is_active = true ORDER BY RANDOM() LIMIT 1");
        const agentId = agentResult.rows[0]?.id || null;

        const slaDeadline = new Date(Date.now() + 24 * 3600000); // 24h SLA default

        await query(
          `INSERT INTO complaints (complaint_id, customer_name, account_number, branch, category, product, source, severity, status, description, assigned_agent, sla_deadline)
           VALUES ($1, $2, $3, $4, $5, $6, 'WhatsApp', 'Medium'::severity_level, 'Open'::complaint_status, $7, $8, $9)`,
          [ticketId, account.customer_name, account.account_number, 'Mumbai Main',
           session.complaintData.category || 'Account Operations', 'Savings Account',
           description, agentId, slaDeadline]
        );

        session.stage = 'complete';
        const response = `Thank you, ${account.customer_name}! Your complaint has been registered successfully.\n\n📋 **Ticket ID: ${ticketId}**\n\nOur team will review your complaint and contact you within 24 hours. You can track the status using your ticket ID.\n\nIs there anything else I can help you with?`;
        
        session.messages.push({ role: 'assistant', content: response });
        return { response, ticketId };
      }
    } else {
      const response = `I wasn't able to find an account with number ${session.complaintData.account_number}. Could you please double-check your account number? It should start with "UBI" followed by 8 digits.`;
      session.messages.push({ role: 'assistant', content: response });
      session.stage = 'collecting';
      session.complaintData.account_number = undefined;
      return { response };
    }
  }

  // For non-special cases, use AI to generate response  
  // Store description from user messages
  if (session.stage === 'greeting' || session.stage === 'collecting') {
    if (userMessage.length > 20 && !accountMatch) {
      session.complaintData.description = userMessage;
      session.stage = 'collecting';
    }
  }

  // Generate AI response
  let response: string;
  try {
    response = await callGroqChat(session.messages);
  } catch {
    try {
      // Convert for Gemini format  
      const geminiMessages = session.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
          content: m.content,
        }));
      response = await callGeminiChat(geminiMessages, SYSTEM_PROMPT);
    } catch {
      response = "I apologize for the technical difficulty. Please try again or contact our helpline at 1800-22-2244.";
    }
  }

  session.messages.push({ role: 'assistant', content: response });
  return { response };
}

export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}
