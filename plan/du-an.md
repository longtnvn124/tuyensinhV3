# Kế hoạch dự án tư vấn tuyển sinh

## 1. Mục tiêu

Xây dựng hệ thống tư vấn tuyển sinh trên website, cho phép thí sinh tìm hiểu chương trình đào tạo và đăng ký tư vấn ngành học quan tâm.

Hệ thống đồng thời cung cấp phần quản trị nội bộ để nhà trường quản lý dữ liệu tuyển sinh theo phân quyền, bao gồm: quản lý hồ sơ xét tuyển, tư vấn thí sinh, phân quyền dữ liệu cho user, 
quản lý đợt đăng ký, quản lý ngành đào tạo, cập nhật chương trình đào tạo, lập hội đồng xét tuyển, báo cáo tuyển sinh, quản lý doanh thu đối tác và trạng thái thanh toán.

## 2. Nhóm người dùng và nhóm quyền

Hệ thống gồm **9 nhóm quyền chính**, phân thành 3 tầng: **Quản trị & Lãnh đạo**, **Vận hành**, và **Bên ngoài**.

### 2.1. Tổng quan các nhóm quyền

Hệ thống gồm 9 nhóm quyền chính, phân thành 3 tầng: **Quản trị & Lãnh đạo**, **Vận hành**, và **Bên ngoài**.

**Tầng Quản trị & Lãnh đạo:**

- `admin` — Quản trị viên: Quản lý danh mục dùng chung, tài khoản người dùng và phân quyền.
- `direction` — Giám đốc: Kiểm duyệt thanh toán cho đối tác, xem báo cáo thống kê tuyển sinh dạng dashboard, toàn quyền với hồ sơ xét tuyển.
- `manager` — Phó giám đốc / Quản lý: Quản lý nghiệp vụ tuyển sinh, hồ sơ, phân công kiểm duyệt hồ sơ cho staff, quản lý chương trình đào tạo, hội đồng xét tuyển và báo cáo.

**Tầng Vận hành:**

- `staff` — Nhân viên tuyển sinh: Kiểm duyệt hồ sơ thí sinh, tạo hồ sơ mới, cập nhật hồ sơ. **Không được thao tác xóa.**
- `training_staff` — Nhân viên đào tạo: Quản lý thí sinh đã được sinh mã, theo dõi tình trạng nộp học phí lần đầu và nhập học.
- `reviewer` — Cán bộ quan sát: Xem toàn bộ dữ liệu thí sinh và báo cáo. **Không được thêm/sửa/xóa.** Phạm vi dữ liệu do manager cấp.

**Tầng Bên ngoài:**

- `doi-tac` — Đối tác tuyển sinh: Tạo hồ sơ thí sinh tiềm năng, theo dõi trạng thái xét tuyển, doanh thu và thanh toán.
- `doi-tac-cv` — Nhân viên đối tác: Tạo và cập nhật hồ sơ thí sinh tiềm năng, theo dõi trạng thái xét tuyển (do `doi-tac` tạo).
- `thi-sinh` — Thí sinh: Đăng ký tư vấn tuyển sinh qua form công khai trên website. Không có tài khoản đăng nhập.

### 2.2. Ma trận phân quyền chi tiết

| Chức năng | admin | direction | manager | staff | training_staff | reviewer | doi-tac | doi-tac-cv | thi-sinh |
|---|---|---|---|---|---|---|---|---|---|
| **Hồ sơ xét tuyển** ||||||||||
| Xem toàn bộ hồ sơ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓¹ | ✗ | ✗ | ✗ |
| Xem hồ sơ được phân công / của mình | ✓ | ✓ | ✓ | ✓ | ✓ | ✓¹ | ✓ | ✓ | ✗ |
| Tạo hồ sơ mới | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓² |
| Cập nhật hồ sơ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Xóa hồ sơ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Tư vấn & chăm sóc** ||||||||||
| Ghi nhận lịch sử tư vấn | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Phân công hồ sơ cho staff | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Quản lý đào tạo & nhập học** ||||||||||
| Quản lý thí sinh đã sinh mã | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Theo dõi học phí & nhập học | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Quản lý nghiệp vụ** ||||||||||
| Quản lý đợt đăng ký | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Quản lý ngành đào tạo | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Quản lý chương trình đào tạo | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Lập hội đồng xét tuyển | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Cập nhật kết quả xét tuyển | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Báo cáo & tài chính** ||||||||||
| Xem báo cáo tuyển sinh (dashboard) | ✓ | ✓ | ✓ | ✗ | ✗ | ✓¹ | ✗ | ✗ | ✗ |
| Xem báo cáo cá nhân | — | — | — | ✓ | ✓ | — | ✓ | ✓ | ✗ |
| Quản lý doanh thu đối tác | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✓³ | ✗ | ✗ |
| Kiểm duyệt thanh toán đối tác | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Quản trị hệ thống** ||||||||||
| Quản lý tài khoản & phân quyền | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Quản lý danh mục dùng chung | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

> ¹ `reviewer` có phạm vi dữ liệu do `manager` cấp (toàn cục hoặc giới hạn theo đối tác).
> ² `thi-sinh` tạo hồ sơ ban đầu qua form đăng ký tư vấn công khai.
> ³ `doi-tac` chỉ xem doanh thu cá nhân của chính mình.

### 2.3. Mô tả chi tiết từng vai trò

#### 2.3.1. Admin (`admin`) — Quản trị viên

Là vai trò cao nhất, chịu trách nhiệm quản trị hệ thống:
- Quản lý danh mục dùng chung (ngành học, chương trình đào tạo, cấu hình...).
- Tạo, cập nhật, khóa/mở khóa tài khoản người dùng.
- Gán một hoặc nhiều vai trò cho tài khoản (hỗ trợ đa vai trò — xem 2.5).
- Có toàn quyền thao tác với hồ sơ xét tuyển.

#### 2.3.2. Direction (`direction`) — Giám đốc

Là vai trò lãnh đạo, tập trung vào giám sát và phê duyệt:
- Xem toàn bộ báo cáo thống kê tuyển sinh dưới dạng dashboard.
- Có toàn quyền xem và thao tác với hồ sơ xét tuyển.
- **Quyền đặc thù:** kiểm duyệt thanh toán cho đối tác (duyệt chi hoa hồng).
- Không tham gia quản lý nghiệp vụ hàng ngày (đợt đăng ký, chương trình đào tạo, hội đồng xét tuyển — thuộc về `manager`).

#### 2.3.3. Manager (`manager`) — Phó giám đốc / Quản lý tuyển sinh

Là vai trò vận hành chính, phụ trách toàn bộ nghiệp vụ tuyển sinh:
- Xem, thêm, sửa, xóa toàn bộ hồ sơ tuyển sinh.
- Phân công hồ sơ cho `staff` kiểm duyệt.
- Quản lý chương trình đào tạo, đợt đăng ký.
- Lập hội đồng xét tuyển, cập nhật kết quả xét tuyển.
- Xem toàn bộ báo cáo tuyển sinh.
- Quản lý doanh thu đối tác (không có quyền kiểm duyệt thanh toán — thuộc về `direction`).

#### 2.3.4. Staff (`staff`) — Nhân viên tuyển sinh

Là vai trò thực thi, làm việc trực tiếp với hồ sơ thí sinh:
- Xem danh sách hồ sơ được `manager` phân công.
- Tạo hồ sơ thí sinh mới.
- Cập nhật thông tin hồ sơ.
- Ghi nhận lịch sử tư vấn.
- **Không được phép xóa hồ sơ.**
- Xem thống kê KPI cá nhân.

#### 2.3.5. Training Staff (`training_staff`) — Nhân viên đào tạo

Là vai trò chuyên trách mảng đào tạo và nhập học:
- Quản lý danh sách thí sinh đã được sinh mã (sau khi trúng tuyển).
- Theo dõi tình trạng nộp học phí lần đầu.
- Theo dõi tình trạng nhập học.
- **Không** tham gia tư vấn hay xét tuyển.

#### 2.3.6. Reviewer (`reviewer`) — Cán bộ quan sát

Là vai trò chỉ đọc, dành cho cán bộ cần xem dữ liệu nhưng không thao tác:
- Xem toàn bộ dữ liệu thí sinh trong phạm vi được `manager` cấp.
- Xem báo cáo tuyển sinh trong phạm vi được cấp.
- **Không được phép thêm, sửa, xóa** bất kỳ dữ liệu nào.
- Giao diện không hiển thị nút thao tác (thêm/sửa/xóa).

**Hai phạm vi quan sát:**
| Loại | Phạm vi dữ liệu | Người cấp |
|------|----------------|-----------|
| Toàn cục | Xem tất cả hồ sơ và báo cáo toàn hệ thống | Manager |
| Phạm vi đối tác | Chỉ xem hồ sơ và báo cáo của một đối tác cụ thể | Manager |

#### 2.3.7. Đối tác (`doi-tac`) — Đối tác tuyển sinh

Là vai trò dành cho đơn vị/cá nhân hợp tác tuyển sinh bên ngoài:
- Tạo hồ sơ thí sinh tiềm năng.
- Theo dõi trạng thái xét tuyển của thí sinh do mình tạo.
- Xem doanh thu cá nhân và trạng thái thanh toán từ nhà trường.
- Có thể tạo tài khoản `doi-tac-cv` để nhân viên của mình cùng thao tác.

#### 2.3.8. Nhân viên đối tác (`doi-tac-cv`) — Nhân viên của đối tác

Là vai trò thuộc về một đối tác, do chính `doi-tac` tạo ra:
- Tạo và cập nhật hồ sơ thí sinh tiềm năng.
- Theo dõi trạng thái xét tuyển của thí sinh do `doi-tac` chủ quản tạo.
- Dữ liệu luôn thuộc phạm vi của `doi-tac` chủ quản.

**Mối quan hệ:** `doi-tac-cv` thuộc về 1 `doi-tac`. Hồ sơ do `doi-tac-cv` tạo được ghi nhận nguồn là `doi-tac` chủ quản.

#### 2.3.9. Thí sinh (`thi-sinh`) — Thí sinh

Là người dùng cuối của website công khai:
- **Không có tài khoản đăng nhập.**
- Đăng ký tư vấn tuyển sinh qua form công khai trên website.
- Xem thông tin ngành học, chương trình đào tạo, đợt đăng ký.
- Hồ sơ sau khi đăng ký được hệ thống ghi nhận và chuyển cho `staff` / `manager` xử lý.

### 2.4. Sơ đồ phân cấp vai trò

```
                    ┌─────────┐
                    │  admin  │  Quản trị hệ thống + toàn quyền
                    └────┬────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
         ┌────┴────┐ ┌───┴───┐     │
         │direction│ │manager│     │  Lãnh đạo & Quản lý
         └─────────┘ └───┬───┘     │
                         │         │
              ┌──────────┼──────────┐
              │          │          │
         ┌────┴────┐ ┌───┴────┐ ┌──┴──────┐
         │  staff  │ │training│ │reviewer │  Vận hành
         │         │ │_staff  │ │         │
         └─────────┘ └────────┘ └─────────┘

              ┌──────────┐
              │ doi-tac  │  Bên ngoài (có tài khoản)
              └────┬─────┘
                   │
              ┌────┴──────┐
              │doi-tac-cv │  Bên ngoài (có tài khoản)
              └───────────┘

              ┌──────────┐
              │ thi-sinh │  Bên ngoài (không tài khoản)
              └──────────┘
```

### 2.5. Hỗ trợ đa vai trò (Multi-Role)

Hệ thống hỗ trợ một người dùng có nhiều vai trò cùng lúc thông qua trường `role_ids` (mảng ObjectId tham chiếu đến collection `roles`).

**Nguyên tắc kiểm tra quyền:**
- Khi kiểm tra quyền thực hiện một thao tác, hệ thống duyệt qua tất cả các role của người dùng. Nếu **ít nhất một** role có quyền, thao tác được phép.
- Menu hiển thị là **hợp (union)** của tất cả menu từ các role của người dùng.
- Quyền cao nhất sẽ được ưu tiên khi có xung đột (ví dụ: user vừa có role `reviewer` vừa có role `staff` → được phép thao tác thêm/sửa vì `staff` có quyền đó).

**Ví dụ:**
- Một người dùng có `role_ids: [staff, reviewer]` → có quyền `staff` (tạo, sửa hồ sơ được phân công) + quyền `reviewer` (xem báo cáo toàn hệ thống).
- Một người dùng có `role_ids: [manager, doi-tac]` → có quyền `manager` (toàn bộ nghiệp vụ) + quyền `doi-tac` (xem doanh thu cá nhân).

## 3. Phạm vi hệ thống

Hệ thống được chia thành 2 phần chính:

### 3.1. Website công khai

Website công khai hiển thị thông tin tuyển sinh cho người chưa đăng nhập, bao gồm:
- Bố cục trang chủ hiện đại, chuyên nghiệp.
- Section 1 chứa tên website: Tuyển sinh Đại học từ xa, logo: ICTU, menu: Trang chủ, Giới thiệu, Đề án tuyển sinh, Ngành đào tạo, Biểu mẫu, Đăng ký xét tuyển, Hướng dẫn.
- Section 2 chứa banner slide show kích thước 800x1920px.
- Section 3 chứa thông tin lý do thuyết phục để thí sinh lựa chọn học từ xa tại ICTU.
- Section 4 chứa thông tin về ngành học, chương trình đào tạo, văn bằng tốt nghiệp, thời gian học, học phí.
- Section 5 chứa thông tin các đợt xét tuyển, đối tượng và phương thức xét tuyển.
- Section 6 chứa thông tin liên hệ tư vấn và form đăng ký tư vấn.
- ChatbotAI về tư vấn tuyển sinh
- Mỗi section đều có nút hành động để thí sinh nhấn vào đăng ký xét tuyển.

### 3.2. Phần quản trị

Phần quản trị yêu cầu người dùng đăng nhập. Sau khi đăng nhập, hệ thống hiển thị chức năng tương ứng theo quyền của từng tài khoản.

Các nhóm chức năng chính:

- Quản lý hồ sơ xét tuyển.
- Quản lý tư vấn và lịch sử chăm sóc thí sinh.
- Phân công dữ liệu thí sinh cho `staff`.
- Quản lý ngành đào tạo.
- Quản lý đợt đăng ký.
- Quản lý chương trình đào tạo.
- Quản lý hội đồng xét tuyển.
- Cập nhật kết quả xét tuyển.
- Theo dõi trạng thái nhập học và học phí.
- Báo cáo tuyển sinh.
- Quản lý đối tác, doanh thu và thanh toán.
- Quản trị tài khoản và phân quyền.

### 3.3. Mối quan hệ Ngành học và Chương trình đào tạo

Hệ thống phân biệt 2 khái niệm:

- **Ngành học**: là lĩnh vực đào tạo (ví dụ: Công nghệ thông tin, Quản trị kinh doanh, Kế toán, Ngôn ngữ Anh...). Mỗi ngành học có mã ngành, tên ngành và mô tả chung.
- **Chương trình đào tạo**: là hình thức/phương thức đào tạo cụ thể thuộc một ngành học (ví dụ: Ngành CNTT có chương trình đại trà, chương trình chất lượng cao, chương trình đào tạo từ xa...). Mỗi chương trình thuộc về một ngành học, có điều kiện xét tuyển, học phí, thời gian đào tạo và chỉ tiêu riêng.

Mối quan hệ: **1 Ngành học → N Chương trình đào tạo**. Thí sinh đăng ký vào một chương trình đào tạo cụ thể thuộc một ngành học.

### 3.4. Đợt đăng ký

**Đợt đăng ký** là khoảng thời gian nhà trường mở cổng đăng ký xét tuyển. Mỗi đợt đăng ký chỉ bao gồm:

- Thông tin chung: tên đợt, thời gian bắt đầu, thời gian kết thúc, mô tả.
- Trạng thái: đang mở (active) hoặc đã đóng (inactive).

**Nguyên tắc:** Tại mỗi thời điểm, chỉ có **tối đa 1 đợt đăng ký** ở trạng thái active. Khi thí sinh gửi form đăng ký, server backend tự động gán thí sinh vào đợt đang active. Thí sinh không cần chọn đợt khi đăng ký — chỉ chọn ngành học và chương trình đào tạo.

## 4. Phạm vi theo vai trò

### 4.1. Thí sinh (`thi-sinh`)

Thí sinh sử dụng hệ thống để:

- Đăng ký tư vấn xét tuyển qua form công khai.
- Xem danh sách và mô tả chi tiết ngành đào tạo, chương trình đào tạo của nhà trường.
- Xem thông tin các đợt đăng ký đang mở.

### 4.2. Nhân viên đối tác (`doi-tac-cv`)

Nhân viên đối tác sử dụng hệ thống để:

- Tạo hồ sơ thí sinh tiềm năng (ghi nhận nguồn là `doi-tac` chủ quản).
- Cập nhật thông tin hồ sơ thí sinh do mình hoặc `doi-tac` chủ quản tạo.
- Theo dõi trạng thái xét tuyển của thí sinh thuộc phạm vi `doi-tac` chủ quản.
- Xem báo cáo cá nhân.

### 4.3. Đối tác tuyển sinh (`doi-tac`)

Đối tác tuyển sinh sử dụng hệ thống để:

- Tạo hồ sơ thí sinh tiềm năng.
- Tạo và quản lý tài khoản `doi-tac-cv` thuộc phạm vi của mình.
- Theo dõi trạng thái xét tuyển và nhập học của thí sinh do mình hoặc `doi-tac-cv` tạo.
- Xem doanh thu cá nhân và trạng thái thanh toán từ nhà trường.

### 4.4. Cán bộ quan sát (`reviewer`)

Cán bộ quan sát sử dụng hệ thống để:

- Xem danh sách hồ sơ tuyển sinh (toàn bộ hoặc theo phạm vi đối tác, do `manager` cấp).
- Xem chi tiết thông tin từng hồ sơ thí sinh.
- Xem báo cáo tuyển sinh.
- Xem danh sách ngành đào tạo và chương trình đào tạo.
- **Không được** tạo, sửa, xóa bất kỳ dữ liệu nào.

Có 2 loại tài khoản quan sát:

1. **Quan sát toàn cục (global observer):** Do `admin` hoặc `manager` tạo, có thể xem tất cả hồ sơ và báo cáo toàn hệ thống.
2. **Quan sát phạm vi đối tác (partner observer):** Do `admin`, `manager` hoặc chính `doi-tac` tạo, chỉ xem được hồ sơ do đối tác đó tạo và báo cáo cá nhân của đối tác đó.

### 4.5. Nhân viên đào tạo (`training_staff`)

Nhân viên đào tạo sử dụng hệ thống để:

- Quản lý danh sách thí sinh đã được sinh mã (sau khi trúng tuyển).
- Theo dõi tình trạng nộp học phí lần đầu.
- Theo dõi tình trạng nhập học.
- Xem danh sách ngành đào tạo và chương trình đào tạo.
- Xem báo cáo cá nhân.

### 4.6. Nhân viên tuyển sinh (`staff`)

Nhân viên tuyển sinh sử dụng hệ thống để:

- Kiểm tra thông tin xét tuyển từ thí sinh tự đăng ký.
- Tạo hồ sơ thí sinh mới.
- Cập nhật thông tin hồ sơ (không được xóa).
- Gọi điện, nhắn tin hoặc ghi nhận kết quả tư vấn cho thí sinh.
- Ghi nhận lịch sử tư vấn theo từng lần chăm sóc.
- Hỗ trợ thí sinh bổ sung hồ sơ, minh chứng.
- Theo dõi danh sách thí sinh được `manager` phân công.
- Xem danh sách ngành đào tạo và chương trình đào tạo.
- Xem thống kê KPI cá nhân theo tuần, tháng, quý, năm.

### 4.7. Phó giám đốc / Quản lý tuyển sinh (`manager`)

Manager sử dụng hệ thống để:

- Xem toàn bộ dữ liệu tuyển sinh trong phạm vi được quản lý.
- Thêm, sửa, xóa hồ sơ tuyển sinh.
- Xem lịch sử tư vấn của từng thí sinh.
- Phân công thí sinh cho `staff`, chuyển giao giữa các `staff`.
- Quản lý ngành đào tạo (thêm, sửa, xóa).
- Quản lý chương trình đào tạo (thêm, sửa, xóa).
- Quản lý đợt đăng ký (thêm, sửa, xóa).
- Lập hội đồng xét tuyển với các thí sinh đủ điều kiện.
- Cập nhật kết quả xét tuyển.
- Cập nhật trạng thái nhập học.
- Cập nhật trạng thái đóng học phí học kỳ 1.
- Xem toàn bộ báo cáo tuyển sinh, hiệu quả `staff` và đối tác.
- Quản lý doanh thu đối tác.
- Tạo tài khoản `reviewer` (toàn cục hoặc phạm vi đối tác).

### 4.8. Giám đốc (`direction`)

Giám đốc sử dụng hệ thống để:

- Xem toàn bộ hồ sơ xét tuyển (toàn quyền thêm, sửa, xóa).
- Xem toàn bộ báo cáo thống kê tuyển sinh dưới dạng dashboard.
- Quản lý ngành đào tạo (thêm, sửa, xóa).
- **Kiểm duyệt thanh toán** cho đối tác (duyệt chi hoa hồng) và **cập nhật trạng thái thanh toán**.
- Có quyền thao tác tất cả các chức năng nghiệp vụ (đợt đăng ký, chương trình đào tạo, hội đồng xét tuyển) nhưng không tham gia quản lý hàng ngày — các nghiệp vụ này do `manager` chịu trách nhiệm chính.

### 4.9. Quản trị viên (`admin`)

Admin có toàn quyền như `manager`, đồng thời có thêm quyền:

- Tạo tài khoản người dùng.
- Cập nhật thông tin tài khoản.
- Khóa/mở khóa tài khoản.
- Cấp quyền hoặc thay đổi vai trò người dùng.
- Quản lý danh mục dùng chung.
- Quản lý cấu hình hệ thống nếu cần.
- Cập nhật trạng thái thanh toán cho đối tác tuyển sinh do `direction` thực hiện.

## 5. Module chức năng đề xuất

### 5.1. Module ngành học và chương trình đào tạo

- Tạo mới, cập nhật, xóa ngành học.
- Tạo mới, cập nhật, xóa chương trình đào tạo thuộc một ngành học.
- Bật/tắt trạng thái hiển thị trên website công khai.
- Quản lý mô tả, điều kiện xét tuyển, học phí, thời gian đào tạo và chỉ tiêu cho từng chương trình.
- **Phân quyền:** `admin`, `direction`, `manager` (thêm/sửa/xóa); các vai trò còn lại (xem).

### 5.2. Module đăng ký tư vấn

- Thí sinh gửi form đăng ký tư vấn.
- Hệ thống ghi nhận nguồn đăng ký.
- Hệ thống tạo hồ sơ ban đầu cho thí sinh.
- `manager` hoặc hệ thống phân công dữ liệu cho `staff`.

### 5.3. Module quản lý đợt đăng ký

- Tạo mới đợt đăng ký với thông tin: tên đợt, thời gian bắt đầu, thời gian kết thúc, mô tả.
- Cập nhật thông tin đợt đăng ký.
- Bật/tắt trạng thái đợt (active / inactive). Khi kích hoạt 1 đợt, hệ thống tự động đóng các đợt khác nếu có.
- Xóa đợt đăng ký (chỉ khi chưa có thí sinh đăng ký).
- Xem danh sách thí sinh đã đăng ký theo từng đợt.
- **Phân quyền:** `admin`, `manager` (thêm/sửa/xóa); `direction` (có quyền thao tác).

### 5.4. Module hồ sơ xét tuyển

- Quản lý thông tin cá nhân thí sinh.
- Quản lý ngành/chương trình đăng ký xét tuyển.
- Quản lý giấy tờ, minh chứng hoặc dữ liệu hồ sơ nếu có.
- Theo dõi trạng thái xử lý hồ sơ.
- Cập nhật kết quả xét tuyển.
- **Phân quyền:** `admin`, `direction`, `manager` (toàn quyền); `staff` (tạo, sửa, không xóa); `doi-tac`, `doi-tac-cv` (tạo, xem hồ sơ của mình); `reviewer` (chỉ xem); `training_staff` (xem hồ sơ đã sinh mã).

### 5.5. Module tư vấn thí sinh

- Ghi nhận lịch sử gọi điện, nhắn tin, tư vấn.
- Ghi chú nhu cầu, mức độ quan tâm và phản hồi của thí sinh.
- Cập nhật trạng thái chăm sóc.
- Theo dõi hiệu quả tư vấn của từng `staff`.
- **Phân quyền:** `admin`, `direction`, `manager`, `staff` (thêm/sửa); `reviewer` (xem).

### 5.6. Module phân công dữ liệu

- `manager` phân công thí sinh cho `staff`.
- `staff` chỉ xem và cập nhật thí sinh được phân công.
- `manager` có thể chuyển thí sinh từ `staff` này sang `staff` khác.
- Hệ thống cần lưu lịch sử phân công nếu cần đối soát.
- **Phân quyền:** `admin`, `manager` (phân công); `staff` (xem danh sách được phân công).

### 5.7. Module hội đồng xét tuyển

Quy trình xét tuyển:

1. **Tạo hội đồng xét tuyển**: `admin`, `direction` hoặc `manager` tạo hội đồng xét tuyển với thông tin: tên hội đồng, đợt xét tuyển, thời gian xét tuyển.
2. **Thêm hồ sơ vào hội đồng**: Chọn danh sách thí sinh đủ điều kiện đưa vào đợt xét tuyển.
3. **Xem xét hồ sơ**: Giao diện hiển thị toàn bộ thông tin của từng hồ sơ (thông tin cá nhân, ngành/chương trình đăng ký, bằng cấp, minh chứng, điểm/kết quả học tập) để hội đồng đánh giá.
4. **Đánh dấu kết quả**: Đánh dấu từng hồ sơ là trúng tuyển hoặc không trúng tuyển.
5. **Đóng hội đồng**: Khóa hội đồng, không cho phép chỉnh sửa kết quả sau khi đóng.
6. **Xuất dữ liệu**: Xuất danh sách thí sinh trúng tuyển, không trúng tuyển và báo cáo thống kê theo đợt xét tuyển.
- Lưu lịch sử xét tuyển theo từng đợt để phục vụ đối soát.
- **Phân quyền:** `admin`, `manager` (toàn quyền); `direction` (có quyền thao tác).

### 5.8. Module báo cáo tuyển sinh

- Báo cáo số lượng thí sinh đăng ký.
- Báo cáo theo nguồn đăng ký.
- Báo cáo theo ngành đào tạo và chương trình đào tạo.
- Báo cáo theo trạng thái hồ sơ.
- Báo cáo hiệu quả `staff`.
- Báo cáo hiệu quả đối tác.
- Báo cáo doanh thu, nhập học và học phí.
- **Phân quyền:** `admin`, `direction`, `manager` (toàn bộ); `reviewer` (theo phạm vi được cấp); `staff`, `training_staff`, `doi-tac`, `doi-tac-cv` (báo cáo cá nhân).

### 5.9. Module đối tác và thanh toán

- Quản lý danh sách đối tác tuyển sinh.
- Ghi nhận thí sinh do đối tác và `doi-tac-cv` tạo.
- Tính doanh thu/hoa hồng theo quy định của nhà trường.
- Theo dõi trạng thái thanh toán.
- `direction` kiểm duyệt và cập nhật trạng thái thanh toán cho đối tác.
- **Phân quyền:** `admin`, `manager` (quản lý danh sách, xem doanh thu); `direction` (kiểm duyệt & cập nhật thanh toán); `doi-tac` (xem doanh thu cá nhân).

### 5.10. Module người dùng và phân quyền

- Tạo tài khoản người dùng.
- Cập nhật thông tin tài khoản.
- Gán một hoặc nhiều vai trò cho tài khoản (hỗ trợ đa vai trò).
- Khóa/mở khóa tài khoản.
- Kiểm soát quyền truy cập theo vai trò.
- **Phân quyền:** `admin` (toàn quyền).

Quản lý tài khoản `reviewer`:

- **`admin` / `manager`**: tạo tài khoản `reviewer` toàn cục (xem tất cả) hoặc phạm vi đối tác.
- **`doi-tac`**: tự tạo tài khoản `reviewer` phạm vi chính mình (partnerId = id đối tác).
- Giới hạn: `reviewer` không thể tạo thêm `reviewer` khác.

**Luồng đối tác tạo tài khoản `reviewer`:**

1. Đối tác đăng nhập → vào mục "Quản lý tài khoản quan sát".
2. Bấm "Tạo tài khoản quan sát".
3. Điền thông tin: username, password, họ tên, email.
4. Hệ thống tạo user với role = `reviewer`, partnerId = id của đối tác đang đăng nhập.
5. Tài khoản `reviewer` đăng nhập → chỉ xem được hồ sơ do đối tác đó tạo, không có nút thao tác thêm/sửa/xóa.

## 6. Luồng nghiệp vụ chính

### 6.1. Luồng thí sinh tự đăng ký

1. Thí sinh truy cập website công khai.
2. Thí sinh xem danh sách ngành học và chương trình đào tạo.
3. Thí sinh gửi form đăng ký tư vấn (chọn ngành học, chương trình đào tạo và điền thông tin cá nhân). Server backend tự động gán thí sinh vào đợt đăng ký đang active.
4. Hệ thống tạo hồ sơ ban đầu.
5. `manager` hoặc hệ thống phân công hồ sơ cho `staff`.
6. `staff` tư vấn và cập nhật lịch sử chăm sóc.
7. `staff` hỗ trợ thí sinh bổ sung hồ sơ xét tuyển.
8. `manager` đưa hồ sơ vào hội đồng xét tuyển.
9. Hội đồng / `manager` cập nhật kết quả xét tuyển.
10. `manager` cập nhật trạng thái nhập học và học phí.
11. `training_staff` theo dõi tình trạng nhập học và học phí sau khi thí sinh được sinh mã.

### 6.2. Luồng đối tác tạo thí sinh

1. `doi-tac` hoặc `doi-tac-cv` đăng nhập vào hệ thống.
2. `doi-tac` hoặc `doi-tac-cv` tạo hồ sơ thí sinh tiềm năng.
3. Hệ thống ghi nhận nguồn hồ sơ là `doi-tac` chủ quản.
4. `staff` hoặc `manager` xử lý tư vấn và hồ sơ.
5. `manager` cập nhật kết quả xét tuyển, nhập học và học phí.
6. Hệ thống tính doanh thu/hoa hồng cho `doi-tac` theo dữ liệu hợp lệ.
7. `direction` kiểm duyệt và cập nhật trạng thái thanh toán.
8. `doi-tac` theo dõi doanh thu và trạng thái thanh toán.

## 7. Trạng thái hồ sơ đề xuất

Các trạng thái hồ sơ thí sinh có thể gồm:

- `moi_dang_ky`: mới đăng ký tư vấn.
- `dang_tu_van`: đang được tư vấn.
- `can_bo_sung_ho_so`: cần bổ sung hồ sơ.
- `da_nop_ho_so`: đã nộp đủ hồ sơ.
- `cho_xet_tuyen`: chờ xét tuyển.
- `trung_tuyen`: trúng tuyển.
- `khong_trung_tuyen`: không trúng tuyển.
- `da_nhap_hoc`: đã nhập học.
- `da_dong_hoc_phi_hk1`: đã đóng học phí học kỳ 1.
- `huy_ho_so`: hồ sơ bị hủy hoặc thí sinh không tiếp tục.

## 8. Dữ liệu cần quản lý

### 8.1. Dữ liệu form thí sinh đăng ký 

- Họ tên.
- Ngày sinh.
- Số điện thoại.
- Email.
- Địa chỉ tỉnh đang sinh sống (sẽ được chọn từ dropdown có 36 tỉnh thành phố).
- Ngành học quan tâm.
- Chương trình đào tạo (thuộc ngành đã chọn).
- Bằng cấp ứng tuyển (trung cấp, cao đẳng, đại học).

> **Ghi chú:** Thí sinh không chọn đợt đăng ký. Server backend tự động gán hồ sơ vào đợt đang active (`dot_dang_ky_id`).


### 8.2. Dữ liệu hồ sơ xét tuyển


- Ngành học và chương trình đào tạo đăng ký (chọn ngành → chọn chương trình thuộc ngành đó).
- Bằng tốt nghiệp(Trung học phổ thông hoặc bổ túc văn hóa ):yêu cầu thêm thông tin chuyển ngành và năm tốt nghiệp
- Bằng cấp chuyên môn( trung cấp | cao đẳng| đại học ): yêu cầu thêm thông tin chuyển ngành và năm tốt nghiệp
- Điểm hoặc kết quả học tập nếu cần.
- Tài liệu/minh chứng hồ sơ nếu có.
- Kết quả xét tuyển.
- Trạng thái nhập học.
- Trạng thái đóng học phí.

### 8.3. Dữ liệu tư vấn

- Thí sinh được tư vấn.
- Nhân viên telesale phụ trách.
- Thời gian tư vấn.
- Kênh tư vấn.
- Nội dung ghi chú.
- Kết quả tư vấn.
- Lần chăm sóc tiếp theo nếu có.

### 8.4. Dữ liệu ngành học và chương trình đào tạo

#### Ngành học

- Tên ngành.
- Mã ngành.
- Mô tả ngành.
- Trạng thái hiển thị.

#### Chương trình đào tạo (thuộc một ngành học)

- Tên chương trình.
- Mã chương trình.
- Ngành học liên kết (khóa ngoại đến Ngành học).
- Mô tả.
- Điều kiện xét tuyển.
- Chỉ tiêu.
- Học phí.
- Thời gian đào tạo.
- Trạng thái hiển thị.

### 8.4bis. Dữ liệu đợt đăng ký

- Tên đợt đăng ký.
- Thời gian bắt đầu.
- Thời gian kết thúc.
- Mô tả.
- Trạng thái (active / inactive).

### 8.5. Dữ liệu đối tác và thanh toán

- Thông tin đối tác.
- Danh sách thí sinh do đối tác giới thiệu.
- Xem trạng thái xét tuyển/nhập học của từng thí sinh.
- Thanh toán hoa hồng theo quý 

## 9. Phân quyền sơ bộ

| Chức năng | admin | direction | manager | staff | training_staff | reviewer | doi-tac | doi-tac-cv | thi-sinh |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Xem website công khai | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Đăng ký tư vấn | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Xem toàn bộ hồ sơ tuyển sinh | ✓ | ✓ | ✓ | ✗ | ✗ | ✓¹ | ✗ | ✗ | ✗ |
| Xem hồ sơ được phân công / của mình | ✓ | ✓ | ✓ | ✓ | ✓ | ✓¹ | ✓ | ✓ | ✗ |
| Tạo hồ sơ thí sinh | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓² |
| Cập nhật hồ sơ xét tuyển | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Xóa hồ sơ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Ghi nhận lịch sử tư vấn | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Phân công hồ sơ cho staff | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Quản lý ngành đào tạo | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Quản lý đợt đăng ký | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Quản lý chương trình đào tạo | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Lập hội đồng xét tuyển | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Cập nhật kết quả xét tuyển | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Xem báo cáo tuyển sinh (dashboard) | ✓ | ✓ | ✓ | ✗ | ✗ | ✓¹ | ✗ | ✗ | ✗ |
| Xem báo cáo cá nhân | — | — | — | ✓ | ✓ | — | ✓ | ✓ | ✗ |
| Quản lý doanh thu đối tác | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✓³ | ✗ | ✗ |
| Kiểm duyệt & cập nhật thanh toán đối tác | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Quản lý tài khoản & phân quyền | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Tạo tài khoản reviewer | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✓⁴ | ✗ | ✗ |

> ¹ `reviewer` có phạm vi dữ liệu do `manager` cấp (toàn cục hoặc giới hạn theo đối tác).
> ² `thi-sinh` tạo hồ sơ ban đầu qua form đăng ký tư vấn công khai.
> ³ `doi-tac` chỉ xem doanh thu cá nhân của chính mình.
> ⁴ `doi-tac` chỉ tạo được tài khoản `reviewer` có phạm vi là chính mình.
>
> **Ghi chú đa vai trò**: Khi người dùng có nhiều role, quyền thực tế là hợp (union) các quyền của tất cả role. Ví dụ: user có cả `reviewer` và `staff` sẽ có quyền `staff` (tạo, sửa hồ sơ được phân công) thay vì chỉ xem.

## 10. Yêu cầu phi chức năng
- Giao diện thống nhất về tông màu; tông màu chủ đạo: màu xanh da trời, trắng.
- Giao diện website công khai đẹp dễ nhìn và có thiết kế cho web và mobile.
- Phần quản trị yêu cầu đăng nhập trước khi sử dụng.
- Chức năng phải kiểm soát theo vai trò người dùng.
- `staff` chỉ được truy cập dữ liệu được phân công.
- `doi-tac` và `doi-tac-cv` chỉ được xem dữ liệu thí sinh do mình tạo hoặc thuộc phạm vi `doi-tac` chủ quản.
- `thi-sinh` chỉ đăng ký tư vấn qua form công khai, không có tài khoản đăng nhập.
- Hệ thống cần hỗ trợ tìm kiếm, lọc và phân trang danh sách hồ sơ.
- Các thao tác quan trọng nên có lịch sử cập nhật để phục vụ đối soát.
- Báo cáo nên hỗ trợ lọc theo thời gian, nguồn đăng ký, ngành đào tạo, chương trình đào tạo và trạng thái hồ sơ.
- Dữ liệu cá nhân của thí sinh cần được bảo vệ, không hiển thị vượt quá quyền được cấp.

## 11. Các điểm đã làm rõ

- `thi-sinh` không cần tạo tài khoản đăng nhập. Thí sinh chỉ đăng ký tư vấn qua form công khai; hồ sơ sẽ được quản lý và cập nhật trong phần quản trị bởi `staff`, `manager` hoặc `admin`.
- Hồ sơ xét tuyển có sử dụng file minh chứng như ảnh, tài liệu scan hoặc file đính kèm. Hệ thống cần hỗ trợ upload, lưu trữ, xem lại và quản lý file minh chứng theo từng hồ sơ thí sinh.
- File minh chứng cần được gắn với loại giấy tờ cụ thể, ví dụ: căn cước công dân, học bạ, bằng tốt nghiệp, giấy chứng nhận tốt nghiệp tạm thời, ảnh chân dung hoặc giấy tờ khác.
- File minh chứng chỉ được truy cập bởi người có quyền liên quan đến hồ sơ. Thí sinh không có tài khoản nên việc bổ sung file sẽ do `staff`, `manager` hoặc `admin` hỗ trợ cập nhật.
- Doanh thu/hoa hồng của `doi-tac` sẽ được tính theo công thức do nhà trường khai báo sau. Giai đoạn hiện tại chỉ cần thiết kế phần dữ liệu và báo cáo đủ linh hoạt để áp dụng công thức tính về sau.
- Hội đồng xét tuyển không phải nhóm tài khoản riêng. Chức năng hội đồng xét tuyển chỉ dành cho `admin`, `direction` hoặc `manager` để tổng hợp hồ sơ, đánh giá, cập nhật kết quả và lập báo cáo xét tuyển.
- `staff` sẽ được phân công bởi tài khoản có quyền cao hơn, gồm `admin` hoặc `manager`. Khi đăng nhập, `staff` chỉ nhìn thấy dữ liệu đã được phân công hoặc có quyền liên quan.
- Phần đăng nhập sẽ dựa trên `User` và `Role` hiện có. Hệ thống kiểm tra `user.role_ids` để xác định quyền truy cập rồi điều hướng vào dashboard phù hợp.
- User là tài khoản đăng nhập nội bộ, không áp dụng cho thí sinh. Các nhóm quyền sẽ map từ `Role` để xác định màn hình và chức năng được phép dùng.
- Role `reviewer` có partnerId optional: null = xem toàn bộ, có giá trị = gắn với partner đó và chỉ xem hồ sơ của partner.
- Người dùng role `reviewer` không thấy nút thao tác thêm/sửa/xóa trên giao diện (HasPermissionDirective kiểm soát).
- Trang quản trị users (`admin/nguoi-dung`) chỉ dành cho `admin` (RoleGuard kiểm soát).
- Báo cáo cần hỗ trợ xuất file Excel và PDF.
- Chức năng tích hợp SMS, Zalo, email hoặc tổng đài gọi điện chưa chốt, để lại như hạng mục mở rộng cần xác nhận sau.
- Nhật ký thao tác cho các hành động quan trọng (thêm/sửa/xóa) do server backend ghi lại, không lưu trong database MongoDB của ứng dụng.

## 12. Ghi chú cập nhật

