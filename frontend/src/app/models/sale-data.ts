import { IctuBaseModel } from "@models/ictu-base-model";

export interface SaleData extends IctuBaseModel {
    id: number;
    donvi_id: number;
    user_id: number;
    sale_team_id: number;
    name: string;
    phone: string;
    email: string;
    sort_name: string;
    dob: string;
    gender: string;
    address: string;
    child_name: string;
    child_gender: 'Nam' | 'Nữ' | 'Khác';
    child_dob: string;
    status: number;
    appointment_time: string;
}