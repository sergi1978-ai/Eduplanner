
import { GoogleGenAI, Type } from "@google/genai";
import { CURRICULUM_DATA } from '../constants';

/**
 * Totes les crides utilitzen gemini-3-flash-preview, que és el model 
 * més ràpid i amb el pla gratuït més ampli de Google.
 */
const DEFAULT_MODEL = 'gemini-3-flash-preview';

/**
 * Gestió centralitzada d'errors per facilitar el debug a l'usuari.
 */
const handleApiError = (error: any) => {
  console.error("EDUPLAN AI DEBUG:", error);
  const message = error?.message || "";
  
  if (message.includes("API key not valid") || message.includes("401")) {
    return "Error: La clau API_KEY no és vàlida o no s'ha configurat a Vercel.";
  }
  
  if (message.includes("location is not supported")) {
    return "Error: Aquesta regió no està suportada pel pla gratuït de Google. Prova de canviar la regió del deployment a Vercel.";
  }

  if (message.includes("User location is not supported")) {
    return "Error: El servei Gemini no està disponible a la teva ubicació actual (prova amb VPN o revisa la regió de Vercel).";
  }

  return `Error de la IA: ${message || "No es pot connectar."}`;
};

export const suggestActivityDetails = async (title: string, grade: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Ets un mestre expert a Catalunya. Genera una descripció per a l'activitat: "${title}" (${grade}). Inclou objectiu i dinàmica. Català.`,
    });
    return response.text;
  } catch (error) {
    return handleApiError(error);
  }
};

export const expandActivityContent = async (title: string, shortDescription: string, grade: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Seqüència didàctica detallada per: "${title}" (${grade}). Base: ${shortDescription}. Català.`,
    });
    return response.text;
  } catch (error) {
    return handleApiError(error);
  }
};

export const suggestEvaluation = async (title: string, description: string, grade: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Proposa indicadors d'avaluació per a: "${title}" (${grade}). Descripció: ${description}. Català.`,
    });
    return response.text;
  } catch (error) {
    return handleApiError(error);
  }
};

export const generateRubricHTML = async (title: string, description: string, criteria: string[], grade: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const criteriaList = criteria.map(c => `- ${c}`).join('\n');
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Genera una taula HTML <table> d'una rúbrica per "${title}" (${grade}). Criteris: ${criteriaList}.`,
    });
    const text = response.text || '';
    return text.replace(/```html/g, '').replace(/```/g, '').trim();
  } catch (error) {
    return `<div class="p-4 bg-red-50 text-red-600 rounded-lg">${handleApiError(error)}</div>`;
  }
};

export const suggestCurriculumLinks = async (title: string, description: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const context = CURRICULUM_DATA.slice(0, 30).map(c => ({ id: c.id, text: c.description }));
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Tria els 3 IDs de currículum que millor encaixen amb "${title}".\n${JSON.stringify(context)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ['id', 'reason']
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const chatWithCurriculum = async (message: string, history: {role: string, text: string}[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const chat = ai.chats.create({
      model: DEFAULT_MODEL,
      config: { systemInstruction: "Ets un expert en currículum de primària. Respon en català." },
      history: history.map(h => ({ role: h.role as 'user' | 'model', parts: [{ text: h.text }] }))
    });
    return await chat.sendMessageStream({ message });
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
