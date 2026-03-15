import { callGroq } from './groqService';
import { callGemini } from './geminiService';
import { query } from '../config/database';

// Call AI with Groq-first, Gemini-fallback pattern
async function callAI(prompt: string, systemPrompt: string, complaintId?: string, task?: string): Promise<string> {
  try {
    return await callGroq(prompt, systemPrompt, complaintId, task);
  } catch (groqError) {
    console.warn(`[AI Pipeline] Groq failed for ${task}, falling back to Gemini...`);
    try {
      return await callGemini(prompt, systemPrompt, complaintId, task);
    } catch (geminiError) {
      console.error(`[AI Pipeline] Both providers failed for ${task}`);
      throw new Error(`AI analysis failed for ${task}: both Groq and Gemini unavailable`);
    }
  }
}

// ─── 1. Categorization ─────────────────────────────────────────────
async function categorize(description: string, complaintId: string): Promise<string> {
  const prompt = `Analyze this banking complaint and categorize it into exactly ONE of these categories:
- UPI/Digital Payment
- ATM Services
- Internet Banking
- Credit Card
- Loan/EMI
- Account Operations
- Customer Service
- Fraud Alert
- Net Banking
- Mobile App

Complaint: "${description}"

Respond with ONLY the category name, nothing else.`;

  const result = await callAI(prompt, 'You are a banking complaint classification expert. Respond with only the category name.', complaintId, 'categorization');
  return result.trim();
}

// ─── 2. Sentiment Analysis ──────────────────────────────────────────
async function analyzeSentiment(description: string, complaintId: string): Promise<{ sentiment: string; score: number }> {
  const prompt = `Analyze the customer sentiment in this banking complaint.

Complaint: "${description}"

Respond in this exact JSON format (no markdown, no explanation):
{"sentiment": "Positive|Neutral|Negative|Very Negative", "score": <number between -1.0 and 1.0>}`;

  const result = await callAI(prompt, 'You are a sentiment analysis expert. Respond only with valid JSON.', complaintId, 'sentiment');
  try {
    const parsed = JSON.parse(result.replace(/```json?\n?|\n?```/g, '').trim());
    return { sentiment: parsed.sentiment, score: parseFloat(parsed.score) };
  } catch {
    return { sentiment: 'Negative', score: -0.5 };
  }
}

// ─── 3. Severity Detection ──────────────────────────────────────────
async function detectSeverity(description: string, complaintId: string): Promise<string> {
  const prompt = `Assess the severity of this banking complaint. Consider financial impact, urgency, and customer distress.

Complaint: "${description}"

Respond with ONLY one of: Low, Medium, High, Critical`;

  const result = await callAI(prompt, 'You are a banking risk assessment expert. Respond with only the severity level.', complaintId, 'severity');
  const severity = result.trim();
  const valid = ['Low', 'Medium', 'High', 'Critical'];
  return valid.includes(severity) ? severity : 'Medium';
}

// ─── 4. Duplicate Detection ─────────────────────────────────────────
async function detectDuplicate(description: string, complaintId: string): Promise<{ isDuplicate: boolean; matchedComplaintId?: string; similarity?: number }> {
  // First, use database full-text search to find potential matches
  const recentComplaints = await query(
    `SELECT complaint_id, description, 
      ts_rank(to_tsvector('english', description), plainto_tsquery('english', $1)) as rank
     FROM complaints 
     WHERE id::text != $2
     AND created_at > NOW() - INTERVAL '30 days'
     AND to_tsvector('english', description) @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC
     LIMIT 5`,
    [description.substring(0, 200), complaintId]
  );

  if (recentComplaints.rows.length === 0) {
    return { isDuplicate: false };
  }

  // Ask AI to compare similarity
  const prompt = `Compare this new complaint with existing complaints and determine if it's a duplicate (describing the same issue).

New Complaint: "${description}"

Existing Complaints:
${recentComplaints.rows.map((c: any, i: number) => `${i + 1}. [${c.complaint_id}] "${c.description.substring(0, 150)}"`).join('\n')}

Respond in this exact JSON format (no markdown):
{"isDuplicate": true|false, "matchedComplaintId": "CIQ-XXXX-XXXX or null", "similarity": <percentage 0-100>}`;

  const result = await callAI(prompt, 'You are a duplicate detection expert. Respond only with valid JSON.', complaintId, 'duplicate_detection');
  try {
    const parsed = JSON.parse(result.replace(/```json?\n?|\n?```/g, '').trim());
    return {
      isDuplicate: parsed.similarity > 85,
      matchedComplaintId: parsed.matchedComplaintId,
      similarity: parsed.similarity,
    };
  } catch {
    return { isDuplicate: false };
  }
}

// ─── 5. Fraud Risk Detection ────────────────────────────────────────
async function detectFraudRisk(description: string, complaintId: string): Promise<string> {
  const prompt = `Assess the fraud risk level for this banking complaint. Look for indicators like: unauthorized transactions, card misuse, phishing, identity theft, unusual activity patterns.

Complaint: "${description}"

Respond with ONLY one of: Low, Medium, High`;

  const result = await callAI(prompt, 'You are a banking fraud detection expert. Respond with only the risk level.', complaintId, 'fraud_detection');
  const risk = result.trim();
  const valid = ['Low', 'Medium', 'High'];
  return valid.includes(risk) ? risk : 'Low';
}

// ─── 6. Root Cause Prediction ───────────────────────────────────────
async function predictRootCause(description: string, category: string, complaintId: string): Promise<string> {
  const prompt = `Based on this banking complaint, predict the most likely root cause.

Category: ${category}
Complaint: "${description}"

Respond with a brief root cause (5-10 words). Examples: "System outage", "Network timeout", "Data entry error", "Third-party failure", "Unauthorized access attempt"`;

  const result = await callAI(prompt, 'You are a banking operations root cause analysis expert.', complaintId, 'root_cause');
  return result.trim().substring(0, 100);
}

// ─── 7. Resolution Suggestion ───────────────────────────────────────
async function suggestResolution(description: string, category: string, rootCause: string, complaintId: string): Promise<string> {
  const prompt = `Suggest a resolution for this banking complaint.

Category: ${category}
Root Cause: ${rootCause}
Complaint: "${description}"

Provide a brief, actionable resolution suggestion in 1-2 sentences. Include specific steps the bank should take.`;

  const result = await callAI(prompt, 'You are a banking complaint resolution expert.', complaintId, 'resolution_suggestion');
  return result.trim().substring(0, 500);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN AI PIPELINE
// ═══════════════════════════════════════════════════════════════════
export async function runAiPipeline(complaintDbId: string, description: string, complaintId: string): Promise<void> {
  console.log(`[AI Pipeline] Starting analysis for ${complaintId}...`);

  try {
    // Step 1: Categorization
    const category = await categorize(description, complaintDbId);
    console.log(`  ✓ Category: ${category}`);

    // Step 2: Sentiment Analysis
    const { sentiment, score: sentimentScore } = await analyzeSentiment(description, complaintDbId);
    console.log(`  ✓ Sentiment: ${sentiment} (${sentimentScore})`);

    // Step 3: Severity Detection
    const severity = await detectSeverity(description, complaintDbId);
    console.log(`  ✓ Severity: ${severity}`);

    // Step 4: Duplicate Detection
    const duplicateResult = await detectDuplicate(description, complaintDbId);
    console.log(`  ✓ Duplicate: ${duplicateResult.isDuplicate ? `Yes (${duplicateResult.similarity}%)` : 'No'}`);

    // Step 5: Fraud Risk Detection
    const fraudRisk = await detectFraudRisk(description, complaintDbId);
    console.log(`  ✓ Fraud Risk: ${fraudRisk}`);

    // Step 6: Root Cause Prediction
    const rootCause = await predictRootCause(description, category, complaintDbId);
    console.log(`  ✓ Root Cause: ${rootCause}`);

    // Step 7: Resolution Suggestion
    const resolution = await suggestResolution(description, category, rootCause, complaintDbId);
    console.log(`  ✓ Resolution: ${resolution.substring(0, 50)}...`);

    // Compute SLA deadline based on new severity
    const slaHours = { Critical: 4, High: 12, Medium: 24, Low: 48 }[severity] || 24;
    const createdAtResult = await query('SELECT created_at FROM complaints WHERE id = $1', [complaintDbId]);
    const createdAt = createdAtResult.rows[0]?.created_at || new Date();
    const slaDeadline = new Date(new Date(createdAt).getTime() + slaHours * 3600000);

    // Compute priority score
    const sevWeight = severity === 'Critical' ? 40 : severity === 'High' ? 30 : severity === 'Medium' ? 20 : 10;
    const fraudWeight = fraudRisk === 'High' ? 30 : fraudRisk === 'Medium' ? 15 : 5;
    const sentWeight = Math.max(0, (1 - sentimentScore) * 10);
    const hoursRemaining = (slaDeadline.getTime() - Date.now()) / 3600000;
    const slaWeight = hoursRemaining < 0 ? 20 : hoursRemaining < 4 ? 15 : hoursRemaining < 12 ? 10 : hoursRemaining < 24 ? 5 : 0;
    const priorityScore = parseFloat((sevWeight + fraudWeight + sentWeight + slaWeight).toFixed(2));

    // Handle incident grouping for duplicates
    let incidentId: string | null = null;
    if (duplicateResult.isDuplicate && duplicateResult.matchedComplaintId) {
      // Find existing incident from matched complaint
      const existingResult = await query(
        'SELECT incident_id FROM complaints WHERE complaint_id = $1 AND incident_id IS NOT NULL',
        [duplicateResult.matchedComplaintId]
      );
      if (existingResult.rows.length > 0) {
        incidentId = existingResult.rows[0].incident_id;
        // Update incident complaint count
        await query('UPDATE incidents SET complaint_count = complaint_count + 1 WHERE id = $1', [incidentId]);
      }
    }

    // Update complaint with AI analysis results
    await query(
      `UPDATE complaints SET 
        category = $1, sentiment = $2, sentiment_score = $3,
        severity = $4::severity_level, fraud_risk = $5, 
        duplicate_flag = $6, root_cause = $7, resolution_suggestion = $8,
        priority_score = $9, sla_deadline = $10,
        incident_id = COALESCE($11, incident_id)
      WHERE id = $12`,
      [category, sentiment, sentimentScore, severity, fraudRisk,
       duplicateResult.isDuplicate, rootCause, resolution,
       priorityScore, slaDeadline, incidentId, complaintDbId]
    );

    console.log(`[AI Pipeline] ✅ Analysis complete for ${complaintId} (priority: ${priorityScore})`);
  } catch (error) {
    console.error(`[AI Pipeline] ❌ Analysis failed for ${complaintId}:`, error);
  }
}

// Standalone duplicate check
export async function checkDuplicate(description: string): Promise<any> {
  const recentComplaints = await query(
    `SELECT complaint_id, description, 
      ts_rank(to_tsvector('english', description), plainto_tsquery('english', $1)) as rank
     FROM complaints 
     WHERE created_at > NOW() - INTERVAL '30 days'
     AND to_tsvector('english', description) @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC
     LIMIT 5`,
    [description.substring(0, 200)]
  );

  if (recentComplaints.rows.length === 0) {
    return { isDuplicate: false, matches: [] };
  }

  return {
    isDuplicate: recentComplaints.rows[0].rank > 0.3,
    matches: recentComplaints.rows.map((r: any) => ({
      complaint_id: r.complaint_id,
      similarity: Math.round(r.rank * 100),
      description: r.description.substring(0, 150),
    })),
  };
}
