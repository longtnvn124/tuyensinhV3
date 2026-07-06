import { IctuBaseModel } from '@models/ictu-base-model';
import { CourseAttachment } from '@models/course';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { IctuBasicFile } from '@models/file';
import { sortBy } from 'lodash-es';
import { ClassLesson } from '@models/class';

export type DeliveryMode = 'ONLINE' | 'OFFLINE' | 'HYBRID';

export const optionDeliveryModeType : IctuDropdownOption<DeliveryMode>[] = [
    { value : 'ONLINE' , label : 'Trá»±c tuyáº¿n' } ,
    { value : 'OFFLINE' , label : 'Trá»±c tiáº¿p' } ,
    { value : 'HYBRID' , label : 'Káº¿t há»£p' }
];

export interface ScormResponse {
    code : string;
    message : string;
    data : string;
}

export type TypeCourseLesson = 'TEXT' | 'VIDEO' | 'AUDIO' | 'QUIZ' | 'ASSIGNMENT' | 'STREAM' | 'SCORM'

export interface CourseLessonParam {
    fast_forward? : boolean
}

export interface CourseLesson extends IctuBaseModel {
    id : number;
    donvi_id : number;
    course_id : number;
    parent_id : number;
    title : string;
    slug : string;
    code : string;
    type : TypeCourseLesson;
    params : CourseLessonParam;
    content : string;
    desc : string;
    video : CourseAttachment;
    audio : CourseAttachment;
    scorm : IctuBasicFile;
    preview : number;
    attachments : CourseAttachment[];
    ordering : number;
    teacher : number;
    status : number;
    duration : number;
    courseLessonChild? : CourseLesson[];
    delivery_mode : DeliveryMode;
}

export const courseLessons2ClassLessons : any = ( courseLessons : CourseLesson[] ) : ClassLesson[] => {
    const chapters : any[] = sortBy( courseLessons.filter( ( i : CourseLesson ) : boolean => i.parent_id === 0 ).map( ( p : CourseLesson ) : any => {
        const children : CourseLesson[] = sortBy<CourseLesson>( courseLessons.filter( ( c : CourseLesson ) : boolean => c.parent_id === p.id ) , 'ordering' );
        return { ... p , children };
    } ) , 'ordering' );
    const lessons : CourseLesson[]         = chapters.reduce( ( _reducer : CourseLesson[] , item : any ) : CourseLesson[] => {
        _reducer.push( ... item[ 'children' ] );
        return _reducer;
    } , new Array<CourseLesson>() );
    return lessons.map( ( { id } : CourseLesson , index : number ) : ClassLesson => ( { course_lesson_id : id , teacher_id : 0 , ordering : 1 + index } ) );
}
