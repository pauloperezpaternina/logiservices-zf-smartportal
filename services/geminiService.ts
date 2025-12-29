import { GoogleGenAI } from "@google/genai";
import { Shipment } from '../types';

// Initialize Gemini Client
// Ensure API KEY is available in your environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Simulates a RAG (Retrieval Augmented Generation) workflow.
 * In a real production app, this would query a Supabase pgvector database.
 * Here, we perform a naive local search to find relevant context from mock data.
 */
export const querySmartAssistant = async (question: string, allShipments: Shipment[]): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Error: API Key de Google Gemini no configurada. Por favor configura process.env.API_KEY.";
  }

  try {
    // 1. "Retrieval" Step (Simulated)
    // Find relevant shipments based on simple keyword matching
    const keywords = question.toLowerCase().split(' ').filter(w => w.length > 3);
    const relevantData = allShipments.filter(s => {
      const strData = JSON.stringify(s).toLowerCase();
      return keywords.some(k => strData.includes(k));
    });

    // If no specific match, provide summary data
    const contextData = relevantData.length > 0 ? relevantData : allShipments.slice(0, 5); // Limit context size

    // 2. Construct Prompt with Context
    const prompt = `
      Actúa como un asistente logístico inteligente para Logiservices ZF.
      
      Contexto de Inventario y Envíos (Datos recuperados de base de datos):
      ${JSON.stringify(contextData, null, 2)}

      Pregunta del Usuario: "${question}"

      Instrucciones:
      - Responde de forma natural y profesional.
      - Usa los datos proporcionados para responder preguntas sobre estados, fechas, BLs, etc.
      - Si la respuesta no está en los datos, indícalo amablemente.
      - Si el usuario saluda, preséntate brevemente como el Asistente SmartPortal.
      - Responde en español.
    `;

    // 3. "Generation" Step
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Lo siento, no pude generar una respuesta en este momento.";

  } catch (error) {
    console.error("Gemini Error:", error);
    return "Hubo un error conectando con la inteligencia artificial. Por favor intenta más tarde.";
  }
};

/**
 * Simulates OCR extraction from a document using Gemini Vision capabilities
 */
export const extractDataFromDocument = async (base64Image: string, mimeType: string): Promise<any> => {
    if (!process.env.API_KEY) {
        // Fallback mock if no API key
        return {
            blNumber: 'BL-EXTRACTED-' + Math.floor(Math.random() * 1000),
            invoiceNumber: 'INV-' + Math.floor(Math.random() * 1000),
            vcesCode: 'VCES-AUTO'
        };
    }

    try {
        const prompt = `
            Extract the following fields from this logistics document image in JSON format:
            - blNumber (Bill of Lading number)
            - invoiceNumber
            - vcesCode (if present, otherwise null)
            
            Return ONLY the JSON.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Efficient for vision/OCR tasks
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType
                        }
                    },
                    { text: prompt }
                ]
            }
        });

        const text = response.text;
        // Basic cleanup to ensure we parse JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch (e) {
        console.error("OCR Extraction failed", e);
        return null;
    }
}
