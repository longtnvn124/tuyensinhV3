import { IctuBaseModel } from '@models/ictu-base-model';

export interface Nganhhoc extends IctuBaseModel {
    id: number;
    name: string;
    code: string;
    description?: string;
    is_active: boolean;
}
