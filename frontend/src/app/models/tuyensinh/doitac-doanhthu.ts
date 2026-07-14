import { IctuBaseModel } from '@models/ictu-base-model';

export interface DoitacDoanhthu extends IctuBaseModel {
    id: number;
    user_id: number;
    hoso_id: number;
    rule_code?: string;
    amount: number;
    status: number;
    settlement_status?: string;
}
