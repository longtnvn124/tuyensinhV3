import { Pipe , PipeTransform } from '@angular/core';
import { ClassLessonExtend , getLessonTopic } from '@models/class';

@Pipe( {
    name : 'classLessonExtendLabel'
} )
export class ClassLessonExtendLabelPipe implements PipeTransform {

    transform ( lesson : ClassLessonExtend , label : 'title' | 'supTitle' ) : string {
        if ( label === 'supTitle' ) {
            return getLessonTopic( lesson.type , ( lesson.relation.parentCourseLesson?.title ?? 'Unknown' ) )
        }
        else {
            switch ( lesson.type ) {
                case 'activity':
                    return lesson.title ?? 'Unknown';
                case 'other':
                    return lesson.title ?? 'Unknown';
                default:
                    return lesson.relation.courseLesson?.title ?? 'Unknown';
            }
        }
    }

}
