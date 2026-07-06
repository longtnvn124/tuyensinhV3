import { Component , computed , inject , input , InputSignal , signal , Signal , WritableSignal } from '@angular/core';
import { ClassCurriculumLectureMediaComponent } from '@components/class-curriculums/class-curriculum-lecture-media-component';
import { CourseLessonStructureMedia } from '@pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/course-lesson-structure-media';
import { IctuTokenFile , matchIctuFileString , str2IctuTokenFile } from '@pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/components/edit-course-lesson-structure-media-upload/edit-course-lesson-structure-media-model';
import { formatBytes } from '@utilities/helper';
import { IctuBasicFile } from '@models/file';
import { debounceTime , Subject } from 'rxjs';
import { NotificationService } from '@services/notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component( {
    selector    : 'app-class-curriculum-lecture-media-document' ,
    standalone  : true ,
    imports     : [] ,
    templateUrl : './class-curriculum-lecture-media-document.component.html' ,
    styleUrl    : './class-curriculum-lecture-media-document.component.css'
} )
export class ClassCurriculumLectureMediaDocumentComponent implements ClassCurriculumLectureMediaComponent {

    media : InputSignal<CourseLessonStructureMedia> = input.required<CourseLessonStructureMedia>();

    private notification : NotificationService = inject( NotificationService );

    readonly fileInfo : Signal<IctuTokenFile> = computed( () : IctuTokenFile => {
        if ( this.media()?.content && this.validate( this.media() ) ) {
            return str2IctuTokenFile( this.media().content );
        }
        return null;
    } );

    readonly fileTitle : Signal<string> = computed( () : string => this.fileInfo()?.title ?? '...' );

    readonly fileSize : Signal<string> = computed( () : string => this.fileInfo() ? formatBytes( this.fileInfo().size ?? 0 , 2 ).replace( ' ' , '' ) : '' );

    readonly fileIcon : Signal<string> = computed( () : string => {
        let _fileExt : string = 'txt';
        if ( this.fileInfo()?.ext && [ 'docx' , 'pptx' , 'pdf' , 'xlsx' , 'txt' ].includes( this.fileInfo().ext.toLowerCase() ) ) {
            _fileExt = this.fileInfo().ext.toLowerCase();
        }
        return `images/file-extensions/${ _fileExt }.svg`
    } );

    private previewFileObserver : Subject<void> = new Subject<void>();

    constructor () {
        this.previewFileObserver.asObservable().pipe(
            takeUntilDestroyed() ,
            debounceTime( 500 )
        ).subscribe( () : void => {
            this.previewFile()
        } )
    }

    validate ( media : CourseLessonStructureMedia ) : boolean {
        return media.content ? matchIctuFileString( media.content ) : false;
    }

    protected btnPreviewFile () : void {
        this.previewFileObserver.next()
    }

    private previewFile () : void {
        if ( this.fileInfo() ) {
            const _fileInfo : IctuBasicFile = {
                url      : '' ,
                id       : this.fileInfo().id ,
                name     : this.fileInfo().name ,
                title    : this.fileInfo().title ,
                ext      : this.fileInfo().ext ,
                size     : this.fileInfo().size ,
                location : this.fileInfo().location ,
                type     : this.fileInfo().mineType
            }
            this.notification.previewFile( { info : [ _fileInfo ] } )
        }
    }
}
