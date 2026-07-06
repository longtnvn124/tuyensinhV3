import { Class } from '@models/class';

export interface ClassHistory extends Pick<Class , 'id' | 'donvi_id' | 'csdt_id' | 'course_id' | 'curriculum' | 'teacher_ids' | 'assistant_ids' | 'time_slots' | 'total_student' | 'is_deleted' | 'deleted_by' | 'deleted_at' | 'created_by' | 'created_at' | 'updated_by' | 'updated_at'> {
    class_id : number;
    course_name : string;
    total_lessons : number;
}
