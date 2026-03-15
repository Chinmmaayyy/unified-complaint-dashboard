import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../config/database';

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');
  }
  return geminiClient;
}

export async function callGemini(
  prompt: string,
  systemPrompt: string = 'You are an AI assistant for a banking complaint management system.',
  complaintId?: string,
  task?: string
): Promise<string> {
  const startTime = Date.now();
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const latency = Date.now() - startTime;

    // Log AI call
    if (complaintId) {
      await query(
        'INSERT INTO ai_logs (complaint_id, provider, task, prompt, response, latency_ms, success) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [complaintId, 'gemini', task || 'general', prompt.substring(0, 500), response.substring(0, 1000), latency, true]
      ).catch(err => console.error('[AI Log] Error:', err));
    }

    return response;
  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error('[Gemini] API error:', error.message);

    // Log failure
    if (complaintId) {
      await query(
        'INSERT INTO ai_logs (complaint_id, provider, task, prompt, latency_ms, success, error_message) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [complaintId, 'gemini', task || 'general', prompt.substring(0, 500), latency, false, error.message]
      ).catch(err => console.error('[AI Log] Error:', err));
    }

    throw error;
  }
}

export async function callGeminiChat(
  messages: Array<{ role: 'user' | 'model'; content: string }>,
  systemPrompt: string = 'You are an AI assistant for a banking complaint management system.'
): Promise<string> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history: messages.slice(0, -1).map(m => ({
        role: m.role,
        parts: [{ text: m.content }],
      })),
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
  } catch (error: any) {
    console.error('[Gemini] Chat error:', error.message);
    throw error;
  }
}
