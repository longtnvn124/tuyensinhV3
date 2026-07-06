# Kế hoạch database

## 1. Mục tiêu

Thiết kế MongoDB schema đủ cho MVP: lưu tài khoản nội bộ, nhóm quyền, chương trình đào tạo, hồ sơ thí sinh, tư vấn, file minh chứng, lịch sử phân công tư vấn, doanh thu và báo cáo.

## 2. Nguyên tắc thiết kế

- Dùng collection rõ ràng, tên dễ hiểu.
- Quan hệ giữa collection lưu bằng ObjectId hoặc mã nghiệp vụ phù hợp.
- Không nhồi mọi dữ liệu vào một collection lớn.
- File minh chứng lưu local, DB chỉ lưu metadata và đường dẫn file.
- Thiết kế đủ linh hoạt để sau này đổi storage file hoặc công thức doanh thu.

## 3. Collections đề xuất


### 3.1. majors

Ngành học (ví dụ: Công nghệ thông tin, Quản trị kinh doanh...).

interface Majors {
    id?: ObjectId;
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
    id?: ObjectId;
    major_id: ObjectId; // thuộc ngành học nào
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
    id?: ObjectId;
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
    id?: ObjectId;
    full_name: string; // họ và tên
    phone: string; // số điện thoại
    email?: string; // email của hồ sơ
    birthday?: string; // ngày tháng năm sinh
    tinh_id?: ObjectId; // tỉnh id sẽ được lấy từ bảng tỉnh
    huyen_id?: ObjectId; // quận/huyện
    xa_id?: ObjectId; // xã id sẽ được lấy từ bảng xã
    address?: string; // địa chỉ: số nhà, đường, ngõ,...
    noi_sinh?: string; // nơi sinh (tỉnh/thành phố)
    dan_toc?: string; // dân tộc
    status: string; // trạng thái hồ sơ (xem mục 7)

    cccd?: string; // số căn cước công dân
    cccd_ngaycap?: string; // ngày cấp căn cước
    cccd_noicap?: string; // nơi cấp căn cước

    major_id?: ObjectId; // ngành học muốn đào tạo
    program_id?: ObjectId; // chương trình đào tạo
    dot_dangky_id?: ObjectId; // đợt đăng ký (chọn từ khi đăng ký)

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

    owner_by: ObjectId; // người sở hữu hồ sơ
    nguoi_tuvan_id?: ObjectId; // người được phân công tư vấn
    hinhthuc_xettuyen?: string; // hình thức xét tuyển
    nguon_dang_ky?: string; // website, doi-tac, ...

    created_at: Date;
    updated_at: Date;
}



### 3.5. consult_logs

Lịch sử tư vấn.

interface ConsultationLogs {
    id?: ObjectId;
    registration_id: ObjectId; // id của hồ sơ tư vấn
    content: string; // nội dung tư vấn
    hinhthuc_tuvan: string; // online, tin nhắn, gọi điện
    user_id: ObjectId; // id người tư vấn
    ketqua_tuvan?: string; // kết quả tư vấn
    next_follow_up?: Date; // lần chăm sóc tiếp theo
    created_at: Date;
}



### 3.6. tuvan_assignments

Lịch sử phân công/chuyển đổi người tư vấn cho hồ sơ.

interface TuvanAssignment {
    id?: ObjectId;
    registration_id: ObjectId; // Hồ sơ được phân công
    tuvan_id: ObjectId; // Người tư vấn được gán
    assigned_by: ObjectId; // Người thực hiện phân công
    assigned_at: Date; // Thời điểm phân công
    note?: string; // Ghi chú
}



### 3.7. partner_commissions

Doanh thu/hoa hồng. Đối tác dùng chung user nội bộ.

interface PartnerCommission {
    id?: ObjectId;
    user_id: ObjectId; // đối tác
    applicant_id: ObjectId; // hồ sơ tạo ra doanh thu
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
    id?: ObjectId;
    name: string; // tên hội đồng
    dot_dangky_id: ObjectId; // đợt xét tuyển
    thoi_gian_xet_tuyen: Date;
    status: string; // "dang_mo" | "da_dong"
    created_at: Date;
    updated_at: Date;
}

### 3.9. admission_councils_registration

Hội đồng - thí sinh : dùng để lưu hồ sơ đã thêm vào hội đồng, có thể dùng để lưu kết quả tuyển sinh.

interface AdmissionCouncilProfiles {
    id?: ObjectId;
    hoidong_id: ObjectId; // hội đồng id
    registration_id: ObjectId; // hồ sơ id
    ket_qua: string; // "trung_tuyen" | "khong_trung_tuyen"
    ghi_chu?: string;
    created_at: Date;
    updated_at: Date;
}


### 3.10. parents

Quan hệ đối tác - nhân viên đối tác. Liên kết doi-tac-cv với doi-tac chủ quản.

interface Parents {
    id?: ObjectId;
    parent_id: ObjectId; // id của doi-tac (đối tác chủ quản)
    user_id: ObjectId; // id của doi-tac-cv
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
- 2026-07-01: Sửa đánh số section; đồng bộ tên interface (Registrations→Applicants, hoidong→AdmissionCouncils, hoidong_thisinh→AdmissionCouncilProfiles); sửa index sai field (profile_id→registration_id, council_results→admission_council_profiles, applicant_id→registration_id); thêm collection tinh/huyen/xa; cập nhật registration_periods.nganh_ids thành mảng object chứa major_id + program_ids; sửa hoidong_id kiểu string→ObjectId.
