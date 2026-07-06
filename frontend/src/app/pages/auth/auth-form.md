# Auth Forms — Redesign Plan

## Current Structure

`pages/auth/` gồm 5 component:

| Component | Route | Trạng thái |
|-----------|-------|------------|
| Login | `/auth/login` | ✅ Đã có form |
| Forgot Password | `/auth/forgot-password` | ✅ Đã có form |
| Reset Password | `/auth/reset-password` | ✅ Đã có form |
| Unauthorized | `/auth/unauthorized` | Page tĩnh |
| Redirect URI Callback | `/auth/redirect-uri-call-back` | OAuth handler |

**Vấn đề hiện tại:**
- CSS lộn xộn, share bằng `styleUrls: ['../login/login.component.css']` (forgot, reset đều reference vào login CSS)
- Dùng background image (`/images/bggp.webp`) — không linh hoạt
- Nhiều inline style trong template
- Thiếu shared auth layout — mỗi component tự layout riêng

---

## Design System

### Color Palette

```
BG:        linear-gradient(135deg, #667eea 0%, #764ba2 100%)
           hoặc grid pattern nhẹ nhàng (checkered background)

Primary:   #4F6EF7 (sky blue - xanh da trời chủ đạo)
Primary dark:  #3B56D4
Primary light: #EEF2FF

Card BG:   #FFFFFF
Card shadow: 0 20px 60px rgba(79, 110, 247, 0.15)

Text:      #1A1A2E (heading), #6B7280 (body)
Error:     #EF4444
Success:   #10B981
Border:    #E5E7EB
Input BG:  #F9FAFB
```

### Typography

- Font: `Inter` (Google Font) — fallback `sans-serif`
- Heading: 24px, weight 700, color #1A1A2E
- Body/label: 14px, weight 500, color #6B7280
- Input text: 15px, weight 400

### Spacing

- Card padding: 40px
- Gap giữa các form field: 20px
- Border radius input: 8px
- Border radius card: 16px
- Button height: 48px

---

## Component Architecture

### 1. Shared Auth Layout Component (`auth-layout/`)

Tạo component layout chung cho tất cả auth pages.

**Template structure:**
```html
<div class="auth-layout">
  <div class="auth-layout__bg">         <!-- Background layer -->
    <div class="auth-layout__grid"></div>  <!-- Checkered pattern overlay -->
    <div class="auth-layout__glow-1"></div> <!-- Decorative glow -->
    <div class="auth-layout__glow-2"></div>
  </div>
  <div class="auth-layout__container">
    <div class="auth-card">
      <!-- Logo / Brand -->
      <div class="auth-card__logo">
        <img src="..." alt="Logo" />
      </div>
      <!-- Title -->
      <h1 class="auth-card__title">Đăng nhập</h1>
      <p class="auth-card__subtitle">Chào mừng bạn quay trở lại</p>
      <!-- Content (ng-content) -->
      <ng-content></ng-content>
    </div>
  </div>
</div>
```

**Background design:**
```css
.auth-layout__bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* hoặc dùng checkered grid pattern */
}
.auth-layout__grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

### 2. Component Updates

Mỗi component sẽ:
- Wrap nội dung trong `<auth-layout>`
- Dùng shared form styles (không còn reference vào login.component.css)
- Loại bỏ inline styles
- Giữ nguyên logic TypeScript (chỉ thay đổi template + CSS)

#### Login
- Username + Password fields
- "Remember me" checkbox + "Forgot password?" link
- Submit button
- Third-party login buttons (Google, Microsoft)
- App version text

#### Forgot Password
- Email field
- Submit button
- Back to login link
- Success state với thông báo

#### Reset Password
- New password field (có toggle visibility)
- Confirm password field (có toggle visibility)
- Submit button
- Back to login link
- Token expired state

#### Unauthorized
- 403 illustration hoặc icon
- Title + message
- Back to login button

#### Redirect URI Callback
- Minimal loading/processing state (giữ nguyên logic, chỉ cập nhật style)

---

## Files to Create/Modify

### New files:
| File | Purpose |
|------|---------|
| `src/app/pages/auth/auth-layout/auth-layout.component.ts` | Shared layout component |
| `src/app/pages/auth/auth-layout/auth-layout.component.html` | Layout template |
| `src/app/pages/auth/auth-layout/auth-layout.component.css` | Layout styles |

### Modified files:
| File | Changes |
|------|---------|
| `login/login.component.html` | Use `<auth-layout>`, clean inline styles |
| `login/login.component.css` | Remove shared styles, keep only login-specific |
| `forgot-password/forgot-password.component.html` | Use `<auth-layout>`, clean up |
| `forgot-password/forgot-password.component.css` | Rewrite with shared approach |
| `forgot-password/forgot-password.component.ts` | Remove `styleUrls` reference to login CSS |
| `reset-password/reset-password.component.html` | Use `<auth-layout>`, clean up |
| `reset-password/reset-password.component.css` | Rewrite |
| `reset-password/reset-password.component.ts` | Remove `styleUrls` reference to login CSS |
| `unauthorized/unauthorized.component.html` | Redesign with auth-layout |
| `unauthorized/unauthorized.component.css` | Rewrite |
| `redirect-uri-call-back/*` | Use auth-layout |

### Delete (sau khi chuyển xong):
| File | Reason |
|------|--------|
| `src/app/pages/auth/authentication.css` | Không còn dùng |

---

## CSS Variables (Theme)

```css
:root {
  --auth-primary: #4F6EF7;
  --auth-primary-dark: #3B56D4;
  --auth-primary-light: #EEF2FF;
  --auth-bg-start: #667eea;
  --auth-bg-end: #764ba2;
  --auth-card-bg: #FFFFFF;
  --auth-text-primary: #1A1A2E;
  --auth-text-secondary: #6B7280;
  --auth-border: #E5E7EB;
  --auth-input-bg: #F9FAFB;
  --auth-radius: 16px;
  --auth-input-radius: 8px;
}
```

---

## Implementation Order

1. Tạo `auth-layout` component (shared layout)
2. Sửa Login component
3. Sửa Forgot Password component
4. Sửa Reset Password component
5. Sửa Unauthorized component
6. Sửa Redirect URI Callback component
7. Xóa file cũ không cần thiết
8. Kiểm tra tổng thể

---

## Notes

- **Không thay đổi logic TypeScript** — chỉ cập nhật template + CSS
- **Giữ nguyên selector** của từng component để không ảnh hưởng routing
- Các component standalone đã dùng `loadComponent` trong routing — không cần đăng ký trong module
- Sau khi redesign, có thể dễ dàng thêm theme tối (dark mode) sau này
