import { Component , inject , OnDestroy , OnInit , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { IctuBasePermission , IctuPermissionControl } from "@models/ictu-base-model";
import { IctuDropdownField , IctuDropdownOption } from "@models/ictu-dropdown-option";
import { PhongHocSearchInfo , PhongHocService } from "@services/phong-hoc.service";
import { AuthenticationService } from "@services/authentication.service";
import { NotificationService } from "@services/notification.service";
import { CoSoDaoTaoService } from "@services/co-so-dao-tao.service";
import { AppState } from "@models/app-state";
import { AbstractControl , FormBuilder , FormsModule , ReactiveFormsModule , Validators } from "@angular/forms";
import { Drawer } from "primeng/drawer";
import { IctuFormControl2 } from "@models/ictu-form-control";
import { PhongHoc } from "@models/phong-hoc";
import { DataTableEvent , DataTableEventName , IctuDataTable , IctuDataTablePaginatorInfo } from '@models/datatable';
import { forkJoin , map , Observable , Subject , switchMap , takeUntil } from "rxjs";
import { filter } from "rxjs/operators";
import { IctuDeletingAnimationControl } from "@models/ictu-deleting-animation-control";
import { DtoObject } from "@models/dto";
import { IctuDropdownOptionMapPipe } from "@pipes/ictu-dropdown-option-map.pipe";
import { IctuPaginatorComponent } from "@theme/components/ictu-paginator/ictu-paginator.component";
import { InputText } from "primeng/inputtext";
import { LoadingProgressComponent } from "@theme/components/loading-progress/loading-progress.component";
import { MatButton } from "@angular/material/button";
import { MatCheckbox } from "@angular/material/checkbox";
import { Select } from "primeng/select";
import { Textarea } from "primeng/textarea";

@Component( {
	selector    : 'app-ceo-class-rooms' ,
	imports     : [ Drawer , IctuDropdownOptionMapPipe , IctuPaginatorComponent , InputText , LoadingProgressComponent , MatButton , MatCheckbox , ReactiveFormsModule , Select , Textarea , FormsModule ] ,
	templateUrl : './ceo-class-rooms.component.html' ,
	styleUrl    : './ceo-class-rooms.component.css'
} )
export default class CeoClassRoomsComponent implements OnInit , OnDestroy , IctuBasePermission {

	optionList : IctuDropdownOption<number>[] = [
		{ value : 0 , label : 'Dừng hoạt động' } ,
		{ value : 1 , label : 'Đang hoạt động' }
	];

	private service : PhongHocService = inject( PhongHocService );

	private auth : AuthenticationService = inject( AuthenticationService );

	private notification : NotificationService = inject( NotificationService );

	private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

	get donviId () : number {
		return this.auth.user.donvi_id;
	}

	parentDropdownField : IctuDropdownField = new IctuDropdownField( this.coSoDaoTaoService.loadOptions( this.donviId ) , 'Chọn cơ sở đào tạo' );

	state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	private fb : FormBuilder = inject( FormBuilder );

	readonly drawer : Signal<Drawer> = viewChild<Drawer>( 'pDrawer' );

	formControl : IctuFormControl2<PhongHoc> = new IctuFormControl2<PhongHoc>( {
		dropdownFields : [ this.parentDropdownField ] ,
		formGroup      : this.fb.group( {
			name        : [ '' , [ Validators.required , Validators.minLength( 2 ) , Validators.maxLength( 255 ) ] ] ,
			code        : [ '' , [ Validators.required , Validators.minLength( 2 ) , Validators.maxLength( 255 ) ] ] ,
			description : [ '' ] ,
			csdt_id     : [ 0 , [ Validators.required , Validators.min( 1 ) ] ] ,
			capacity    : [ 0 , [ Validators.required , Validators.min( 1 ) ] ] ,
			donvi_id    : [ this.donviId ] ,
			status      : [ 0 ]
		} ) ,
		objectName     : 'phòng học' ,
		drawer         : this.drawer
	} );

	private handelEvent : Record<DataTableEventName , ( data : PhongHoc ) => void> = {
		OPEN_FORM_ADD        : () : void => {
			this.formControl.formGroup.reset( {
				name        : '' ,
				code        : '' ,
				description : '' ,
				csdt_id     : 0 ,
				donvi_id    : this.donviId ,
				capacity    : 0 ,
				status      : 0
			} );
			this.formControl.openFormAdd();
		} ,
		OPEN_FORM_UPDATE     : ( data : PhongHoc ) : void => {
			this.formControl.formGroup.reset( {
				name        : data.name ,
				code        : data.code ,
				description : data.description ,
				csdt_id     : data.csdt_id ,
				capacity    : data.capacity ,
				donvi_id    : this.donviId ,
				status      : data.status
			} );
			this.formControl.openFormEdit( data );
		} ,
		DELETE_SINGLE_ROW    : ( { id } : PhongHoc ) : void => {
			this.requestDeletingData( [ id ] );
		} ,
		DELETE_SELECTED_ROWS : () : void => {
			const ids : number[] = this.dataTable.getSelectedData().map( ( { id } : PhongHoc ) : number => id );
			if ( ids.length ) {
				this.requestDeletingData( ids );
			}
		} ,
		SUBMIT_FORM          : () : void => {
			if ( this.formControl.canSubmit ) {
				const info : Partial<PhongHoc>  = {
					name        : this.formField( 'name' ).value ,
					code        : this.formField( 'code' ).value ,
					description : this.formField( 'description' ).value ,
					csdt_id     : this.formField( 'csdt_id' ).value ,
					donvi_id    : this.formField( 'donvi_id' ).value ,
					capacity    : this.formField( 'capacity' ).value ,
					status      : this.formField( 'status' ).value
				}
				const request : Observable<any> = this.formControl.isFormAdd ? this.service.create( info ) : this.service.update( this.formControl.object.id , info )
				const message : string          = this.formControl.isFormAdd ? 'Thêm mới thành công' : 'Cập nhật thành công';
				this.formControl.submit( request ).subscribe( {
					next  : () : void => {
						this.notification.toastSuccess( message , 'Thông báo' );
						if ( this.formControl.isFormAdd ) {
							this.formControl.formGroup.reset( {
								name        : '' ,
								code        : '' ,
								description : '' ,
								csdt_id     : 0 ,
								donvi_id    : this.donviId ,
								capacity    : 0 ,
								status      : 0
							} );
						}
						else {
							this.formControl.closeForm();
						}
					} ,
					error : () : void => {
						this.notification.toastError( message , 'Thông báo' );
					}
				} )
			}
		}
	}

	private eventObserver$ : Subject<DataTableEvent<PhongHoc>> = new Subject<DataTableEvent<PhongHoc>>();

	private onDestroy$ : Subject<string> = new Subject<string>();

	private _temp : IctuDataTablePaginatorInfo = { paged : 1 , resetPaginator : true };

	searchInfo : PhongHocSearchInfo = {
		search  : '' ,
		csdt_id : null
	}

	dataTable : IctuDataTable<PhongHoc> = new IctuDataTable<PhongHoc>();

	permissionControl : Signal<IctuPermissionControl> = signal<IctuPermissionControl>( new IctuPermissionControl( this.auth.getUserPermission( 'ceo/class-rooms' ) ) )

	constructor () {
		this.eventObserver$.asObservable().pipe(
			takeUntil( this.onDestroy$ )
		).subscribe( ( { name , data } : DataTableEvent<PhongHoc> ) : void => this.handelEvent[ name ]( data ) );
	}

	private formField ( path : keyof PhongHoc ) : AbstractControl {
		return this.formControl.formGroup.get( path );
	}

	ngOnInit () : void {
		this.loadData( 1 , true );
	}

	private requestDeletingData ( ids : number[] ) : void {
		this.notification.confirmDelete( ids.length ).pipe(
			filter( ( confirm : boolean ) : boolean => confirm ) ,
			map( () : IctuDeletingAnimationControl<PhongHoc> => new IctuDeletingAnimationControl( ids , this.service ) ) ,
			switchMap( ( deleteController : IctuDeletingAnimationControl<PhongHoc> ) : Observable<boolean> => {
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

	loadData ( paged : number = 1 , resetPaginator : boolean = true ) : void {
		this.state.set( 'loading' );
		this._temp = { paged , resetPaginator };
		forkJoin<[
			IctuDropdownOption<number>[] ,
			DtoObject<PhongHoc[]>
		]>( [
			this.parentDropdownField.load() ,
			this.service.load( this.searchInfo , this.donviId , { limit : this.dataTable.paginator.rows() , paged } )
		] ).pipe(
			map( ( [ _ , res ] : [ IctuDropdownOption<number>[] , DtoObject<PhongHoc[]> ] ) : PhongHoc[] => {
				if ( resetPaginator ) {
					return this.dataTable.paginator.setupPaginator( res );
				}
				else {
					this.dataTable.paginator.changePage( paged );
					return res.data;
				}
			} )
		).subscribe( {
			next  : ( data : PhongHoc[] ) : void => {
				this.dataTable.fillData( data );
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.state.set( 'error' )
			}
		} )
	}

	deleteRow ( data : PhongHoc ) : void {
		this.eventObserver$.next( { name : 'DELETE_SINGLE_ROW' , data } );
	}

	deleteSelectedRows () : void {
		this.eventObserver$.next( { name : 'DELETE_SELECTED_ROWS' , data : null } );
	}

	editRow ( data : PhongHoc ) : void {
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

	ngOnDestroy () : void {
		this.onDestroy$.next( 'OnDestroy' );
		this.onDestroy$.complete();
	}
}
