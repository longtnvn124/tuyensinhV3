import { IctuBaseModel } from '@models/ictu-base-model';

export interface Parents extends IctuBaseModel {
    id: number;
    parent_id: number;
    user_id: number;
}
