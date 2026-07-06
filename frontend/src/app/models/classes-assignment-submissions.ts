import { IctuBaseModel } from '@models/ictu-base-model';
import { CourseAttachment } from '@models/course';
import { HocSinh } from './hoc-sinh';

export interface ClassesAssignmentSubmission extends IctuBaseModel {
    id: number;
    donvi_id: number;
    classes_assignments_id: number;
    class_session_id: number;
    student_id: number;
    files: CourseAttachment[];
    score: number;
    comment: string;
    content: string;
}

export interface ClassesAssignmentSubmissionExtend extends ClassesAssignmentSubmission {
    student?: HocSinh;
}
