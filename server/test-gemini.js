const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });


async function listModels() {
  console.log('Key length:', process.env.GEMINI_API_KEY?.length);
  console.log('Key prefix:', process.env.GEMINI_API_KEY?.substring(0, 4));
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    // There isn't a direct listModels in GenAI SDK easily accessible without extra auth usually
    // but let's try a simple generation with a very basic model
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent("test");
    console.log(result.response.text());
  } catch (e) {
    console.error(e);
  }
}

listModels();
