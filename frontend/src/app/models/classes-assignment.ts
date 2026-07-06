import { IctuBaseModel } from '@models/ictu-base-model';
import { CourseAttachment } from '@models/course';
import { CourseLessonTest } from '@models/course-lesson-test';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { ClassSession } from '@models/class-session';
import { Class } from '@models/class';
import { SysRoleName } from '@models/role';
import { ClassesAssignmentSubmission } from './classes-assignment-submissions';

export type ClassesAssignmentType = 'TU_LUAN' | 'TRAC_NGHIEM';

export interface ClassesAssignment extends IctuBaseModel {
    id: number;
    donvi_id: number;
    class_id: number;
    student_ids: number[];
    title: string;
    content: string;
    time_start: string;
    time_end: string;
    course_lesson_test_id: number;
    course_lesson_id: number;
    class_session_id: number;
    type: ClassesAssignmentType;
    required: number;
    bank_id: number;
    config: any;
    files: CourseAttachment[];
    time: number; // thời gian làm bài (giây)
}

export interface ClassesAssignmentExtend extends ClassesAssignment {
    course_lesson_test?: CourseLessonTest;
}

export interface ClassesAssignmentScoring extends ClassesAssignment {
    course_lesson_test?: CourseLessonTest;
    submission?: Pick<ClassesAssignmentSubmission, 'id' | 'student_id' | 'score'>[];
    class: Class;
    class_session: ClassSession;
    total_student_pending: number;
    total_student_submitted: number;
    total_marked: number;
}

export interface ClassAssignmentCommand {
    class_session_id?: number;
    classes_assignment_id: number;
    role: SysRoleName;
    userId: number;
}

export const optionClassesAssignmentType: IctuDropdownOption<ClassesAssignmentType>[] = [
    { value: 'TU_LUAN', label: 'Tự luận' },
    { value: 'TRAC_NGHIEM', label: 'Trắc nghiệm' },
];

