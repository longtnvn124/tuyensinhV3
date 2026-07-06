import { PricingPlanSessionItem } from "@models/pricing";
import { IctuBaseModel } from '@models/ictu-base-model';

export interface Payrolls extends IctuBaseModel {
    id: number;
    employee_id: number;
    total_sessions: number;
    total_income: number;
    details: PayrollDetails[];
    donvi_id: number;
    slug: string;
}

export interface PayrollDetails {
    class_session_id: number;
    pricing_id: number;
    pricing_plan_item: PricingPlanSessionItem;
    amount: number; // thành tiền
}