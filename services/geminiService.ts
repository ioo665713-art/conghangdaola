import { GoogleGenAI, Type } from "@google/genai";
import { CategoryData } from "../types";

// This service is used to generate custom categories or fill in missing ones
// based on the user's massive list using Gemini 2.5 Flash.

export const generateCategoryItems = async (topic: string): Promise<string[]> => {
  let apiKey = '';
  
  // Safe access to process.env to avoid ReferenceError in some browser environments
  try {
    if (typeof process !== 'undefined' && process.env) {
      apiKey = process.env.API_KEY || '';
    }
  } catch (e) {
    console.warn("Could not access process.env", e);
  }
  
  // If no API key is present, return a generated mock list to ensure the app remains playable.
  if (!apiKey) {
    console.warn("No API Key found for Gemini. Using fallback.");
    return Array.from({ length: 16 }, (_, i) => `${topic} ${i + 1}`);
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a list of exactly 16 popular, distinct items for the category: "${topic}". 
      Return JSON with a single property "items" containing the array of strings.
      Keep strings short (under 12 chars).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    let text = response.text;
    if (!text) return [];

    // Clean up potential markdown blocks if responseMimeType didn't handle it perfectly
    // e.g. remove ```json and ```
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const data = JSON.parse(text);
    if (data && Array.isArray(data.items)) {
      return data.items.slice(0, 20);
    }
    
    return [];
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    // Return empty array to signal failure, App.tsx will handle fallback
    return [];
  }
};