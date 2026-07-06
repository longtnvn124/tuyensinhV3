import { IctuBaseModel } from '@models/ictu-base-model';
import { IctuDropdownOption } from './ictu-dropdown-option';
import { CourseAttachment } from './course';

export type CourseLessonTestType = 'TU_LUAN' | 'TRAC_NGHIEM';

export interface CourseLessonTest extends IctuBaseModel {
    id: number;
    donvi_id: number;
    course_lesson_id: number;
    title: string;
    type: CourseLessonTestType;
    files: CourseAttachment[];
    content: string;
    required: number;
    configs: string;
    time: number;
    status: number;
    course_id: number;
}

export const optionTypeCourseLessonTest: IctuDropdownOption<CourseLessonTestType>[] =
    [
        { value: 'TU_LUAN', label: 'Tự luận' },
        { value: 'TRAC_NGHIEM', label: 'Trắc nghiệm' },
    ];

export const optionRequiredCourseLessonTest: IctuDropdownOption<number>[] =
    [
        { value: 0, label: 'Không bắt buộc' },
        { value: 1, label: 'Bắt buộc' },
    ];

export const optionStatusCourseLesson: IctuDropdownOption<number>[] = [
    { value: 0, label: 'Đang soạn thảo' },
    { value: 1, label: 'Hoàn thành' },
];
