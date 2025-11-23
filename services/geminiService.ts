import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { AnalysisResult, EntityType, SeverityLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    transcript: { type: Type.STRING, description: "Verbatim transcription of the input audio (if audio provided), or the input text." },
    detectedLanguage: { type: Type.STRING, description: "The language detected in the input (e.g., 'English', 'Tamil')." },
    entities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "The EXACT substring from the text." },
          type: { 
            type: Type.STRING, 
            enum: [EntityType.DRUG, EntityType.ADE, EntityType.MODIFIER, EntityType.INDICATION]
          },
          severity: {
            type: Type.STRING,
            enum: [SeverityLevel.MILD, SeverityLevel.MODERATE, SeverityLevel.SEVERE, SeverityLevel.UNKNOWN]
          },
          description: { type: Type.STRING }
        },
        required: ["text", "type"]
      }
    },
    summary: { type: Type.STRING },
    patientAgeGroup: { type: Type.STRING },
    overallRiskScore: { type: Type.INTEGER },
    clinicalReasoning: { type: Type.STRING },
    suggestedActions: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }
    },
    sentiment: {
      type: Type.STRING,
      enum: ['Positive', 'Negative', 'Neutral'],
      description: "The overall sentiment of the clinical narrative."
    },
    classification: {
      type: Type.STRING,
      description: "Type of report (e.g., 'Adverse Event Report', 'Product Quality Complaint', 'Medical Inquiry', 'Routine Follow-up')."
    },
    tamilAnalysis: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        clinicalReasoning: { type: Type.STRING },
        suggestedActions: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }
        }
      },
      required: ["summary", "clinicalReasoning", "suggestedActions"]
    }
  },
  required: ["transcript", "entities", "summary", "patientAgeGroup", "overallRiskScore", "clinicalReasoning", "suggestedActions", "sentiment", "classification", "tamilAnalysis"]
};

export const analyzeClinicalContent = async (
  text: string | null, 
  triageLevel: string,
  attachment?: { data: string, mimeType: string }
): Promise<AnalysisResult> => {
  try {
    // Dynamic Model Selection
    // gemini-3-pro-preview: Best for Vision (Image Analysis) and Complex Reasoning
    // gemini-2.5-flash: Best for Audio (Multimodal) and Fast Text
    let modelName = 'gemini-2.5-flash'; 
    let systemContext = `You are ADEGuard, an advanced AI for Pharmacovigilance. 
    Analyze the provided input (Text, Audio, or Image).
    Context: Triage Level "${triageLevel}".
    
    Tasks:
    1. If Audio: Transcribe it verbatim into the 'transcript' field. Detect the language.
    2. If Image: Analyze the visual features (rashes, swelling, pills) and correlate with ADEs. Describe visual findings in 'clinicalReasoning'.
    3. Extract entities (Drugs, ADEs) with high precision.
    4. Assess Risk Score (0-100).
    5. Classify the report type and determine sentiment.
    6. Provide a Tamil translation of the findings.`;

    let contents: any[] = [];

    if (attachment) {
      if (attachment.mimeType.startsWith('image/')) {
        modelName = 'gemini-3-pro-preview'; // Vision Specialist
        systemContext += "\n\nFOCUS ON VISUAL EVIDENCE in the image.";
      } else if (attachment.mimeType.startsWith('audio/')) {
        modelName = 'gemini-2.5-flash'; // Audio Specialist
        systemContext += "\n\nLISTEN CAREFULLY. Transcribe mixed English/Tamil speech accurately.";
      } else if (attachment.mimeType === 'application/pdf') {
        modelName = 'gemini-2.5-flash'; // Long context document
      }

      contents = [{
        role: 'user',
        parts: [
          { text: text || "Analyze this clinical input." },
          { inlineData: { mimeType: attachment.mimeType, data: attachment.data } }
        ]
      }];
    } else {
      if (!text) throw new Error("No input provided");
      contents = [{ role: 'user', parts: [{ text }] }];
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: systemContext
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    console.error("Error analyzing content:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string, voiceName: 'Kore' | 'Puck' = 'Kore'): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};

export const sendChatMessage = async (message: string, history: {role: 'user' | 'model', parts: {text: string}[]}[]): Promise<string> => {
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: "You are the ADEGuard AI Assistant. Help users understand drug safety, analyze symptoms, and navigate the dashboard. Be professional, medical, yet accessible."
    },
    history: history
  });

  const result = await chat.sendMessage({ message });
  return result.text || "I could not generate a response.";
};