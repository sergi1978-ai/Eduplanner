
import { GoogleGenAI } from "@google/genai";
import { CURRICULUM_DATA } from '../constants';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const suggestActivityDetails = async (title: string, grade: string) => {
  if (!apiKey) throw new Error("API Key missing");
  
  const modelId = 'gemini-2.5-flash';
  const prompt = `
    Ets un mestre expert de primària a Catalunya redactant la programació d'aula.
    Genera una descripció tècnica i completa per a l'activitat escolar: "${title}" (Nivell: ${grade}).
    
    Inclou:
    1. Objectiu didàctic principal.
    2. Dinàmica de treball dels alumnes.
    
    Longitud: 60-80 paraules.
    Estil: Tècnic, professional, per a documentació docent interna. NO t'adrecis a les famílies ni als alumnes.
    IMPORTANT: No utilitzis format markdown ni asteriscs (**). Només text pla.
    Idioma: Català.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini error:", error);
    return "Error generating description.";
  }
};

export const expandActivityContent = async (title: string, shortDescription: string, grade: string) => {
  if (!apiKey) throw new Error("API Key missing");

  const modelId = 'gemini-2.5-flash';
  const prompt = `
    Ets un mestre expert redactant la programació d'aula.
    
    Títol: "${title}"
    Descripció: "${shortDescription}"
    Nivell: ${grade}

    Genera una seqüència didàctica detallada per al mestre:
    1. Introducció (Activació de coneixements previs).
    2. Desenvolupament (Instruccions pas a pas de l'activitat).
    3. Tancament (Síntesi i reflexió).
    
    Estil: Tècnic docent. NO t'adrecis a les famílies.
    IMPORTANT: No utilitzis asteriscs (**) ni format markdown. Escriu en text pla, net i ben redactat en Català.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini expansion error:", error);
    return "Error expanding activity.";
  }
};

export const suggestEvaluation = async (title: string, description: string, grade: string) => {
  if (!apiKey) throw new Error("API Key missing");

  const modelId = 'gemini-2.5-flash';
  const prompt = `
    Ets un especialista en avaluació educativa.
    Activitat: "${title}".
    Descripció: "${description}".
    Nivell: ${grade}.
    
    Genera una proposta tècnica d'avaluació:
    1. Indicadors d'avaluació observables (concrets i mesurables).
    2. Instruments d'avaluació recomanats.
    
    Estil: Documentació interna per al mestre. NO t'adrecis a les famílies.
    Format: Text net, estructurat, en Català. 
    IMPORTANT: No utilitzis asteriscs (**) ni negretes. Només text pla.
    Màxim 150 paraules.
  `;

  try {
    const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini evaluation error:", error);
    return "Error generant avaluació.";
  }
};

export const generateRubricHTML = async (title: string, description: string, criteria: string[], grade: string) => {
  if (!apiKey) throw new Error("API Key missing");
  
  const modelId = 'gemini-2.5-flash';
  
  const criteriaListString = criteria.length > 0 ? criteria.map(c => `- ${c}`).join('\n') : 'Cap criteri específic seleccionat.';
  
  const prompt = `
    Ets un expert en disseny curricular i avaluació.
    Crea un document d'avaluació (rúbrica) complet i tècnic en format HTML optimitzat per a Google Docs.

    Dades de l'activitat:
    - Títol: "${title}"
    - Descripció: "${description}"
    - Nivell: ${grade}
    - Criteris d'Avaluació Oficials (amb la seva nomenclatura específica): 
      ${criteriaListString}

    Requisits del codi:
    1. Genera NOMÉS el codi HTML dins d'un div principal. No incloguis <html>, <head> o <body> tags.
    2. IMPORTANT: Utilitza etiquetes <table> estàndard per a la rúbrica. No utilitzis CSS Grid o Flexbox complex, ja que no es copien bé a Google Docs.
    
    Estructura del document:
    1. Títol <h2>: "${title}"
    2. Apartat de context: "Descripció: ${description.substring(0, 100)}..."
    3. Llistat de Criteris:
       - Crea un apartat titulat "Criteris d'Avaluació Associats".
       - Fes servir una llista <ul> on cada element <li> mostri el text EXACTE proporcionat als criteris (incloent codis com CE1, CE2, etc.).
    4. Taula Rúbrica:
       - Columnes: "Criteri Vinculat", "Excel·lent (4)", "Notable (3)", "Satisfactori (2)", "En procés (1)".
       - A la primera columna, indica quin criteri específic s'està avaluant (Fes servir la nomenclatura oficial, ex: "CE1 - 1.1...").
       - Genera els descriptors per a cada nivell basant-te en els criteris.
    
    Estil: Professional i sobri.
  `;

  try {
    const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
    });
    const text = response.text || '';
    // Clean markdown code blocks if present
    return text.replace(/```html/g, '').replace(/```/g, '').trim();
  } catch (error) {
    console.error("Gemini rubric HTML error:", error);
    return "<p>Error generant el document.</p>";
  }
};

export const suggestCurriculumLinks = async (title: string, description: string) => {
  if (!apiKey) throw new Error("API Key missing");
  
  // Create a simplified version of the curriculum for context to save tokens/complexity
  const curriculumContext = CURRICULUM_DATA.map(c => ({
    id: c.id,
    area: c.area,
    text: `${c.saber}: ${c.description}`
  })).map(c => JSON.stringify(c)).join('\n');

  const modelId = 'gemini-2.5-flash';
  const prompt = `
    I have an educational activity.
    Title: "${title}"
    Description: "${description}"

    Here is the available curriculum list (JSON format):
    ${curriculumContext}

    Analyze the activity and identify the curriculum items that best match it.
    Return a JSON array of objects. Each object must have:
    - "id": The ID of the curriculum item (e.g., "c1").
    - "reason": A brief explanation (max 15 words) in Catalan of why this item fits.

    Select at most 3 items.
    Return ONLY the JSON array, no markdown formatting.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });
    const text = response.text || '[]';
    // Clean up potentially wrapped markdown
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText) as { id: string; reason: string }[];
  } catch (error) {
    console.error("Gemini matching error:", error);
    return [];
  }
};

export const chatWithCurriculum = async (message: string, history: {role: string, text: string}[]) => {
    if (!apiKey) throw new Error("API Key missing");

    const modelId = 'gemini-2.5-flash';
    const systemInstruction = `
    You are an expert educational planner and consultant specializing in the Catalan curriculum for primary education.
    Your goal is to help teachers plan activities, understand curriculum competencies, and evaluate student progress.
    
    Tone: Professional, encouraging, and practical. STRICTLY for teachers, never address parents/families.
    Language: Catalan.
    `;

    const chatSession = ai.chats.create({
        model: modelId,
        config: { systemInstruction },
        history: history.map(h => ({
            role: h.role as 'user' | 'model',
            parts: [{ text: h.text }]
        }))
    });

    const result = await chatSession.sendMessageStream({ message });
    return result;
};
