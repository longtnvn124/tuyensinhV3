import { IctuBaseModel } from '@models/ictu-base-model';

export interface PhancongTuvan extends IctuBaseModel {
    id: number;
    hoso_id: number;
    tuvan_id: number;
    assigned_by: number;
    assigned_at: string;
    note?: string;
}
