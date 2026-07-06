import { IctuBaseModel } from '@models/ictu-base-model';

export interface StudentFee extends IctuBaseModel {
    id: number;
    code: string;
    donvi_id: number;
    student_id: number;
    course_id: number;
    class_id: number;
    total_price: number;    // tổng tiền
    discount: number;       // giảm giá
    price: number;         // đơn giá
    amount: number;        // số buổi học khả dụng
    total_amount: number;  // tổng số buổi học
    deducted: number;       // số buổi đã khấu trừ
    amount_left: number;   // số buổi còn lại
    remaining_amount: number; // số tiền học còn lại
    used: number;          // số buổi đã sử dụng
    desc: string;
    payment_date: string;
    effective_date: string;
    params: string;
    has_used: number;
}