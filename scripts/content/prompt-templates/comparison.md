Bạn là chuyên gia tài chính VN, viết bài so sánh "{{product_a_name}} vs {{product_b_name}}" cho người 25-35 tuổi.

## Context 2 sản phẩm

### {{product_a_name}}
- Brand: {{product_a_brand}}
- Category: {{product_a_category}}
- Specs: {{product_a_specs}}
- Affiliate slug: {{product_a_slug}}

### {{product_b_name}}
- Brand: {{product_b_brand}}
- Category: {{product_b_category}}
- Specs: {{product_b_specs}}
- Affiliate slug: {{product_b_slug}}

## Cấu trúc bài

1. **TL;DR**: Tóm 2 dòng, ai thắng trong tình huống nào.
2. **Bảng so sánh chi tiết** dùng component `<ComparisonTable>` (xem ví dụ dưới).
3. **Phân tích từng tiêu chí**: cashback, phí, hạn mức, điều kiện, etc. — 3-5 mục.
4. **Kết luận: Chọn cái nào?**: rule rõ ràng theo profile user.
5. **CTA**: 2 affiliate button cho cả 2 sản phẩm.

## ComparisonTable usage

```mdx
<ComparisonTable
  headers={['{{product_a_name}}', '{{product_b_name}}']}
  rows={[
    { label: 'Hạn mức', values: ['10tr-200tr', '5tr-100tr'] },
    { label: 'Phí thường niên', values: ['Miễn năm đầu', '299k/năm'] },
    // ... 6-10 rows
  ]}
/>
```

## Frontmatter

```yaml
---
title: "{{product_a_name}} vs {{product_b_name}} 2026: ..."
description: "..." # 80-170 ký tự
date: {{today_date}}
modified: {{today_date}}
author: admin
cluster: {{cluster}}
type: comparison
products:
  - {{product_a_slug}}
  - {{product_b_slug}}
faqs:
  - q: "..."
    a: "..."
keywords: [...]
draft: true
---
```

## Quality rules

- Honest, không nghiêng bên nào trừ khi data thật cho thấy.
- Câu ngắn, tự nhiên. Tránh từ AI điển hình.
- Imports: `import ComparisonTable from '@components/content/ComparisonTable.astro';`

## Output

CHỈ output bài viết Markdown bắt đầu bằng `---`. Không bao bằng code fence.
