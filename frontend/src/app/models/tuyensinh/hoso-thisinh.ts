import { IctuBaseModel } from '@models/ictu-base-model';

export interface HosoThisinh extends IctuBaseModel {
    id: number;
    ho_va_ten: string;
    dien_thoai: string;
    email?: string;
    ngay_sinh?: string;
    gioi_tinh: string;
    dia_chi_tinh?: number;
    dia_chi_xa?: number;
    dia_chi_nha?: string;
    noi_sinh?: number;
    dan_toc?: string;
    status: string;
    status_connent: number;

    cccd?: string;
    ngay_cap_cccd?: string;
    noi_cap_cccd?: string;

    ctdt_id?: number;
    nganh_id?: number;
    dotxettuyen_id?: number;

    van_bang_tn?: string;
    nam_tn?: string;
    tn_noicap?: string;
    diem_xettuyen?: number;
    anh_thpt?: string;
    doituong: string;

    vb_chuyenmon?: string;
    vb_chuyenmon_nganh?: string;
    vb_chuyenmon_noicap?: string;
    vb_chuyenmon_sohieu?: string;
    vb_chuyenmon_namtn?: string;

    anh_the?: string;
    anh_cmnd_truoc?: string;
    anh_cmnd_sau?: string;
    anh_phieu_dang_ky?: string;
    anh_hoc_ba?: string;
    anh_soyeulylich: string;

    owner_by: number;
    nguoi_tuvan?: number;
    hinhthuc_xettuyen?: string;
    submit_from?: string;
    content?: string;
    sohieu_vb?: string;
    shared?: string;
}
