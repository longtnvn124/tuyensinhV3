import { IctuBaseModel } from '@models/ictu-base-model';

export interface LichsuTuvan extends IctuBaseModel {
    id: number;
    hoso_id: number;
    content: string;
    hinhthuc_tuvan: string;
    thoigian_tuvan: string;
    user_id: number;
    ketqua_tuvan?: string;
    next_follow_up?: string;
}
