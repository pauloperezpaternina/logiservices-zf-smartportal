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

/**
 * Extract D.Orden data from "Formulario de Movimiento de Mercancías" PDF/Image
 * This extracts all relevant fields to auto-fill the D.Orden creation form
 */
export interface ExtractedDOrdenData {
  // D.Orden fields
  do_code?: string;
  bl_no?: string;
  producto?: string;
  bultos?: number;
  peso_bruto?: number;
  cliente_nombre?: string;
  cliente_nit?: string;
  // Movement fields
  formulario_ref?: string;
  contenedor?: string;
  sello?: string;
  fecha_ingreso?: string;
  // Additional info
  descripcion_mercancia?: string;
  agencia_aduana?: string;
}

export const extractDOrdenFromFormulario = async (base64Image: string, mimeType: string): Promise<ExtractedDOrdenData | null> => {
  if (!process.env.API_KEY) {
    console.error('API_KEY not configured');
    return null;
  }

  try {
    const prompt = `
            Analiza este "Formulario de Movimiento de Mercancías" de Zona Franca y extrae los siguientes datos en formato JSON:

            Campos a extraer:
            - do_code: El código "DO LS" o número de D.Orden (ejemplo: "1975-2025" o "DO LS1975-2025")
            - bl_no: Documento de Transporte o BL (ejemplo: "BWLECTDR2300")
            - producto: Descripción del producto en la sección "DETALLE DE ÍTEMS POR SUBPARTIDA" o "DESCRIPCIÓN"
            - bultos: Número de Bultos (buscar "Número de Bultos")
            - peso_bruto: Peso Bruto en KG (buscar "Peso Bruto")
            - cliente_nombre: Nombre del Importador (buscar "Importador")
            - cliente_nit: NIT del importador (número después del nombre del importador)
            - formulario_ref: Número de Formulario (buscar "Formulario:" al inicio)
            - contenedor: Número de Contenedor (buscar "NUMERO DE CONTENEDOR", puede tener formato como "HFMU2428164")
            - sello: Número de Sello (buscar "SELLO" junto al contenedor, ejemplo: "MLD00039632")
            - fecha_ingreso: Fecha Elaborado en formato YYYY-MM-DD (buscar "Fecha Elaborado")
            - descripcion_mercancia: Descripción completa de la mercancía
            - agencia_aduana: Nombre de la Agencia de Aduana (buscar "AGENCIA DE ADUANA")

            IMPORTANTE:
            - Si un campo no se encuentra, usar null
            - Los números deben ser numéricos (sin comas)
            - El DO LS puede aparecer en la tabla de "COMENTARIO DE LA OPERACION" o similar
            - Retornar SOLO el JSON sin explicaciones adicionales
            
            Ejemplo de respuesta esperada:
            {
                "do_code": "1975-2025",
                "bl_no": "BWLECTDR2300",
                "producto": "BARQUILLOS RELLENOS DE CHOCOLATE Y AVELLANA",
                "bultos": 1975,
                "peso_bruto": 6715.28,
                "cliente_nombre": "MORENOS S.A.S",
                "cliente_nit": "860075498",
                "formulario_ref": "918870643",
                "contenedor": "HFMU2428164",
                "sello": "MLD00039632",
                "fecha_ingreso": "2026-01-05",
                "descripcion_mercancia": "BARQUILLOS RELLENOS DE CHOCOLATE Y AVELLANA - SECCION IV PRODUCTOS DE LAS INDUSTRIAS ALIMENTARIAS",
                "agencia_aduana": "CICOREX"
            }
        `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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

    const text = response.text || '';
    console.log('Gemini raw response:', text);

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Clean up numeric fields
      if (parsed.bultos && typeof parsed.bultos === 'string') {
        parsed.bultos = parseInt(parsed.bultos.replace(/,/g, ''), 10) || 0;
      }
      if (parsed.peso_bruto && typeof parsed.peso_bruto === 'string') {
        parsed.peso_bruto = parseFloat(parsed.peso_bruto.replace(/,/g, '')) || 0;
      }

      return parsed as ExtractedDOrdenData;
    }

    console.error('Could not parse JSON from Gemini response');
    return null;
  } catch (e) {
    console.error("D.Orden extraction failed:", e);
    return null;
  }
}

/**
 * Process multiple images/pages and combine extracted data
 */
export const extractDOrdenFromMultipleImages = async (images: { base64: string; mimeType: string }[]): Promise<ExtractedDOrdenData | null> => {
  const allData: ExtractedDOrdenData = {};

  for (const img of images) {
    const extracted = await extractDOrdenFromFormulario(img.base64, img.mimeType);
    if (extracted) {
      // Merge data, keeping first non-null values
      Object.keys(extracted).forEach(key => {
        const k = key as keyof ExtractedDOrdenData;
        if (extracted[k] !== null && extracted[k] !== undefined && !allData[k]) {
          (allData as any)[k] = extracted[k];
        }
      });
    }
  }

  return Object.keys(allData).length > 0 ? allData : null;
}
