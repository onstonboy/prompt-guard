#!/usr/bin/env node
/**
 * Cron: 8h sáng & 8h tối (Asia/Singapore).
 * Tìm trên mạng (DuckDuckGo) xem có ai nhắc đến các app của anh (CDev / Chuong Le) không.
 * Chỉ tính các app có trong trang developer (Google/Apple), không chỉ Radio.
 * Ghi báo cáo vào memory/mentions-YYYY-MM-DD-HHmm.md
 *
 * Developer links:
 * - Google: https://play.google.com/store/apps/dev?id=6296625987520320887
 * - Apple:  https://apps.apple.com/sg/developer/chuong-le/id1602451499
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKSPACE = path.resolve(__dirname, '..')
const MEMORY_DIR = path.join(WORKSPACE, 'memory')

/** App names & package IDs có trong trang developer (CDev / Chuong Le) — không chỉ Radio */
const APP_NAMES = [
  'Led Board',
  'Led Banner',
  'Score Keeper',
  'Score Counter',
  'WealthFy',
  'Daily Quote',
  'AI PhotoBooth',
  'Gen Booth',
  'Skor',
  'King Word',
  'Mazii',
  'Couple Live Widget',
  'AI Caption',
  'Tap Roulette',
]
const PACKAGE_IDS = [
  'com.chuongdever.led_board',
  'com.chuongdever.score_counter',
  'com.chuongdever.tap_roulette',
  'com.cdev.wealthfy',
  'com.cdev.daily_quote',
  'com.cdev.gen_booth',
  'com.cdev.skor',
  'com.cdev.kingword',
  'com.cdev.ai_caption',
  'com.dtalabs.togethersnap',
]
const DEV_GOOGLE_ID = '6296625987520320887'

const QUERIES = [
  'CDev developer app',
  'Chuong Le app developer',
  'Led Board Led Banner app',
  'Score Keeper Score Counter app',
  'WealthFy Gold Portfolio app',
  'Skor All in One app',
]

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function decodeDuckDuckGoUrl(href) {
  try {
    const match = href.match(/uddg=([^&]+)/)
    if (match) return decodeURIComponent(match[1])
  } catch (_) {}
  return href
}

async function searchDuckDuckGo(q) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!res.ok) return []
  const html = await res.text()
  const results = []
  const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi
  const links = [...html.matchAll(linkRegex)]
  const snippets = [...html.matchAll(snippetRegex)]
  const stripHtml = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  for (let i = 0; i < links.length; i++) {
    const href = links[i][1]
    const title = stripHtml(links[i][2])
    const realUrl = decodeDuckDuckGoUrl(href)
    const snippet = snippets[i] ? stripHtml(snippets[i][1]).slice(0, 200) : ''
    if (title && realUrl && !realUrl.startsWith('https://duckduckgo.com')) {
      results.push({ title, url: realUrl, snippet })
    }
  }
  return results
}

function isRelevant(result) {
  const u = result.url.toLowerCase()
  const t = (result.title + ' ' + result.snippet).toLowerCase()
  const isDevStore =
    u.includes('play.google.com/store/apps/dev?id=' + DEV_GOOGLE_ID) ||
    u.includes('chuong-le') ||
    u.includes('1602451499')
  const isOurPackage = PACKAGE_IDS.some((pkg) => u.includes(pkg))
  const mentionsApp = APP_NAMES.some(
    (name) => name.length >= 4 && t.includes(name.toLowerCase())
  )
  const mentionsCdev = t.includes('cdev') && (t.includes('app') || t.includes('developer'))
  return isDevStore || isOurPackage || mentionsApp || mentionsCdev
}

function main() {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '')
  const reportPath = path.join(MEMORY_DIR, `mentions-${dateStr}-${timeStr}.md`)
  if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true })

  const allResults = new Map()
  const run = async () => {
    for (const q of QUERIES) {
      try {
        const list = await searchDuckDuckGo(q)
        for (const r of list) {
          if (!allResults.has(r.url)) allResults.set(r.url, { ...r, query: q })
        }
      } catch (e) {
        console.error('Search failed:', q, e.message)
      }
    }
    const relevant = [...allResults.values()].filter(isRelevant)
    const lines = [
      `# Báo cáo mention (${dateStr} ${now.toTimeString().slice(0, 5)} Asia/Singapore)`,
      '',
      '**Nguồn:** DuckDuckGo. Từ khóa: CDev, Chuong Le, Led Board, Score Keeper, WealthFy, Skor, … (các app trong trang developer).',
      '',
    ]
    if (relevant.length === 0) {
      lines.push('**Không tìm thấy** mention nào liên quan đến các app trong trang developer (CDev / Chuong Le).')
      lines.push('')
      lines.push('(Nếu anh muốn rà rộng hơn, có thể dùng thêm Google Alerts hoặc tool có API.)')
    } else {
      lines.push(`Tìm thấy **${relevant.length}** kết quả có thể liên quan:`)
      lines.push('')
      for (const r of relevant) {
        lines.push(`- **${r.title}**`)
        lines.push(`  - Link: ${r.url}`)
        if (r.snippet) lines.push(`  - Tóm tắt: ${r.snippet}`)
        lines.push('')
      }
    }
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8')
    console.log('Report written:', reportPath)
  }
  run().catch((e) => {
    const errReport = `# Lỗi check mention (${dateStr})\n\n${e.message}\n`
    fs.writeFileSync(reportPath, errReport, 'utf8')
    console.error(e)
    process.exit(1)
  })
}

main()
