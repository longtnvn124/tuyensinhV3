import { Component , computed , input , InputSignal , Signal } from '@angular/core';
import { ClassCurriculumLectureMediaComponent } from '@components/class-curriculums/class-curriculum-lecture-media-component';
import { CourseLessonStructureMedia } from '@pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/course-lesson-structure-media';
import * as Plyr from 'plyr';
import { regexMatchALink , regexMatchGoogleDrive } from '@models/file';
import { IctuTokenFile , ictuTokenFile2Link , matchIctuFileString , str2IctuTokenFile } from '@pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/components/edit-course-lesson-structure-media-upload/edit-course-lesson-structure-media-model';
import { tokenGetter } from '@app/app.config';
import { PlyrComponent } from '@module/ngx-plyr/lib/plyr/plyr.component';
import { SafeResourceUrlPipe } from '@pipes/safe-resource-url.pipe';
import { formatBytes } from '@utilities/helper';

@Component( {
    selector    : 'app-class-curriculum-lecture-media-audio' ,
    standalone  : true ,
    imports     : [ PlyrComponent , SafeResourceUrlPipe ] ,
    templateUrl : './class-curriculum-lecture-media-audio.component.html' ,
    styleUrl    : './class-curriculum-lecture-media-audio.component.css'
} )
export class ClassCurriculumLectureMediaAudioComponent implements ClassCurriculumLectureMediaComponent {

    media : InputSignal<CourseLessonStructureMedia> = input.required<CourseLessonStructureMedia>();

    readonly fileDetails : Signal<string> = computed( () : string => {
        let result : string = '';
        if ( this.media()?.content && this.validate( this.media() ) && this.media().provider === 'upload' ) {
            const _tokenFile : IctuTokenFile = str2IctuTokenFile( this.media().content );
            result                           = [ _tokenFile.title , formatBytes( _tokenFile.size ?? 0 , 2 ).replace( ' ' , '' ) ].join( ' | ' )
        }
        return result;
    } );

    readonly sources : Signal<Plyr.Source[]> = computed( () : Plyr.Source[] => {
        if ( this.media()?.content && this.validate( this.media() ) ) {
            switch ( this.media().provider ) {
                case 'googleDrive':
                    const driveMatch : RegExpMatchArray | null = this.media().content.match( regexMatchGoogleDrive( [] ) );
                    if ( driveMatch ) {
                        const videoId : string = driveMatch[ 1 ];
                        return [ {
                            provider : 'html5' ,
                            src      : `https://drive.google.com/file/d/${ videoId }/preview`
                        } ];
                    }
                    return [];
                case 'html5':
                    return [ {
                        provider : 'html5' ,
                        src      : this.media().content
                    } ];
                case 'upload':
                    if ( matchIctuFileString( this.media().content ) && tokenGetter() ) {
                        const _tokenFile : IctuTokenFile = str2IctuTokenFile( this.media().content );
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
        else {
            return [];
        }
    } );

    validate ( media : CourseLessonStructureMedia ) : boolean {
        if ( media.content ) {
            switch ( media.provider ) {
                case 'googleDrive':
                    return regexMatchGoogleDrive( [ 'g' , 'i' ] ).test( media.content );
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
}
