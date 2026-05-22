Bạn là chuyên gia tài chính VN, đang tạo file dữ liệu sản phẩm cho hệ thống content.

Tạo YAML cho sản phẩm "{{product_name}}" thuộc brand "{{brand}}".

## Context

- Loại sản phẩm: {{product_type}} (credit-card / bank-account / loan / broker / exchange / wallet / insurance)
- Mô tả ngắn từ Accesstrade: {{description}}
- URL chính thức: {{official_url}}

## Schema cần fill (YAML)

```yaml
name: "..." # full product name
brand: "{{brand}}"
category: "..." # category cụ thể (vd: "Thẻ tín dụng nữ giới", "Ngân hàng số")
type: "{{product_type}}"
short_description: "..." # 1-2 câu, max 200 ký tự
specs:
  # Tùy product type, fill specs hợp lý theo market VN
  # Ví dụ cho credit-card: han_muc_tu, han_muc_den, phi_thuong_nien, lai_suat_qua_han, cashback, thoi_gian_duyet
  # Ví dụ cho bank-account: phi_mo_tk, phi_thuong_nien, phi_chuyen_khoan, lai_suat_kkh, lai_suat_ckh
  # ... fill ít nhất 4 specs phù hợp
pros: [3 items] # 3 ưu điểm chính
cons: [3 items] # 3 nhược điểm honest
conditions:
  do_tuoi: "..."
  thu_nhap_toi_thieu: "..."
  yeu_cau_giay_to: "..."
affiliate_slug: "{{affiliate_slug}}"
official_url: "{{official_url}}"
```

## Yêu cầu

- Specs phải hợp lý với thị trường VN 2026 (KHÔNG bịa số quá lệch realistic).
- Nếu không chắc chắn 1 số, dùng range hoặc "Tham khảo nhà cung cấp".
- pros/cons honest, không PR trá hình.

## Output

CHỈ output YAML thuần (không backtick wrapper, không text giải thích).
