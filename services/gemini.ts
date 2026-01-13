
import { GoogleGenAI, Type } from "@google/genai";
import { CURRICULUM_DATA } from '../constants';

// Funció segura per obtenir la clau d'API de l'entorn
const getApiKey = () => {
  // En entorns de navegador, process.env pot no estar disponible directament 
  // sense un bundler que el mapegi. Assumim que l'entorn el proporciona segons instruccions.
  const key = process.env.API_KEY;
  if (!key) {
    console.error("EDUPLAN ERROR: No s'ha trobat la variable d'entorn API_KEY.");
  }
  return key;
};

const handleApiError = async (error: any) => {
  console.error("EDUPLAN GEMINI ERROR DETALLAT:", error);
  
  const message = error?.message || "";
  const status = error?.status || (error?.cause?.status);

  if (message.includes("API key not valid") || status === 401) {
    return "Error: La clau d'API no és vàlida o no s'ha configurat correctament a Vercel.";
  }
  
  if (message.includes("model not found") || message.includes("Requested entity was not found") || status === 404) {
    return "Error: El model 'gemini-3-flash-preview' no està disponible per a la teva clau/regió.";
  }

  if (status === 429) {
    return "Error: Massa peticions. Espera uns segons (quota del pla gratuït).";
  }
  
  return `Error de connexió: ${message || "Revisa la consola del navegador per a més detalls."}`;
};

// Utilitzem el model Flash que és el més estable per al pla gratuït
const DEFAULT_MODEL = 'gemini-3-flash-preview';

export const suggestActivityDetails = async (title: string, grade: string) => {
  const key = getApiKey();
  if (!key) return "Configura la API_KEY a Vercel.";
  
  const ai = new GoogleGenAI({ apiKey: key });
  const prompt = `Ets un mestre expert de Catalunya. Genera una descripció pedagògica per a l'activitat: "${title}" (Nivell: ${grade}). Inclou objectiu didàctic i dinàmica. Respon en Català i text pla.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return await handleApiError(error);
  }
};

export const expandActivityContent = async (title: string, shortDescription: string, grade: string) => {
  const key = getApiKey();
  if (!key) return "Configura la API_KEY.";
  
  const ai = new GoogleGenAI({ apiKey: key });
  const prompt = `Seqüència didàctica detallada per a l'activitat "${title}" (${grade}). Descripció base: ${shortDescription}. Genera: Introducció, Desenvolupament i Tancament. Català, text pla.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return await handleApiError(error);
  }
};

export const suggestEvaluation = async (title: string, description: string, grade: string) => {
  const key = getApiKey();
  if (!key) return "Configura la API_KEY.";
  
  const ai = new GoogleGenAI({ apiKey: key });
  const prompt = `Ets expert en avaluació competencial. Genera indicadors d'avaluació i instruments per a l'activitat "${title}" de ${grade}. Descripció: ${description}. Català, text pla.`;

  try {
    const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    return await handleApiError(error);
  }
};

export const generateRubricHTML = async (title: string, description: string, criteria: string[], grade: string) => {
  const key = getApiKey();
  if (!key) return "<p>Configura la API_KEY.</p>";
  
  const ai = new GoogleGenAI({ apiKey: key });
  const criteriaListString = criteria.map(c => `- ${c}`).join('\n');
  
  const prompt = `Genera una rúbrica en format taula HTML per a l'activitat "${title}". Criteris: ${criteriaListString}. Nivell: ${grade}. Genera NOMÉS el codi HTML de la <table>.`;

  try {
    const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
    });
    const text = response.text || '';
    return text.replace(/```html/g, '').replace(/```/g, '').trim();
  } catch (error) {
    const err = await handleApiError(error);
    return `<div class="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">${err}</div>`;
  }
};

export const suggestCurriculumLinks = async (title: string, description: string) => {
  const key = getApiKey();
  if (!key) return [];
  
  const ai = new GoogleGenAI({ apiKey: key });
  // Limitem el context per no saturar el prompt en el model flash
  const curriculumContext = CURRICULUM_DATA.slice(0, 40).map(c => ({
    id: c.id,
    area: c.area,
    text: `${c.saber}: ${c.description}`
  })).map(c => JSON.stringify(c)).join('\n');

  const prompt = `Troba els 3 millors vincles curriculars per a l'activitat "${title}". Currículum:\n${curriculumContext}`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: { 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ['id', 'reason']
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Error en suggestCurriculumLinks", error);
    return [];
  }
};

export const chatWithCurriculum = async (message: string, history: {role: string, text: string}[]) => {
    const key = getApiKey();
    if (!key) throw new Error("API_KEY no configurada.");
    
    const ai = new GoogleGenAI({ apiKey: key });
    const systemInstruction = "Ets un expert en el currículum català de primària. Respon sempre en català. Sigues concís i professional.";

    try {
        const chatSession = ai.chats.create({
            model: DEFAULT_MODEL,
            config: { systemInstruction },
            history: history.map(h => ({
                role: h.role as 'user' | 'model',
                parts: [{ text: h.text }]
            }))
        });

        return await chatSession.sendMessageStream({ message });
    } catch (error) {
        const err = await handleApiError(error);
        throw new Error(err);
    }
};
