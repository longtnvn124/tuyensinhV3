import { IctuBaseModel } from '@models/ictu-base-model';
import { Registrations } from '@models/tuyensinh/registrations';

export interface HoidongHosoThisinh extends IctuBaseModel {
    id: number;
    hoidong_id: number;
    tuyensinh_id: number;
    ket_qua: string; // "trung_tuyen" | "khong_trung_tuyen"
    ghi_chu?: string;
    _hoso?: Registrations | null;
}
