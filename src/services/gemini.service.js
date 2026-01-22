const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "models/gemini-2.5-flash", // Using stable version
});

exports.generateReply = async (sessionId, text) => {
  try {
    if (!text || text.trim().length === 0) {
      // Return fallback response instead of throwing error
      return "Thank you for calling. How can I help you today?";
    }

    const prompt = `You are a professional phone assistant for a business. Keep responses brief (1-2 sentences max) and helpful. Respond in the same language as the user.

User: ${text}
Assistant:`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: Number(process.env.MAX_OUTPUT_TOKENS) || 100,
        temperature: 0.7,
        topP: 0.9,
      },
    });

    const response = result.response.text();
    console.log(`AI Response for session ${sessionId}: ${response}`);
    return response;
  } catch (error) {
    console.error('Gemini Service Error:', error.message);
    
    // Return fallback responses based on input
    const fallbackResponses = {
      'Option 1': 'Thank you for selecting option 1. Our sales team will assist you shortly.',
      'Option 2': 'You have selected technical support. Please hold while we connect you.',
      'Option 3': 'Thank you for choosing customer service. How can we help you today?',
      'default': 'Thank you for calling. Please hold while we process your request.'
    };
    
    return fallbackResponses[text] || fallbackResponses['default'];
  }
};
