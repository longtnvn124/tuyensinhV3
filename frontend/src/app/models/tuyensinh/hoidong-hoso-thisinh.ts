import { IctuBaseModel } from '@models/ictu-base-model';

export interface HoidongHosoThisinh extends IctuBaseModel {
    id: number;
    hoidong_id: number;
    registration_id: number;
    ket_qua: string; // "trung_tuyen" | "khong_trung_tuyen"
    ghi_chu?: string;
}
