import { Component , computed , inject , input , InputSignal , Signal , signal , TemplateRef , viewChild , WritableSignal } from '@angular/core';
import { IctuDropdownField , IctuDropdownOption } from '@models/ictu-dropdown-option';
import { AppState } from '@models/app-state';
import { IctuPermissionControl } from '@models/ictu-base-model';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';
import { AbstractControl , AsyncValidatorFn , FormBuilder , FormControl , FormGroup , FormsModule , ReactiveFormsModule , Validators } from '@angular/forms';
import { Drawer } from 'primeng/drawer';
import { IctuFormControl2 } from '@models/ictu-form-control';
import { DataTableEvent , DataTableEventName , IctuDataTable } from '@models/datatable';
import { debounceTime , firstValueFrom , forkJoin , map , merge , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { catchError , delay , filter } from 'rxjs/operators';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { SysRoleName } from '@models/role';
import { PROVIDED_ROLE } from '@app/providers/admin-role.provider';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { InputText } from 'primeng/inputtext';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButton , MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { InputMask } from 'primeng/inputmask';
import { LinhVucDaoTaoService } from '@services/linh-vuc-dao-tao.service';
import { IctuDropdownOptionMapPipe } from '@app/pipes/ictu-dropdown-option-map.pipe';
import { MatDialog , MatDialogRef } from '@angular/material/dialog';
import { DragAndDropDirective } from '@theme/directives/drag-and-drop.directive';
import { MatTooltip } from '@angular/material/tooltip';
import { _10MB } from '@utilities/syscats';
import readXlsxFile , { Row } from 'read-excel-file';
import { ACADEMIC_DEGREE_OPTIONS , ACADEMIC_RANK_OPTIONS , AcademicDegree , AcademicRank , Employee , EmployeePositionTagOrdering , EmployeeQueryParams , Gender , GENDER_OPTIONS } from '@app/models/employee';
import { EmployeesService } from '@app/services/employees.service';
import { SafeUrlPipe } from '@pipes/safe-url.pipe';
import { MatMenu , MatMenuModule } from '@angular/material/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { IctuFileService } from '@app/services/ictu-file.service';
import { ICTUStandardFile } from '@app/models/file';
import { IctuImageResizeComponent , ImageResizerConfig , ImageResizerDto } from '@app/components/ictu-image-resize/ictu-image-resize.component';
import { Helper } from '@app/utilities/helper';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type ImportPanelLayout = 'SELECT_FILE' | 'PROCESS';

class ImportPanel<T> {
	readonly step : WritableSignal<ImportPanelLayout>;
	store : T[];
	readonly paged : WritableSignal<number>;
	readonly rows : Signal<number>;
	readonly filtered : WritableSignal<T[]>;
	readonly loadingTitle : WritableSignal<string>;
	readonly indexOffset : Signal<number> = computed(
		() : number => this.rows() * Math.min( 0 , this.paged() - 1 ) + 1
	);
	readonly isLoading : Signal<boolean>  = computed(
		() : boolean => this.loadingTitle() && this.loadingTitle().length > 0
	);

	constructor( initState : ImportPanelLayout ) {
		this.step         = signal<ImportPanelLayout>( initState );
		this.rows         = signal<number>( 20 );
		this.paged        = signal<number>( 1 );
		this.store        = [];
		this.filtered     = signal<T[]>( [] );
		this.loadingTitle = signal<string>( null );
	}

	public openSelectLayout() : void {
		this.store = [];
		this.filtered.set( [] );
		this.paged.set( 1 );
	}

	public enableLoading( loadingTitle : string ) : void {
		this.loadingTitle.set( loadingTitle );
	}

	public disableLoading() : void {
		this.loadingTitle.set( null );
	}
}

type TeacherImportRowState = 'INVALID' | 'VALID' | 'UPLOADING' | 'UPLOADING_FAIL' | 'REJECTED' | 'UPLOADED';

interface TeacherImportRow {
	index : number;
	info : Pick<Employee , 'full_name' | 'name' | 'dob' | 'gender' | 'code' | 'academic_rank' | 'academic_degree' | 'linhvuc_id' | 'workplace' | 'workplace_position' | 'contract_status' | 'csdt_id'>;
	teacher : Employee;
	ready : Signal<boolean>;
	state : WritableSignal<TeacherImportRowState>;
}

type FileUploadCategory = 'photo';

type EmployeeFieldName = Pick<EmployeeExtend , 'photo'>;

interface EmployeeExtend extends Employee {
	password : string;
}

@Component( {
	selector    : 'app-teacher-component' ,
	imports     : [ Drawer , IctuPaginatorComponent , InputText , LoadingProgressComponent , MatButton , MatCheckbox , ReactiveFormsModule , Select , Textarea , FormsModule , InputMask , IctuDropdownOptionMapPipe , DragAndDropDirective , MatTooltip , MatMenu , MatMenuModule , MatButtonModule , MultiSelectModule , TooltipModule , DialogModule , SafeUrlPipe ] ,
	templateUrl : './teacher-component.html' ,
	styleUrl    : './teacher-component.css'
} )
export class TeacherComponent {

	positions : InputSignal<string> = input.required<string>();

	private auth : AuthenticationService = inject( AuthenticationService );

	role = this.auth.permission.data.roles[ 0 ];

	private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

	private openFileChooserObserver : Subject<FileUploadCategory> = new Subject<FileUploadCategory>();

	private destroy$ : Subject<void> = new Subject<void>();

	get donviId() : number {
		return this.auth.user.donvi_id;
	}

	readonly state : WritableSignal<AppState | 'invalid'> = signal<AppState>( 'error' );

	readonly agentList : WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>( [] );

	readonly permissionControl : Signal<IctuPermissionControl> = signal<IctuPermissionControl>( new IctuPermissionControl( this.auth.getUserPermission( 'training-management/teachers' ) ) );

	genderOptions : IctuDropdownOption<Gender>[] = GENDER_OPTIONS;

	hocHamOptions : IctuDropdownOption<AcademicRank>[] = ACADEMIC_RANK_OPTIONS;

	hocViOptions : IctuDropdownOption<AcademicDegree>[] = ACADEMIC_DEGREE_OPTIONS;

	trangThaiHopDongOption : IctuDropdownOption<string>[] = [
		{ value : 'THU_VIEC' , label : 'Thử việc' } ,
		{ value : 'CHINH_THUC' , label : 'Chính thức' } ,
		{ value : 'NGHI_THAI_SAN' , label : 'Nghỉ thai sản' } ,
		{ value : 'NGHI_VIEC' , label : 'Nghỉ việc' } ,
		{ value : 'CHO_DUYET' , label : 'Chờ duyệt' }
	];

	trangThaiHoatDongOption : IctuDropdownOption<number>[] = [
		{ value : -1 , label : 'Dừng hoạt động' } ,
		{ value : 0 , label : 'Tạm nghỉ' } ,
		{ value : 1 , label : 'Đang hoạt động' }
	];

	roleUsed : SysRoleName = inject( PROVIDED_ROLE );

	private service : EmployeesService = inject( EmployeesService );

	private notification : NotificationService = inject( NotificationService );

	private linhVucDaoTaoService : LinhVucDaoTaoService = inject( LinhVucDaoTaoService );

	private fileService : IctuFileService = inject<IctuFileService>( IctuFileService );

	private fb : FormBuilder = inject( FormBuilder );

	private dialog : MatDialog = inject( MatDialog );

	isDaoTao() : boolean {
		return this.auth.userHasRole( [ 'training_management' ] );
	}

	titleForm : string = '';

	visibleDialog : boolean = false;

	passwordReset : string = '';

	userUpdatepassword : EmployeeExtend;

	readonly statepasswordReset : WritableSignal<AppState> = signal<AppState>( 'error' );

	csdtDropdownField : IctuDropdownField = new IctuDropdownField( this.coSoDaoTaoService.loadOptions( this.donviId ) , 'Chọn cơ sở đào tạo' );

	linhVucDaoTaoDropdownField : IctuDropdownField = new IctuDropdownField( this.linhVucDaoTaoService.loadOptions( null , true ) , 'Lĩnh vực chuyên môn' );

	readonly drawer : Signal<Drawer> = viewChild<Drawer>( 'pDrawer' );

	isForcusEmail : boolean = false;

	vaiTroOption : IctuDropdownOption<string>[] = [
		{ label : 'Trợ giảng' , value : 'teaching_assistant' }
	];

	listPositionsCurrent : IctuDropdownOption<string>[] = [];

	public emailValidatorObserver : Subject<void> = new Subject();

	private _formGroup : FormGroup = new FormGroup( {
		photo              : new FormControl( '' , [] ) ,
		email              : new FormControl( '' , [ Validators.required , Validators.email ] , [ this.emailValidator() ] ) ,
		phone              : new FormControl( '' , Validators.required ) ,
		name               : new FormControl( '' , [] ) ,
		user_id            : new FormControl( 0 , [] ) ,
		password           : new FormControl( '' ) ,
		full_name          : new FormControl( '' , [ Validators.required , Validators.minLength( 2 ) , Validators.maxLength( 255 ) ] ) ,
		code               : new FormControl( '' , Validators.required ) ,
		donvi_id           : new FormControl( 0 ) ,
		csdt_id            : new FormControl( 0 , Validators.required ) ,
		gender             : new FormControl( '' , Validators.required ) ,
		dob                : new FormControl( '' , Validators.required ) ,
		positions          : new FormControl( '' ) ,
		academic_degree    : new FormControl( '' ) ,
		academic_rank      : new FormControl( '' ) ,
		linhvuc_ids        : new FormControl( [] , Validators.required ) ,
		workplace          : new FormControl( '' ) ,
		workplace_position : new FormControl( '' ) ,
		nationality        : new FormControl( '' ) ,
		language           : new FormControl( '' ) ,
		province_id        : new FormControl( 0 ) ,
		ward_id            : new FormControl( 0 ) ,
		street             : new FormControl( '' ) ,
		address            : new FormControl( '' ) ,
		social_media       : new FormControl( '' ) ,
		contract_status    : new FormControl( '' , Validators.required ) ,
		status             : new FormControl( 0 , Validators.required )
	} );

	formControl : IctuFormControl2<EmployeeExtend> = new IctuFormControl2<EmployeeExtend>( {
		dropdownFields : [ this.csdtDropdownField , this.linhVucDaoTaoDropdownField ] ,
		formGroup      : this._formGroup ,
		objectName     : this.titleForm ,
		drawer         : this.drawer
	} );

	private handelEvent : Record<DataTableEventName , ( data : EmployeeExtend ) => void> = {
		OPEN_FORM_ADD        : () : void => {
			this.listPositionsCurrent =
				this.positions() == 'teaching_assistant'
				? [ { label : 'Trợ giảng' , value : 'teaching_assistant' } ]
				: [ { label : 'Giáo viên' , value : 'teacher' } ];
			this.formControl.formGroup.reset( {
				email              : '' ,
				phone              : '' ,
				name               : '' ,
				user_id            : 0 ,
				full_name          : '' ,
				password           : '' ,
				code               : '' ,
				donvi_id           : 0 ,
				csdt_id            : 0 ,
				gender             : 'NAM' ,
				dob                : '' ,
				positions          : '' ,
				academic_degree    : '' ,
				academic_rank      : '' ,
				linhvuc_ids        : [] ,
				workplace          : '' ,
				workplace_position : '' ,
				nationality        : '' ,
				language           : '' ,
				province_id        : 0 ,
				ward_id            : 0 ,
				street             : '' ,
				social_media       : '' ,
				contract_status    : 'CHINH_THUC' ,
				status             : 1 ,
				address            : ''
			} );
			this.formField( 'email' ).enable();
			this.formField( 'phone' ).enable();
			this.createPositionsChip();
			this.formControl.openFormAdd();
		} ,
		OPEN_FORM_UPDATE     : ( data : EmployeeExtend ) : void => {
			this.listPositionsCurrent = [];
			this.vaiTroOption         = Object.values( EmployeePositionTagOrdering ).map( ( tag ) => ( {
				label : tag.label ,
				value : tag.value ,
				order : tag.order
			} ) ).filter( ( item ) => item.value != 'parent' );
			this.formControl.formGroup.reset( {
				email              : data.email ,
				photo              : data.photo ,
				phone              : data.phone ,
				name               : data.name ,
				user_id            : data.user_id ,
				full_name          : data.full_name ,
				code               : data.code ,
				donvi_id           : data.donvi_id ,
				csdt_id            : data.csdt_id ,
				gender             : data.gender ,
				dob                : data.dob ,
				positions          : data.positions ,
				academic_degree    : data.academic_degree ,
				academic_rank      : data.academic_rank ,
				linhvuc_ids        : data.linhvuc_ids ,
				workplace          : data.workplace ,
				workplace_position : data.workplace_position ,
				nationality        : data.nationality ,
				language           : data.language ,
				province_id        : data.province_id ,
				ward_id            : data.ward_id ,
				street             : data.street ,
				social_media       : data.social_media ,
				contract_status    : data.contract_status ,
				status             : data.status ,
				address            : data.address
			} );
			this.formField( 'email' ).disable();
			this.formField( 'phone' ).disable();
			this.createPositionsChipCurrent();
			this.formControl.openFormEdit( data );
		} ,
		DELETE_SINGLE_ROW    : ( { id } : EmployeeExtend ) : void => {
			this.requestDeletingData( [ id ] );
		} ,
		DELETE_SELECTED_ROWS : () : void => {
			const ids : number[] = this.dataTable.getSelectedData().map( ( { id } : EmployeeExtend ) : number => id );
			if ( ids.length ) {
				this.requestDeletingData( ids );
			}
		} ,
		SUBMIT_FORM          : () : void => {
			if ( this.formControl.canSubmit ) {
				this.updateFormFieldpositions();
				const info : Partial<EmployeeExtend>       = {
					email              : this.formField( 'email' ).value ,
					phone              : this.formField( 'phone' ).value ,
					photo              : this.formField( 'photo' ).value ,
					name               : this.formField( 'name' ).value ,
					user_id            : this.formField( 'user_id' ).value ,
					full_name          : this.formField( 'full_name' ).value ,
					code               : this.formField( 'code' ).value.toUpperCase() ,
					donvi_id           : this.donviId ,
					csdt_id            : this.formField( 'csdt_id' ).value ,
					gender             : this.formField( 'gender' ).value ,
					dob                : this.formField( 'dob' ).value ,
					positions          : this.formField( 'positions' ).value ,
					academic_degree    : this.formField( 'academic_degree' ).value ,
					academic_rank      : this.formField( 'academic_rank' ).value ,
					linhvuc_ids        : this.formField( 'linhvuc_ids' ).value ,
					workplace          : this.formField( 'workplace' ).value ,
					workplace_position :
					this.formField( 'workplace_position' ).value ,
					nationality        : this.formField( 'nationality' ).value ,
					language           : this.formField( 'language' ).value ,
					province_id        : this.formField( 'province_id' ).value ,
					ward_id            : this.formField( 'ward_id' ).value ,
					street             : this.formField( 'street' ).value ,
					social_media       : this.formField( 'social_media' ).value ,
					contract_status    : this.formField( 'contract_status' ).value ,
					status             : this.formField( 'status' ).value ,
					address            : this.formField( 'address' ).value ,
					... ( this.formControl.isFormAdd && {
						password : this.formField( 'password' ).value
					} )
				};
				const request : Observable<EmployeeExtend> = this.formControl.isFormAdd ? this.service.create( { ... info , email : this.formField( 'email' ).value , phone : this.formField( 'phone' ).value } ) : this.service.update( this.formControl.object.id , info );
				const message : string                     = this.formControl.isFormAdd ? 'Thêm mới thành công' : 'Cập nhật thành công';
				const messageErorr : string                = this.formControl.isFormAdd ? 'Thêm mới không thành công' : 'Cập nhật không thành công';
				this.formControl.submit( request ).subscribe( {
					next  : () : void => {
						this.notification.toastSuccess( message , 'Thông báo' );
						if ( this.formControl.isFormAdd ) {
							this.formControl.formGroup.reset( {
								hoten               : '' ,
								ngaysinh            : '' ,
								gioitinh            : '' ,
								email               : '' ,
								phone               : '' ,
								maso                : '' ,
								hocvi               : null ,
								hocham              : null ,
								linhvuc_chuyenmon   : '' ,
								ten_donvicongtac    : '' ,
								chucvu              : '' ,
								trangthai_tuyendung : 0 ,
								trangthai_hopdong   : 0 ,
								csdt_id             : 0 ,
								donvi_id            : this.donviId ,
								status              : 1 ,
								address             : ''
							} );
						} else {
							this.formControl.closeForm();
						}
					} ,
					error : () : void => {
						this.notification.toastError( messageErorr , 'Thông báo' );
					}
				} );
			}
		}
	};

	private eventObserver$ : Subject<DataTableEvent<Employee>> = new Subject<DataTableEvent<Employee>>();

	private destroyed$ : Subject<void> = new Subject<void>();

	private observeImportTeacher$ : Subject<string> = new Subject<string>();

	private _temp : { paged : number; resetPaginator : boolean } = {
		paged          : 1 ,
		resetPaginator : true
	};

	searchInfo : EmployeeQueryParams = {
		search  : '' ,
		csdt_id : null
	};

	dataTable : IctuDataTable<EmployeeExtend> = new IctuDataTable<EmployeeExtend>();

	importDialogRef : MatDialogRef<boolean>;

	importDialogDirty : WritableSignal<boolean> = signal<boolean>( false );

	readonly importTemplate : Signal<TemplateRef<any>> = viewChild<TemplateRef<any>>( 'importTemplate' );

	readonly importPanel : ImportPanel<TeacherImportRow> = new ImportPanel( 'SELECT_FILE' );

	private observeOpenFileSelector : Subject<string> = new Subject<string>();

	constructor() {
		this.eventObserver$.asObservable().pipe( takeUntil( this.destroyed$ ) ).subscribe( ( { name , data } : DataTableEvent<EmployeeExtend> ) : void =>
			this.handelEvent[ name ]( data )
		);
		this.openFileChooserObserver.pipe( takeUntilDestroyed() , debounceTime( 500 ) ).subscribe( ( category : FileUploadCategory ) : void => {
			this.handleFileChooser[ category ]();
		} );

		this.observeImportTeacher$.asObservable().pipe(
			takeUntil( this.destroyed$ ) ,
			map( () : MatDialog => this.notification.matDialog ) ,
			debounceTime( 250 )
		).subscribe( ( importDialog : MatDialog ) : void => {
			this.importDialogDirty.set( false );
			const dialogRef : MatDialogRef<boolean> = importDialog.open(
				this.importTemplate() ,
				{
					disableClose : true ,
					maxHeight    : '100vh' ,
					minHeight    : '100vh' ,
					minWidth     : '100vw' ,
					maxWidth     : '100vw'
				}
			);
			dialogRef.afterClosed().subscribe( ( dirty : boolean ) : void => {
				if ( dirty ) {
					this._doReload();
				}
			} );
			this.importDialogRef = dialogRef;
		} );

		this.observeOpenFileSelector.asObservable().pipe( takeUntil( this.destroyed$ ) , debounceTime( 250 ) ).subscribe( () : void => {
			const inputElement : HTMLInputElement = Object.assign( document.createElement<'input'>( 'input' ) , { type : 'file' , accept : '.xlsx' , multiple : false } );

			inputElement.oncancel = () : void => {
				setTimeout( () : void => inputElement.remove() , 1000 );
			};

			inputElement.onchange = () : void => {
				this.onInputFile( inputElement.files );
				setTimeout( () : void => inputElement.remove() , 1000 );
			};

			inputElement.click();
		} );
	}

	private formField( path : keyof EmployeeExtend ) : AbstractControl {
		return this.formControl.formGroup.get( path );
	}

	ngOnInit() : void {
		if ( [ 'training_management' ].includes( this.roleUsed ) ) {
			this.titleForm =
				this.positions() == 'teacher' ? 'giáo viên' : 'trợ giảng';
			this.loadData( 1 , true );
		} else {
			this.state.set( 'invalid' );
		}
	}

	private requestDeletingData( ids : number[] ) : void {
		this.notification.confirmDelete( ids.length ).pipe(
			filter( ( confirm : boolean ) : boolean => confirm ) ,
			map( () : IctuDeletingAnimationControl<Employee> => new IctuDeletingAnimationControl( ids , this.service ) ) ,
			switchMap( ( deleteController : IctuDeletingAnimationControl<Employee> ) : Observable<boolean> => {
				deleteController.run();
				return this.notification.startDeleting( deleteController.progress );
			} )
		).subscribe( {
			next  : ( success : boolean ) : void => {
				if ( success ) {
					this.notification.toastSuccess( 'Xóa thành công' );
				}
				this.loadData( 1 , true );
			} ,
			error : () : void => {
				this.notification.toastError( 'Xóa thất bại' );
			}
		} );
	}

	loadData( paged : number = 1 , resetPaginator : boolean = true ) : void {
		this.state.set( 'loading' );
		this._temp                              = { paged , resetPaginator };
		const queryParams : IctuQueryParams     = {
			limit      : 20 ,
			paged      : paged ,
			include    : this.donviId ,
			include_by : 'donvi_id' ,
			order      : 'ASC' ,
			orderby    : 'name'
		};
		const conditions : IctuConditionParam[] = [];
		if ( this.searchInfo.csdt_id != null ) {
			conditions.push( {
				conditionName : 'csdt_id' ,
				condition     : IctuQueryCondition.equal ,
				value         : this.searchInfo.csdt_id.toString() ,
				orWhere       : 'and'
			} );
		}

		conditions.push( {
			conditionName : 'positions' ,
			condition     : IctuQueryCondition.like ,
			value         : `%|${ this.positions() }|%` ,
			orWhere       : 'and'
		} );
		if ( this.searchInfo.search != '' ) {
			conditions.push( {
				conditionName : 'full_name' ,
				condition     : IctuQueryCondition.like ,
				value         : `%${ this.searchInfo.search }%` ,
				orWhere       : 'and'
			} );
		}

		forkJoin<[ IctuDropdownOption<number>[] , DtoObject<Employee[]> ]>( [
			this.csdtDropdownField.load() ,
			this.service.query( conditions , queryParams )
		] ).pipe(
			map( ( [ _ , res ] : [ IctuDropdownOption<number>[] , DtoObject<Employee[]> ] ) : Employee[] => {
				if ( resetPaginator ) {
					return this.dataTable.paginator.setupPaginator( res );
				} else {
					this.dataTable.paginator.changePage( paged );
					return res.data;
				}
			} )
		).subscribe( {
			next  : ( data : EmployeeExtend[] ) : void => {
				this.dataTable.fillData( data );
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.state.set( 'error' );
			}
		} );
	}

	deleteRow( data : Employee ) : void {
		this.eventObserver$.next( { name : 'DELETE_SINGLE_ROW' , data } );
	}

	deleteSelectedRows() : void {
		this.eventObserver$.next( { name : 'DELETE_SELECTED_ROWS' , data : null } );
	}

	editRow( data : Employee ) : void {
		this.eventObserver$.next( { name : 'OPEN_FORM_UPDATE' , data } );
	}

	reload( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this._doReload();
	}

	private _doReload() : void {
		this.loadData( this._temp.paged , this._temp.resetPaginator );
	}

	addNewItem() : void {
		this.eventObserver$.next( { name : 'OPEN_FORM_ADD' , data : null } );
	}

	openImportingFromFile() : void {
		this.closeImportingFromFile( false );
		this.observeImportTeacher$.next( 'create' );
	}

	closeImportingFromFile( dirty : boolean ) : void {
		if ( this.importDialogRef ) {
			this.importDialogRef.close( dirty );
		}
	}

	submitForm() : void {
		this.eventObserver$.next( { name : 'SUBMIT_FORM' , data : null } );
	}

	onDrawerHide() : void {
		if ( this.formControl.submitted ) {
			this.loadData( 1 , true );
		}
	}

	onChangePage( paged : number ) : void {
		this.loadData( paged , false );
	}

	onSearchData() : void {
		this.loadData( 1 , true );
	}

	onInputFile( files : FileList ) : void {
		if ( files.length ) {
			// Chú ý thời gian đọc file có thể lâu hơn với file có dung lượng lớn, nên để loading để người dùng nhận biết hệ thống đang chạy
			this.importPanel.enableLoading( 'Xử lý file...' );
			switch ( true ) {
				case !files[ 0 ].name.toLowerCase().endsWith( '.xlsx' ):
					this.notification.toastError( 'Hệ thống chỉ chấm nhận file định dạng .xlsx' , 'Lỗi định dạng File!' );
					this.importPanel.disableLoading();
					break;
				case files[ 0 ].size >= _10MB:
					this.notification.toastError( 'Hệ thống chỉ hỗ trợ file có dung lượng từ 10Mb trở xuống' , 'File dung lượng quá lớn!' );
					this.importPanel.disableLoading();
					break;
				default:
					readXlsxFile( files[ 0 ] ).then( () : void => {
						this.importPanel.disableLoading();
					} );
					break;
			}
		}
	}

	downloadFileImportSample() : void {
		this.notification.downloadLocalFile( 'files/samples/import-teacher.xlsx' , 'file-mau-import-giao-vien-[DACMS]' );
	}

	openFileSelector() : void {
		this.observeOpenFileSelector.next( 'open' );
	}

	private handleFileChooser : Record<FileUploadCategory , () => void> = {
		photo : () : void => {
			const inputTag : HTMLInputElement = Object.assign<HTMLInputElement , Pick<HTMLInputElement , 'type' | 'accept' | 'multiple'>>( document.createElement( 'input' ) , { type : 'file' , accept : 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon' , multiple : false } );
			inputTag.onchange                 = () : void => {
				if ( inputTag.files.length ) {
					const _file : File = this.validateImageInputFile(
						inputTag.files.item( 0 )
					);
					if ( _file ) {
						void this.resizeCourseThumbnail( _file );
					}
				}
				setTimeout( () : void => inputTag.remove() , 1000 );
			};
			inputTag.click();
		}
	};

	private imageResize( file : File , config? : Partial<ImageResizerConfig> ) : Observable<ImageResizerDto> {
		const _defaultConfig : Partial<ImageResizerConfig> = {
			resizeToWidth : 300 ,
			aspectRatio   : 3 / 2 ,
			format        : 'png' ,
			dataUrl       : URL.createObjectURL( file )
		};

		const dialogRef : MatDialogRef<IctuImageResizeComponent , ImageResizerDto> = this.dialog.open( IctuImageResizeComponent , {
			data         : Object.assign<Partial<ImageResizerConfig> , Partial<ImageResizerConfig>>( _defaultConfig , config ?? {} ) ,
			disableClose : true ,
			panelClass   : 'image-resizer-panel'
		} );

		return dialogRef.afterClosed();
	}

	private validateImageInputFile( file : File ) : File {
		switch ( true ) {
			case file.size >= _10MB:
				this.notification.toastError( 'Dung lượng file không được vượt quá 10MB' );
				return null;
			case ![ 'jpg' , 'png' , 'jpeg' , 'gif' ].includes( file.name.toLowerCase().split( '.' ).pop() ):
				this.notification.toastError( 'Chỉ chấp nhận file có định dạng jpg, png, jpeg, gif' );
				return null;
			default:
				return file;
		}
	}

	private async resizeCourseThumbnail( file : File ) : Promise<any> {
		try {
			const result : ImageResizerDto = await firstValueFrom(
				this.imageResize( file , { aspectRatio : 16 / 16 , format : 'png' } )
			);
			if ( !result.error ) {
				this.formControl.state.set( 'LOADING' );
				const fileName : string = `employee-avatar-${ Date.now() }.png`;
				const fileLogo : File   = Helper.blobToFile( result.data.blob , fileName );
				this.fileService.upload( fileLogo , { public : 1 , tag : 'employee-avatar' } ).pipe(
					takeUntil( this.destroy$ )
				).subscribe( {
					next  : ( { name } : ICTUStandardFile ) : void => {
						this.getControl( 'photo' ).setValue( Helper.removeSlashes( this.fileService.fileHostingServiceApi ) + '/file/' + name );
						this.getControl( 'photo' ).markAsTouched( { emitEvent : true } );
						this.formControl.state.set( 'READY' );
					} ,
					error : () : void => {
						this.notification.toastError( 'Upload file thất bại' );
					}
				} );
			}
		} catch ( e ) {
			console.log( e );
		}
	}

	protected callFileChooser( category : FileUploadCategory ) : void {
		this.openFileChooserObserver.next( category );
	}

	createPositionsChipCurrent() : void {
		const arr = this.formField( 'positions' ).value.split( '|' ).filter( ( x ) => x );
		for ( let item of arr ) {
			this.listPositionsCurrent.push(
				this.vaiTroOption.find( ( itemz ) => itemz.value == item )
			);
		}
		this.createPositionsChip();
	}

	createPositionsChip() : void {
		this.vaiTroOption = this.vaiTroOption.filter( ( item ) => !this.listPositionsCurrent.includes( item ) );

	}

	addPositionsChip( positions : IctuDropdownOption<string> ) : void {
		this.listPositionsCurrent.push( positions );
		this.createPositionsChip();
		this.updateFormFieldpositions();
	}

	removePositionsChip( positions : IctuDropdownOption<string> ) : void {
		this.listPositionsCurrent = this.listPositionsCurrent.filter( ( item ) => item != positions );
		this.vaiTroOption.push( positions );
		this.createPositionsChip();
		this.updateFormFieldpositions();
	}

	updateFormFieldpositions() : void {
		const values = this.listPositionsCurrent.map( ( pos ) => pos.value );
		const str    = '|' + values.join( '|' ) + '|';
		this.formField( 'positions' ).setValue( str );
		this.formField( 'positions' ).markAsTouched();
	}

	emailValidator() : AsyncValidatorFn {
		this.emailValidatorObserver.next();
		return ( control : AbstractControl ) => {
			if ( !control.value ) return of( null );
			return this.service.checkEmail( control.value ).pipe(
				delay( 2000 ) ,
				map( ( exists : boolean ) => {
					if ( exists ) {
						return { emailTaken : true };
					} else {
						const newPassword = this.generateRandomPassword( 12 );
						this.formControl.formGroup.get( 'password' )?.setValue( newPassword );
						return null;
					}
				} ) ,
				takeUntil( merge( this.destroyed$ , this.emailValidatorObserver ) ) ,
				catchError( () => of( null ) )
			);
		};
	}

	generateRandomPassword( length : number = 12 ) : string {
		const lower           = 'abcdefghijklmnopqrstuvwxyz';
		const upper           = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		const numbers         = '0123456789';
		const special         = '@$%&';
		const all : string    = lower + upper + numbers + special;
		let password : string = '';
		password += upper[ Math.floor( Math.random() * upper.length ) ];
		password += numbers[ Math.floor( Math.random() * numbers.length ) ];
		password += special[ Math.floor( Math.random() * special.length ) ];
		password += lower[ Math.floor( Math.random() * lower.length ) ];
		for ( let i = password.length ; i < length ; i++ ) {
			password += all[ Math.floor( Math.random() * all.length ) ];
		}
		return password.split( '' ).sort( () => 0.5 - Math.random() ).join( '' );
	}

	copyPassword( password : string ) {
		if ( password ) {
			navigator.clipboard.writeText( password ).then( () => {
				this.notification.toastSuccess( 'Mật khẩu đã được sao chép' , 'Thông báo' );
			} );
		}
	}

	updatePassword( user : EmployeeExtend ) : void {
		this.visibleDialog = true;
		this.statepasswordReset.set( 'loading' );
		this.userUpdatepassword = user;
		const password : string = this.generateRandomPassword();
		this.service.updatePassword( user.user_id , password ).subscribe( {
			next  : () : void => {
				this.passwordReset = password;
				this.statepasswordReset.set( 'success' );
				this.notification.toastSuccess( 'Cập nhật mật khẩu thành công' , 'Thông báo' );
			} ,
			error : () : void => {
				this.notification.toastError( 'Cập nhật mật khẩu không thành công' , 'Thông báo' );
				this.visibleDialog = false;
			}
		} );
	}

	protected getControl<K extends keyof EmployeeFieldName>( key : K ) : FormControl<EmployeeFieldName[K]> {
		return this._formGroup.get( key as string ) as FormControl<EmployeeFieldName[K]>;
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
