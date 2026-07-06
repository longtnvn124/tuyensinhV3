import { Component , inject , input , InputSignal , output , OutputEmitterRef , signal , WritableSignal } from '@angular/core';
import { CourseAttachment } from '@models/course';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import * as Plyr from 'plyr';
import { isArray } from 'lodash-es';
import { FileHelper , FileTypeHelperSupportedType } from '@utilities/helper';
import { IctuBasicFile } from '@models/file';
import { PlyrComponent } from '@module/ngx-plyr/lib/plyr/plyr.component';
import { NgClass , NgOptimizedImage , NgTemplateOutlet } from '@angular/common';
import { SafeUrlPipe } from '@pipes/safe-url.pipe';
import { FileIconPipe } from '@pipes/file-icon.pipe';
import { FormatBytesPipe } from '@pipes/format-bytes.pipe';
import { SafeHtmlPipe } from '@pipes/safe-html.pipe';
import { Tooltip } from 'primeng/tooltip';
import { NotificationService } from '@services/notification.service';
import { debounceTime , Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

type IctuCourseAttachmentPreviewState = 'loading' | 'empty' | 'ready';

type CourseAttachmentMedia = CourseAttachment | CourseAttachment[];

interface CourseAttachmentMediaData {
    sources : Plyr.Source[],
    imgSrc : string;
    file : IctuBasicFile,
    type : FileTypeHelperSupportedType,
}

type DocumentEventName = 'delete' | 'download' | 'preview';

interface DocumentEvent {
    name : DocumentEventName,
    session : number,
    index : number,
    file : IctuBasicFile
}

@Component( {
    selector    : 'app-ictu-course-attachment-preview' ,
    standalone  : true ,
    imports     : [ PlyrComponent , NgOptimizedImage , SafeUrlPipe , FileIconPipe , FormatBytesPipe , SafeHtmlPipe , Tooltip , NgClass , NgTemplateOutlet ] ,
    templateUrl : './ictu-course-attachment-preview.component.html' ,
    styleUrl    : './ictu-course-attachment-preview.component.css'
} )
export class IctuCourseAttachmentPreviewComponent {

    cssClasses : InputSignal<string> = input<string>( '' );

    multipleMode : InputSignal<boolean> = input<boolean>( false );

    media : InputSignal<CourseAttachmentMedia> = input.required<CourseAttachmentMedia>();

    emptyMessage : InputSignal<string> = input( 'No media selected' );

    readonly data : WritableSignal<CourseAttachmentMediaData> = signal( null );

    readonly state : WritableSignal<IctuCourseAttachmentPreviewState> = signal( 'loading' );

    readonly listMedia : WritableSignal<CourseAttachment[]> = signal( [] );

    onDeleteAttachment : OutputEmitterRef<number> = output<number>();

    private notification : NotificationService = inject( NotificationService );

    private session : number = 0;

    private eventObserver : Subject<DocumentEvent> = new Subject();

    constructor () {
        toObservable( this.media ).pipe(
            takeUntilDestroyed()
        ).
        subscribe( ( data : CourseAttachmentMedia ) : void => {
            if ( this.multipleMode() ) {
                if ( isArray( data ) && data.length ) {
                    this.listMedia.set( data );
                    this.state.set( 'ready' );
                }
                else {
                    this.state.set( 'empty' );
                }
            }
            else {
                if ( data && data[ 'file' ] ) {
                    const media : CourseAttachment                = data as CourseAttachment;
                    const mediaType : FileTypeHelperSupportedType = FileHelper.getFileType( media.file.type );
                    switch ( mediaType ) {
                        case 'audio':
                        case 'video':
                            this.data.set( {
                                imgSrc  : '' ,
                                sources : FileHelper.getPlyrSources( { ... media.file , mineType : media.file.type } ) ,
                                type    : mediaType ,
                                file    : media.file
                            } );
                            break;
                        case 'image':
                            this.data.set( {
                                imgSrc  : FileHelper.getStreamLink( { ... media.file , mineType : media.file.type } ) ,
                                sources : [] ,
                                type    : mediaType ,
                                file    : media.file
                            } );
                            break;
                        default:
                            this.data.set( {
                                imgSrc  : '' ,
                                sources : [] ,
                                type    : mediaType ,
                                file    : media.file
                            } );
                            break;
                    }
                    this.state.set( 'ready' );
                }
                else {
                    this.state.set( 'empty' );
                }
            }
        } );

        this.eventObserver.asObservable().pipe(
            takeUntilDestroyed() ,
            debounceTime( 100 ) ,
            distinctUntilChanged( ( previous : DocumentEvent , current : DocumentEvent ) : boolean => previous?.session === current.session )
        ).subscribe( ( { index , file , name } : DocumentEvent ) : void => {
            switch ( name ) {
                case 'download':
                    this.notification.downloadFile( file );
                    this.session += 1;
                    break;
                case 'preview':
                    this.notification.previewFile( { info : [ file ] } );
                    this.session += 1;
                    break;
                case 'delete':
                    this.onDeleteAttachment.emit( index );
                    this.session += 1;
                    break;
                default: {
                    this.session += 1;
                    break
                }
            }
        } )
    }

    protected btnDeleteAttachment ( index : number ) : void {
        this.eventObserver.next( {
            name    : 'delete' ,
            session : this.session ,
            file    : null ,
            index
        } );
    }

    protected btnPreviewAttachment ( file : IctuBasicFile ) : void {
        this.eventObserver.next( {
            name    : 'preview' ,
            session : this.session ,
            file    : file ,
            index   : -1
        } );
    }

    protected btnDownloadAttachment ( file : IctuBasicFile ) : void {
        this.eventObserver.next( {
            name    : 'download' ,
            session : this.session ,
            file    : file ,
            index   : -1
        } );
    }
}
