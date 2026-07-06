import { IctuBaseModel } from '@models/ictu-base-model';
import { CourseLectureFormat } from '@models/course';

export interface CourseLessonPlanContentPageItem {
    start : number;
    end : number;
    id_file : number;
}

export type CourseLessonPlanContentPageItemSlideState = 'init' | 'loading' | 'loaded' | 'error';

export interface CourseLessonPlanContentPageItemSlide {
    state : CourseLessonPlanContentPageItemSlideState,
    fileID : number;
    order : number;
}

export interface CourseLessonPlanContentItem extends CourseLectureFormat {
    content? : string;
    page? : CourseLessonPlanContentPageItem;
    words? : number[];
    grammars? : number[];
}

export interface CourseLessonPlan extends IctuBaseModel {
    id : number;
    course_lessons_id : number;
    content : CourseLessonPlanContentItem[];
    title : string;
    slug : string;
    page : string;
    course_id : number;
    code : string;
    class_id : number;
    parent_id : number;
    donvi_id : number;
    ordering : number;
    courseLessonPlanChild? : CourseLessonPlan[];
}
