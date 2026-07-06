import { Pipe , PipeTransform } from '@angular/core';
import { isArray , isString } from 'lodash-es';
import { Helper } from '@utilities/helper';
import { CourseLessonStructureMedia } from '@pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/course-lesson-structure-media';

@Pipe( {
    name       : 'courseLessonMediaDecode' ,
    standalone : true
} )
export class CourseLessonMediaDecodePipe implements PipeTransform {

    transform ( value : string ) : CourseLessonStructureMedia[] {
        if ( isString( value ) && Helper.isBase64( value ) ) {
            const decodedText : string = Helper.decodeBase64( value );
            if ( Helper.maybeJSON( decodedText ) ) {
                const media : CourseLessonStructureMedia[] = Helper.tryParseJSON( decodedText , [] );
                return isArray( media ) ? media : [];
            }
            else {
                return [];
            }
        }
        else {
            return [];
        }
    }

}
