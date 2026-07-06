import { IctuBaseModel } from '@models/ictu-base-model';
import { CourseLessonPlanContentItem } from '@models/course-lesson-plan';
import { CourseAttachment } from './course';
export interface ClassSessionContent extends IctuBaseModel {
    id: number;
    class_id: number;
    donvi_id: number;
    course_lesson_id: number;
    content: CourseLessonPlanContentItem[];
    class_session_id: number;
    attachments: CourseAttachment[];
}