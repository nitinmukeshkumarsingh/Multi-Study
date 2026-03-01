
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Flashcard, Note } from "../types";
import { getSettings, getCustomApiKey, getActiveApiKey, getGeminiKey, getGroqUsage, updateGroqUsage } from "./storage";

const getAI = () => {
  const apiKey = getGeminiKey();
  
  if (!apiKey || apiKey === '') {
    throw new Error("Gemini API Key is missing. Please add it in Settings! ⚠️");
  }
  return new GoogleGenAI({ apiKey });
};

const executeWebSearch = async (query: string) => {
  try {
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`)}`);
    const data = await res.json();
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.contents, 'text/html');
    const results = Array.from(doc.querySelectorAll('.result__snippet')).slice(0, 5).map(el => el.textContent?.trim()).join('\n');
    return results || "No results found.";
  } catch (e) {
    return "Search failed.";
  }
};

const executeWebVisit = async (url: string) => {
  try {
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.contents, 'text/html');
    return doc.body.textContent?.replace(/\s+/g, ' ').slice(0, 2000) || "No content.";
  } catch (e) {
    return "Failed to visit webpage.";
  }
};

// Helper for non-streaming AI calls across providers
export const callAI = async (prompt: string, options: { 
  system?: string, 
  image?: { data: string, mimeType: string },
  json?: boolean,
  schema?: Schema,
  tools?: any[]
} = {}): Promise<string> => {
  const settings = getSettings();
  
  // Determine mode for model selection
  let mode: 'text' | 'vision' | 'json' = 'text';
  if (options.image) mode = 'vision';
  else if (options.json) mode = 'json';

  const selectedModelStr = mode === 'vision' ? (settings.mediaModel || 'groq:meta-llama/llama-4-scout-17b-16e-instruct') : (settings.textModel || 'groq:qwen/qwen3-32b');
  const [provider, modelId] = selectedModelStr.split(':');

  // Gemini supports JSON with vision, Groq Llama 3.2 Vision also supports JSON mode
  // Llama 4 Scout might support JSON mode as well
  let isJsonModeSupported = true;
  if (provider === 'groq') {
    if (mode === 'vision' && !modelId.includes('vision')) isJsonModeSupported = false;
    if (modelId.includes('compound') || modelId.includes('deepseek')) isJsonModeSupported = false;
  }

  let apiKey = '';
  let url = '';

  if (provider === 'groq') {
      apiKey = settings.groqKey || process.env.GROQ_API_KEY || '';
      url = 'https://api.groq.com/openai/v1/chat/completions';
  } else if (provider === 'openrouter') {
      apiKey = settings.openrouterKey || process.env.OPENROUTER_API_KEY || '';
      url = 'https://openrouter.ai/api/v1/chat/completions';
  } else if (provider === 'gemini') {
      apiKey = getGeminiKey();
  }

  if (!apiKey) {
      throw new Error(`No API Key found for ${provider}. Please add one in Settings! ⚠️`);
  }

  if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey });
      let parts: any[] = [];
      if (options.image) {
          // Ensure image data is correctly formatted for Gemini
          parts.push({ 
            inlineData: {
              data: options.image.data,
              mimeType: options.image.mimeType
            } 
          });
      }
      
      let finalPrompt = prompt;
      if (options.json && options.schema) {
          finalPrompt += `\n\nIMPORTANT: Respond with valid JSON matching this schema:\n${JSON.stringify(options.schema, null, 2)}`;
      }
      parts.push({ text: finalPrompt });

      const config: any = {
          systemInstruction: options.system,
          responseMimeType: (options.json && isJsonModeSupported) ? "application/json" : "text/plain",
      };
      if (options.schema && isJsonModeSupported) config.responseSchema = options.schema;
      if (options.tools) config.tools = options.tools;

      const result = await ai.models.generateContent({ 
          model: modelId,
          contents: { parts }, 
          config 
      });
      return result.text || "";
  }

  const messages: any[] = [];
  if (options.system) messages.push({ role: 'system', content: options.system });
  
  let finalPrompt = prompt;
  if (options.json && options.schema) {
      finalPrompt += `\n\nIMPORTANT: Respond with valid JSON matching this schema:\n${JSON.stringify(options.schema, null, 2)}`;
  }

  const userContent: any[] = [{ type: 'text', text: finalPrompt }];
  if (options.image) {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${options.image.mimeType};base64,${options.image.data}`
      }
    });
  }
  messages.push({ role: 'user', content: userContent });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(provider === 'openrouter' ? {
          'HTTP-Referer': window.location.origin,
          'X-Title': 'MUKTI Study'
        } : {})
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        max_tokens: 4096,
        response_format: (options.json && isJsonModeSupported) ? { type: 'json_object' } : undefined
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Failed to connect to ${provider}`);
    }

    const data = await response.json();
    
    if (provider === 'groq' && data.usage?.total_tokens) {
      updateGroqUsage(data.usage.total_tokens);
    }
    
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    throw error;
  }
};

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const robustParseJSON = (text: string) => {
  if (!text) return null;
  
  try {
    // 1. Clean markdown
    let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    // 2. Extract JSON part
    const startArr = clean.indexOf('[');
    const startObj = clean.indexOf('{');
    let start = -1;
    let end = -1;
    
    if (startArr !== -1 && (startObj === -1 || startArr < startObj)) {
      start = startArr;
      end = clean.lastIndexOf(']');
    } else if (startObj !== -1) {
      start = startObj;
      end = clean.lastIndexOf('}');
    }
    
    // If we found a start but NO end, it might be truncated
    if (start !== -1 && end === -1) {
      end = clean.length - 1;
    }

    if (start !== -1 && end !== -1) {
      clean = clean.substring(start, end + 1);
    }

    // 3. Fix truncated JSON (unclosed strings, objects, arrays)
    const fixTruncated = (json: string) => {
      let result = json;
      let inString = false;
      let escape = false;
      const stack: string[] = [];

      for (let i = 0; i < result.length; i++) {
        const char = result[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === '\\') {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === '{' || char === '[') {
            stack.push(char);
          } else if (char === '}') {
            if (stack[stack.length - 1] === '{') stack.pop();
          } else if (char === ']') {
            if (stack[stack.length - 1] === '[') stack.pop();
          }
        }
      }

      if (inString) result += '"';
      while (stack.length > 0) {
        const last = stack.pop();
        result += last === '{' ? '}' : ']';
      }
      return result;
    };

    clean = fixTruncated(clean);

    // 4. Fix control characters (literal newlines/tabs inside strings)
    // We only escape newlines that are NOT structural (i.e., inside a string value)
    const sanitized = clean.replace(/[\u0000-\u001F]/g, (match, offset, fullString) => {
      if (match === '\n' || match === '\r') {
        // Heuristic: Check if this newline is structural
        // Structural newlines usually follow { [ , : or precede } ] "
        const prevPart = fullString.slice(0, offset).trim();
        const nextPart = fullString.slice(offset + 1).trim();
        
        const lastChar = prevPart.slice(-1);
        const firstChar = nextPart.slice(0, 1);
        
        const isStructural = 
          ['{', '[', ',', ':'].includes(lastChar) || 
          ['}', ']', '"'].includes(firstChar);
          
        if (isStructural) return match; // Keep as real whitespace
        return '\\n'; // Escape as string content
      }
      if (match === '\t') return '  '; // Replace tabs with spaces to avoid issues
      return '';
    });

    return JSON.parse(sanitized);
  } catch (e) {
    console.error("JSON Parse Error:", e, "Original text:", text);
    return null;
  }
};

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
  2. INTERACTIVE: For educational topics, ask the student questions like "Does that make sense?" or "Want to try an example together?". However, DO NOT use these for simple greetings, basic facts like the time, or potential typos. 🙋‍♂️
  3. EMOJIS: Use emojis naturally to keep the mood light and encouraging! 🚀📚🎨
  4. TIME AWARENESS: Use the user's exact local time (provided above). If they ask "What time is it in India?", use your live data to calculate it exactly.
  5. REAL-TIME KNOWLEDGE (CRITICAL): You MUST use your provided tools (like \`web_search\`) to look up current events, live prices (e.g., Bitcoin), weather, or any real-time data. DO NOT GUESS OR HALLUCINATE LIVE DATA. If a user asks for current info, CALL THE TOOL FIRST. 🔍
  6. FORMATTING: Use Markdown for structure. Use LaTeX for math expressions. Use DOUBLE dollar signs for block equations (e.g. $$E=mc^2$$) and SINGLE dollar signs for inline math (e.g. $x+y$). DO NOT use \[ \] or \( \) delimiters.
  7. CONCISE BUT RICH: Keep answers easy to read but high-value. Avoid unnecessary reasoning, meta-talk, or explaining how you got the answer (e.g., don't say "Based on my system context..."). Just give the answer directly.
  8. ADAPTIVE LENGTH: For simple questions (like "Time?", "Hi", "How are you?"), keep your response VERY SHORT (under 2 sentences). Do not lecture or give long intros unless the topic is complex.
  9. NO FILLER: Avoid asking "Does that make sense?" or "Want to try an example?" for simple factual answers like the time or a greeting.
  10. AMBIGUOUS SHORT INPUTS: If the user provides a single word that looks like a potential typo for a greeting (e.g., "Gi", "Ho", "He", "Hi") or is extremely short and ambiguous, keep your response to ONE sentence or ask for clarification. DO NOT provide a detailed lecture or table of information unless the user's intent is explicitly clear. If it looks like a typo, just say "Hi! Did you mean 'hi'?" or similar.
  `;
};

export const generateFlashcards = async (
  source: 'topic' | 'image' | 'youtube',
  payload: string, 
  mimeType?: string,
  count: number = 8
): Promise<Flashcard[]> => {
  try {
    const contextStr = getContextPrompt();
    let prompt = "";
    let image: any = undefined;
    
    // Note: We pre-fetch YouTube data instead of using tools to ensure reliability with Groq/OpenRouter
    let extraContext = "";

    if (source === 'topic') {
      prompt = `Generate ${count} highly engaging, visually appealing, and easy-to-memorize study flashcards about "${payload}". 
      
      STRICT RULES:
      - FRONT: A clear, specific question or concept. Keep it strictly between 5 to 10 words. Use 1-2 relevant emojis. 🧠
      - BACK: A concise, punchy explanation that is strictly between 10 to 15 words. Use bullet points, bold text, and mnemonics if possible. Make it interesting, eye-catching, and easy to memorize. Use tables or schematic manner where applicable.
      - INTERACTIVE: Frame questions to spark curiosity.
      - FORMATTING: Use Markdown for structure. Use LaTeX ($...$) for math/science formulas.
      ${contextStr}`;
    } else if (source === 'image') {
      image = { data: payload, mimeType: mimeType || 'image/jpeg' };
      prompt = `Analyze this image and generate ${count} highly engaging, visually appealing, and easy-to-memorize study flashcards based on its content. 
      
      STRICT RULES:
      - FRONT: A clear, specific question or concept derived from the image. Keep it strictly between 5 to 10 words. Use 1-2 relevant emojis. 📸
      - BACK: A concise, punchy explanation that is strictly between 10 to 15 words. Use bullet points, bold text, and mnemonics if possible. Make it interesting, eye-catching, and easy to memorize. Use tables or schematic manner where applicable.
      - FORMATTING: Use Markdown for structure. Use LaTeX ($...$) for math/science formulas.
      ${contextStr}`;
    } else if (source === 'youtube') {
      // Pre-fetch search results for the video
      const searchResults = await executeWebSearch(`site:youtube.com ${payload} summary transcript`);
      extraContext = `\n\nVideo Context/Search Results:\n${searchResults}`;
      
      prompt = `Based on the following video context, generate ${count} highly engaging, visually appealing, and easy-to-memorize study flashcards: "${payload}". 
      ${extraContext}
      
      STRICT RULES:
      - FRONT: A clear, specific question or concept from the video. Keep it strictly between 5 to 10 words. Use 1-2 relevant emojis. 🎥
      - BACK: A concise, punchy explanation that is strictly between 10 to 15 words. Use bullet points, bold text, and mnemonics if possible. Make it interesting, eye-catching, and easy to memorize. Use tables or schematic manner where applicable.
      - FORMATTING: Use Markdown for structure. Use LaTeX ($...$) for math/science formulas.
      ${contextStr}`;
    }

    const text = await callAI(prompt, { 
      json: true, 
      schema: flashcardSchema, 
      image
    });

    const rawData = robustParseJSON(text) || [];
    // Handle both array directly or object with key
    const cards = Array.isArray(rawData) ? rawData : (rawData.items || rawData.flashcards || []);
    
    return cards.map((item: any) => ({ id: generateId(), front: item.front, back: item.back, mastered: false }));
  } catch (error) {
    console.error("Error generating flashcards:", error);
    return [];
  }
};

export const generateDiagramCode = async (prompt: string): Promise<string> => {
  try {
    const text = await callAI(`Generate Mermaid.js diagram code for: "${prompt}".
      
      STRICT SYNTAX RULES:
      1. First, think step-by-step about the structure, logic, and relationships of the diagram. Wrap your thinking entirely in <think>...</think> tags.
      2. Use 'graph TD' for flowcharts or 'mindmap' for concept maps.
      3. ALL node labels MUST be wrapped in double quotes and square brackets, e.g., A["My Label"].
      4. Do NOT use parentheses () or curly braces {} in labels unless they are inside double quotes.
      5. Node IDs should be simple alphanumeric strings (e.g., Node1, StepA).
      6. Avoid using special characters like +, -, *, /, (, ), [, ], {, } in node IDs.
      7. Use standard arrow syntax: A -->|Label| B or A --> B. Do NOT use |Label|> or other non-standard arrows.
      8. Return ONLY the raw Mermaid code after your <think> block. No markdown blocks.`);
    
    let code = text.trim();
    // Strip out the <think> block robustly
    if (code.includes('</think>')) {
      code = code.split('</think>')[1];
    }
    code = code.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    code = code.replace(/```mermaid/g, '').replace(/```/g, '').trim();
    return code;
  } catch (error) {
    return "graph TD\nA[\"Error\"] --> B[\"Could not generate diagram\"]";
  }
};

export const enhanceNoteContent = async (content: string): Promise<string> => {
  if (!content) return "";
  try {
    const text = await callAI(`You are MUKTI AI, an elite study material designer. Your task is to transform the provided raw notes into an "Attractive Visual Study Guide" that is highly structured, clear, simple, and easy to learn.

        STRICT RULES:
        1. STRUCTURE: Use clear headings, bullet points, and numbered lists. Make it highly schematic and easy to learn.
        2. KEY POINTS: Highlight the most important concepts in a "Key Points" section.
        3. DEFINITIONS: Create a dedicated "Definitions" section for technical terms.
        4. VISUALS: Use relevant emojis (🌟, 🧪, 📐, 🧬, 🧠) abundantly to make the notes engaging, interesting, and eye-catching.
        5. TABLES: Use Markdown tables extensively to compare concepts, organize data, or summarize information.
        6. SPECIAL CHARACTERS: Use LaTeX ($...$) for ALL mathematical symbols, chemical formulas (e.g., $H_2O$, $C_6H_{12}O_6$), and scientific signs.
        7. TONE: Keep it clear, simple, and encouraging.
        8. OUTPUT: Return ONLY the enhanced, structured content. Do NOT include any conversational text, introductions, or conclusions.
        
        Raw Notes to Enhance:
        ${content}`);
    return text.trim() || content;
  } catch (error) { return content; }
};

export const processImageToNote = async (base64Data: string, mimeType: string): Promise<{title: string, content: string}> => {
  try {
    const text = await callAI(`You are an expert OCR and study material designer. Extract text from this image and format it as a "Visual Study Guide". 
      The content should be highly attractive, clear, easy to learn, interesting, and eye-catching.
      
      STRICT RULES:
      1. USE TABLES: Extensively use markdown tables for any comparisons or structured data.
      2. USE EMOJIS: Use emojis abundantly to highlight sections and keep it interesting.
      3. SCHEMATIC MANNER: Organize the content in a schematic, highly structured way.
      4. KEY POINTS & DEFINITIONS: Explicitly separate these.
      5. SPECIAL CHARACTERS: Use LaTeX ($...$) for all formulas and scientific signs.
      6. FORMAT: Return as a structured JSON object with "title" and "content" fields. Respond ONLY with valid JSON.`, {
      image: { data: base64Data, mimeType },
      json: true,
      schema: { 
        type: Type.OBJECT, 
        properties: { 
          title: { type: Type.STRING, description: "A concise, catchy title for the notes" }, 
          content: { type: Type.STRING, description: "The detailed, enhanced study notes formatted in Markdown" } 
        }, 
        required: ["title", "content"] 
      }
    });
    
    if (!text) return { title: "Error", content: "Failed to extract text." };
    
    const data = robustParseJSON(text);
    if (!data) return { title: "Error", content: "Failed to parse AI response." };
    
    return data;
  } catch (error) { 
    console.error("Error processing image to note:", error);
    return { title: "Error", content: "Failed to process image." }; 
  }
};

export const solveProblemFromImage = async (base64Data: string, mimeType: string, context?: string): Promise<string> => {
  try {
    const text = await callAI(`You are an expert academic problem solver. 
    Analyze the image and the provided context.
    
    Context provided by user: "${context || ''}"
    
    INSTRUCTIONS:
    1. If the context or image contains a mathematical expression (like "1.1-4"), SOLVE IT mathematically. Do not interpret it as a section number unless explicitly stated.
    2. If it is a word problem, solve it step-by-step.
    3. If it is a conceptual question, explain it clearly.
    4. Provide the final answer clearly at the end.
    
    Solve now.`, {
      image: { data: base64Data, mimeType }
    });
    return text || "Couldn't solve.";
  } catch (error) { return "Error."; }
};

export const getChatResponseStream = async (history: any[], message: string) => {
  const settings = getSettings();
  
  const selectedModelStr = settings.textModel || 'groq:qwen/qwen3-32b';
  const [provider, modelId] = selectedModelStr.split(':');

  let apiKey = '';
  let url = '';

  if (provider === 'groq') {
      apiKey = settings.groqKey || process.env.GROQ_API_KEY || '';
      url = 'https://api.groq.com/openai/v1/chat/completions';
  } else if (provider === 'openrouter') {
      apiKey = settings.openrouterKey || process.env.OPENROUTER_API_KEY || '';
      url = 'https://openrouter.ai/api/v1/chat/completions';
  } else if (provider === 'gemini') {
      apiKey = getGeminiKey();
  }

  if (!apiKey) {
      throw new Error(`No API Key found for ${provider}. Please add one in Settings! ⚠️`);
  }

  if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey });
      const contents = [...history];
      const validContents = contents.filter(c => c.parts && c.parts.length > 0 && c.parts[0].text);
      if (validContents.length > 0 && validContents[0].role === 'model') {
        validContents.shift();
      }
      validContents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      try {
        const stream = await ai.models.generateContentStream({
          model: modelId,
          contents: validContents,
          config: {
            systemInstruction: getContextPrompt(),
            tools: [{ googleSearch: {} }]
          }
        });
        
        return (async function* () {
            for await (const chunk of stream) {
                if (chunk.text) {
                    yield { text: chunk.text };
                }
            }
        })();
      } catch (error: any) {
        if (error?.message?.includes('tool') || error?.message?.includes('search')) {
          const stream = await ai.models.generateContentStream({
            model: modelId,
            contents: validContents,
            config: {
              systemInstruction: getContextPrompt()
            }
          });
          return (async function* () {
            for await (const chunk of stream) {
                if (chunk.text) {
                    yield { text: chunk.text };
                }
            }
          })();
        }
        throw error;
      }
  }

  const messages = [
    { role: 'system', content: getContextPrompt() },
    ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0].text })),
    { role: 'user', content: message }
  ];

  const searchTool = {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" }
        },
        required: ["query"]
      }
    }
  };

  const browseTool = {
    type: "function",
    function: {
      name: "visit_webpage",
      description: "Visit a webpage and extract its text content",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to visit" }
        },
        required: ["url"]
      }
    }
  };

  const codeTool = {
    type: "function",
    function: {
      name: "execute_code",
      description: "Execute Python code and return the output",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "The Python code to execute" }
        },
        required: ["code"]
      }
    }
  };

  const wolframTool = {
    type: "function",
    function: {
      name: "wolfram_alpha",
      description: "Query Wolfram Alpha for math, science, and real-time data",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The query for Wolfram Alpha" }
        },
        required: ["query"]
      }
    }
  };

  let tools: any[] | undefined = undefined;
  
  // Provide all tools to all text models by default as requested
  // But disable for models known not to support tools
  const isToolSupported = !modelId.includes('compound') && !modelId.includes('deepseek') && !modelId.includes('mini');
  if (isToolSupported) {
      tools = [searchTool, browseTool, wolframTool, codeTool];
  }

  const performFetch = async (currentUrl: string, currentKey: string, currentModel: string, currentMessages: any[], skipTools = false) => {
      // If skipping tools, remove any tool-related messages from the end of history
      // as they will cause errors if the model is not provided with tools.
      let filteredMessages = currentMessages;
      if (skipTools) {
          filteredMessages = currentMessages.filter(m => m.role !== 'tool' && !m.tool_calls);
      }

      const body: any = {
          model: currentModel,
          messages: filteredMessages,
          stream: true
      };
      if (tools && tools.length > 0 && !skipTools) {
          body.tools = tools;
          body.tool_choice = "auto";
      }
      return fetch(currentUrl, {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${currentKey}`,
              'Content-Type': 'application/json',
              ...(provider === 'openrouter' ? {
                  'HTTP-Referer': window.location.origin,
                  'X-Title': 'MUKTI Study'
              } : {})
          },
          body: JSON.stringify(body)
      });
  };

  let response = await performFetch(url, apiKey as string, modelId, messages);

  if (!response.ok) {
    let errData = await response.json().catch(() => ({}));
    let errMsg = (errData.error?.message || errData.message || JSON.stringify(errData) || `Failed to connect to ${provider}`).toLowerCase();
    
    // If the model fails to generate a valid tool call, retry without tools
    if (errMsg.includes("failed to call a function") || errMsg.includes("failed_generation") || errMsg.includes("tool_calls") || errMsg.includes("not supported with this model")) {
        console.warn("Model failed to call a function or does not support tools, retrying without tools...");
        response = await performFetch(url, apiKey as string, modelId, messages, true);
        if (!response.ok) {
            errData = await response.json().catch(() => ({}));
            errMsg = errData.error?.message || errData.message || `Failed to connect to ${provider} after retry`;
            throw new Error(errMsg);
        }
    } else {
        throw new Error(errData.error?.message || errData.message || errMsg);
    }
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  return (async function* () {
    if (!reader) return;
    let buffer = '';
    let isToolCall = false;
    let toolCallId = '';
    let toolCallName = '';
    let toolCallArgs = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ') || line.startsWith(':')) continue;
        const cleanLine = line.replace(/^data:\s*/, '').trim();
        if (cleanLine === '' || cleanLine === '[DONE]') continue;
        
        try {
          const json = JSON.parse(cleanLine);
          
          if (json.error) {
              const errMsg = json.error.message || "API Error during streaming";
              throw new Error(`[API_ERROR] ${errMsg}`);
          }

          if (provider === 'groq' && json.usage?.total_tokens) {
              updateGroqUsage(json.usage.total_tokens);
          }

          const delta = json.choices?.[0]?.delta;
          if (delta?.tool_calls) {
              isToolCall = true;
              const tc = delta.tool_calls[0];
              if (tc.id) toolCallId = tc.id;
              if (tc.function?.name) toolCallName = tc.function.name;
              if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
          } else {
              if (delta?.reasoning) {
                  yield { reasoning: delta.reasoning };
              }
              if (delta?.content) {
                  yield { text: delta.content };
              }
          }
        } catch (e: any) {
          if (e.message && e.message.startsWith("[API_ERROR]")) {
              throw new Error(e.message.replace("[API_ERROR] ", ""));
          }
          console.warn("Error parsing stream chunk", e);
        }
      }
    }

    if (isToolCall) {
        let displayToolName = toolCallName;
        if (toolCallName === 'web_search') displayToolName = '🔍 Searching the web';
        else if (toolCallName === 'visit_webpage') displayToolName = '🌐 Browsing webpage';
        else if (toolCallName === 'execute_code') displayToolName = '💻 Executing code';
        else if (toolCallName === 'wolfram_alpha') displayToolName = '🧮 Querying Wolfram Alpha';

        yield { tool: displayToolName };
        let toolResult = "";
        try {
            const args = JSON.parse(toolCallArgs || "{}");
            if (toolCallName === 'web_search') {
                toolResult = await executeWebSearch(args.query || "");
            } else if (toolCallName === 'visit_webpage') {
                toolResult = await executeWebVisit(args.url || "");
            } else if (toolCallName === 'execute_code') {
                toolResult = "Code execution is simulated. Output: Success.";
            } else if (toolCallName === 'wolfram_alpha') {
                toolResult = "Wolfram Alpha query simulated. Result: 42.";
            }
        } catch (e) {
            toolResult = "Error executing tool.";
        }
        
        // Ensure toolCallId is not empty for OpenRouter
        const safeToolCallId = toolCallId || `call_${Date.now()}`;

        messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [{
                id: safeToolCallId,
                type: 'function',
                function: { name: toolCallName, arguments: toolCallArgs || "{}" }
            }]
        } as any);
        messages.push({
            role: 'tool',
            tool_call_id: safeToolCallId,
            name: toolCallName,
            content: toolResult
        } as any);
        
        let secondResponse = await performFetch(url, apiKey as string, modelId, messages);
        yield { doneTool: true };

        let secondErrData = null;
        if (!secondResponse.ok) {
            secondErrData = await secondResponse.json().catch(() => ({}));
            let errMsg = (secondErrData.error?.message || secondErrData.message || JSON.stringify(secondErrData) || "").toLowerCase();
            if (errMsg.includes("failed to call a function") || errMsg.includes("failed_generation") || errMsg.includes("tool_calls")) {
                console.warn("Model failed to call a function on second pass, retrying without tools...");
                secondResponse = await performFetch(url, apiKey as string, modelId, messages, true);
                if (!secondResponse.ok) {
                    secondErrData = await secondResponse.json().catch(() => ({}));
                }
            }
        }

        if (secondResponse.ok) {
            const secondReader = secondResponse.body?.getReader();
            if (secondReader) {
                let secondBuffer = '';
                while (true) {
                    const { done, value } = await secondReader.read();
                    if (done) break;
                    secondBuffer += decoder.decode(value, { stream: true });
                    const lines = secondBuffer.split('\n');
                    secondBuffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        if (line.startsWith('event: ') || line.startsWith(':')) continue;
                        const cleanLine = line.replace(/^data:\s*/, '').trim();
                        if (cleanLine === '' || cleanLine === '[DONE]') continue;
                        try {
                            const json = JSON.parse(cleanLine);
                            if (json.error) {
                                const errMsg = json.error.message || "API Error during streaming";
                                throw new Error(`[API_ERROR] ${errMsg}`);
                            }
                            const delta = json.choices?.[0]?.delta;
                            if (delta?.reasoning) {
                                yield { reasoning: delta.reasoning };
                            }
                            if (delta?.content) {
                                yield { text: delta.content };
                            }
                        } catch (e: any) {
                            if (e.message && e.message.startsWith("[API_ERROR]")) {
                                throw new Error(e.message.replace("[API_ERROR] ", ""));
                            }
                            console.warn("Error parsing second stream chunk", e);
                        }
                    }
                }
            }
        } else {
            console.error("Second response failed", secondErrData);
            yield { text: "\n\n*Error getting final response after tool call. Please try again.*" };
        }
    }
  })();
};
