import { IctuBaseModel } from '@models/ictu-base-model';
import { HosoThisinh } from '@models/tuyensinh/hoso-thisinh';

export interface HoidongHosoThisinh extends IctuBaseModel {
    id: number;
    hoidong_id: number;
    hoso_id: number;
    ket_qua: string; // "trung_tuyen" | "khong_trung_tuyen"
    ghi_chu?: string;
    _hoso?: HosoThisinh | null;
}
