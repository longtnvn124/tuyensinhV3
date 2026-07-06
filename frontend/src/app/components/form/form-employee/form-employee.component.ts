import { Component , computed , inject , input , InputSignal , model , ModelSignal , OnDestroy , OnInit , Signal , signal , WritableSignal } from '@angular/core';
import { ACADEMIC_DEGREE_OPTIONS , ACADEMIC_RANK_OPTIONS , AcademicDegree , AcademicRank , Employee , EMPLOYEE_CONTRACT_STATUS_OPTIONS , EMPLOYEE_PHOTO_PLACEHOLDER , EmployeeContractStatus , EmployeeForm , EmployeeFormSocial , Gender , GENDER_OPTIONS , SocialMedia } from "@models/employee";
import { debounceTime , firstValueFrom , Subject , takeUntil } from "rxjs";
import { toObservable } from "@angular/core/rxjs-interop";
import { InputMask } from "primeng/inputmask";
import { InputText } from "primeng/inputtext";
import { FormControl , FormGroup , ReactiveFormsModule , Validators } from "@angular/forms";
import { Select } from "primeng/select";
import { Textarea } from "primeng/textarea";
import { IctuDropdownOption , IctuDropdownOptionElement } from "@models/ictu-dropdown-option";
import { LinhVucDaoTaoService } from "@services/linh-vuc-dao-tao.service";
import { AppState } from "@models/app-state";
import { IctuImageResizeComponent , ImageResizerConfig , ImageResizerDto } from "@components/ictu-image-resize/ictu-image-resize.component";
import { MatDialog , MatDialogRef } from "@angular/material/dialog";
import { NotificationService } from "@services/notification.service";
import { ICTUStandardFile } from "@models/file";
import { Helper } from "@utilities/helper";
import { IctuFileService } from "@services/ictu-file.service";
import { User } from "@models/user";

@Component( {
	selector    : 'app-form-employee' ,
	imports     : [ InputMask , InputText , ReactiveFormsModule , Select , Textarea ] ,
	templateUrl : './form-employee.component.html' ,
	styleUrl    : './form-employee.component.css'
} )
export class FormEmployeeComponent implements OnInit , OnDestroy {

	private linhVucDaoTaoService : LinhVucDaoTaoService = inject( LinhVucDaoTaoService );

	private notification : NotificationService = inject<NotificationService>( NotificationService );

	private fileService : IctuFileService = inject<IctuFileService>( IctuFileService );

	private dialog : MatDialog = inject( MatDialog );

	protected readonly profilePhotoPlaceholder : Signal<string> = signal<string>( EMPLOYEE_PHOTO_PLACEHOLDER );

	submitter : InputSignal<User> = input.required();

	employee : InputSignal<Employee> = input.required();

	dmLinhVuc : ModelSignal<IctuDropdownOption<number>[]> = model<IctuDropdownOption<number>[]>( [] );

	private destroy$ : Subject<void> = new Subject<void>();

	private submittingObserver : Subject<any> = new Subject<any>();

	protected readonly formGroup : FormGroup<EmployeeForm> = new FormGroup<EmployeeForm>( {
		photo              : new FormControl( '' ) ,
		user_id            : new FormControl( 0 , Validators.required ) ,
		academic_degree    : new FormControl( '' ) ,
		academic_rank      : new FormControl( '' ) ,
		code               : new FormControl( '' ) ,
		contract_status    : new FormControl( 'CHO_DUYET' , [ Validators.required ] ) ,
		csdt_id            : new FormControl( 0 ) ,
		dob                : new FormControl( '' , [ Validators.required ] ) ,
		donvi_id           : new FormControl( 0 ) ,
		email              : new FormControl( '' , [ Validators.required , Validators.email ] ) ,
		full_name          : new FormControl( '' , [ Validators.required , Validators.minLength( 3 ) , Validators.maxLength( 200 ) ] ) ,
		gender             : new FormControl( 'KHAC' , [ Validators.required ] ) ,
		language           : new FormControl( '' ) ,
		linhvuc_id         : new FormControl( 0 ) ,
		name               : new FormControl( '' ) ,
		nationality        : new FormControl( '' ) ,
		origin             : new FormControl( '' ) ,
		phone              : new FormControl( '' , [ Validators.required ] ) ,
		province_id        : new FormControl( 0 ) ,
		social_media       : new FormGroup<EmployeeFormSocial>( {
			facebook  : new FormControl<string>( '' ) ,
			instagram : new FormControl<string>( '' ) ,
			tiktok    : new FormControl<string>( '' ) ,
			linkedIn  : new FormControl<string>( '' ) ,
			youtube   : new FormControl<string>( '' )
		} ) ,
		status             : new FormControl( 0 ) ,
		street             : new FormControl( '' ) ,
		ward_id            : new FormControl( 0 ) ,
		workplace          : new FormControl( '' ) ,
		workplace_position : new FormControl( '' )
	} );

	protected readonly ACADEMIC_RANK_OPTIONS : IctuDropdownOptionElement<AcademicRank>[] = ACADEMIC_RANK_OPTIONS;

	protected readonly EMPLOYEE_CONTRACT_STATUS_OPTIONS : IctuDropdownOptionElement<EmployeeContractStatus>[] = EMPLOYEE_CONTRACT_STATUS_OPTIONS;

	protected readonly ACADEMIC_DEGREE_OPTIONS : IctuDropdownOptionElement<AcademicDegree>[] = ACADEMIC_DEGREE_OPTIONS;

	protected readonly GENDER_OPTIONS : IctuDropdownOptionElement<Gender>[] = GENDER_OPTIONS;

	protected readonly state : WritableSignal<AppState | 'updating'> = signal<AppState>( 'loading' );

	protected readonly isLoading : Signal<boolean> = computed( () : boolean => [ 'updating' , 'loading' ].includes( this.state() ) );

	protected readonly loadingTitle : Signal<string> = computed( () : string => this.state() === 'loading' ? 'Đang tải xuống thông tin...' : 'Cập nhật thông tin...' );

	private openFileChooserObserver : Subject<void> = new Subject<void>();

	protected readonly Validators : typeof Validators = Validators;

	constructor () {
		toObservable( this.employee ).pipe(
			takeUntil( this.destroy$ )
		).subscribe( ( employee : Employee ) : void => this.loadFormData( employee ) );

		this.openFileChooserObserver.pipe(
			takeUntil( this.destroy$ ) ,
			debounceTime( 250 )
		).subscribe( () : void => {
			this.callFileChooser();
		} );
	}

	ngOnInit () : void {

	}

	public getControl<K extends keyof Employee> ( key : K ) : FormControl<Employee[K]> {
		return this.formGroup.get( key as string ) as FormControl<Employee[K]>;
	}

	loadFormData ( employee : Employee ) : void {
		this.state.set( 'loading' );
		if ( employee ) {
			this.formGroup.reset( {
				photo              : employee.photo ,
				user_id            : employee.user_id ,
				academic_degree    : employee.academic_degree ,
				academic_rank      : employee.academic_rank ,
				code               : employee.code ,
				contract_status    : employee.contract_status ,
				csdt_id            : employee.csdt_id ,
				dob                : employee.dob ,
				donvi_id           : employee.donvi_id ,
				email              : employee.email ,
				full_name          : employee.full_name ,
				gender             : employee.gender ,
				language           : employee.language ,
				linhvuc_id         : employee.linhvuc_id ,
				name               : employee.name ,
				nationality        : employee.nationality ,
				phone              : employee.phone ,
				province_id        : employee.province_id ,
				social_media       : Object.assign<SocialMedia , SocialMedia>( { facebook : '' , instagram : '' , tiktok : '' , linkedIn : '' , youtube : '' } , employee.social_media ) ,
				status             : employee.status ,
				street             : employee.street ,
				ward_id            : employee.ward_id ,
				workplace          : employee.workplace ,
				workplace_position : employee.workplace_position
			} );
		}
		else {
			this.formGroup.reset( {
				photo              : null ,
				user_id            : 0 ,
				academic_degree    : '' ,
				academic_rank      : '' ,
				code               : '' ,
				contract_status    : 'CHO_DUYET' ,
				csdt_id            : 0 ,
				dob                : '' ,
				donvi_id           : 0 ,
				email              : '' ,
				full_name          : '' ,
				gender             : 'KHAC' ,
				language           : '' ,
				linhvuc_id         : 0 ,
				name               : '' ,
				nationality        : '' ,
				phone              : '' ,
				province_id        : 0 ,
				social_media       : { facebook : '' , instagram : '' , tiktok : '' , linkedIn : '' , youtube : '' } ,
				status             : 0 ,
				street             : '' ,
				ward_id            : 0 ,
				workplace          : '' ,
				workplace_position : ''
			} );
		}
		this.preloadDanhMucLinhVuc();
	}

	private preloadDanhMucLinhVuc () : void {
		if ( this.dmLinhVuc().length ) {
			this.state.set( 'success' );
		}
		else {
			this.state.set( 'loading' );
			this.linhVucDaoTaoService.loadOptions( null , false ).pipe(
				takeUntil( this.destroy$ )
			).subscribe( {
				next  : ( options : IctuDropdownOption<number>[] ) : void => {
					this.dmLinhVuc.set( options );
					this.state.set( 'success' );
				} ,
				error : () : void => {
					this.dmLinhVuc.set( [] );
					this.state.set( 'error' );
				}
			} )
		}
	}

	reload ( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.preloadDanhMucLinhVuc();
	}

	private async profilePhotoMaker ( file : File ) : Promise<any> {
		try {
			const data : Partial<ImageResizerConfig> = {
				resizeToWidth : 200 ,
				aspectRatio   : 1 ,
				format        : 'png' ,
				dataUrl       : URL.createObjectURL( file )
			};

			const dialogRef : MatDialogRef<IctuImageResizeComponent> = this.dialog.open( IctuImageResizeComponent , {
				data ,
				disableClose : true ,
				panelClass   : 'image-resizer-panel'
			} );

			const result : ImageResizerDto = await firstValueFrom( dialogRef.afterClosed() );
			if ( ! result.error ) {
				const fileName : string = `profile-photo-${ this.employee().user_id ?? 0 }-${ Date.now() }.png`;
				const photo : File      = Helper.blobToFile( result.data.blob , fileName );
				this.fileService.upload( photo , { tag : 'profile-photo' , public : 1 } ).pipe(
					takeUntil( this.destroy$ )
				).subscribe( {
					next  : ( fileInfo : ICTUStandardFile ) : void => {
						this.getControl( 'photo' ).setValue( this.fileService.getPublicLink( fileInfo ) );
						this.getControl( 'photo' ).markAsTouched( { emitEvent : true } );
					} ,
					error : () : void => {
						this.notification.toastError( 'Upload file thất bại' );
					}
				} );
			}
		}
		catch ( e ) {
			console.log( e );
		}
	}

	btnUpdateEmployeePhoto () : void {
		this.openFileChooserObserver.next();
	}

	private callFileChooser () : void {
		const fileChooser : HTMLInputElement = document.createElement( 'input' );
		fileChooser.type                     = 'file';
		fileChooser.accept                   = 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon';
		fileChooser.onchange                 = () : void => {
			if ( fileChooser.files.length ) {
				void this.profilePhotoMaker( fileChooser.files.item( 0 ) );
			}
			setTimeout( () : void => fileChooser.remove() , 1000 );
		};
		fileChooser.click();
	}

	btnSubmit () : void {
		if ( this.formGroup.valid ) {
			this.submittingObserver.next( this.formGroup.value );
		}
	}

	ngOnDestroy () : void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}
