import { IctuBaseModel } from '@models/ictu-base-model';

export interface Nganhhoc extends IctuBaseModel {
    id: number;
    ten_nganh: string;
    ma_nganh: string;
    description?: string;
    status: number;
}
