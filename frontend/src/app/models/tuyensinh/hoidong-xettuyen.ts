import { IctuBaseModel } from '@models/ictu-base-model';

export interface HoidongXettuyen extends IctuBaseModel {
    id: number;
    tieu_de_hoi_dong: string;
    mo_ta_hoi_dong: string;
    dot_xettuyen_id: number;
    ngay_xetduyet: string;
    status: string; // "dang_mo" | "da_dong"
}
