import { IctuBaseModel } from '@models/ictu-base-model';

export interface HoidongXettuyen extends IctuBaseModel {
    id: number;
    name: string;
    desc: string;
    dot_xettuyen_id: number;
    thoigian_xettuyen: string;
    status: string; // "dang_mo" | "da_dong"
}
