import { IctuBaseModel } from '@models/ictu-base-model';

export interface DotXettuyen extends IctuBaseModel {
    id: number;
    tieude: string;
    thoi_gian_bat_dau: string;
    thoi_gian_ket_thuc: string;
    mota?: string;
    status: number; // 1: đang mở, 0: đã đóng
    nam?:string;
}
