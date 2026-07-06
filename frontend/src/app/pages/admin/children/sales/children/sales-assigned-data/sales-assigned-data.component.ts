import { Component , computed , inject , OnDestroy , OnInit , signal , Signal , TemplateRef , viewChild , WritableSignal } from '@angular/core';
import { HocSinh } from "@models/hoc-sinh";
import { IctuBasePermission , IctuPermissionControl } from "@models/ictu-base-model";
import { forkJoin , map , Observable , Subject , switchMap , takeUntil } from "rxjs";
import { MatDialog , MatDialogRef } from "@angular/material/dialog";
import { IctuDropdownOption } from "@models/ictu-dropdown-option";
import { SaleDataService } from "@services/sale-data.service";
import { AuthenticationService } from "@services/authentication.service";
import { NotificationService } from "@services/notification.service";
import { AppState } from "@models/app-state";
import { AbstractControl , FormBuilder , FormsModule , ReactiveFormsModule , Validators } from "@angular/forms";
import { Drawer } from "primeng/drawer";
import { IctuFormControl2 } from "@models/ictu-form-control";
import { SaleData } from "@models/sale-data";
import { DataTableEvent , DataTableEventName , IctuDataTable } from "@models/datatable";
import { HocSinhSearchInfo } from "@services/hoc-sinh.service";
import { Router } from "@angular/router";
import { debounceTime , filter } from "rxjs/operators";
import { IctuDeletingAnimationControl } from "@models/ictu-deleting-animation-control";
import { DtoObject } from "@models/dto";
import { _10MB } from "@utilities/syscats";
import readXlsxFile , { Row } from "read-excel-file";
import { DatePickerModule } from "primeng/datepicker";
import { CommonModule } from "@angular/common";
import { DialogModule } from "primeng/dialog";
import { DragAndDropDirective } from "@theme/directives/drag-and-drop.directive";
import { IctuPaginatorComponent } from "@theme/components/ictu-paginator/ictu-paginator.component";
import { InputText } from "primeng/inputtext";
import { LoadingProgressComponent } from "@theme/components/loading-progress/loading-progress.component";
import { MatButton } from "@angular/material/button";
import { MatCheckbox } from "@angular/material/checkbox";
import { MatTooltip } from "@angular/material/tooltip";
import { Select } from "primeng/select";
import { Textarea } from "primeng/textarea";
import { Helper } from "@utilities/helper";
import { LopHocSearchInfo } from '@services/lop-hoc.service';

type ImportPanelLayout = 'SELECT_FILE' | 'PROCESS';
type HSImportState =
	| 'prepare'
	| 'invalid'
	| 'waitting'
	| 'uploading'
	| 'uploadingFail'
	| 'uploaded';
type Mode = 'DF' | 'import';

interface HSImport {
	id : number;
	donvi_id : number;
	// phuhuynh_id: number;
	tenphuhuynh : string;
	maso : string;
	// masophuhuynh: string;
	// sdtphuhuynh: number;
	user_id : number;
	hoten : string;
	ten : string;
	english_name : string;
	ngaysinh : string;
	gioitinh : string;
	email : string;
	phone : string;
	avata : string;
	tinh : number;
	huyen : number;
	xa : number;
	diachi : string;
	trangthai : number;
	state : HSImportState;
	errorMessage : string;
	referenceObjectId : number;
	checked : boolean;
}

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

	constructor ( initState : ImportPanelLayout ) {
		this.step         = signal<ImportPanelLayout>( initState );
		this.rows         = signal<number>( 20 );
		this.paged        = signal<number>( 1 );
		this.store        = [];
		this.filtered     = signal<T[]>( [] );
		this.loadingTitle = signal<string>( null );
	}

	public openSelectLayout () : void {
		this.store = [];
		this.filtered.set( [] );
		this.paged.set( 1 );
	}

	public enableLoading ( loadingTitle : string ) : void {
		this.loadingTitle.set( loadingTitle );
	}

	public disableLoading () : void {
		this.loadingTitle.set( null );
	}
}

type HocSinhImportRowState =
	| 'INVALID'
	| 'VALID'
	| 'UPLOADING'
	| 'UPLOADING_FAIL'
	| 'REJECTED'
	| 'UPLOADED';

interface HocSinhImportRow {
	index : number;
	info : Pick<
		HocSinh ,
		| 'donvi_id'
        | 'phuhuynh_id'
        | 'user_id'
        | 'code'
        | 'full_name'
        | 'name'
        | 'english_name'
        | 'dob'
        | 'gender'
        | 'avatar'
        | 'nguonden'
        | 'tinh'
        | 'huyen'
        | 'xa'
        | 'address'
        | 'status'
	>;
	hocsinh : HocSinh;
	ready : Signal<boolean>;
	state : WritableSignal<HocSinhImportRowState>;
}

@Component( {
	selector    : 'app-sales-assigned-data' ,
	imports     : [ Drawer , IctuPaginatorComponent , InputText , LoadingProgressComponent , MatButton , MatCheckbox , ReactiveFormsModule , Select , DragAndDropDirective , FormsModule , DatePickerModule , Textarea , CommonModule , MatTooltip , DialogModule ] ,
	templateUrl : './sales-assigned-data.component.html' ,
	styleUrl    : './sales-assigned-data.component.css'
} )
export default class SalesAssignedDataComponent implements OnInit , OnDestroy , IctuBasePermission {
	importDialogRef : MatDialogRef<boolean>;
	private observeImportHocSinh$ : Subject<string>      = new Subject<string>();
	importDialogDirty : WritableSignal<boolean>          = signal<boolean>( false );
	readonly importTemplate : Signal<TemplateRef<any>>   = viewChild<TemplateRef<any>>( 'importTemplate' );
	private observeOpenFileSelector : Subject<string>    = new Subject<string>();
	readonly importPanel : ImportPanel<HocSinhImportRow> = new ImportPanel( 'SELECT_FILE' );
	optionGioiTinh : IctuDropdownOption<number>[]        = [
		{ value : 0 , label : 'Nam' } ,
		{ value : 1 , label : 'Nữ' } ,
		{ value : 2 , label : 'Khác' }
	];
	optionStatus : IctuDropdownOption<number>[]          = [
		{ value : -1 , label : 'Đã từ chối' } ,
		{ value : 0 , label : 'Chưa liên hệ' } ,
		{ value : 1 , label : 'Hẹn gọi lại' } ,
		{ value : 2 , label : 'Đã chốt lịch checkin' }
	];

	optiondoitac : [] = [];

	statusSelect : number;

	private service : SaleDataService = inject( SaleDataService );

	private auth : AuthenticationService = inject( AuthenticationService );

	private notification : NotificationService = inject( NotificationService );

	get donviId () : number {
		return this.auth.user.donvi_id;
	}

	get userId () : number {
		return this.auth.user.id;
	}

	modeState : WritableSignal<Mode> = signal<Mode>( 'DF' );

	setMode ( mode : Mode ) {
		switch ( mode ) {
			case 'DF':
				this.modeState.set( 'DF' );
				break;
			case 'import':
				this.modeState.set( 'import' );
				break;
		}
	}

	visibleDialog = false;

	state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	private fb : FormBuilder = inject( FormBuilder );

	isListImportDuplicate : WritableSignal<boolean> = signal( false );

	readonly drawer : Signal<Drawer> = viewChild<Drawer>( 'pDrawer' );

	private readonly listImport : WritableSignal<HSImport[]> = signal( [] );

	readonly importFiltered : Signal<HSImport[]> = computed( () => {
		return this.isListImportDuplicate()
		       ? this.listImport().filter( ( item ) => item.state == 'invalid' )
		       : this.listImport();
	} );

	readonly someItemsChecked : Signal<boolean> = computed( () : boolean => {
		if ( ! this.importFiltered().length ) {
			return false;
		}
		return this.importFiltered().some( ( e : HSImport ) : boolean => e.checked );
	} );

	readonly partiallyChecked : Signal<boolean> = computed(
		() : boolean => this.someItemsChecked() && ! this.totalChecked()
	);

	readonly totalChecked : Signal<boolean> = computed( () : boolean => {
		if ( ! this.importFiltered().length ) {
			return false;
		}
		return this.importFiltered().every( ( e : HSImport ) : boolean => e.checked );
	} );

	formControl : IctuFormControl2<SaleData> = new IctuFormControl2<SaleData>( {
		dropdownFields : [] ,
		formGroup      : this.fb.group( {
			user_id      : [ this.userId ] ,
			name         : [ '' , [ Validators.minLength( 1 ) , Validators.maxLength( 255 ) ] ] ,
			phone        : [ '' , [ Validators.minLength( 10 ) , Validators.maxLength( 10 ) ] ] ,
			email        : [ '' ] ,
			sort_name    : [ '' ] ,
			dob          : [ '' ] ,
			gender       : [ '' ] ,
			address      : [ '' ] ,
			child_name   : [ '' ] ,
			child_gender : [ '' ] ,
			child_dob    : [ '' ] ,
			status       : [ 0 , [ Validators.required , Validators.min( -1 ) ] ] ,
			donvi_id     : [ this.donviId ]
		} ) ,
		objectName     : 'Sale' ,
		drawer         : this.drawer
	} );

	private handelEvent : Record<DataTableEventName , ( data : SaleData ) => void> = {
		OPEN_FORM_ADD        : () : void => {
			this.formControl.formGroup.reset( {
				user_id      : this.userId ,
				name         : '' ,
				phone        : '' ,
				email        : '' ,
				sort_name    : '' ,
				dob          : '' ,
				gender       : 'Khác' ,
				address      : '' ,
				child_name   : '' ,
				child_gender : 'Khác' ,
				child_dob    : '' ,
				status       : 0 ,
				donvi_id     : this.donviId
			} );
			this.formControl.openFormAdd();
		} ,
		OPEN_FORM_UPDATE     : ( data : SaleData ) : void => {
			this.formControl.formGroup.reset( {
				user_id      : this.userId ,
				name         : data.name ,
				phone        : data.phone ,
				email        : data.email ,
				sort_name    : data.sort_name ,
				dob          : new Date( data.dob ) ,
				gender       : data.gender ,
				address      : data.address ,
				child_name   : data.child_name ,
				child_gender : data.child_gender ,
				child_dob    : new Date( data.child_dob ) ,
				status       : data.status ,
				donvi_id     : this.donviId
			} );
			this.formControl.openFormEdit( data );
		} ,
		DELETE_SINGLE_ROW    : ( { id } : SaleData ) : void => {
			this.requestDeletingData( [ id ] );
		} ,
		DELETE_SELECTED_ROWS : () : void => {
			const ids : number[] = this.dataTable.getSelectedData().map( ( { id } : SaleData ) : number => id );
			if ( ids.length ) {
				this.requestDeletingData( ids );
			}
		} ,
		SUBMIT_FORM          : () : void => {
			if ( this.formControl.canSubmit ) {
				const info : Partial<SaleData>       = {
					user_id      : this.userId ,
					name         : this.formField( 'name' ).value ,
					phone        : this.formField( 'phone' ).value ,
					email        : this.formField( 'email' ).value ,
					sort_name    : this.formField( 'sort_name' ).value ,
					dob          : Helper.formatSQLTimeStamp( this.formField( 'dob' ).value ) ,
					gender       : this.formField( 'gender' ).value ,
					address      : this.formField( 'address' ).value ,
					child_name   : this.formField( 'child_name' ).value ,
					child_gender : this.formField( 'child_gender' ).value ,
					child_dob    : Helper.formatSQLTimeStamp( this.formField( 'child_dob' ).value ) ,
					status       : this.formField( 'status' ).value ,
					donvi_id     : this.donviId
				};
				const request : Observable<SaleData> = this.formControl.isFormAdd ? this.service.create( info ) : this.service.update( this.formControl.object.id , info );
				const message : string               = this.formControl.isFormAdd ? 'Thêm mới thành công' : 'Cập nhật thành công';
				this.formControl.submit( request ).subscribe( {
					next  : () : void => {
						this.notification.toastSuccess( message , 'Thông báo' );
						if ( this.formControl.isFormAdd ) {
							this.formControl.formGroup.reset( {
								name         : '' ,
								phone        : '' ,
								email        : '' ,
								sort_name    : '' ,
								dob          : '' ,
								gender       : '' ,
								address      : '' ,
								child_name   : '' ,
								child_gender : '' ,
								child_dob    : '' ,
								status       : 0 ,
								donvi_id     : this.donviId
							} );
						}
						else {
							this.formControl.closeForm();
						}
					} ,
					error : () : void => {
						this.notification.toastError( message , 'Thông báo' );
					}
				} );
			}
		}
	};

	private eventObserver$ : Subject<DataTableEvent<SaleData>> = new Subject<DataTableEvent<SaleData>>();

	private onDestroy$ : Subject<string> = new Subject<string>();

	private _temp : { paged : number; resetPaginator : boolean } = {
		paged          : 1 ,
		resetPaginator : true
	};

	searchInfo : HocSinhSearchInfo = {
		search : ''
	};

	lopHocSreachInfo : LopHocSearchInfo = {
		search : '' ,
		namhoc : new Date().getFullYear()
	};

	dataTable : IctuDataTable<SaleData> = new IctuDataTable<SaleData>();

	permissionControl : Signal<IctuPermissionControl> =
		signal<IctuPermissionControl>(
			new IctuPermissionControl(
				this.auth.getUserPermission( 'dao-tao/hoc-sinh' )
			)
		);

	constructor ( private router : Router ) {
		this.eventObserver$.asObservable().pipe( takeUntil( this.onDestroy$ ) ).subscribe( ( { name , data } : DataTableEvent<SaleData> ) : void =>
			this.handelEvent[ name ]( data )
		);
		//import
		this.observeImportHocSinh$.asObservable().pipe(
			takeUntil( this.onDestroy$ ) ,
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

		this.observeOpenFileSelector.asObservable().pipe( takeUntil( this.onDestroy$ ) , debounceTime( 250 ) ).subscribe( () : void => {
			const inputElement : HTMLInputElement = Object.assign(
				document.createElement<'input'>( 'input' ) ,
				{
					type     : 'file' ,
					accept   : '.xlsx' ,
					multiple : false
				}
			);

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

	private formField ( path : keyof SaleData ) : AbstractControl {
		return this.formControl.formGroup.get( path );
	}

	ngOnInit () : void {
		this.loadData( 1 , true );
	}

	private requestDeletingData ( ids : number[] ) : void {
		this.notification.confirmDelete( ids.length ).pipe(
			filter( ( confirm : boolean ) : boolean => confirm ) ,
			map(
				() : IctuDeletingAnimationControl<SaleData> =>
					new IctuDeletingAnimationControl( ids , this.service )
			) ,
			switchMap(
				(
					deleteController : IctuDeletingAnimationControl<SaleData>
				) : Observable<boolean> => {
					deleteController.run();
					return this.notification.startDeleting(
						deleteController.progress
					);
				}
			)
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

	loadData ( paged : number = 1 , resetPaginator : boolean = true ) : void {
		this.state.set( 'loading' );
		this._temp = { paged , resetPaginator };
		forkJoin<[ DtoObject<SaleData[]> ]>( [
			this.service.load(
				this.searchInfo ,
				this.donviId ,
				this.userId ,
				this.statusSelect ,
				{
					limit : this.dataTable.paginator.rows() ,
					paged
				}
			)
		] ).pipe(
			map( ( [ res ] : [ DtoObject<SaleData[]> ] ) : SaleData[] => {
				if ( resetPaginator ) {
					return this.dataTable.paginator.setupPaginator( res );
				}
				else {
					this.dataTable.paginator.changePage( paged );
					return res.data;
				}
			} )
		).subscribe( {
			next  : ( data : SaleData[] ) : void => {
				this.dataTable.fillData( data );
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.state.set( 'error' );
			}
		} );
	}

	deleteRow ( data : SaleData ) : void {
		this.eventObserver$.next( { name : 'DELETE_SINGLE_ROW' , data } );
	}

	deleteSelectedRows () : void {
		this.eventObserver$.next( { name : 'DELETE_SELECTED_ROWS' , data : null } );
	}

	editRow ( data : SaleData ) : void {
		this.eventObserver$.next( { name : 'OPEN_FORM_UPDATE' , data } );
	}

	reload ( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData( this._temp.paged , this._temp.resetPaginator );
	}

	addNewItem () : void {
		this.eventObserver$.next( { name : 'OPEN_FORM_ADD' , data : null } );
	}

	submitForm () : void {
		this.eventObserver$.next( { name : 'SUBMIT_FORM' , data : null } );
	}

	onDrawerHide () : void {
		if ( this.formControl.submitted ) {
			this.loadData( 1 , true );
		}
	}

	onChangePage ( paged : number ) : void {
		this.loadData( paged , false );
	}

	onSearchData () : void {
		this.loadData( 1 , true );
	}

	getTen ( fullName : string ) : string {
		const parts = fullName.trim().split( /\s+/ );
		return parts.length ? parts[ parts.length - 1 ] : '';
	}

	getIds ( list : any[] , isHuyen : boolean ) {
		if ( isHuyen ) {
			return Array.from( new Set( list.map( ( item ) => item.huyen ) ) ).join(
				','
			);
		}
		else {
			return Array.from( new Set( list.map( ( item ) => item.xa ) ) ).join( ',' );
		}
	}

	joinTTHS ( saleData : SaleData ) : string {
		return (
			saleData.child_name +
			' - ' +
			saleData.child_gender +
			' - ' +
			Helper.formatSQLDate( new Date( saleData.child_dob ) )
		);
	}

	//import
	openImportingFromFile () : void {
		this.closeImportingFromFile( false );
		this.observeImportHocSinh$.next( 'create' );
	}

	closeImportingFromFile ( dirty : boolean ) : void {
		if ( this.importDialogRef ) {
			this.importDialogRef.close( dirty );
		}
	}

	downloadFileImportSample () : void {
		this.notification.downloadLocalFile(
			'files/samples/import-HocSinh.xlsx' ,
			'dacms-file-mau-import-hoc-sinh'
		);
	}

	private _doReload () : void {
		this.loadData( this._temp.paged , this._temp.resetPaginator );
	}

	onInputFile ( files : FileList ) : void {
		if ( files.length ) {
			// Chú ý thời gian đọc file có thể lâu hơn với file có dung lượng lớn, nên để loading để người dùng nhận
			// biết hệ thống đang chạy
			this.importPanel.enableLoading( 'Xử lý file...' );
			switch ( true ) {
				case ! files[ 0 ].name.toLowerCase().endsWith( '.xlsx' ):
					this.notification.toastError(
						'Hệ thống chỉ chấm nhận file định dạng .xlsx' ,
						'Lỗi định dạng File!'
					);
					this.importPanel.disableLoading();
					break;
				case files[ 0 ].size >= _10MB:
					this.notification.toastError(
						'Hệ thống chỉ hỗ trợ file có dung lượng từ 10Mb trở xuống' ,
						'File dung lượng quá lớn!'
					);
					this.importPanel.disableLoading();
					break;
				default:
					readXlsxFile( files[ 0 ] ).then( ( rows : Row[] ) : void => {
						this.setMode( 'import' );
						const dataFromRow1 = [];

						for ( let i = 1 ; i < rows.length ; i++ ) {
							const row = rows[ i ];
							if ( ! row[ 1 ] ) break;
							dataFromRow1.push( row );
						}

						const _listImport : HSImport[] = this.validateInportData(
							dataFromRow1.map(
								( data , index : number ) : HSImport => {
									// console.log(this.joinIdsubject(item, rows[0]));
									const info : HSImport = {
										// csdt_ids    : data[ 1 ]
										//               ? this.getIDDropDown(
										// 		this.cosodaotaoDropdownField.options() ,
										// 		data[ 1 ]
										// 	)
										//               : 0 ,
										id          : index ,
										donvi_id    : this.donviId ,
										tenphuhuynh : data[ 1 ] ?? null ,
										user_id     : 0 ,

										// doitac_id    : this.getidfromOption( data[ 3 ] ) ?? 0 ,
										maso              : data[ 2 ] ?? 0 ,
										hoten             : data[ 3 ] ?? '' ,
										ten               : data[ 3 ]
										                    ? this.getTen( data[ 3 ] )
										                    : '' ,
										english_name      : data[ 4 ] ,
										ngaysinh          : data[ 5 ] ?? '' ,
										gioitinh          : data[ 6 ] ?? '' ,
										email             : data[ 7 ] ?? '' ,
										phone             : data[ 8 ] ?? '' ,
										avata             : '' ,
										tinh              : data[ 9 ] ?? 0 ,
										huyen             : data[ 10 ] ?? 0 ,
										xa                : data[ 11 ] ?? 0 ,
										diachi            : data[ 12 ] ?? '' ,
										trangthai         : 1 ,
										state             : 'prepare' ,
										errorMessage      : '' ,
										referenceObjectId : 0 ,
										checked           : false
									};
									return info;
								}
							)
						);
						this.importPanel.disableLoading();
						this.closeImportingFromFile( this.importDialogDirty() );
						this.listImport.set( _listImport );
						if (
							_listImport.filter(
								( item ) => item.state == 'invalid'
							).length
						) {
							this.updateStateDialog();
						}
					} );
					break;
			}
		}
	}

	private validateInportData ( listImport : HSImport[] ) : HSImport[] {
		if ( listImport && listImport.length ) {
			return listImport.filter( ( item ) => item.state != 'uploaded' ).map( ( i ) => {
				i.state = 'prepare';
				return i;
			} ).map( ( info : HSImport ) : HSImport => {
				if ( ! Boolean( info.email ) ) {
					info.state        = 'invalid';
					info.errorMessage = 'Thiếu Email';
				}
				else if ( ! Boolean( info.phone ) ) {
					info.state        = 'invalid';
					info.errorMessage = 'Thiếu Sdt';
				}
				else if (
					! /^\d{6,}$/gm.test( info.phone.toString().trim() )
				) {
					info.state        = 'invalid';
					info.errorMessage = 'Không đúng định dạng Sdt';
				}
				else if (
					! /[A-Za-z0-9\._%+\-]+@[A-Za-z0-9\.\-]+\.[A-Za-z]{2,}/gm.test(
						info.email.trim()
					)
				) {
					info.state        = 'invalid';
					info.errorMessage = 'Không đúng định dạng Email';
				}
				else {
					const objectDuplicateEmail : HSImport = listImport.find(
						( i ) =>
							i.id !== info.id &&
							i.state === 'prepare' &&
							i.email &&
							i.email.trim().toLowerCase() ===
							info.email.toString().trim().toLocaleLowerCase()
					);

					if ( objectDuplicateEmail ) {
						info.state             = 'invalid';
						info.errorMessage      = 'Trùng Email';
						info.referenceObjectId = objectDuplicateEmail.id;
					}
					else {
						const objectDuplicatePhone : HSImport =
							      listImport.find(
								      ( i ) =>
									      i.id !== info.id &&
									      i.state === 'prepare' &&
									      i.phone &&
									      i.phone.toString().trim().toLowerCase() ===
									      info.phone.toString().trim().toLocaleLowerCase()
							      );
						if ( objectDuplicatePhone ) {
							info.state             = 'invalid';
							info.errorMessage      = 'Trùng Sdt';
							info.referenceObjectId =
								objectDuplicatePhone.id;
						}
						else {
							info.errorMessage = '';
						}
					}
				}
				return info;
			} );
		}
		else {
			return [];
		}
	}

	
	mapArrayToHocSinhList ( dataList : any[][] ) {
		if ( ! dataList || ! Array.isArray( dataList ) ) return [];
		return dataList.map( ( data ) => ( {
			// csdt_ids    : data[ 1 ]
			//               ? this.getIDDropDown(
			// 		this.cosodaotaoDropdownField.options() ,
			// 		data[ 1 ]
			// 	)
			//               : 0 ,
			donvi_id    : this.donviId ,
			tenphuhuynh : data[ 1 ] ?? null ,
			user_id     : 0 ,

			// doitac_id    : this.getidfromOption( data[ 3 ] ) ?? 0 ,
			maso              : data[ 2 ] ?? 0 ,
			hoten             : data[ 3 ] ?? '' ,
			ten               : data[ 3 ] ? this.getTen( data[ 3 ] ) : '' ,
			english_name      : data[ 4 ] ,
			ngaysinh          : data[ 5 ] ?? '' ,
			gioitinh          : data[ 6 ] ?? '' ,
			email             : data[ 7 ] ?? '' ,
			phone             : data[ 8 ] ?? '' ,
			avata             : '' ,
			tinh              : data[ 9 ] ?? 0 ,
			huyen             : data[ 10 ] ?? 0 ,
			xa                : data[ 11 ] ?? 0 ,
			diachi            : data[ 12 ] ?? '' ,
			state             : 'prepare' ,
			errorMessage      : '' ,
			referenceObjectId : 0 ,
			checked           : false
		} ) );
	}

	selectRow ( item : HSImport ) : void {
		this.listImport.update( ( data : HSImport[] ) : HSImport[] => {
			return [
				... data.map( ( row : HSImport ) : HSImport => {
					if ( row.id === item.id ) {
						row.checked = ! item.checked;
					}
					return row;
				} )
			];
		} );
	}

	checkAll ( checked : boolean ) {
		this.listImport.update( ( data : HSImport[] ) : HSImport[] => {
			return [
				... data.map( ( row : HSImport ) : HSImport => {
					if (
						-1 !==
						this.importFiltered().findIndex( ( o ) => o.id === row.id )
					) {
						row.checked = checked;
					}
					return row;
				} )
			];
		} );
	}

	checkErrorThiSinh () : boolean {
		if ( this.listImport().find( ( item ) => item.state == 'invalid' ) ) {
			return false;
		}
		else {
			return true;
		}
	}

	deleteThiSinhImport ( item : HSImport ) {
		this.notification.confirmDelete( 1 ).subscribe( ( result : boolean ) => {
			if ( result ) {
				this.listImport.update( ( list : HSImport[] ) => [
					... list.filter( ( i ) => i.id !== item.id )
				] );
			}
		} );
	}

	deleteSelectedThiSinhImport () {
		this.notification.confirmDelete(
			this.importFiltered().filter( ( i ) => i.checked ).length
		).subscribe( ( result : boolean ) => {
			if ( result ) {
				const ids : number[] = this.importFiltered().filter( ( i ) => i.checked ).map( ( o ) => o.id );
				this.listImport.update( ( list : HSImport[] ) => [
					... list.filter( ( i ) => ! ids.includes( i.id ) )
				] );
			}
		} );
	}

	updateStateDialog () : void {
		this.visibleDialog = ! this.visibleDialog;
	}

	openListImportDuplicate () {
		this.isListImportDuplicate.update( ( isChecked : boolean ) => ! isChecked );
	}

	openFileSelector () : void {
		this.observeOpenFileSelector.next( 'open' );
	}

	getidfromOption ( label : string ) : number {
		return this.optiondoitac.find( ( item ) => item == label ) ?? 0;
	}

	shortenEmailEnd ( email : string ) : string {
		return email.length > 15 ? '...' + email.slice( -15 ) : email;
	}


	getToClassPlan ( item : SaleData ) : void {
		void this.router.navigate( [ 'sale-histories' ] , {
			queryParams : { saleData_id : item.id }
		} );
	}

	ngOnDestroy () : void {
		this.onDestroy$.next( 'OnDestroy' );
		this.onDestroy$.complete();
	}
}