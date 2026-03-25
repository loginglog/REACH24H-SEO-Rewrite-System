import os
import time
import requests
from urllib.parse import urljoin, urlparse
import asyncio
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from bs4 import BeautifulSoup
from fastapi.staticfiles import StaticFiles
import jieba
import jieba.analyse
from textrank4zh import TextRank4Keyword
import pangu
import sqlite3
import datetime

# Attempt to import BaiduSpider if available
try:
    from baiduspider import BaiduSpider
except ImportError:
    BaiduSpider = None

# Initialize SQLite for Baidu Monitor
conn = sqlite3.connect("monitor.db", check_same_thread=False)
cursor = conn.cursor()
cursor.execute('''CREATE TABLE IF NOT EXISTS publications
                (id INTEGER PRIMARY KEY, url TEXT, title TEXT, platform TEXT, publish_date TEXT)''')
conn.commit()

# Initialize jieba with custom words
WHITELIST_TERMS = [
    "REACH", "FDA", "K-REACH", "PFAS", "EPA", "BPR", "UK REACH", "RoHS", "GHS", "SDS",
    "KKDIK", "TSCA", "CEPE", "ECHA", "EFSA", "CFDA", "NMPA", "CMA", "CNAS"
]
for term in WHITELIST_TERMS:
    jieba.add_word(term)

app = FastAPI(title="REACH24H SEO rewriting system NLP Engine")

# Image cache directory
CACHE_DIR = "tmp_images"
os.makedirs(CACHE_DIR, exist_ok=True)

# Mount the static directory to serve images
app.mount("/images", StaticFiles(directory=CACHE_DIR), name="images")

class IngestRequest(BaseModel):
    url: str

class IngestResponse(BaseModel):
    text: str
    meta_keywords: str
    meta_description: str
    images: list[str]

@app.post("/api/ingest", response_model=IngestResponse)
async def ingest_article(req: IngestRequest):
    url = req.url
    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL format")
        
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        resp.encoding = 'utf-8' # Ensure correct encoding for Chinese characters
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")
        
    soup = BeautifulSoup(resp.text, 'lxml')
    
    # Extract Meta Weight
    meta_keywords = ""
    meta_k_tag = soup.find("meta", attrs={"name": "keywords"})
    if meta_k_tag and meta_k_tag.get("content"):
        meta_keywords = meta_k_tag["content"]
        
    meta_description = ""
    meta_d_tag = soup.find("meta", attrs={"name": "description"})
    if meta_d_tag and meta_d_tag.get("content"):
        meta_description = meta_d_tag["content"]
        
    # Extract clean text from div.article-detail
    # As requested: 定位 div.article-detail 容器，提取纯净正文，剔除导航栏、侧边栏等干扰
    article_detail = soup.select_one("div.article-detail")
    
    if not article_detail:
        # Fallback to body or article if div.article-detail not found
        article_detail = soup.find("article") or soup.find("body")
        
    if not article_detail:
        raise HTTPException(status_code=400, detail="Could not find article content container")
        
    # Process images: Download to Temporal Buffer
    img_tags = article_detail.find_all("img")
    cached_images = []
    
    # We will need the host dynamically in production. For now, we assume local or relative.
    # We can ask the user to configure an ENV var for PUBLIC_URL, defaulting to local.
    base_host = os.environ.get("PUBLIC_URL", "http://localhost:8000")
    
    for idx, img in enumerate(img_tags):
        src = img.get("src")
        if not src:
            continue
            
        full_url = urljoin(url, src)
        try:
            img_resp = requests.get(full_url, headers=headers, timeout=5)
            if img_resp.status_code == 200:
                # Generate a unique filename based on time and original name
                parsed = urlparse(full_url)
                ext = os.path.splitext(parsed.path)[1]
                if not ext:
                    ext = ".png" # default
                filename = f"img_{int(time.time()*1000)}_{idx}{ext}"
                filepath = os.path.join(CACHE_DIR, filename)
                
                with open(filepath, "wb") as f:
                    f.write(img_resp.content)
                    
                new_src = f"{base_host}/images/{filename}"
                img["src"] = new_src
                cached_images.append(new_src)
        except Exception as e:
            print(f"Failed to download image {full_url}: {e}")
            
    # Extract Pure Text
    clean_text = article_detail.get_text(separator='\n', strip=True)
    
    # Remove standard boilerplate
    boilerplate_idx = clean_text.find("关注“瑞欧佰药”")
    if boilerplate_idx != -1:
        clean_text = clean_text[:boilerplate_idx].strip()
    
    return IngestResponse(
        text=clean_text,
        meta_keywords=meta_keywords,
        meta_description=meta_description,
        images=cached_images
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

class TextRequest(BaseModel):
    text: str

class TermResponse(BaseModel):
    whitelist_terms: list[str]

@app.post("/api/extract_terms", response_model=TermResponse)
async def extract_terms(req: TextRequest):
    words = jieba.lcut(req.text)
    found_terms = set()
    for w in words:
        if w.upper() in WHITELIST_TERMS:
            found_terms.add(w.upper())
    return TermResponse(whitelist_terms=list(found_terms))

class OptimizeResponse(BaseModel):
    optimized_text: str
    text_rank_score: float # Mock score based on keyword consistency
    
@app.post("/api/optimize_typography", response_model=OptimizeResponse)
async def optimize_typography(req: TextRequest):
    # Apply pangu to correct spaces between CJK and English/Numbers
    optimized = pangu.spacing(req.text)
    
    # Calculate a simple textrank score as a placeholder for consistency check
    try:
        tr4w = TextRank4Keyword()
        tr4w.analyze(text=optimized, lower=True, window=2)
        items = tr4w.get_keywords(num=5, word_min_len=2)
        score = sum(item.weight for item in items)
    except Exception as e:
        score = 0.0
        print("TextRank error:", e)
        
        
    return OptimizeResponse(optimized_text=optimized, text_rank_score=round(score, 4))

class CleanupRequest(BaseModel):
    images: list[str]

@app.post("/api/schedule_cleanup")
async def schedule_cleanup(req: CleanupRequest, background_tasks: BackgroundTasks):
    async def delete_files(filenames):
        await asyncio.sleep(1800) # 30 mins TTL
        for f in filenames:
            name = f.split('/')[-1]
            path = os.path.join(CACHE_DIR, name)
            if os.path.exists(path):
                try:
                    os.remove(path)
                except:
                    pass
    background_tasks.add_task(delete_files, req.images)
    return {"status": "scheduled"}

class PublishReport(BaseModel):
    url: str
    title: str
    platform: str

@app.post("/api/report_publish")
async def report_publish(req: PublishReport):
    cursor.execute("INSERT INTO publications (url, title, platform, publish_date) VALUES (?, ?, ?, ?)", 
                  (req.url, req.title, req.platform, datetime.datetime.now().isoformat()))
    conn.commit()
    return {"status": "recorded"}

@app.get("/api/cron/monitor")
async def run_monitor():
    if not BaiduSpider:
        return {"error": "BaiduSpider not installed in environment"}
        
    spider = BaiduSpider()
    cursor.execute("SELECT url, title, platform, publish_date FROM publications")
    records = cursor.fetchall()
    results = []
    
    now = datetime.datetime.now()
    for rec in records:
        url, title, platform, p_date = rec
        d = datetime.datetime.fromisoformat(p_date)
        days_diff = (now - d).days
        
        # Check if today is D0, D3, or D5
        if days_diff in [0, 3, 5]:
            try:
                res = spider.search_web(title)
                found = False
                rank = -1
                if res and res.plain:
                    for idx, item in enumerate(res.plain):
                        # Match first page
                        if item.url == url or (platform in str(item.title) and title[:5] in str(item.title)):
                            found = True
                            rank = idx + 1
                            break
                results.append({"title": title, "days": days_diff, "rank": rank if found else None})
            except Exception as e:
                print("Spider error:", e)
                
    return {"status": "checked", "results": results}
