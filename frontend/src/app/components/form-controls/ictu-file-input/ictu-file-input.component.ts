import { Component , computed , forwardRef , inject , input , InputSignal , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { AbstractControl , AsyncValidator , ControlValueAccessor , NG_ASYNC_VALIDATORS , NG_VALUE_ACCESSOR , ValidationErrors } from '@angular/forms';
import { IctuBasicFile , ICTUStandardFile } from '@models/file';
import { MatButton } from '@angular/material/button';
import { filter as _filter , map as _map } from 'lodash-es';
import { _1Gb } from '@utilities/syscats';
import { NotificationService } from '@services/notification.service';
import { FileUploadAttributes , formatBytes , IctuFileService } from '@services/ictu-file.service';
import { BehaviorSubject , catchError , concatMap , debounceTime , delay , map , Observable , of , Subject , switchMap , take , takeUntil , tap } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FileIconPipe } from '@pipes/file-icon.pipe';
import { FormatBytesPipe } from '@pipes/format-bytes.pipe';
import { MatProgressBar } from '@angular/material/progress-bar';
import { SafeHtmlPipe } from '@pipes/safe-html.pipe';
import { Tooltip } from 'primeng/tooltip';
import { NgClass } from '@angular/common';

type IctuFileInputButtonEventName = 'download' | 'preview' | 'remove';

interface IctuFileInputButtonEvent {
	name : IctuFileInputButtonEventName,
	file : IctuBasicFile,
	session : number
}

@Component( {
	selector    : 'ictu-file-input' ,
	standalone  : true ,
	imports     : [ MatButton , FileIconPipe , FormatBytesPipe , MatProgressBar , SafeHtmlPipe , Tooltip , NgClass ] ,
	providers   : [
		{
			provide     : NG_VALUE_ACCESSOR ,
			useExisting : forwardRef( () : typeof IctuFileInputComponent => IctuFileInputComponent ) ,
			multi       : true
		} ,
		{
			provide     : NG_ASYNC_VALIDATORS ,
			useExisting : forwardRef( () : typeof IctuFileInputComponent => IctuFileInputComponent ) ,
			multi       : true
		}
	] ,
	templateUrl : './ictu-file-input.component.html' ,
	styleUrl    : './ictu-file-input.component.css'
} )
export class IctuFileInputComponent implements ControlValueAccessor , AsyncValidator , OnDestroy {

	emptyMessage : InputSignal<string> = input<string>( 'Không có file đính kèm.' );

	addButtonLabel : InputSignal<string> = input<string>( 'Đính kèm files' );

	addButtonIconCssClass : InputSignal<string> = input<string>( 'fa-classic fa-solid fa-plus f-14' );

	fileAttributes : InputSignal<FileUploadAttributes> = input<FileUploadAttributes>( null );

	accept : InputSignal<HTMLInputElement['accept']> = input<string>( '*' ); // Chú ý nếu trường accept kết hợp với validateByAcceptList thì nên dùng extension vd : '.mp4,.mp3,.docx,.pptx'

	validateByAcceptList : InputSignal<boolean> = input<boolean>( false );

	limitFileSize : InputSignal<number> = input<number>( _1Gb );

	btnControls : InputSignal<IctuFileInputButtonEventName[]> = input<IctuFileInputButtonEventName[]>( [ 'download' , 'preview' , 'remove' ] );

	protected readonly enableButtonDownload : Signal<boolean> = computed( () : boolean => this.btnControls()?.includes( 'download' ) );

	protected readonly enableButtonRemove : Signal<boolean> = computed( () : boolean => this.btnControls()?.includes( 'remove' ) && !this.disabled() );

	protected readonly enableButtonPreview : Signal<boolean> = computed( () : boolean => this.btnControls()?.includes( 'preview' ) );

	protected readonly disabled : WritableSignal<boolean> = signal( false );

	protected readonly files : WritableSignal<IctuBasicFile[]> = signal( [] );

	private readonly notification : NotificationService = inject( NotificationService );

	private readonly fileService : IctuFileService = inject<IctuFileService>( IctuFileService );

	private readonly section : WritableSignal<number> = signal( 0 );

	private readonly callFileChooserObserver$ : Subject<number> = new Subject();

	private onChange : ( value : IctuBasicFile[] ) => void = () : void => {};

	private onTouched : () => void = () : void => {};

	private destroyed$ : Subject<void> = new Subject<void>();

	private readonly totalUploadedItems : WritableSignal<number> = signal( 0 );

	private readonly totalUploading : WritableSignal<number> = signal( 0 );

	protected readonly uploadProgress : Signal<number> = computed( () : number => {
		return this.totalUploading() ? Math.floor( ( this.totalUploadedItems() / this.totalUploading() ) * 100 ) : 0;
	} );

	protected readonly enableUploading : WritableSignal<boolean> = signal( false );

	protected readonly selectedFileID : WritableSignal<number> = signal( 0 );

	private isUploading$ : BehaviorSubject<boolean> = new BehaviorSubject<boolean>( false );

	private buttonEventObserver$ : Subject<IctuFileInputButtonEvent> = new Subject<IctuFileInputButtonEvent>();

	private handleButtonEvent : Record<IctuFileInputButtonEventName , ( file : IctuBasicFile ) => void> = {
		remove   : ( file : IctuBasicFile ) : void => {
			this.files.update( ( _files : IctuBasicFile[] ) : IctuBasicFile[] => _filter( _files , ( _f : IctuBasicFile ) : boolean => _f.id !== file.id ) );
			this._triggerChanged();
		} ,
		download : ( file : IctuBasicFile ) : void => {
			this.notification.downloadFile( file );
		} ,
		preview  : ( file : IctuBasicFile ) : void => {
			this.notification.previewFile( { info : [ file ] } );
		}
	};

	constructor() {
		this.callFileChooserObserver$.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this._openFileChooser();
		} );

		this.buttonEventObserver$.asObservable().pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 ) ,
			distinctUntilChanged( ( previous : IctuFileInputButtonEvent , current : IctuFileInputButtonEvent ) : boolean => previous?.session === current.session )
		).subscribe( ( { name , file } : IctuFileInputButtonEvent ) : void => {
			this.handleButtonEvent[ name ]( file );
			this.selectedFileID.set( 0 );
			this.increaseSection();
		} );
	}

	private setPending( isPending : boolean ) : void {
		this.isUploading$.next( !isPending );
	}

	// --- AsyncValidator Impl ---
	validate( control : AbstractControl ) : Observable<ValidationErrors | null> {
		return this.isUploading$.pipe(
			take( 1 ) ,
			switchMap( ( isUploading : boolean ) : Observable<ValidationErrors | null> => {
				if ( isUploading ) {
					// Trả về một object lỗi tạm thời, Angular sẽ giữ trạng thái PENDING
					return of( { uploading : true } );
				}
				return of( null ); // Hợp lệ, trạng thái chuyển về VALID
			} )
		);
	}

	writeValue( files : IctuBasicFile[] ) : void {
		this.files.set( files );
	}

	registerOnChange( fn : ( files : IctuBasicFile[] ) => void ) : void {
		this.onChange = fn;
	}

	registerOnTouched( fn : () => void ) : void {
		this.onTouched = fn;
	}

	setDisabledState( isDisabled : boolean ) : void {
		this.disabled.set( isDisabled );
	}

	btnCallFileChooser() : void {
		this.callFileChooserObserver$.next( this.section() );
	}

	private _openFileChooser() : void {
		const inputTag : HTMLInputElement = Object.assign<HTMLInputElement , Pick<HTMLInputElement , 'type' | 'accept' | 'multiple'>>( document.createElement( 'input' ) , {
			type     : 'file' ,
			accept   : this.accept() ,
			multiple : true
		} );
		inputTag.onchange                 = () : void => {
			const validFiles : File[] = this.validateFile( inputTag.files );
			if ( validFiles.length ) {
				this.uploadFiles( validFiles );
			} else {
				this.increaseSection();
			}
			setTimeout( () : void => inputTag.remove() , 1000 );
		};
		inputTag.oncancel                 = () : void => {
			setTimeout( () : void => inputTag.remove() , 1000 );
			this.increaseSection();
		};
		inputTag.click();
	}

	private validateFile( fileList : FileList ) : File[] {
		const _files : File[] = fileList.length ? Array.from( fileList ) : [];
		return !this.validateByAcceptList() ? _files : _filter( _files , ( f : File ) : boolean => this.fileValidator( f ) );
	}

	private fileValidator( file : File ) : boolean {
		const _rawExtensions : string[]      = _map<string , string>( this.accept().split( ',' ) , ( s : string ) : string => s.trim().toLowerCase().replace( /\./g , '' ) );
		const _extensionsAccepted : string[] = _filter<string>( _rawExtensions , Boolean );
		switch ( true ) {
			case file.size >= this.limitFileSize():
				this.notification.toastError( `Dung lượng file không được vượt quá ${ formatBytes( this.limitFileSize() , 2 ) }` , 'Thông báo' );
				return false;
			case !_extensionsAccepted.includes( file.name.toLowerCase().split( '.' ).pop() ) :
				this.notification.toastWarning( `Chỉ chấp nhận file có định dạng : ${ _map<string , string>( _extensionsAccepted , ( s : string ) : string => '.' + s ).join( ', ' ) }` );
				return false;
			default:
				return true;
		}
	}

	private uploadFiles( validFiles : File[] ) : void {
		this.setPending( true );
		this.uploadFileSequentially( validFiles ).subscribe( {
			next  : () : void => {
				this.setPending( false );
				this.enableUploading.set( false );
				this.increaseSection();
			} ,
			error : () : void => {
				this.setPending( false );
				this.enableUploading.set( false );
				this.increaseSection();
			}
		} );
	}

	private uploadFileSequentially( files : File[] ) : Observable<any> {
		this.totalUploading.set( files.length );
		this.totalUploadedItems.set( 0 );
		this.enableUploading.set( true );
		return files.reduce( ( reducer : Observable<any> , file : File ) : Observable<number> => {
			return reducer.pipe(
				concatMap( () : Observable<any> => {
					return this.updateSingleFile( file ).pipe(
						map( ( info : ICTUStandardFile ) : boolean => {
							this.addValue( info );
							return true;
						} ) ,
						catchError( () : Observable<boolean> => of( false ) ) , // Nếu có lỗi, vẫn tiếp tục
						tap( ( success : boolean ) : void => this.totalUploadedItems.update( ( _oldValue : number ) : number => _oldValue + ( success ? 1 : 0 ) ) ) , // update counter
						delay( 100 )
					);
				} )
			);
		} , of( 0 ) );
	}

	private updateSingleFile( file : File ) : Observable<IctuBasicFile> {
		return this.fileService.upload( file , this.fileAttributes() ).pipe(
			takeUntil( this.destroyed$ ) ,
			map( ( { id , name , title , url , ext , type , size , location } : ICTUStandardFile ) : IctuBasicFile => ( { id , name , title , url , ext , type , size , location } ) )
		);
	}

	private addValue( file : IctuBasicFile ) : void {
		this.files.update( ( _files : IctuBasicFile[] ) : IctuBasicFile[] => [ ... _files , file ] );
		this._triggerChanged();
	}

	protected btnButtonEvent( name : IctuFileInputButtonEventName , file : IctuBasicFile ) : void {
		this.selectedFileID.set( file.id );
		this.buttonEventObserver$.next( { file , name , session : this.section() } );
	}

	private _triggerChanged() : void {
		this.onChange( this.files() );
		this.onTouched();
	}

	private increaseSection() : void {
		this.section.update( ( previousSection : number ) : number => 1 + previousSection );
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
