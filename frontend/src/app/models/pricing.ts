import { IctuBaseModel } from '@models/ictu-base-model';
import { SysRoleName } from '@models/role';
import { IctuDropdownOption } from './ictu-dropdown-option';

export type TeacherPricingType = 'PER_SESSION' | 'TIERED';

export type PricingPlanType = 'OFFICIAL' | 'REMEDIAL';

export type PricingType = 'COURSE' | 'CLASS';


export interface PricingPlan {
    type: PricingPlanType;
    sessions: PricingPlanSession[];
}
export interface PricingPlanSession {
    price: number;
    role: SysRoleName;
    pricing_plan_items?: PricingPlanSessionItem[];
}

export interface PricingPlanSessionItem {
    ordering: number;
    price: number;
    student_count: number;
}

export interface PricingPlanSessionItemTiered {
    ordering: number;
    student_count: number;
    teacherItem: PricingPlanSessionItem;
    teaching_assistantItem: PricingPlanSessionItem;
}
export interface Pricing extends IctuBaseModel {
    id: number;
    title: string;
    note: string;
    csdt_id?: number;
    class_id: number;
    course_id: number;
    donvi_id: number;
    effective_date: string;
    unit: TeacherPricingType;
    type: PricingType;
    plans: PricingPlan[];
    used: number; //0: Chưa sử dụng cho chỉnh sửa | 1: Đã sử dụng khóa chỉnh sửa	
}

export const PricingPlanOptions: IctuDropdownOption<TeacherPricingType>[] = [
    { value: 'PER_SESSION', label: 'Cố định' },
    { value: 'TIERED', label: 'Theo bậc' },
]

export const PricingTypeOptions: IctuDropdownOption<PricingType>[] = [
    { value: 'CLASS', label: 'Theo lớp học' },
    { value: 'COURSE', label: 'Theo khóa học' },
]