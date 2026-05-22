# Project Plan — Affiliate Finance Hub VN

> **Last updated**: 2026-05-22
> **Owner**: Cuongth (cuongth99999@gmail.com)
> **Status**: Planning → MVP

---

## 0. TL;DR

Xây 1 **niche site tài chính cá nhân VN** dạng hub đa cluster, kết hợp **TikTok faceless** drive traffic. Monetize qua **Accesstrade + direct affiliate** (Binance, TikTok Shop, ngân hàng).

- **Vốn**: gần $0 (domain + VPS rẻ)
- **Mục tiêu**: 10-30tr VND/tháng passive sau 6-12 tháng
- **Effort**: 5-10h/tuần part-time
- **Lợi thế của owner**: dev background (Magento → quen ecommerce, SEO), vibe code được pipeline tự động

---

## 1. Niche Strategy — Phased Topic Cluster

### Triết lý
- KHÔNG launch all-in cùng lúc → phá vỡ topical authority
- Dominate 1-2 cluster trước, rồi mở rộng sang cluster liên quan
- Audience overlap: người trẻ 22-35 học tài chính cá nhân → cross-sell nhiều sản phẩm trong 1-2 năm = LTV cao

### Clusters (theo phase)

| Phase | Thời gian | Cluster | Lý do |
|---|---|---|---|
| **1** | Tháng 1-3 | Thẻ tín dụng + Tài khoản ngân hàng số | Payout cao (180-450k) + conversion dễ |
| **2** | Tháng 4-6 | Vay tiêu dùng | Cùng audience, VPBank vay 2.5% × giải ngân |
| **3** | Tháng 7-9 | Chứng khoán + Crypto | Higher-value audience, Binance lifetime referral |
| **4** | Tháng 10-12 | Tiết kiệm, Bảo hiểm (optional) | Hoàn thiện hub |

### Niche con đáng đánh nhất (long-tail keywords)
- "Thẻ tín dụng VPBank cho sinh viên không cần chứng minh thu nhập"
- "Vay tín chấp VPBank online lương 7 triệu duyệt không"
- "TCBS vs SSI vs VNDirect so sánh"
- "Binance vs Bybit cho người Việt"
- "Cake vs Timo nên dùng cái nào"

---

## 2. Affiliate Programs

### Networks
- **Accesstrade** (chính): VPBank, Cathay, MSB, VIB, Tiki, TikTok Shop
- **Masoffer / Adflex** (phụ)

### Direct (đăng ký thẳng)
- **TikTok Shop Affiliate** — 1-20% commission
- **Shopee Affiliate Program**
- **Binance Referral** — 20-41% lifetime trên fee user trade
- **Bybit, OKX, Bitget** — tương tự
- **Hostinger, Canva, Notion** — high-ticket global

### Payout tiers (banking VN)
| Tier | Trigger | Payout |
|---|---|---|
| CPL | User submit form | 20-100k VND |
| CPQL | Form đủ điều kiện | 100-500k VND |
| CPS | Thẻ duyệt + active / vay giải ngân | 500k-2tr VND |

---

## 3. Site Architecture

### Domain strategy
- Chọn broad-able, KHÔNG hẹp
- Tránh: `thetindungviet.com`, `vaytiennhanh.net`
- Ví dụ tốt: `moneyvn.com`, `tien365.com`, `finhub.vn`, `taichinh247.com`

### URL structure (Vietnamese-friendly, bỏ dấu)

```
moneyvn.com/
├── /                                     ← Homepage hub
├── /ve-chung-toi/                        ← About (E-E-A-T)
├── /tac-gia/[author]/                    ← Author pages
├── /tuyen-bo-affiliate/                  ← Affiliate disclosure (bắt buộc)
├── /chinh-sach-bao-mat/
│
├── /the-tin-dung/                        ← CLUSTER 1 (Pillar)
│   ├── /danh-sach-tot-nhat/
│   ├── /review/[brand]/                  ← vpbank-lady, tpbank-evo, ...
│   ├── /so-sanh/[a]-vs-[b]/              ← vpbank-vs-tpbank
│   ├── /so-sanh/[theme]/                 ← sinh-vien, luong-thap
│   ├── /huong-dan/[topic]/
│   └── /cau-hoi/[question]/
│
├── /vay-tieu-dung/                       ← CLUSTER 2 (Phase 2)
│   ├── /review/  /so-sanh/  /huong-dan/
│   └── /canh-bao/                        ← Build trust (tín dụng đen)
│
├── /tai-khoan-ngan-hang/                 ← CLUSTER 3
│   ├── /review/  /so-sanh/  /huong-dan/
│   └── /vi-dien-tu/                      ← MoMo, ZaloPay, ViettelPay
│
├── /chung-khoan/                         ← CLUSTER 4 (Phase 3)
├── /crypto/                              ← CLUSTER 5 (Phase 3)
│   └── /airdrop/                         ← Sub-niche hot
│
├── /cong-cu/                             ← Tools (backlink magnet)
│   ├── /tinh-lai-vay/
│   ├── /tinh-lai-tiet-kiem/
│   ├── /the-tin-dung-nao-phu-hop/        ← Quiz ⭐
│   └── /dca-crypto/
│
└── /sitemap.xml + /robots.txt + /feed.xml
```

### URL slug rules
- Bỏ dấu tiếng Việt: `/the-tin-dung/` không phải `/thẻ-tín-dụng/`
- Ngắn, có keyword
- Không `.html`, không date, không query string
- Max 2-3 level hierarchy

---

## 4. Templates & Components (Vibe Code)

### Pages
```
page-home.astro                ← Homepage hub
page-pillar.astro              ← Cluster intro (2500-4000 từ)
page-listicle.astro            ← "Top X" listicle
page-review.astro              ← Single product review
page-comparison.astro          ← "A vs B"
page-guide.astro               ← How-to
page-faq.astro                 ← FAQ post
page-tool.astro                ← Calculator/quiz
```

### Components
```
AffiliateLink.astro            ← Track click + redirect (200 redirect qua /go/[slug])
ProductCard.astro              ← Card thẻ/app
ComparisonTable.astro
ProsConsBox.astro
FAQSchema.astro                ← JSON-LD
ReviewSchema.astro
AuthorBox.astro                ← E-E-A-T
TableOfContents.astro
RelatedPosts.astro
AffiliateDisclosure.astro      ← Bắt buộc theo luật
```

### Schema markup
| Template | Schema |
|---|---|
| Homepage | `Organization`, `WebSite`, `SearchAction` |
| Pillar | `Article`, `BreadcrumbList` |
| Listicle | `ItemList` |
| Review | `Review`, `Product`, `AggregateRating` |
| Guide | `HowTo` |
| FAQ | `FAQPage` |

---

## 5. Tech Stack

```
Frontend:    Astro (preferred) hoặc Next.js Static
Content:     MDX với frontmatter
CMS:         Sanity / Notion-as-CMS / file-based
AI:          Claude API (draft content)
Voice (TTS): Vbee.vn (giọng VN tốt nhất) / ElevenLabs
Video:       ffmpeg + Pexels API (B-roll)
Hosting:     Cloudflare Pages (free) / Vercel
Analytics:   Plausible / Umami (self-host)
Search GSC:  Bắt buộc submit sitemap
DB:          SQLite (track affiliate click) hoặc Cloudflare D1
```

### Frontmatter chuẩn (MDX)

```yaml
---
title: "Review thẻ tín dụng VPBank Lady Mastercard 2026"
slug: "vpbank-lady"
description: "..."
date: 2026-05-22
modified: 2026-05-22
author: nguyen-van-a
cluster: the-tin-dung
type: review
product:
  name: "VPBank Lady Mastercard"
  brand: "VPBank"
rating: 4.2
pros: [...]
cons: [...]
affiliate:
  network: "accesstrade"
  campaign_id: "vpbank_lady_2026"
  payout: 420000
related: ["tpbank-evo", "the-tin-dung/so-sanh/vpbank-vs-tpbank"]
keywords: [...]
---
```

---

## 6. Content Production Pipeline

### Workflow đúng (KHÔNG copy AI nguyên xi)
```
Outline tay (mình)
   → Claude API viết draft
   → Human edit + thêm experience cá nhân
   → Chèn data thật, screenshot ngân hàng, ảnh tự chụp
   → Schema markup
   → Publish
```

Mỗi bài: **30-50% phải là input mình** (ảnh, ví dụ, số liệu, opinion).

### Prompt template cho review (Claude)
```
Bạn là chuyên gia tài chính cá nhân tại VN, viết blog cho 
người 25-35 tuổi lần đầu mở thẻ tín dụng.

Viết bài "Review [thẻ X] 2026" theo cấu trúc:
1. TL;DR 3 dòng — phù hợp với ai, ưu nhược lớn nhất
2. Thông số cơ bản (bảng): hạn mức, phí, lãi suất, cashback
3. 3 ưu điểm (kèm ví dụ số tiền cụ thể)
4. 3 nhược điểm thật (honest, không PR)
5. So sánh với 2 thẻ đối thủ cùng phân khúc
6. Điều kiện mở + tỷ lệ duyệt thực tế (từ user forum)
7. Hướng dẫn mở online step-by-step
8. FAQ 5 câu (schema markup)

Yêu cầu:
- Tự nhiên, như chia sẻ bạn bè
- TRÁNH từ AI: "Trong bối cảnh", "Đáng chú ý là", "Hơn nữa"
- Câu ngắn, đoạn 2-3 câu
- Chèn [SCREENSHOT_X] nơi cần ảnh thật
- Output Markdown
```

### Anti-AI-fingerprint rules
- ❌ "Trong thời đại hiện nay", "Với sự phát triển của", "Đáng chú ý là"
- ❌ "Thứ nhất... Thứ hai..." quá đều
- ❌ Đoạn 5+ câu đều như nhau
- ✅ Câu cụt, câu hỏi, "Honestly thì...", "Cá nhân tôi..."
- ✅ Đoạn 1 câu xen kẽ đoạn dài

### E-E-A-T checklist
- [ ] Author bio thật + LinkedIn
- [ ] First-hand experience trong bài
- [ ] External link đến nguồn uy tín (SBV, Vietcombank Research)
- [ ] Ảnh thật, screenshot thật
- [ ] Update bài cũ 3-6 tháng/lần (đổi `dateModified`)

---

## 7. SEO Strategy

### Keyword research workflow
1. Lấy 20 từ khóa long-tail từ Ahrefs Free / Ubersuggest / AnswerThePublic
2. Check top 10 Google → có site nhỏ không? (nếu toàn báo lớn → skip)
3. Check volume Google Keyword Planner
4. DR < 30 mà vẫn top → opportunity

### Internal linking
- **Pillar ↔ Children**: bắt buộc 2 chiều
- **Cross-cluster**: cùng brand (VPBank thẻ ↔ VPBank vay ↔ Cake by VPBank)
- **Funnel**: Awareness → Comparison → Review → Affiliate link

### Tools (backlink magnet)
- `/cong-cu/the-tin-dung-nao-phu-hop/` — quiz interactive
- `/cong-cu/tinh-lai-vay/` — loan calculator
- Báo chí, blog khác hay link đến tool free

---

## 8. Multi-Platform Short Video Strategy (không phụ thuộc TikTok)

### ⚠️ Rủi ro TikTok với niche tài chính
TikTok có policy nghiêm với finance content. Nếu sai framing → ban acc. Solution: **đa platform + framing đúng + diversify owned channels**.

### Phổ rủi ro theo topic

| Mức | Topic | Ghi chú |
|---|---|---|
| 🟢 An toàn | TK ngân hàng số (Cake, Timo, MoMo, ZaloPay), tips tiết kiệm, cashback, so sánh phí | Cứ làm thoải mái |
| 🟡 Trung bình | Thẻ tín dụng, vay tiêu dùng, bảo hiểm | OK nếu framing education |
| 🔴 Cao | Crypto trading, chứng khoán signal, forex, "get rich quick" | Push qua YouTube/site, hạn chế TikTok |

### 7 Quy tắc framing để không bị ban TikTok
1. **Education > Advice**: "Mình tìm hiểu được" không phải "Mua ngay"
2. **Tránh con số phô**: không "50tr/tháng dễ"
3. **Có disclaimer ngắn**: "Chia sẻ cá nhân, không phải lời khuyên đầu tư"
4. **Tránh visual nhạy cảm**: không xấp tiền, không screenshot tài khoản nhiều số 0
5. **KHÔNG affiliate link trực tiếp caption**: dùng "Link bio" → landing page riêng
6. **Tránh trigger words**: "kiếm tiền nhanh", "lãi đảm bảo", "không cần vốn", "trading"
7. **Mix AI voice với footage thật**: tránh full AI generated → giảm reach

### Multi-account strategy
- Acc A: "Mẹo tiết kiệm + TK ngân hàng số" 🟢 (an toàn nhất, dồn lực)
- Acc B: "Review thẻ tín dụng" 🟡 (cẩn thận framing)
- Acc C: "Kiến thức đầu tư cơ bản" 🟡
- Acc D (test): crypto education 🔴 (đừng phụ thuộc)

**Warm-up flow** (tránh bị flag spam):
- Tuần 1-2: scroll + like + comment, KHÔNG đăng
- Tuần 2-3: đăng 1-2 video lifestyle non-finance
- Tuần 3+: bắt đầu finance content

### Cross-post pipeline — diversify khỏi TikTok
```
1 video 30s vertical →
  ├── TikTok (hashtag VN)
  ├── YouTube Shorts ⭐ (permissive nhất cho finance)
  ├── Facebook Reels ⭐ (audience VN lớn nhất)
  ├── Instagram Reels
  ├── Threads (clip + text caption)
  └── Zalo OA (broadcast follower)
```

### Owned channels — quan trọng nhất (TikTok có thể ban, owned thì không)
- ⭐⭐⭐ **Email newsletter** (Beehiiv free): mỗi video CTA "Tham gia newsletter nhận bản full"
- ⭐⭐ **Zalo Official Account**: VN-native, broadcast được
- ⭐⭐⭐ **Site SEO** (đã có trong plan)

### Concept formats (safe)
1. **Top 3/Top 5 review** — dễ làm nhất
2. **Story telling** — "Tôi bị từ chối thẻ vì 3 lỗi này"
3. **Comparison split screen** — "VPBank vs TPBank"
4. **Mini guide screen recording** — "Mở TK ngân hàng trong 5 phút"

### Pipeline auto (vibe code)
```
1. Idea từ Google Trends + AnswerThePublic
2. Claude API → script 30s + caption + hashtag (theo 7 quy tắc framing)
3. Vbee.vn → voice over MP3 tiếng Việt
4. Pexels API → tải 5-10 clip phù hợp
5. ffmpeg → ghép clip + voice + subtitle
6. Upload đa platform (TikTok + YouTube Shorts + FB Reels + IG Reels)
```

### Script template (30s) — safe framing
- 0-3s: HOOK education-style ("3 cách tối ưu chi tiêu với thẻ ngân hàng số")
- 3-25s: 3 ý chính × 6-8s, có số liệu, kèm disclaimer 1s
- 25-30s: CTA mềm ("Link review chi tiết trong bio")

### Hashtag mix (5-8/video)
- Niche: #taichinhcanhan #tietkiem #ngansangso (tránh #vaytien quá thô)
- Trending: theo Discover
- Broad: #fyp #xuhuong #vietnam

### Cadence
- Tháng 1: 1 video/ngày × 30 ngày → train algorithm
- Tháng 2+: 2-3 video/ngày, cross-post 5 platform
- Multi-account: 3-5 acc niche khác nhau (giảm risk ban)

### Conversion flow
```
Video đa platform → Bio link → Landing page riêng → 
  ├── Affiliate Accesstrade (instant convert)
  └── Email signup (long-term LTV)
```
(Mọi platform đều ghét link out trực tiếp — phải qua landing page riêng)

---

## 9. Funnel Math & Revenue Projection

### Conversion rate giả định
```
10,000 visitor/tháng (organic SEO)
    ↓ 8-15% click affiliate link
800-1,500 click
    ↓ 20-40% submit form
160-600 lead (CPL: 30-50k/lead = 5-30tr)
    ↓ 30-50% qualified
50-300 qualified (CPQL: 200k = 10-60tr)
    ↓ 30-60% approved + active
15-180 sale (CPS: 800k = 12-144tr)
```

### Timeline realistic
| Tháng | Hoạt động | Income ước tính |
|---|---|---|
| 1-2 | Build site + 30 bài + setup TikTok | 0-2tr |
| 3-4 | TikTok có view, site bắt đầu index | 2-8tr |
| 5-6 | SEO traffic ổn, TikTok có audience | 8-25tr |
| 7-12 | Scale content, optimize conversion | **20-80tr** |

---

## 10. Phase 1 — 90 ngày đầu (Launch checklist)

### Tuần 1-2 — Setup
- [ ] Đăng ký Accesstrade ✅ (đã có)
- [ ] Pick domain broad-able + mua
- [ ] Setup hosting Cloudflare Pages
- [ ] Setup Astro/Next.js base với template ở section 4
- [ ] Setup Plausible analytics + Google Search Console
- [ ] Tạo author profile thật (LinkedIn + photo + bio)
- [ ] Viết trang `/ve-chung-toi/`, `/tuyen-bo-affiliate/`, `/chinh-sach-bao-mat/`

### Tuần 3-4 — Content batch 1 (Cluster Thẻ tín dụng)
- [ ] Viết pillar `/the-tin-dung/` (2500+ từ)
- [ ] Viết listicle `/the-tin-dung/danh-sach-tot-nhat/`
- [ ] 5 bài review: VPBank Lady, VPBank StepUp, TPBank Evo, Sacombank, Cake
- [ ] 3 bài so sánh: VPBank vs TPBank, thẻ cho sinh viên, lương thấp
- [ ] 3 bài hướng dẫn: cách mở online, điều kiện 2026, luơng bao nhiêu mở được

### Tuần 5-6 — Content batch 2 (Cluster TK ngân hàng số)
- [ ] Pillar `/tai-khoan-ngan-hang/`
- [ ] 5 review: Cake, Timo, MBBank, VPBank NEO, TNEX
- [ ] 2 review ví: MoMo, ZaloPay
- [ ] 3 hướng dẫn

### Tuần 7-8 — Tools + TikTok launch
- [ ] Build quiz tool `/cong-cu/the-tin-dung-nao-phu-hop/`
- [ ] Build loan calculator
- [ ] Tạo TikTok account faceless
- [ ] Code pipeline video automation
- [ ] Upload 7-15 video đầu tiên

### Tuần 9-12 — Iterate
- [ ] Submit toàn bộ URL lên Google Search Console
- [ ] Build 5-10 backlink (guest post Voz, Tinhte, Reddit r/VietNam)
- [ ] Track conversion Accesstrade, ID nào ra tiền → double down
- [ ] Optimize bài chưa rank
- [ ] 1 video TikTok/ngày steady

---

## 11. Risk & Mitigation

| Risk | Mitigation |
|---|---|
| Google penalty AI content | Human edit 30-50%, E-E-A-T checklist, ảnh thật |
| TikTok ban acc finance | Multi-account (3-5), framing education > advice, tránh trigger words, đa platform (YouTube Shorts + FB Reels), build owned channels (email + Zalo OA) |
| Affiliate program shut down | Đa dạng network + direct, không phụ thuộc 1 chương trình |
| YMYL niche khắt khe | Disclaimer rõ, link nguồn chính thức, tránh app tín dụng đen |
| Burnout | Cap effort 5-10h/tuần, pipeline AI giảm load |

---

## 12. Open Questions / Decisions Pending

- [ ] Domain name cuối cùng?
- [ ] Astro hay Next.js? (recommend Astro cho SEO-first static site)
- [ ] CMS: file-based MDX hay Sanity?
- [ ] Voice TTS: Vbee.vn hay clone giọng thật qua ElevenLabs?
- [ ] Bắt đầu với 1 cluster hay 2 cluster đồng thời? (recommend 2 cluster theo phase 1)

---

## 13. Reference Links (cập nhật khi có)

- Accesstrade dashboard: pub2.accesstrade.vn
- Google Search Console: search.google.com/search-console
- Ahrefs Free Webmaster Tools: ahrefs.com/webmaster-tools
- Pexels API: pexels.com/api
- Vbee TTS: vbee.vn

---

## 14. Next Action (cập nhật mỗi session)

> **2026-05-22**: Đã xong site map + URL structure. 
> **Tiếp theo**: Chọn 1 trong 3:
> - A. Vẽ Content Calendar 90 ngày chi tiết (bài nào viết tuần nào, từ khóa)
> - B. Vibe code MVP Astro skeleton với template ở section 4
> - C. Gợi ý 20 domain broad-able để check availability
