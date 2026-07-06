import { IctuBaseModel } from '@models/ictu-base-model';
import { Course } from './course';
import { CourseLesson } from './course-lesson';
import { CourseLessonPlan } from './course-lesson-plan';

export interface LopHoc extends IctuBaseModel {
    id: number;
    name: string;
    donvi_id: number;
    khoahoc_id: number;
    course_id: number;
    date_start: string;
    desc: string;
    giaovien_id: number;
    foreign_teacher_id: number;
    trogiang_id: string;
    mota: string;
    duration: number;
    namhoc: number;
    status: number;
    parent_id: number;
    lopBT: LopHoc[];
    soluong: number;
    course: Course;
    lessons?: CourseLesson[];
    lesson_plan?: CourseLessonPlan[];
}
