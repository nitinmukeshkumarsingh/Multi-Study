
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Flashcard, Note } from "../types";
import { getSettings, getCustomApiKey, getActiveApiKey } from "./storage";

const getAI = () => {
  const apiKey = getActiveApiKey();
  
  if (!apiKey || apiKey === '') {
    throw new Error("Gemini API Key is missing. Please add it in Settings! ⚠️");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const flashcardSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      front: { type: Type.STRING, description: "The question or term on the front of the card" },
      back: { type: Type.STRING, description: "The answer or definition on the back of the card" }
    },
    required: ["front", "back"]
  }
};

const getContextPrompt = () => {
  const settings = getSettings();
  const now = new Date();
  
  // Get precise timezone information
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const dateStr = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone 
  });
  
  const timeStr = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    timeZoneName: 'long',
    timeZone 
  });

  return `SYSTEM CONTEXT: 
  - User's Local Time: ${timeStr}
  - User's Date: ${dateStr}
  - User's Timezone: ${timeZone}
  
  IDENTITY:
  You are MUKTI AI, the user's cozy, super-intelligent study bestie. 🌟
  Your student is ${settings.name} (${settings.academicLevel}).
  
  RULES & PERSONALITY:
  1. COZY & WARM: Use a friendly, conversational tone. You aren't a cold robot; you're a supportive mentor. ☕️✨
  2. INTERACTIVE: Don't just lecture. Ask the student questions like "Does that make sense?" or "Want to try an example together?" or "How are you feeling about this topic?" 🙋‍♂️
  3. EMOJIS: Use emojis naturally to keep the mood light and encouraging! 🚀📚🎨
  4. TIME AWARENESS: Use the user's exact local time (provided above). If they ask "What time is it in India?", use your live data to calculate it exactly.
  5. REAL-TIME KNOWLEDGE: Use the integrated Google Search tool for current events or dynamic info. 🔍
  6. FORMATTING: Use Markdown for structure. Use LaTeX for math expressions (e.g. $E=mc^2$).
  7. CONCISE BUT RICH: Keep answers easy to read but high-value.
  `;
};

export const generateFlashcards = async (
  source: 'topic' | 'image' | 'youtube',
  payload: string, 
  mimeType?: string,
  count: number = 8
): Promise<Flashcard[]> => {
  const ai = getAI();
  try {
    let contents: any;
    let config: any = {
      responseMimeType: "application/json",
      responseSchema: flashcardSchema,
    };
    const contextStr = getContextPrompt();

    if (source === 'topic') {
      contents = `Generate ${count} bite-sized, high-impact study flashcards about "${payload}". 
      
      STRICT RULES:
      - LENGTH: Keep it SHORT and PUNCHY. Max 15 words for the front, max 30 words for the back.
      - FRONT: A single clear concept, question, or term. Use 1-2 relevant emojis. 🧠
      - BACK: The core answer only. Use bullet points or bold text for key terms. No fluff. ✨
      - INTERACTIVE: Frame questions to spark curiosity (e.g., "What's the trick to remember...?").
      - FORMATTING: Use Markdown and LaTeX ($...$) for formulas.
      - GOAL: Fit perfectly on a mobile flashcard without scrolling.
      ${contextStr}`;
    } else if (source === 'image') {
      contents = [{ inlineData: { data: payload, mimeType: mimeType || 'image/jpeg' } }, { text: `Analyze this image and generate ${count} bite-sized study flashcards based on its content. 
      
      STRICT RULES:
      - LENGTH: Keep it SHORT and PUNCHY. Max 15 words for the front, max 30 words for the back.
      - FRONT: A single clear concept, question, or term. Use 1-2 relevant emojis. 📸
      - BACK: The core answer only. Use bullet points or bold text for key terms. No fluff. ✨
      - FORMATTING: Use Markdown and LaTeX ($...$) for formulas.
      - GOAL: Fit perfectly on a mobile flashcard without scrolling.
      ${contextStr}` }];
    } else if (source === 'youtube') {
      contents = `Search for the content of the following YouTube video and generate ${count} bite-sized study flashcards: ${payload}. 
      
      STRICT RULES:
      - LENGTH: Keep it SHORT and PUNCHY. Max 15 words for the front, max 30 words for the back.
      - FRONT: A single clear concept, question, or term. Use 1-2 relevant emojis. 🎥
      - BACK: The core answer only. Use bullet points or bold text for key terms. No fluff. ✨
      - FORMATTING: Use Markdown and LaTeX ($...$) for formulas.
      - GOAL: Fit perfectly on a mobile flashcard without scrolling.
      ${contextStr}`;
      config.tools = [{ googleSearch: {} }];
    }
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash-lite-preview", contents, config });
    const rawData = response.text ? JSON.parse(response.text) : [];
    return rawData.map((item: any) => ({ id: generateId(), front: item.front, back: item.back, mastered: false }));
  } catch (error) {
    console.error("Error generating flashcards:", error);
    return [];
  }
};

export const generateDiagramCode = async (prompt: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-preview",
      contents: `Generate Mermaid.js diagram code for: "${prompt}".
      
      STRICT SYNTAX RULES:
      1. Use 'graph TD' for flowcharts or 'mindmap' for concept maps.
      2. ALL node labels MUST be wrapped in double quotes and square brackets, e.g., A["My Label"].
      3. Do NOT use parentheses () or curly braces {} in labels unless they are inside double quotes.
      4. Node IDs should be simple alphanumeric strings (e.g., Node1, StepA).
      5. Avoid using special characters like +, -, *, /, (, ), [, ], {, } in node IDs.
      6. Return ONLY the raw Mermaid code. No markdown blocks.`,
    });
    let code = response.text?.trim() || "";
    // Clean up any potential markdown blocks if the model ignored instructions
    code = code.replace(/```mermaid/g, '').replace(/```/g, '').trim();
    return code;
  } catch (error) {
    return "graph TD\nA[\"Error\"] --> B[\"Could not generate diagram\"]";
  }
};

export const enhanceNoteContent = async (content: string): Promise<string> => {
  const ai = getAI();
  if (!content) return "";
  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite-preview",
        contents: `You are MUKTI AI, an elite study material designer. Your task is to transform the provided raw notes into a "Visual Study Guide" that is eye-catching, highly structured, and easy to memorize.
        STRICT RULE: Return ONLY the enhanced, structured content. Do NOT include any conversational text, introductions, or conclusions.
        
        Raw Notes to Enhance:
        ${content}`
    });
    return response.text?.trim() || content;
  } catch (error) { return content; }
};

export const processImageToNote = async (base64Data: string, mimeType: string): Promise<{title: string, content: string}> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-preview",
      contents: [{ inlineData: { data: base64Data, mimeType } }, { text: "Extract text and format as structured study notes JSON." }],
      config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING } }, required: ["title", "content"] } }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) { return { title: "Error", content: "Failed." }; }
};

export const solveProblemFromImage = async (base64Data: string, mimeType: string, context?: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-preview",
      contents: [
        { inlineData: { data: base64Data, mimeType } }, 
        { text: `Academic problem solver context: ${context || ''}` }
      ],
    });
    return response.text || "Couldn't solve.";
  } catch (error) { return "Error."; }
};

export const getChatResponseStream = async (history: any[], message: string) => {
  const ai = getAI();
  
  // Ensure history alternates correctly and starts with 'user'
  const contents = [...history];
  
  // Filter out any messages that don't have text or parts
  const validContents = contents.filter(c => c.parts && c.parts.length > 0 && c.parts[0].text);
  
  if (validContents.length > 0 && validContents[0].role === 'model') {
    validContents.shift(); // Remove initial model message if it's the first one
  }
  
  // Add the current message
  validContents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  try {
    return await ai.models.generateContentStream({
      model: "gemini-2.5-flash-lite-preview",
      contents: validContents,
      config: {
        systemInstruction: getContextPrompt(),
        tools: [{ googleSearch: {} }]
      }
    });
  } catch (error: any) {
    // If googleSearch tool fails (e.g. not supported by key), try without it
    if (error?.message?.includes('tool') || error?.message?.includes('search')) {
      return await ai.models.generateContentStream({
        model: "gemini-2.5-flash-lite-preview",
        contents: validContents,
        config: {
          systemInstruction: getContextPrompt()
        }
      });
    }
    throw error;
  }
};
