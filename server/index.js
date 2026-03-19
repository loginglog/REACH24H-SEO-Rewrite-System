import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelName = "gemini-2.0-flash";
const model = genAI.getGenerativeModel({
  model: modelName,
  generationConfig: {
    responseMimeType: "application/json",
  }
});

// TASK 1: 关键词预测
app.post('/api/predict-keywords', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  try {
    const prompt = `你是一个专业的 SEO 专家，专注于瑞欧科技（REACH24H）所在的专业合规、化学品、环境法规领域。请分析以下文章，预测 10 个搜索热度最高且符合 SEO 逻辑的长尾词（如：REACH法规更新、欧盟SDS编制、危险品运输合规等）。
    以 JSON 格式输出，格式为：{ "keywords": ["词1", "词2", ...] }

    文章内容：
    ${content}`;

    console.log(`Predicting keywords for content length: ${content.length}`);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // 清理可能存在的 Markdown 代码块标记
    text = text.replace(/```json\n?|\n?```/g, '').trim();

    res.json(JSON.parse(text));
  } catch (error) {
    console.error('Error in predict-keywords:', error);
    if (error.stack) console.error(error.stack);
    res.status(500).json({ error: 'Failed to predict keywords', details: error.message });
  }
});

// TASK 2: 平台定向改写
app.post('/api/rewrite', async (req, res) => {
  const { content, platform, keywords } = req.body;

  try {
    const rewriteModel = genAI.getGenerativeModel({ model: modelName });
    const prompt = `你是一个自媒体运营专家，请为 [${platform}] 平台改写文章。
          
核心约束：
1. 必须生成一个吸引人的标题，并使用 <h1> 标签包裹放在文章最顶部。标题必须在 30 个汉字以内（含标点），且第一个关键词"${keywords[0]}"必须出现在标题前 1/3 处。
2. 文章必须分为多个段落，且**每个段落必须使用 <p> 标签包裹**，严禁只输出纯文本。
3. 文章内部的所有小标题必须使用 <b> 或 <strong> 加粗。
4. 开头段落自然嵌入所有勾选的关键词：${keywords.join('、')}。
4. **严禁**输出任何类似于"本文由瑞欧科技团队原创"、"内容仅供参考"、"未经授权请勿转载"或"相关内容可在瑞欧官网查看"的声明文字，这些由系统统一添加。
5. 保留在原文中的核心法规逻辑和术语，重塑开头吸引力、结尾互动性及段落衔接。

输出格式要求：
直接输出 HTML 片段（不含 <html><body> 标签）。不要包含任何 Markdown 代码块标记（如 \`\`\`html）。

原文内容：
${content}`;

    const result = await rewriteModel.generateContent(prompt);
    const response = await result.response;
    let rewrittenContent = response.text();

    // 彻底清理 Markdown 标记和首尾空白
    rewrittenContent = rewrittenContent.replace(/```(html|json)?\n?|\n?```/g, '').trim();

    res.json({ content: rewrittenContent });
  } catch (error) {
    console.error('Error in rewrite:', error);
    if (error.stack) console.error(error.stack);
    res.status(500).json({ error: 'Failed to rewrite content', details: error.message });
  }
});

// 静态文件服务（用于生产环境）
app.use(express.static(path.join(__dirname, '../dist')));

export default app;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
