const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function diagnose() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const models = [
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-pro-latest',
    'gemini-2.5-flash'
  ];

  console.log('--- Quota Diagnosis ---');
  for (const modelName of models) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hi');
      const text = result.response.text();
      console.log(`✅ Success! Response: ${text.substring(0, 20)}...`);
    } catch (error) {
      if (error.message.includes('429')) {
        console.log(`❌ Quota Exceeded (429): ${error.message.split('\n')[0]}`);
      } else if (error.message.includes('404')) {
        console.log(`❌ Not Found (404)`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
}

diagnose();
