import { Component , computed , inject , input , InputSignal , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { FormControl } from "@angular/forms";
import { CourseFileLocation , CourseVideoIntro } from "@models/course";
import { takeUntilDestroyed , toObservable } from "@angular/core/rxjs-interop";
import { debounceTime , merge , Subject , takeUntil } from "rxjs";
import { InputText } from "primeng/inputtext";
import { MatButton } from "@angular/material/button";
import { Popover } from "primeng/popover";
import { CourseVideoLabelPipe } from "@components/form-controls/course-video-control/course-video-label.pipe";
import { Tooltip } from "primeng/tooltip";
import { Dialog } from "primeng/dialog";
import { SharedModule } from "@shared/shared.module";
import { _100MB } from "@utilities/syscats";
import { NotificationService } from "@services/notification.service";
import { IctuFileService } from "@services/ictu-file.service";
import { IctuBasicFile , UploadInfo } from "@models/file";
import { ProgressBarMode } from "@angular/material/progress-bar";
import { SafeHtmlPipe } from "@pipes/safe-html.pipe";
import { Helper } from "@utilities/helper";

type InputFileState = 'COMPLETED' | 'OPEN_FILE_CHOOSER' | 'UPLOADING';

type InputFileError = 'NO_ERROR' | 'ERROR_FILE_TYPE' | 'ERROR_FILE_SIZE';

@Component( {
	selector    : 'course-video-control' ,
	standalone  : true ,
	imports     : [ InputText , MatButton , Popover , CourseVideoLabelPipe , Tooltip , Dialog , SharedModule , SafeHtmlPipe ] ,
	templateUrl : './course-video-control.component.html' ,
	styleUrl    : './course-video-control.component.css'
} )
export class CourseVideoControlComponent implements OnDestroy {

	private notification : NotificationService = inject( NotificationService );

	private fileService : IctuFileService = inject<IctuFileService>( IctuFileService );

	control : InputSignal<FormControl<CourseVideoIntro>> = input.required<FormControl<CourseVideoIntro>>();

	defaultValue : InputSignal<CourseVideoIntro> = input<CourseVideoIntro>( { location : 'online' , file : null , source : { src : '' , type : 'video' , provider : 'youtube' } } );

	protected readonly isLoading : WritableSignal<boolean> = signal( true );

	protected readonly inputFileState : WritableSignal<InputFileState> = signal( 'COMPLETED' );

	protected enableErrorDialog : boolean = false;

	private _uploadFileError : WritableSignal<InputFileError> = signal( 'NO_ERROR' );

	protected errorHeading : Signal<string> = computed( () : string => this._uploadFileError() !== 'NO_ERROR' ? this._uploadFileError() === 'ERROR_FILE_TYPE' ? 'Lỗi định dạng file!' : 'Dung lượng file quá lớn!' : '' );

	protected errorMessage : Signal<string> = computed( () : string => this._uploadFileError() !== 'NO_ERROR' ? this._uploadFileError() === 'ERROR_FILE_TYPE' ? '<p class="font-roboto f-14 fw-normal text-primary m-0">Hệ thống chỉ chấp nhận file có định dạng .mp4, .webm, .ogg</p>' : '<p class="font-roboto f-14 fw-normal text-primary m-0">Hệ thống chỉ chấp nhận file có dung lượng nhỏ hơn 100Mb.</p>' : '' );

	private formValue : WritableSignal<CourseVideoIntro> = signal( Helper.cloneObject<CourseVideoIntro>( this.defaultValue() ) );

	protected location : Signal<CourseFileLocation> = computed( () : CourseFileLocation => this.formValue().location );

	protected file : Signal<IctuBasicFile> = computed( () : IctuBasicFile => this.formValue().file );

	protected source : Signal<Plyr.Source> = computed( () : Plyr.Source => this.formValue().source );

	protected youtubeUrl : string = '';

	private openFileChooserObserver : Subject<void> = new Subject<void>();

	private _uploadInfo : WritableSignal<UploadInfo> = signal<UploadInfo>( {
		state    : 'PENDING' ,
		progress : 0 ,
		response : null ,
		uploaded : 0 ,
		total    : 0
	} );

	protected uploadFileProgress : Signal<number> = computed( () : number => this._uploadInfo().progress );

	protected progressBarMode : Signal<ProgressBarMode> = computed( () : ProgressBarMode => this._uploadInfo().state === 'IN_PROGRESS' ? 'determinate' : 'buffer' );

	private destroyed$ : Subject<void> = new Subject<void>();

	private presetFormObserver : Subject<void> = new Subject<void>();

	constructor () {
		toObservable( this.formValue ).pipe(
			takeUntilDestroyed()
		).subscribe( ( value : CourseVideoIntro ) : void => {
			if ( value.location === 'online' ) {
				this.youtubeUrl = value?.source?.src ?? ''
			}
			else {
				this.youtubeUrl = '';
			}
		} )

		toObservable( this.control ).pipe(
			takeUntilDestroyed()
		).subscribe( ( control : FormControl<CourseVideoIntro> ) : void => {
			this.presetForm( control );
		} );

		this.openFileChooserObserver.pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 )
		).subscribe( () : void => {
			this._openFileChooser();
		} );
	}

	private presetForm ( control : FormControl<CourseVideoIntro> ) : void {
		this.presetFormObserver.next();// remove previous events
		this.formValue.set( Object.assign<CourseVideoIntro , CourseVideoIntro>( Helper.cloneObject<CourseVideoIntro>( this.defaultValue() ) , control?.value ) );
		control.valueChanges.pipe(
			takeUntil( merge( this.presetFormObserver , this.destroyed$ ) )
		).subscribe( ( value : CourseVideoIntro ) : void => {
			this.formValue.set( Object.assign<CourseVideoIntro , CourseVideoIntro>( Helper.cloneObject<CourseVideoIntro>( this.defaultValue() ) , value ) );
		} )
	}

	protected btnSetVideoIntroLocation ( location : CourseFileLocation , popover : Popover ) : void {
		if ( location !== this.location() ) {
			this.updateControl( { location } );
		}
		popover.hide();
	}

	protected btnCloseDialog () : void {
		this.enableErrorDialog = false
	}

	protected updateYoutubeSrc () : void {
		this.updateControl( { source : { ... this.formValue().source , src : this.youtubeUrl } } );
	}

	private updateControl ( info : Partial<CourseVideoIntro> ) : void {
		this.control().setValue( Object.assign( this.control().value , info ) );
		this.control().markAsTouched()
	}

	protected btnOpenFileChooser () : void {
		this.inputFileState.set( 'OPEN_FILE_CHOOSER' );
		this.openFileChooserObserver.next();
	}

	private _openFileChooser () : void {
		const inputTag : HTMLInputElement = Object.assign<HTMLInputElement , Pick<HTMLInputElement , 'type' | 'accept' | 'multiple'>>( document.createElement( 'input' ) , {
			type     : 'file' ,
			accept   : 'video/mp4,video/webm,video/ogg' ,
			multiple : false
		} );
		inputTag.onchange                 = () : void => {
			if ( inputTag.files.length ) {
				const _file : File = this.validateVideoInputFile( inputTag.files.item( 0 ) );
				if ( _file ) {
					void this._startUploadingFileProgress( _file );
				}
				else {
					this.inputFileState.set( 'COMPLETED' );
					this.enableErrorDialog = true;
				}
			}
			else {
				this.inputFileState.set( 'COMPLETED' );
			}
			setTimeout( () : void => inputTag.remove() , 1000 );
		};
		inputTag.oncancel                 = () : void => {
			this.inputFileState.set( 'COMPLETED' );
			setTimeout( () : void => inputTag.remove() , 1000 );
		}
		inputTag.click();
	}

	private validateVideoInputFile ( file : File ) : File {
		switch ( true ) {
			case file.size >= _100MB:
				this._uploadFileError.set( 'ERROR_FILE_SIZE' )
				return null;
			case ! [ 'mp4' , 'webm' , 'ogg' ].includes( file.name.toLowerCase().split( '.' ).pop() ) :
				this._uploadFileError.set( 'ERROR_FILE_TYPE' )
				return null;
			default:
				return file
		}
	}

	private _startUploadingFileProgress ( file : File ) : void {
		this.inputFileState.set( 'UPLOADING' );
		this.fileService.uploadWithProgress( file , { tag : 'course-intro' , public : 1 } ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( response : UploadInfo ) : void => {
				this._uploadInfo.set( Helper.cloneObject( response ) );
				if ( response.state === 'DONE' ) {
					this.updateControl( {
						location : 'local' ,
						source   : { src : '' , type : 'video' , provider : 'youtube' } ,
						file     : {
							id       : response.response.id ,
							type     : response.response.type ,
							url      : response.response.url ,
							title    : response.response.title ,
							name     : response.response.name ,
							size     : response.response.size ,
							location : response.response.location ,
							ext      : response.response.ext
						}
					} );
					this.inputFileState.set( 'COMPLETED' );
				}
			} ,
			error : () : void => {
				this.inputFileState.set( 'COMPLETED' );
			}
		} )
	}

	protected btnUnselectedFile () : void {
		this.updateControl( {
			file : null
		} )
	}

	protected btnPreviewVideo () : void {
		if ( this.formValue().location === 'local' ) {
			if ( this.formValue().file ) {
				this.notification.playMedia( { file : this.formValue().file } );
			}
		}
		else {
			if ( /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/gmi.test( this.youtubeUrl ) ) {
				this.notification.playMedia( {
					sources : [ {
						src      : this.youtubeUrl ,
						provider : 'youtube'
					} ]
				} );
			}
			else {
				this.notification.toastWarning( 'Đường dẫn bạn nhập không đúng với định dạng video của youtube' )
			}
		}
	}

	ngOnDestroy () : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
