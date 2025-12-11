import { GoogleGenAI } from "@google/genai";
import { DrawingPart, Language } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateTopic = async (lang: Language): Promise<string> => {
  try {
    const prompt = lang === 'zh'
      ? "生成一个简单的、具体的日常物品名词，用于画图游戏（例如：'牙刷'、'草莓'、'苹果'、'椅子'）。只返回这一个词，不要标点符号，不要多余的文字。"
      : "Generate a single, simple, concrete everyday object for a drawing game (e.g., 'Toothbrush', 'Strawberry', 'Apple', 'Chair'). Return ONLY the noun, no punctuation.";

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || (lang === 'zh' ? "快乐的小狗" : "A Happy Dog");
  } catch (error) {
    console.error("Error generating topic:", error);
    return lang === 'zh' ? "神秘物体" : "A Mystery Object";
  }
};

export const generateAiDrawing = async (topic: string, part: DrawingPart): Promise<string> => {
  try {
    // We want the AI to draw the specific part.
    // If part is BOTTOM, we want the legs/lower body.
    // If part is TOP, we want the head/upper body.
    
    const partDescription = part === DrawingPart.TOP ? "upper half (head and torso)" : "lower half (legs and feet)";
    const otherPart = part === DrawingPart.TOP ? "lower body" : "head or upper body";

    const prompt = `
      Draw a simple, bold black-and-white line art sketch of the ${partDescription} of: ${topic}.
      White background. 
      Do NOT draw the ${otherPart}. 
      Make it look like a hand-drawn doodle with a thick marker.
      Center the drawing.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
    });

    // Extract image
    for (const p of response.candidates?.[0]?.content?.parts || []) {
      if (p.inlineData && p.inlineData.data) {
        return `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`;
      }
    }
    
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating AI drawing:", error);
    // Return a transparent 1x1 pixel as fallback to prevent crash
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
};
