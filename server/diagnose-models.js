import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function diagnose() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const models = [
    'gemini-flash-latest',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash'
  ];

  console.log('--- Model Diagnosis (ESM) ---');
  console.log(`Using API Key: ${process.env.GEMINI_API_KEY ? 'Present' : 'Missing'}`);
  
  for (const modelName of models) {
    try {
      process.stdout.write(`Testing ${modelName}: `);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hi');
      const text = await result.response.text();
      console.log(`✅ Success! (Result: ${text.substring(0, 10)}...)`);
    } catch (error) {
      if (error.message.includes('429')) {
        console.log(`❌ 429 (Quota Exceeded)`);
      } else if (error.message.includes('404')) {
        console.log(`❌ 404 (Not Found)`);
      } else if (error.message.includes('API key not valid')) {
        console.log(`❌ 400 (Invalid API Key)`);
      } else {
        console.log(`❌ Error: ${error.message.substring(0, 50)}...`);
      }
    }
  }
}

diagnose();
