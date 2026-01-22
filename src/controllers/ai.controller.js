const geminiService = require("../services/gemini.service");

exports.askGemini = async (userText) => {
  return await geminiService.generateReply(userText);
};
