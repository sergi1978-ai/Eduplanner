
import { GoogleGenAI, Type } from "@google/genai";
import { CURRICULUM_DATA } from '../constants';

// Auxiliar per crear l'instància de l'API amb la clau actual de l'entorn
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const handleApiError = async (error: any) => {
  console.error("Gemini API Error:", error);
  const message = error?.message || "";
  
  // Si el projecte no es troba o no hi ha permís per al model Pro, sugerim el Flash o revisar la clau
  if (message.includes("Requested entity was not found")) {
    return "El model o projecte no s'ha trobat. Assegura't d'estar fent servir una clau d'AI Studio vàlida i que el model 'gemini-3-flash-preview' estigui disponible.";
  }
  
  if (message.includes("API_KEY_INVALID")) {
    return "La clau d'API no és vàlida. Revisa la configuració de les variables d'entorn.";
  }
  
  return "Problema de connexió amb la IA. Revisa la teva clau d'API.";
};

// Utilitzem el model Flash per a totes les tasques per garantir el funcionament gratuït
const DEFAULT_MODEL = 'gemini-3-flash-preview';

export const suggestActivityDetails = async (title: string, grade: string) => {
  const ai = getAI();
  const prompt = `
    Ets un mestre expert de primària a Catalunya redactant la programació d'aula.
    Genera una descripció tècnica i completa per a l'activitat escolar: "${title}" (Nivell: ${grade}).
    Inclou objectiu didàctic i dinàmica. Text pla en Català.
  `;

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
  const ai = getAI();
  const prompt = `
    Ets un mestre expert redactant la programació d'aula.
    Títol: "${title}"
    Descripció: "${shortDescription}"
    Nivell: ${grade}
    Genera una seqüència didàctica detallada (Introducció, Desenvolupament, Tancament). Text pla en Català.
  `;

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
  const ai = getAI();
  const prompt = `
    Ets un especialista en avaluació educativa.
    Activitat: "${title}".
    Nivell: ${grade}.
    Genera indicadors d'avaluació i instruments recomanats. Text pla en Català.
  `;

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
  const ai = getAI();
  const criteriaListString = criteria.map(c => `- ${c}`).join('\n');
  
  const prompt = `
    Genera una rúbrica en format taula HTML per a l'activitat "${title}".
    Criteris: ${criteriaListString}
    Nivell: ${grade}
    Genera només el codi HTML d'una taula <table>.
  `;

  try {
    const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
    });
    const text = response.text || '';
    return text.replace(/```html/g, '').replace(/```/g, '').trim();
  } catch (error) {
    const err = await handleApiError(error);
    return `<p class="text-red-500">${err}</p>`;
  }
};

export const suggestCurriculumLinks = async (title: string, description: string) => {
  const ai = getAI();
  const curriculumContext = CURRICULUM_DATA.map(c => ({
    id: c.id,
    area: c.area,
    text: `${c.saber}: ${c.description}`
  })).map(c => JSON.stringify(c)).join('\n');

  const prompt = `
    Analyze activity "${title}" and find matches in this curriculum:
    ${curriculumContext}
    Return ONLY a JSON array with items like {"id": "...", "reason": "..."} in Catalan.
  `;

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
              id: { type: Type.STRING, description: 'The curriculum item ID' },
              reason: { type: Type.STRING, description: 'The reason why this item fits the activity in Catalan' },
            },
            required: ['id', 'reason'],
            propertyOrdering: ['id', 'reason']
          }
        }
      }
    });
    const text = response.text || '[]';
    return JSON.parse(text.trim());
  } catch (error) {
    await handleApiError(error);
    return [];
  }
};

export const chatWithCurriculum = async (message: string, history: {role: string, text: string}[]) => {
    const ai = getAI();
    const systemInstruction = "Ets un expert en el currículum català de primària. Respon sempre en català i de forma professional per a docents.";

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
