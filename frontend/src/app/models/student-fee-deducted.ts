import { IctuBaseModel } from './ictu-base-model';

export interface StudentFeeDeducted extends IctuBaseModel {
    id: number;
    donvi_id: number;
    student_fee_id: number;
    amount: number;
    code: string;
    class_id: number;
    course_id: number;
    student_id: number;
    date: string;
}