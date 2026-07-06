import { Pipe , PipeTransform } from '@angular/core';
import { CourseLessonPlanContentPageItem , CourseLessonPlanContentPageItemSlide } from '@models/course-lesson-plan';
import { range } from 'lodash-es';

@Pipe( {
    name       : 'excerptFromDocumentToSlides' ,
    standalone : true
} )
export class ExcerptFromDocumentToSlidesPipe implements PipeTransform {

    transform ( page : CourseLessonPlanContentPageItem ) : CourseLessonPlanContentPageItemSlide[] {
        const numberOfSlides : number = Math.max( page.start , page.end ) - Math.min( page.start , page.end );
        if ( numberOfSlides ) {
            return range( Math.min( page.start , page.end ) , Math.max( page.start , page.end ) ).map( ( order : number ) : CourseLessonPlanContentPageItemSlide => ( { order , state : 'init' , fileID : page.id_file } ) )
        }
        return [];
    }
}
