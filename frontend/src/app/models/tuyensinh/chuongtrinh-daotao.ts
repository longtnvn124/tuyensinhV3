import { IctuBaseModel } from '@models/ictu-base-model';

export interface ChuongtrinhDaotao extends IctuBaseModel {
    id: number;
    major_id: number;
    name: string;
    code: string;
    description?: string;
    dieu_kien_xet_tuyen?: string;
    hoc_phi?: number;
    thoi_gian_dao_tao?: string;
    chi_tieu?: number;
    is_active: boolean;
}
