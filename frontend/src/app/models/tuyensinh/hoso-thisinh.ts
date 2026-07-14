import { IctuBaseModel } from '@models/ictu-base-model';

export interface HosoThisinh extends IctuBaseModel {
    id: number;
    full_name: string;
    phone: string;
    email?: string;
    birthday?: string;
    tinh_id?: number;
    huyen_id?: number;
    xa_id?: number;
    address?: string;
    noi_sinh?: string;
    dan_toc?: string;
    status: string;

    cccd?: string;
    cccd_ngaycap?: string;
    cccd_noicap?: string;

    major_id?: number;
    program_id?: number;
    dot_dangky_id?: number;

    vb_tn?: string;
    vb_tn_nam?: string;
    vb_tn_sohieu?: string;
    diem_xettuyen?: number;
    vb_tn_anh?: string;

    vb_chuyenmon?: string;
    vb_chuyenmon_nganh?: string;
    vb_chuyenmon_noicap?: string;

    anh_the?: string;
    cccd_mattruoc?: string;
    cccd_matsau?: string;
    anh_phieudangky?: string;
    anh_hoc_ba?: string[];

    owner_by: number;
    nguoi_tuvan_id?: number;
    hinhthuc_xettuyen?: string;
    nguon_dang_ky?: string;
}
