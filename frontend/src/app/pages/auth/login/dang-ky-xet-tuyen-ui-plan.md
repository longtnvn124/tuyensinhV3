# Kế hoạch: Cập nhật background trang đăng ký xét tuyển

## Mục tiêu

Đổi background của trang đăng ký xét tuyển sang phong cách giống trang login:
- Gradient xanh (ICTU navy → blue)
- Grid overlay mờ
- Floating glow effects (ánh sáng di chuyển nhẹ)
- Form card vẫn giữ layout hiện tại nhưng đặt trên nền mới

## Phân tích hiện trạng

### Login component (mẫu tham chiếu)

```
- Gradient: linear-gradient(135deg, #667eea, #bebebe)
- Grid: rgba(255,255,255,0.04), 48px × 48px
- Glow 1: 500px circle, rgba(255,255,255,0.08), top-right
- Glow 2: 350px circle, rgba(255,255,255,0.05), bottom-left
- Animation: float 8s/10s ease-in-out
- Card: white, rounded, shadow
```

### Dang-ky-xet-tuyen hiện tại

```
- Gradient: linear-gradient(...) x 3 lớp, #f7fcfe → #e9f5fa → #f8fcfd
- Grid: rgba(5,73,117,0.035), 32px × 32px
- Ambient shapes: border + background, tĩnh
- Layout: header + hero-content + form-card + footer
```

## Thay đổi đề xuất

### 1. CSS Background (`dang-ky-xet-tuyen.component.css`)

**Xóa:**
- `.registration-page` — background gradient cũ + grid cũ
- `.ambient-shape` / `.ambient-shape-one` / `.ambient-shape-two`

**Thêm:**
- `.registration-page` — gradient xanh ICTU navy → blue, đổi màu grid sang rgba(255,255,255,0.04), kích thước 48px
- `.registration-page__bg` — container cho grid + glow (giống login)
- `.registration-page__grid` — grid overlay (copy từ login)
- `.registration-page__glow` / `--1` / `--2` — floating glow effects (copy từ login)

**Giữ nguyên:**
- `.site-header`, `.brand`, `.login-link` — header layout
- `.registration-layout` — grid 2 cột
- `.hero-content` — hero text bên trái
- `.form-card` — card form bên phải
- `.site-footer` — footer
- Tất cả responsive breakpoints

### 2. HTML Template (`dang-ky-xet-tuyen.component.html`)

**Thay đổi:**
- Thêm `<div class="registration-page__bg">` với grid + 2 glow div bên trong `<main>`
- Xóa 2 div `.ambient-shape` cũ

**Giữ nguyên:**
- Toàn bộ nội dung: header, hero, form, footer
- Không đổi structure form fields

### 3. Màu sắc

| Element | Màu cũ | Màu mới |
|---------|--------|---------|
| Page gradient | #f7fcfe → #e9f5fa → #f8fcfd (xanh nhạt) | #062c4d → #006eb7 (ICTU navy → blue) |
| Grid | rgba(5,73,117,0.035), 32px | rgba(255,255,255,0.04), 48px |
| Glow 1 | rgba(32,169,210,0.07) solid | rgba(255,255,255,0.08) blur |
| Glow 2 | rgba(32,169,210,0.07) solid | rgba(255,255,255,0.05) blur |

## Kết quả mong đợi

- Nền gradient xanh đậm ICTU, hiện đại hơn
- Grid mờ tạo chiều sâu
- Glow animation tạo cảm giác sống động
- Form card vẫn nổi bật trên nền mới
- Responsive giữ nguyên

## File thay đổi

| File | Hành động |
|------|-----------|
| `dang-ky-xet-tuyen.component.css` | Sửa background, thêm glow, xóa ambient-shape |
| `dang-ky-xet-tuyen.component.html` | Thêm div bg, xóa ambient-shape divs |
| `dang-ky-xet-tuyen.component.ts` | Không đổi |
