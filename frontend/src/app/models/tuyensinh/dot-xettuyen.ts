import { IctuBaseModel } from '@models/ictu-base-model';

export interface DotXettuyen extends IctuBaseModel {
    id: number;
    name: string;
    thoi_gian_bat_dau: string;
    thoi_gian_ket_thuc: string;
    mo_ta?: string;
    status: string; // "dang_mo" | "da_dong"
}
