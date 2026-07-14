# Plan: Redesign full-screen UI cho nganh-hoc + chuongtrinh-daotao

## Yêu cầu
- Giữ nguyên logic hiện tại (parent-child, @Input, CRUD, event flow)
- Viết lại hoàn toàn template + CSS — không kế thừa class cũ
- Thiết kế full màn hình, hiện đại, sạch sẽ
- Drawer full width (100vw) cho detail

## Layout

### Parent (nganh-hoc.component)
```
┌──────────────────────────────────────────────────────┐
│  Header: icon + "Danh sách ngành học" [Tìm] [+][🗑]  │
├──────────────────────────────────────────────────────┤
│  Bảng full height, scrollable tbody                   │
│  # │ Mã │ Tên │ Trạng thái │ Hành động               │
├──────────────────────────────────────────────────────┤
│  Paginator (bottom)                                   │
└──────────────────────────────────────────────────────┘
```

### Child (chuongtrinh-daotao.component) — trong drawer full màn hình
```
┌─────────────────────────────┬──────────────────────────┐
│  LEFT: Danh sách CTĐT       │  RIGHT: Form inline       │
│  [Tìm] [+][🗑]              │  ┌────────────────────┐  │
│  ──────────────────────     │  │ Tên: [________]    │  │
│  #│Mã│Tên│TG│HP│CT│T.thái│Hđ│  │ Mã:  [________]    │  │
│  ... scrollable ...         │  │ Mô tả: [________]  │  │
│  ──────────────────────     │  │ Điều kiện: [____]  │  │
│  Paginator                  │  │ Học phí [___] CT[_]│  │
│                             │  │ Thời gian [______] │  │
│                             │  │ Trạng thái [▼]     │  │
│                             │  └────────────────────┘  │
│                             │  [Thêm mới] [Hủy]        │
└─────────────────────────────┴──────────────────────────┘
```

## File thay đổi

| File | Action |
|------|--------|
| `nganh-hoc/nganh-hoc.component.html` | Viết lại template sạch, full-height table |
| `nganh-hoc/nganh-hoc.component.css` | Viết lại CSS, ko kế thừa class cũ |
| `nganh-hoc/chuongtrinh-daotao/chuongtrinh-daotao.component.html` | Viết lại template split |
| `nganh-hoc/chuongtrinh-daotao/chuongtrinh-daotao.component.css` | Viết lại CSS custom |
| `nganh-hoc/nganh-hoc.component.ts` | Layout update, drawer full màn hình |

## CSS approach
- Custom CSS variables, flex layout
- Table: border-collapse, sticky thead, scroll tbody
- Right panel: fixed width 420px, card shadow
- No dependency on `admin-section--table`, `admin-wrap-table`, `ictu-badge`, `admin-table`, etc.
- Giữ functional classes của PrimeNG (`p-drawer`, `mat-*`, `ictu-paginator`)

## Độ phức tạp
**LOW-MEDIUM** (~1 giờ)
