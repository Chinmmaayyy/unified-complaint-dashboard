import Groq from 'groq-sdk';
import { query } from '../config/database';

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY || '',
    });
  }
  return groqClient;
}

export async function callGroq(
  prompt: string,
  systemPrompt: string = 'You are an AI assistant for a banking complaint management system.',
  complaintId?: string,
  task?: string
): Promise<string> {
  const startTime = Date.now();
  try {
    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    const response = completion.choices[0]?.message?.content || '';
    const latency = Date.now() - startTime;

    // Log AI call
    if (complaintId) {
      await query(
        'INSERT INTO ai_logs (complaint_id, provider, task, prompt, response, latency_ms, success) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [complaintId, 'groq', task || 'general', prompt.substring(0, 500), response.substring(0, 1000), latency, true]
      ).catch(err => console.error('[AI Log] Error:', err));
    }

    return response;
  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error('[Groq] API error:', error.message);

    // Log failure
    if (complaintId) {
      await query(
        'INSERT INTO ai_logs (complaint_id, provider, task, prompt, latency_ms, success, error_message) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [complaintId, 'groq', task || 'general', prompt.substring(0, 500), latency, false, error.message]
      ).catch(err => console.error('[AI Log] Error:', err));
    }

    throw error;
  }
}

export async function callGroqChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
): Promise<string> {
  try {
    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages,
      temperature: 0.7,
      max_tokens: 512,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error: any) {
    console.error('[Groq] Chat error:', error.message);
    throw error;
  }
}
