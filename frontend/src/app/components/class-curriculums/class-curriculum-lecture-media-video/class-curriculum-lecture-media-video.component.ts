import { Component , computed , input , InputSignal , signal , Signal , WritableSignal } from '@angular/core';
import { CourseLessonStructureMedia } from '@app/pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/course-lesson-structure-media';
import { ClassCurriculumLectureMediaComponent , ClassCurriculumLectureMediaComponentState } from '@components/class-curriculums/class-curriculum-lecture-media-component';
import * as Plyr from 'plyr';
import { regexMatchALink , regexMatchGoogleDrive , regexMatchVimeo , regexMatchYouTube } from '@models/file';
import { IctuTokenFile , ictuTokenFile2Link , matchIctuFileString , str2IctuTokenFile } from '@pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/components/edit-course-lesson-structure-media-upload/edit-course-lesson-structure-media-model';
import { tokenGetter } from '@app/app.config';
import { PlyrComponent } from '@module/ngx-plyr/lib/plyr/plyr.component';
import { SafeResourceUrlPipe } from '@pipes/safe-resource-url.pipe';

@Component( {
    selector    : 'class-curriculum-lecture-media-video' ,
    standalone  : true ,
    imports     : [ PlyrComponent , SafeResourceUrlPipe ] ,
    templateUrl : './class-curriculum-lecture-media-video.component.html' ,
    styleUrl    : './class-curriculum-lecture-media-video.component.css'
} )
export class ClassCurriculumLectureMediaVideoComponent implements ClassCurriculumLectureMediaComponent {

    media : InputSignal<CourseLessonStructureMedia> = input.required<CourseLessonStructureMedia>();

    readonly sources : Signal<Plyr.Source[]> = computed( () : Plyr.Source[] => {
        return this.media()?.content && this.validate( this.media() ) ? this.getSource( this.media() ) : []
    } );

    validate ( media : CourseLessonStructureMedia ) : boolean {
        if ( media?.content ) {
            switch ( media.provider ) {
                case 'googleDrive':
                    return regexMatchGoogleDrive( [ 'g' , 'i' ] ).test( media.content );
                case 'youtube':
                    return regexMatchYouTube( [ 'g' , 'i' ] ).test( media.content );
                case 'vimeo':
                    return regexMatchVimeo( [ 'g' , 'i' ] ).test( media.content );
                case 'upload':
                    return matchIctuFileString( media.content );
                case 'html5':
                    return regexMatchALink( [ 'g' , 'i' ] ).test( media.content );
                default:
                    return false;
            }
        }
        else {
            return false;
        }
    }

    private getSource ( media : CourseLessonStructureMedia ) : Plyr.Source[] {
        switch ( media.provider ) {
            case 'googleDrive':
                const driveMatch : RegExpMatchArray | null = media.content.match( regexMatchGoogleDrive( [] ) );
                if ( driveMatch ) {
                    const videoId : string = driveMatch[ 1 ];
                    return [ {
                        provider : 'html5' ,
                        src      : `https://drive.google.com/file/d/${ videoId }/preview`
                    } ];
                }
                return [];
            case 'youtube':
                return [ {
                    provider : 'youtube' ,
                    src      : media.content
                } ];
            case 'vimeo':
                return [ {
                    provider : 'vimeo' ,
                    src      : media.content
                } ];
            case 'html5':
                return [ {
                    provider : 'html5' ,
                    src      : media.content
                } ];
            case 'upload':
                if ( matchIctuFileString( media.content ) && tokenGetter() ) {
                    const _tokenFile : IctuTokenFile = str2IctuTokenFile( media.content );
                    const url : URL                  = new URL( ictuTokenFile2Link( _tokenFile ) );
                    url.searchParams.set( 'token' , tokenGetter() );
                    return [ {
                        provider : 'html5' ,
                        src      : url.toString() ,
                        type     : _tokenFile.mineType
                    } ];
                }
                else {
                    return [];
                }
            default:
                return [];
        }
    }
}
