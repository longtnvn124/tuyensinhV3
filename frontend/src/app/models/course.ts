import { IctuBaseModel } from '@models/ictu-base-model';
import { IctuDropdownOption , IctuDropdownOptionElement } from './ictu-dropdown-option';
import { CourseLesson } from '@models/course-lesson';
import { CourseLessonPlan } from '@models/course-lesson-plan';
import { RoutingCommand } from '@models/dto';
import { SysRoleName } from '@models/role';
import { IctuBasicFile } from '@models/file';
import { Source } from 'plyr';

export type CourseType = 'ONLINE' | 'ON_SITE' | 'BLENDED';

export type LectureType = 'EXCERPT_FROM_DOCUMENT' | 'VOCABULARY' | 'TEXT' | 'EXAMPLE_SENTENCES' | 'LINK' | 'TEST' | 'MEDIA';

export interface CourseLectureFormat {
    order : number;
    title : string;
    slug : string;
    type? : LectureType;
    public? : boolean;
    fileID : number;
    totalPages : number;
}

export const optionListType : IctuDropdownOption<LectureType>[] = [
    { value : 'EXCERPT_FROM_DOCUMENT' , label : 'Trích tài liệu' } ,
    { value : 'VOCABULARY' , label : 'Từ vựng' } ,
    { value : 'TEXT' , label : 'Văn bản' } ,
    { value : 'EXAMPLE_SENTENCES' , label : 'Ví dụ câu' } ,
    { value : 'MEDIA' , label : 'Media' } ,
    { value : 'LINK' , label : 'Link' }
] as const;

export const optionListTypeIcons : IctuDropdownOption<LectureType>[] = [
    { value : 'EXCERPT_FROM_DOCUMENT' , label : 'm-r-5 f-16 ti ti-vocabulary' } ,
    { value : 'VOCABULARY' , label : 'm-r-5 f-16 ti ti-a-b' } ,
    { value : 'TEXT' , label : 'm-r-5 f-16 ti ti-file-text' } ,
    { value : 'EXAMPLE_SENTENCES' , label : 'm-r-5 f-16 ti ti-message-dots' } ,
    { value : 'MEDIA' , label : 'm-r-5 f-16 ti ti-brand-youtube' } ,
    { value : 'LINK' , label : 'm-r-5 f-16 ti ti-link' }
] as const;

export type CourseFileLocation = 'local' | 'online' |'youtube';

export interface CourseCommand {
    course: Course;
    role: SysRoleName;
    userId: number;
}

export interface CourseVideoIntro {
    location : CourseFileLocation;
    file : IctuBasicFile; // available when location equal local
    source : Source; // available when location equal online
}

export interface CourseParams {}

export type CourseAttachmentType = 'textbook' | 'document';

export interface CourseAttachment {
    // type : CourseAttachmentType;
    location : CourseFileLocation;
    title : string; // title of doc and available when location equal online,
    link : string; // available when location equal online,
    file : IctuBasicFile; // available when location equal local
}

export type CourseSubject = 'normal' | 'language' | 'math'

export interface Course extends IctuBaseModel {
    id : number;
    donvi_id : number;
    type : CourseType;
    title : string;
    code : string;
    lecture_format : CourseLectureFormat[];
    desc : string;
    excerpt : string; // Trích đoạn - Đoạn mô tả ngắn về khóa học(Không quá 200 ký tự);
    thumbnail : string;
    tags : string;
    category_ids : number[];
    attachments : CourseAttachment[];
    linhvuc_id : number;
    bacdaotao_id : number;
    sobaigiang : number;
    duration : number;
    video_introduce : CourseVideoIntro;
    playlist_id : string;
    playlist_source : string;
    seo : string;
    price : number;
    discount : number;
    num_of_like : number;
    num_of_view : number;
    feature : number;
    status : number;
    activated : number;
    teacher_ids : string;
    creator_id : number;
    creator_name : string;
    params : CourseParams;
    subject? : CourseSubject
}

export const TYPE_COURSE_OPTIONS : IctuDropdownOptionElement<CourseType>[] = [
    { value : 'ONLINE' , label : 'Trực tuyến' } ,
    { value : 'ON_SITE' , label : 'Trực tiếp' } ,
    { value : 'BLENDED' , label : 'Kết hợp' }
];

export interface CourseWidthLessons extends Course {
    lessons : CourseLesson[];
}

export interface CourseWidthLessonsPlan extends Course {
    lesson_plan : CourseLessonPlan[];
}

export interface CourseWidthLessonsAndLessonsPlan extends Course {
    lesson_plan : CourseLessonPlan[];
    lessons : CourseLesson[];
}

export interface CourseRoutingCommand extends RoutingCommand {
    courseID : number;
    role : SysRoleName;
}
