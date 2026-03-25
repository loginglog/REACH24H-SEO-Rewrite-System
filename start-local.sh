#!/bin/bash

# Terminate background jobs on script exit
trap "kill 0" EXIT

echo "--- 启动 REACH24H SEO 3.0 本地环境 ---"

# 1. 启动 Python NLP 服务
echo "[*] 启动 Python 后端 (localhost:8000)..."
cd python_service
if [ ! -d "venv" ]; then
    echo "    [*] 正在创建 Python 虚拟环境..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
python main.py &
cd ..

# 2. 启动 Node.js 代理服务器
echo "[*] 启动 Node 代理 (localhost:3001)..."
# 确保 server/.env 存在并有 API Key
if [ ! -f "server/.env" ]; then
    echo "警告: server/.env 不存在，请确保配置了 GEMINI_API_KEY。"
fi
npm start &

# 3. 启动 Vite 前端
echo "[*] 启动 Vite 前端 (localhost:5173)..."
npm run dev

wait
