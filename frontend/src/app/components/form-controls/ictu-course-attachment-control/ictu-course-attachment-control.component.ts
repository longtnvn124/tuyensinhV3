import { Component , computed , forwardRef , inject , input , InputSignal , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { CourseAttachment } from '@models/course';
import { ControlValueAccessor , NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject , takeUntil } from 'rxjs';
import { NotificationService } from '@services/notification.service';
import { FileUploadAttributes } from '@services/ictu-file.service';
import { _2Gb } from '@utilities/syscats';
import * as Plyr from 'plyr';
import { IctuCourseAttachmentPreviewComponent } from '@components/ictu-course-attachment-preview/ictu-course-attachment-preview.component';
import { FileIconPipe } from '@pipes/file-icon.pipe';
import { FormatBytesPipe } from '@pipes/format-bytes.pipe';
import { MatTooltip } from '@angular/material/tooltip';
import { SafeHtmlPipe } from '@pipes/safe-html.pipe';
import { NgClass } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { Is } from '@utilities/is';
import { assign } from 'lodash-es';
import { formatBytes } from '@utilities/helper';
import { IctuFileUploaderDialogResponse } from '@theme/components/ictu-file-uploader/ictu-file-uploader.component';
import { IctuBasicFile } from '@models/file';

const FORBIDDEN_EXTENSIONS : string[] = [ '.js' , '.php' , '.exe' , '.sh' , '.bat' ] as const;

export type CourseAttachmentDoc = 'documents' | 'video' | 'audio' | 'archive';

interface CourseAttachmentDocFile {
    extensions : string[],
    mimeTypes : string[]
}

const AllCourseAttachmentDoc : Record<CourseAttachmentDoc , CourseAttachmentDocFile> = {
    documents : {
        mimeTypes  : [
            'application/pdf' ,
            'application/msword' ,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ,
            'application/vnd.ms-excel' ,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ,
            'application/vnd.ms-powerpoint' ,
            'application/vnd.openxmlformats-officedocument.presentationml.presentation' ,
            'text/plain'
        ] ,
        extensions : [ '.pdf' , '.doc' , '.docx' , '.xls' , '.xlsx' , '.ppt' , '.pptx' , '.txt' ]
    } ,
    video     : {
        mimeTypes  : [
            'video/mp4' ,
            'video/quicktime' ,
            'video/x-msvideo'
        ] ,
        extensions : [ '.mp4' , '.mov' , '.avi' ]
    } ,
    audio     : {
        mimeTypes  : [
            'audio/mpeg' ,
            'audio/wav' ,
            'audio/ogg'
        ] ,
        extensions : [ '.mp3' , '.wav' , '.ogg' ]
    } ,
    archive   : {
        mimeTypes  : [
            'application/zip' ,
            'application/x-zip-compressed' ,
            'application/x-rar-compressed' ,
            'application/x-7z-compressed'
        ] ,
        extensions : [ '.zip' , '.rar' , '.7z' ]
    }
} as const;

@Component( {
    selector    : 'ictu-course-attachment-control' ,
    imports     : [ IctuCourseAttachmentPreviewComponent , FileIconPipe , FormatBytesPipe , MatTooltip , SafeHtmlPipe , NgClass , MatButton ] ,
    standalone  : true ,
    providers   : [ {
        provide     : NG_VALUE_ACCESSOR ,
        useExisting : forwardRef( () : typeof IctuCourseAttachmentControlComponent => IctuCourseAttachmentControlComponent ) ,
        multi       : true
    } ] ,
    templateUrl : './ictu-course-attachment-control.component.html' ,
    styleUrl    : './ictu-course-attachment-control.component.css'
} )
export class IctuCourseAttachmentControlComponent implements ControlValueAccessor , OnDestroy {

    maxFileSize : InputSignal<number> = input<number>( _2Gb );

    fileAttributes : InputSignal<FileUploadAttributes> = input<FileUploadAttributes>( { public : 1 } );

    multipleMode : InputSignal<boolean> = input<boolean>( false );

    allowedFileTypes : InputSignal<CourseAttachmentDoc[]> = input<CourseAttachmentDoc[]>( [ 'documents' , 'archive' , 'audio' , 'video' ] );

    btnUploadLabel : InputSignal<string> = input<string>( 'Thêm tài liệu' );

    btnUploadIcons : InputSignal<string[]> = input<string[]>( [ 'fa-classic' , 'fa-light' , 'fa-file-circle-plus' , 'f-16' ] );

    btnDeleteLabel : InputSignal<string> = input<string>( 'Xóa File' );

    options : InputSignal<Plyr.Options> = input<Plyr.Options>( {
        controls : [ 'play' , 'progress' , 'current-time' ]
    } );

    value : WritableSignal<CourseAttachment | CourseAttachment[]> = signal( null );

    readonly allowedMimeTypes : Signal<string[]> = computed( () : string[] => {
        return this.allowedFileTypes().reduce( ( reducer : string[] , type : CourseAttachmentDoc ) : string[] => {
            reducer.push( ... AllCourseAttachmentDoc[ type ].mimeTypes )
            return reducer
        } , new Array<string>() )
    } );

    readonly allowedExtensions : Signal<string[]> = computed( () : string[] => {
        return this.allowedFileTypes().reduce( ( reducer : string[] , type : CourseAttachmentDoc ) : string[] => {
            reducer.push( ... AllCourseAttachmentDoc[ type ].extensions )
            return reducer
        } , new Array<string>() )
    } );

    readonly singleAttachment : Signal<CourseAttachment> = computed( () : CourseAttachment => {
        return ! this.multipleMode() && this.value() ? ( this.value() as CourseAttachment ) : null;
    } );

    readonly attachments : Signal<CourseAttachment[]> = computed( () : CourseAttachment[] => {
        return this.multipleMode() && this.value() && Is.array( this.value() ) ? ( this.value() as CourseAttachment[] ) : [];
    } );

    readonly acceptedTypes : Signal<string> = computed( () : string => this.allowedExtensions().join( ', ' ) );

    readonly disabled : WritableSignal<boolean> = signal( false );

    protected readonly enableLoading : WritableSignal<boolean> = signal( true );

    private destroyed$ : Subject<void> = new Subject<void>();

    private notification : NotificationService = inject( NotificationService );

    private onChange : ( _ : any ) => void = ( _ : any ) : void => {
    };

    private onTouched : () => void = () : void => {
    };

    private attachMoreDocumentsObserver : Subject<number> = new Subject();

    private session : number = 0;

    constructor () {
        this.attachMoreDocumentsObserver.asObservable().pipe(
            takeUntilDestroyed() ,
            distinctUntilChanged()
        ).subscribe( () : void => {
            this.uploadDocuments();
        } )
    }

    registerOnChange ( fn : any ) : void {
        this.onChange = fn;
    }

    registerOnTouched ( fn : any ) : void {
        this.onTouched = fn;
    }

    setDisabledState ( isDisabled : boolean ) : void {
        this.disabled.set( isDisabled );
    }

    writeValue ( value : CourseAttachment | CourseAttachment[] ) : void {
        this.value.set( value );
    }

    private validateFile ( file : File ) : boolean {
        switch ( true ) {
            case file.size >= this.maxFileSize():
                this.notification.toastError( 'Dung lượng file không được vượt quá ' + formatBytes( this.maxFileSize() ) );
                return false;
            case ! this.validateFileType( file ):
                this.notification.toastError( `Chỉ chấp nhận file có định dạng ${ this.allowedExtensions().join( ', ' ) }`.replace( /\./g , '' ) );
                return false;
            default:
                return true;
        }
    }

    private _fileUploader ( file : File ) : void {
        this.notification.uploadFile( { file , fileAttributes : this.fileAttributes() } ).pipe(
            takeUntil( this.destroyed$ )
        ).subscribe( {
            next  : ( { info , success } : IctuFileUploaderDialogResponse ) : void => {
                if ( success ) {
                    this.notification.toastSuccess( 'Upload file thành công' )
                    const file : IctuBasicFile = {
                        id       : info.id ,
                        name     : info.name ,
                        title    : info.title ,
                        url      : info.url ,
                        ext      : info.ext ,
                        type     : info.type ,
                        size     : info.size ,
                        location : info.location
                    };
                    this.value.update( ( value : CourseAttachment | CourseAttachment[] ) : CourseAttachment | CourseAttachment[] => {
                        if ( this.multipleMode() ) {
                            if ( Array.isArray( value ) && value.length ) {
                                return [ ... value , { location : 'local' , link : '' , title : info.title , file } ];
                            }
                            else {
                                return [ { location : 'local' , link : '' , title : info.title , file } ]
                            }
                        }
                        else {
                            return { location : 'local' , link : '' , title : info.title , file }
                        }
                    } );
                    this.onChange( this.value() );
                    this.onTouched();
                    this.notification.toastSuccess( 'Upload file thành công' );
                }
            } ,
            error : () : void => {
                this.notification.toastError( 'Upload file thất bại' )
            }
        } );
    }

    protected removeAttachmentFile () : void {
        this.value.set( null );
        this.onChange( this.value() );
        this.onTouched();
    }

    protected btnCallFileChooser () : void {
        this.attachMoreDocumentsObserver.next( this.session );
    }

    private uploadDocuments () : void {
        const filePanel : HTMLInputElement = assign<HTMLInputElement , Pick<HTMLInputElement , 'type' | 'accept' | 'multiple'>>( document.createElement( 'input' ) , { type : 'file' , accept : this.acceptedTypes() , multiple : false } );
        filePanel.onchange                 = () : void => {
            if ( filePanel.files.length ) {
                const _file : File = filePanel.files.item( 0 );
                if ( this.validateFile( _file ) ) {
                    this._fileUploader( _file );
                }
            }
            this.session += 1;
            setTimeout( () : void => filePanel.remove() , 1000 );
        };
        filePanel.oncancel                 = () : void => {
            this.session += 1;
        };
        filePanel.onabort                  = () : void => {
            this.session += 1;
        };
        filePanel.click();
    }

    private getFileExtension ( fileName : string ) : string {
        // const fileName : string  = file.name.toLowerCase();
        // const extension : string = fileName.substring( fileName.lastIndexOf( '.' ) );
        const lastDot : number = fileName.lastIndexOf( '.' );
        if ( lastDot === -1 ) return '';
        return fileName.slice( lastDot ).toLowerCase();
    }

    private validateFileType ( file : File ) : boolean {
        const extension : string = this.getFileExtension( file.name );
        if ( ! extension ) {
            return false;
        }

        if ( ! this.isAllowedExtension( extension ) ) {
            return false;
        }

        return ! ( file.type && ! this.allowedMimeTypes().includes( file.type ) );
    }

    private isAllowedExtension ( extension : string ) : boolean {
        if ( FORBIDDEN_EXTENSIONS.includes( extension ) ) {
            return false;
        }
        if ( ! this.allowedExtensions().length || ! this.allowedExtensions().filter( Boolean ).length ) {
            return true;
        }
        return this.allowedExtensions().filter( Boolean ).map( ( i : string ) : string => i.toLowerCase() ).includes( extension );
    }

    protected removeAttachmentFromList ( index : number ) : void {
        this.value.update( ( list : CourseAttachment[] ) : CourseAttachment[] => [ ... list.filter( ( _ : CourseAttachment , i : number ) : boolean => i !== index ) ] );
        this.onChange( this.value() );
        this.onTouched();
    }

    ngOnDestroy () : void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
