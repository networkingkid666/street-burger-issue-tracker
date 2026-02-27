import { GoogleGenerativeAI } from "@google/generative-ai";

// Read API key from Vite environment
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize AI safely (do NOT crash app)
let genAI: GoogleGenerativeAI | null = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  console.warn("Gemini API key not found. AI features disabled.");
}

export const GeminiService = {
  /**
   * Expands a short issue title into a professional technical description.
   */
  expandIssueDescription: async (
    title: string,
    category: string
  ): Promise<string> => {
    if (!genAI) {
      return "AI service not configured.";
    }

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      const result = await model.generateContent(`
I am an IT support staff member reporting an issue.

Title: "${title}"
Category: "${category}"

Please generate a professional, detailed description of what might be going wrong and what initial troubleshooting steps could be tried.
Keep it under 150 words.
      `);

      return result.response.text();
    } catch (error) {
      console.error("Gemini expandIssueDescription Error:", error);
      return "Error connecting to AI service.";
    }
  },

  /**
   * Suggests troubleshooting steps based on issue details.
   */
  suggestSolution: async (
    issueTitle: string,
    issueDescription: string
  ): Promise<string> => {
    if (!genAI) {
      return "AI service not configured.";
    }

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      const result = await model.generateContent(`
Act as a senior IT System Administrator.

Analyze the following IT issue and suggest 3 potential solutions or troubleshooting steps formatted as a bulleted list.

Issue: ${issueTitle}
Details: ${issueDescription}
      `);

      return result.response.text();
    } catch (error) {
      console.error("Gemini suggestSolution Error:", error);
      return "Error connecting to AI service.";
    }
  },
};