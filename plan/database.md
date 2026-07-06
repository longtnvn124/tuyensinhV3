# Kế hoạch database

## 1. Mục tiêu

Thiết kế MongoDB schema đủ cho MVP: lưu tài khoản nội bộ, nhóm quyền, chương trình đào tạo, hồ sơ thí sinh, tư vấn, file minh chứng, lịch sử phân công tư vấn, doanh thu và báo cáo.

## 2. Nguyên tắc thiết kế

- Dùng collection rõ ràng, tên dễ hiểu.
- Quan hệ giữa collection lưu bằng number hoặc mã nghiệp vụ phù hợp.
- Không nhồi mọi dữ liệu vào một collection lớn.
- File minh chứng lưu local, DB chỉ lưu metadata và đường dẫn file.
- Thiết kế đủ linh hoạt để sau này đổi storage file hoặc công thức doanh thu.

## 3. Collections đề xuất


### 3.1. majors

Ngành học (ví dụ: Công nghệ thông tin, Quản trị kinh doanh...).

interface Majors {
    id?: number;
    name: string; // tên ngành
    code: string; // mã ngành, unique
    description?: string;
    is_active: boolean; // hiển thị trên website hay không
    created_at: Date;
    updated_at: Date;
}

### 3.2. programs

Chương trình đào tạo thuộc một ngành học (ví dụ: CNTT đại trà, CNTT chất lượng cao...).

interface Programs {
    id?: number;
    major_id: number; // thuộc ngành học nào
    name: string;
    code: string; // mã chương trình
    description?: string;
    dieu_kien_xet_tuyen?: string;
    hoc_phi?: number;
    thoi_gian_dao_tao?: string; // ví dụ "2.5 năm", "4 năm"
    chi_tieu?: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}



### 3.3. registration_periods

Đợt đăng ký xét tuyển.

interface RegistrationPeriods {
    id?: number;
    name: string; // tên đợt
    thoi_gian_bat_dau: Date;
    thoi_gian_ket_thuc: Date;
    mo_ta?: string;
    status: string; // "dang_mo" | "da_dong"
    created_at: Date;
    updated_at: Date;
}

### 3.4. Registrations

Hồ sơ thí sinh.

interface Registrations {
    id?: number;
    full_name: string; // họ và tên
    phone: string; // số điện thoại
    email?: string; // email của hồ sơ
    birthday?: string; // ngày tháng năm sinh
    tinh_id?: number; // tỉnh id sẽ được lấy từ bảng tỉnh
    huyen_id?: number; // quận/huyện
    xa_id?: number; // xã id sẽ được lấy từ bảng xã
    address?: string; // địa chỉ: số nhà, đường, ngõ,...
    noi_sinh?: string; // nơi sinh (tỉnh/thành phố)
    dan_toc?: string; // dân tộc
    status: string; // trạng thái hồ sơ (xem mục 7)

    cccd?: string; // số căn cước công dân
    cccd_ngaycap?: string; // ngày cấp căn cước
    cccd_noicap?: string; // nơi cấp căn cước

    major_id?: number; // ngành học muốn đào tạo
    program_id?: number; // chương trình đào tạo
    dot_dangky_id?: number; // đợt đăng ký (chọn từ khi đăng ký)

    vb_tn?: string; // văn bằng tốt nghiệp THPT
    vb_tn_nam?: string; // năm tốt nghiệp
    vb_tn_sohieu?: string; // số hiệu văn bằng
    diem_xettuyen?: number; // điểm xét tuyển
    vb_tn_anh?: string; // ảnh văn bằng tốt nghiệp

    vb_chuyenmon?: string; // bằng trung cấp, cao đẳng,...
    vb_chuyenmon_nganh?: string; // ngành học trên bằng chuyên môn
    vb_chuyenmon_noicap?: string; // nơi cấp văn bằng chuyên môn

    anh_the?: string; // ảnh thẻ của hồ sơ
    cccd_mattruoc?: string; // ảnh cccd mặt trước
    cccd_matsau?: string; // ảnh cccd mặt sau
    anh_phieudangky?: string; // ảnh phiếu đăng ký
    anh_hoc_ba?: string[]; // các ảnh bằng cấp liên quan

    owner_by: number; // người sở hữu hồ sơ
    nguoi_tuvan_id?: number; // người được phân công tư vấn
    hinhthuc_xettuyen?: string; // hình thức xét tuyển
    nguon_dang_ky?: string; // website, doi-tac, ...

    created_at: Date;
    updated_at: Date;
}



### 3.5. consult_logs

Lịch sử tư vấn.

interface ConsultationLogs {
    id?: number;
    registration_id: number; // id của hồ sơ tư vấn
    content: string; // nội dung tư vấn
    hinhthuc_tuvan: string; // online, tin nhắn, gọi điện
    user_id: number; // id người tư vấn
    ketqua_tuvan?: string; // kết quả tư vấn
    next_follow_up?: Date; // lần chăm sóc tiếp theo
    created_at: Date;
}



### 3.6. tuvan_assignments

Lịch sử phân công/chuyển đổi người tư vấn cho hồ sơ.

interface TuvanAssignment {
    id?: number;
    registration_id: number; // Hồ sơ được phân công
    tuvan_id: number; // Người tư vấn được gán
    assigned_by: number; // Người thực hiện phân công
    assigned_at: Date; // Thời điểm phân công
    note?: string; // Ghi chú
}



### 3.7. partner_commissions

Doanh thu/hoa hồng. Đối tác dùng chung user nội bộ.

interface PartnerCommission {
    id?: number;
    user_id: number; // đối tác
    applicant_id: number; // hồ sơ tạo ra doanh thu
    rule_code?: string; // mã công thức áp dụng
    amount: number;
    status: number;
    settlement_status?: string; // trạng thái đối soát/thanh toán
    created_at: Date;
    updated_at: Date;
}

### 3.8. admission_councils

Hội đồng xét tuyển.

interface AdmissionCouncils {
    id?: number;
    name: string; // tên hội đồng
    dot_dangky_id: number; // đợt xét tuyển
    thoi_gian_xet_tuyen: Date;
    status: string; // "dang_mo" | "da_dong"
    created_at: Date;
    updated_at: Date;
}

### 3.9. admission_councils_registration

Hội đồng - thí sinh : dùng để lưu hồ sơ đã thêm vào hội đồng, có thể dùng để lưu kết quả tuyển sinh.

interface AdmissionCouncilProfiles {
    id?: number;
    hoidong_id: number; // hội đồng id
    registration_id: number; // hồ sơ id
    ket_qua: string; // "trung_tuyen" | "khong_trung_tuyen"
    ghi_chu?: string;
    created_at: Date;
    updated_at: Date;
}


### 3.10. parents

Quan hệ đối tác - nhân viên đối tác. Liên kết doi-tac-cv với doi-tac chủ quản.

interface Parents {
    id?: number;
    parent_id: number; // id của doi-tac (đối tác chủ quản)
    user_id: number; // id của doi-tac-cv
    created_at: Date;
}


## 4. Index đề xuất

- users.username unique
- users.phone unique nếu cần
- users.email unique nếu cần
- roles.name unique
- programs.code unique
- applicants.phone
- applicants.status
- applicants.nguoi_tuvan_id
- consult_logs.registration_id + created_at
- partner_commissions.user_id + created_at
- tuvan_assignments.registration_id + assigned_at
- majors.code unique
- donvi.code unique
- users.role_ids
- users.donvi_id
- registration_periods.status
- registration_periods.nganh_ids.major_id
- admission_councils.dot_dangky_id
- admission_council_profiles.hoidong_id + registration_id unique
- admission_council_profiles.registration_id
- parents.parent_id
- parents.user_id unique
- applicants.dot_dangky_id
- tinh.code unique
- huyen.tinh_id
- xa.huyen_id

## 5. Quy ước ngày giờ

- Lưu dạng ISO string hoặc Date object của MongoDB.
- Ví dụ: `2026-05-29T10:30:00.000Z`.

## 6. Ghi chú cập nhật

- 2026-05-29: Tạo sơ đồ collection MongoDB cho user/role/applicant/program/attachment/partner/commission/audit.
- 2026-06-19: Tinh gọn schema: thêm majors, tuvan_assignments; bỏ partner_profiles/assignments/audit_logs/attachments; sửa partner_commissions.user_id.
- 2026-06-25: Thêm collection donvi; bổ sung giải thích donvi_id, realms, role_ids, is_admin; sửa index applicants.assigned_user_id → applicants.nguoi_tuvan_id; bổ sung index cho donvi, role_ids, is_deleted.
- 2026-06-30: Thêm registration_periods, admission_councils, council_results, parents; cập nhật roles (9 roles mới); thêm dot_dangky_id vào applicants.
- 2026-07-01: Sửa đánh số section; đồng bộ tên interface (Registrations→Applicants, hoidong→AdmissionCouncils, hoidong_thisinh→AdmissionCouncilProfiles); sửa index sai field (profile_id→registration_id, council_results→admission_council_profiles, applicant_id→registration_id); thêm collection tinh/huyen/xa; cập nhật registration_periods.nganh_ids thành mảng object chứa major_id + program_ids; sửa hoidong_id kiểu string→number.
- 2026-07-06: Chuyển ObjectId → number; thêm SQL CREATE TABLE scripts.

## 7. SQL CREATE TABLE scripts

Scripts dùng MySQL 8+.

```sql
-- ============================================================
-- 7.1. majors
-- ============================================================
CREATE TABLE majors (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    code         VARCHAR(50)  NOT NULL UNIQUE,
    description  TEXT,
    is_active    TINYINT(1) NOT NULL DEFAULT 1,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7.2. programs
-- ============================================================
CREATE TABLE programs (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    major_id            INT NOT NULL,
    name                VARCHAR(255) NOT NULL,
    code                VARCHAR(50)  NOT NULL UNIQUE,
    description         TEXT,
    dieu_kien_xet_tuyen TEXT,
    hoc_phi             DECIMAL(15,0),
    thoi_gian_dao_tao   VARCHAR(50),
    chi_tieu            INT,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7.3. registration_periods
-- ============================================================
CREATE TABLE registration_periods (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    thoi_gian_bat_dau   DATETIME NOT NULL,
    thoi_gian_ket_thuc  DATETIME NOT NULL,
    mo_ta               TEXT,
    status              ENUM('dang_mo', 'da_dong') NOT NULL DEFAULT 'dang_mo',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7.4. registrations
-- ============================================================
CREATE TABLE registrations (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    full_name           VARCHAR(255) NOT NULL,
    phone               VARCHAR(20)  NOT NULL,
    email               VARCHAR(255),
    birthday            VARCHAR(20),
    tinh_id             INT,
    huyen_id            INT,
    xa_id               INT,
    address             TEXT,
    noi_sinh            VARCHAR(255),
    dan_toc             VARCHAR(100),
    status              VARCHAR(50) NOT NULL,

    cccd                VARCHAR(20),
    cccd_ngaycap        VARCHAR(20),
    cccd_noicap         VARCHAR(255),

    major_id            INT,
    program_id          INT,
    dot_dangky_id       INT,

    vb_tn               VARCHAR(255),
    vb_tn_nam           VARCHAR(20),
    vb_tn_sohieu        VARCHAR(100),
    diem_xettuyen       DECIMAL(5,2),
    vb_tn_anh           VARCHAR(500),

    vb_chuyenmon        VARCHAR(255),
    vb_chuyenmon_nganh  VARCHAR(255),
    vb_chuyenmon_noicap VARCHAR(255),

    anh_the             VARCHAR(500),
    cccd_mattruoc       VARCHAR(500),
    cccd_matsau         VARCHAR(500),
    anh_phieudangky     VARCHAR(500),
    anh_hoc_ba          JSON,

    owner_by            INT NOT NULL,
    nguoi_tuvan_id      INT,
    hinhthuc_xettuyen   VARCHAR(100),
    nguon_dang_ky       VARCHAR(100),

    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_phone (phone),
    INDEX idx_status (status),
    INDEX idx_nguoi_tuvan_id (nguoi_tuvan_id),
    INDEX idx_dot_dangky_id (dot_dangky_id),
    INDEX idx_owner_by (owner_by),
    FOREIGN KEY (major_id)      REFERENCES majors(id) ON DELETE SET NULL,
    FOREIGN KEY (program_id)    REFERENCES programs(id) ON DELETE SET NULL,
    FOREIGN KEY (dot_dangky_id) REFERENCES registration_periods(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7.5. consult_logs
-- ============================================================
CREATE TABLE consult_logs (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    registration_id   INT NOT NULL,
    content           TEXT NOT NULL,
    hinhthuc_tuvan    VARCHAR(50) NOT NULL,
    user_id           INT NOT NULL,
    ketqua_tuvan      TEXT,
    next_follow_up    DATETIME,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_registration_created (registration_id, created_at),
    FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7.6. tuvan_assignments
-- ============================================================
CREATE TABLE tuvan_assignments (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    registration_id   INT NOT NULL,
    tuvan_id          INT NOT NULL,
    assigned_by       INT NOT NULL,
    assigned_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note              TEXT,
    INDEX idx_registration_assigned (registration_id, assigned_at),
    FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7.7. partner_commissions
-- ============================================================
CREATE TABLE partner_commissions (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    user_id           INT NOT NULL,
    applicant_id      INT NOT NULL,
    rule_code         VARCHAR(100),
    amount            DECIMAL(15,2) NOT NULL,
    status            TINYINT NOT NULL DEFAULT 0,
    settlement_status VARCHAR(50),
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_created (user_id, created_at),
    FOREIGN KEY (applicant_id) REFERENCES registrations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7.8. admission_councils
-- ============================================================
CREATE TABLE admission_councils (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    name               VARCHAR(255) NOT NULL,
    dot_dangky_id      INT NOT NULL,
    thoi_gian_xet_tuyen DATETIME NOT NULL,
    status             ENUM('dang_mo', 'da_dong') NOT NULL DEFAULT 'dang_mo',
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dot_dangky_id (dot_dangky_id),
    FOREIGN KEY (dot_dangky_id) REFERENCES registration_periods(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7.9. admission_council_profiles
-- ============================================================
CREATE TABLE admission_council_profiles (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    hoidong_id        INT NOT NULL,
    registration_id   INT NOT NULL,
    ket_qua           ENUM('trung_tuyen', 'khong_trung_tuyen'),
    ghi_chu           TEXT,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_hoidong_registration (hoidong_id, registration_id),
    INDEX idx_registration_id (registration_id),
    FOREIGN KEY (hoidong_id)      REFERENCES admission_councils(id) ON DELETE CASCADE,
    FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7.10. parents
-- ============================================================
CREATE TABLE parents (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    parent_id   INT NOT NULL,
    user_id     INT NOT NULL UNIQUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
