import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './components/ui/card'
import { Button } from './components/ui/button'
import { Textarea } from './components/ui/textarea'
import { Checkbox } from './components/ui/checkbox'
import { Label } from './components/ui/label'
import { Copy, ExternalLink, Sparkles, Wand2 } from 'lucide-react'

// 平台配置字典
const PLATFORMS = {
  BAIJIAHAO: {
    name: '百家号',
    url: 'https://baijiahao.baidu.com/builder/rc/edit?type=news',
    guide: '相关内容可在瑞欧官网查看：',
    linkStyle: (title: string, url?: string) => `<u>${title}</u>${url ? `<br/>(原文链接: ${url})` : ''}`,
    copyrightStyle: 'color: #999999;'
  },
  ZHIHU: {
    name: '知乎',
    url: 'https://www.zhihu.com/write',
    guide: '<strong>相关阅读：</strong>',
    linkStyle: (title: string, url?: string) => `<b>${url ? `<a href="${url}">` : ''}<strong><u>${title}</u></strong>${url ? '</a>' : ''}</b>`,
    copyrightStyle: 'color: #000000;'
  },
  SOHU: {
    name: '搜狐',
    url: 'https://mp.sohu.com/mpfe/v3/main/news/add',
    guide: '相关内容可在瑞欧官网查看：',
    linkStyle: (title: string, url?: string) => `${title}${url ? `<br/>(原文链接: ${url})` : ''}`,
    copyrightStyle: 'color: #000000;'
  },
  BILIBILI: {
    name: 'B站',
    url: 'https://member.bilibili.com/platform/upload/text/edit',
    guide: '相关内容可在瑞欧官网查看：',
    linkStyle: (title: string, url?: string) => `<u>${title}</u>${url ? `<br/>(原文链接: ${url})` : ''}`,
    copyrightStyle: 'color: #CCCCCC;'
  }
}

type PlatformKey = keyof typeof PLATFORMS

interface Recommendation {
  title: string
  url?: string
}

function App() {
  const [inputText, setInputText] = useState('')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [targetPlatform, setTargetPlatform] = useState<PlatformKey>('BAIJIAHAO')
  const [outputHtml, setOutputHtml] = useState('')
  const [isPredicting, setIsPredicting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // 解析原文中的推荐阅读
  useEffect(() => {
    const lines = inputText.split('\n')
    const foundRecs: Recommendation[] = []
    // 简单的关键词匹配逻辑，后续可增强
    const recIndex = lines.findIndex(line => 
      line.includes('推荐阅读') || 
      line.includes('相关阅读') || 
      line.includes('相关内容可在瑞欧官网查看')
    )
    if (recIndex !== -1) {
      for (let i = recIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        // 排除掉版权法律声明行
        if (line.includes('本文的内容与版权均归杭州瑞欧科技有限公司所有')) break;

        // 模式 1: 标题 [分割符] 链接 (在同一行)
        const sameLineMatch = line.match(/^[\d.]*\s*(.*?)\s*[:：\-\s\>]+\s*(https?:\/\/[^\s]+)/)
        if (sameLineMatch) {
          foundRecs.push({ title: sameLineMatch[1].trim(), url: sameLineMatch[2].trim() })
          continue
        }

        // 模式 2: 标题 (单行) + 链接 (下一行)
        if (!line.startsWith('http') && i + 1 < lines.length) {
          const nextLine = lines[i+1].trim()
          if (nextLine.startsWith('http')) {
            foundRecs.push({ title: line.replace(/^[\d.]*\s*/, '').trim(), url: nextLine })
            i++; 
            continue
          }
        }

        // 模式 3: 只有标题 (没有检测到后续链接)
        if (!line.startsWith('http')) {
          foundRecs.push({ title: line.replace(/^[\d.]*\s*/, '').trim() })
        }
      }
    }
    setRecommendations(foundRecs)
  }, [inputText])

  // Task 1: 真实关键词预测
  const handlePredictKeywords = async () => {
    if (!inputText) return
    setIsPredicting(true)
    try {
      const resp = await fetch('/api/predict-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: inputText })
      });
      const data = await resp.json();
      if (resp.ok && data.keywords) {
        setKeywords(data.keywords);
      } else {
        console.error('Prediction failed:', data);
        alert(`预测失败: ${data.details || data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Error predicting keywords:', error);
      alert('网络错误，请检查后端服务是否启动');
    } finally {
      setIsPredicting(false);
    }
  }

  // Task 2: 平台定向改写
  const handleGenerate = async () => {
    if (!inputText || selectedKeywords.length === 0) return
    setIsGenerating(true)
    try {
      const resp = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: inputText, 
          platform: targetPlatform, 
          keywords: selectedKeywords 
        })
      });
      const data = await resp.json();
      
      if (resp.ok && data.content) {
        const platform = PLATFORMS[targetPlatform]
        let html = data.content;
        
        // 拼接推荐阅读
        html += `<div style="margin-top: 20px;">`
        html += `<p><b>${platform.guide}</b></p>`
        recommendations.forEach(rec => {
          html += `<p>${platform.linkStyle(rec.title, rec.url)}</p>`
        })
        html += `</div>`
        
        // 版权声明
        html += `<div style="margin-top: 20px; ${platform.copyrightStyle} font-size: 12px; line-height: 1.6;">`
        html += `注：本文的内容与版权均归杭州瑞欧科技有限公司所有，受相关法律法规保护。未经杭州瑞欧科技有限公司书面协议授权，任何媒体、网站或个人，不得以转载、链接、转贴、镜像、摘录、改编或者其他任何形式，对本文的全部或部分内容进行复制、传播，否则我司将依法追究其相应的法律责任。 已获得我司授权的媒体、网站，需严格在授权协议约定的范围内使用本文内容，并且必须在使用时清晰注明 「内容来源：杭州瑞欧科技有限公司」，同时附带原文的文章链接。`
        html += `</div>`

        setOutputHtml(html)
      } else {
        console.error('Rewrite failed:', data);
        alert(`改写失败: ${data.details || data.error || '未知错误'}`);
      }
    } catch (err) {
      console.error(err);
      alert('文章改写失败，请检查网络连接');
    } finally {
      setIsGenerating(false);
    }
  }

  // 复制并发布
  const handlePublish = async () => {
    console.log('handlePublish triggered');
    if (!outputHtml) {
      console.warn('No output HTML to publish');
      return;
    }

    const plainText = outputHtml.replace(/<[^>]+>/g, '')
    try {
      console.log('Writing to clipboard...');
      
      // 检查 ClipboardItem 支持情况
      if (typeof ClipboardItem !== 'undefined') {
        const clipboardItem = new ClipboardItem({
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
          'text/html': new Blob([outputHtml], { type: 'text/html' })
        })
        await navigator.clipboard.write([clipboardItem])
      } else {
        // 退而求其次，仅复制文本
        await navigator.clipboard.writeText(plainText);
        console.warn('ClipboardItem not supported, copied plain text only');
      }

      console.log('Clipboard write successful, opening platform:', PLATFORMS[targetPlatform].url);
      
      const targetUrl = PLATFORMS[targetPlatform].url;
      const platformName = PLATFORMS[targetPlatform].name;

      // 使用 confirm 保持 User Gesture
      if (confirm(`内容已对标 ${platformName} 复制成功！\n\n是否立即为您打开发布页面？`)) {
        const newWindow = window.open(targetUrl, '_blank');
        
        // 检查是否被拦截
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          const manualJump = confirm('跳转被浏览器拦截了！\n\n请点击“确定”尝试直接在当前窗口打开（或请检查浏览器地址栏右侧的拦截图标并允许弹出窗口）。');
          if (manualJump) {
            window.location.href = targetUrl;
          }
        }
      }
    } catch (err) {
      console.error('Publish error:', err);
      alert(`发布失败: ${err instanceof Error ? err.message : String(err)} \n请尝试手动复制内容。`);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">瑞欧科技 SEO 内容改写系统</h1>
            <p className="text-slate-500">v2.0 终极开发版</p>
          </div>
          <div className="flex gap-2">
            {(Object.keys(PLATFORMS) as PlatformKey[]).map(key => (
              <Button 
                key={key} 
                variant={targetPlatform === key ? 'default' : 'outline'}
                onClick={() => setTargetPlatform(key)}
                size="sm"
              >
                {PLATFORMS[key].name}
              </Button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：输入与配置 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  原文输入
                </CardTitle>
                <CardDescription>粘贴 Word 内容或文本，自动分析推荐阅读</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea 
                  placeholder="在此粘贴文章内容..." 
                  className="min-h-[300px] font-mono text-xs"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </CardContent>
              <CardFooter className="justify-between bg-slate-50/50 py-3">
                <span className="text-xs text-slate-500">
                  检测到 {recommendations.length} 条推荐阅读
                </span>
                <Button onClick={handlePredictKeywords} disabled={!inputText || isPredicting} size="sm">
                  {isPredicting ? 'AI 正在分析...' : '预测 SEO 关键词'}
                </Button>
              </CardFooter>
            </Card>

            {keywords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    SEO 关键词勾选 (建议 3-5 个)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {keywords.map(kw => (
                      <div key={kw} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`kw-${kw}`} 
                          checked={selectedKeywords.includes(kw)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedKeywords([...selectedKeywords, kw])
                            else setSelectedKeywords(selectedKeywords.filter(k => k !== kw))
                          }}
                        />
                        <Label htmlFor={`kw-${kw}`} className="cursor-pointer">{kw}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={handleGenerate} 
                    disabled={selectedKeywords.length === 0 || isGenerating}
                  >
                    {isGenerating ? 'AI 正在改写中...' : `对标 ${PLATFORMS[targetPlatform].name} 生成`}
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>

          {/* 右侧：预览与发布 */}
          <div className="space-y-6">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>结果预览</CardTitle>
                  <CardDescription>符合 {PLATFORMS[targetPlatform].name} 渲染规范</CardDescription>
                </div>
                {outputHtml && (
                  <Button variant="outline" size="icon" onClick={() => {
                    navigator.clipboard.writeText(outputHtml)
                    alert('HTML源码已复制')
                  }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {outputHtml ? (
                  <div 
                    className="prose prose-sm max-w-none border rounded-md p-4 bg-white min-h-[400px] overflow-y-auto [&_p]:mb-4 [&_h1]:mb-6 [&_b]:text-blue-900"
                    dangerouslySetInnerHTML={{ __html: outputHtml }}
                  />
                ) : (
                  <div className="h-[400px] flex items-center justify-center border border-dashed rounded-md text-slate-400">
                    等待生成...
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-3 pt-6">
                <Button 
                  className="w-full h-12 text-lg" 
                  disabled={!outputHtml}
                  onClick={handlePublish}
                >
                  确认并去发布
                  <ExternalLink className="ml-2 w-5 h-5" />
                </Button>
                {outputHtml && (
                  <div className="text-center w-full">
                    <p className="text-xs text-slate-400 mb-1">如果点击上方按钮无效，请点击下方链接手动打开：</p>
                    <a 
                      href={PLATFORMS[targetPlatform].url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline flex items-center justify-center gap-1 hover:text-primary/80"
                    >
                      手动打开发布页 <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
