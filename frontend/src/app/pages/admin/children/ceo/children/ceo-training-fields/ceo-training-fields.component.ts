import { Component , inject , OnDestroy , OnInit , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { Drawer } from "primeng/drawer";
import { FormBuilder , FormsModule , ReactiveFormsModule , Validators } from "@angular/forms";
import { IctuPaginatorComponent } from "@theme/components/ictu-paginator/ictu-paginator.component";
import { InputText } from "primeng/inputtext";
import { LoadingProgressComponent } from "@theme/components/loading-progress/loading-progress.component";
import { MatButton } from "@angular/material/button";
import { MatCheckbox } from "@angular/material/checkbox";
import { Select } from "primeng/select";
import { IctuDropdownField , IctuDropdownOption } from "@models/ictu-dropdown-option";
import { LinhVucDaoTaoService } from "@services/linh-vuc-dao-tao.service";
import { NotificationService } from "@services/notification.service";
import { AppState } from "@models/app-state";
import { IctuFormControl2 } from "@models/ictu-form-control";
import { LinhVucDaoTao } from "@models/linh-vuc-dao-tao";
import { DataTableEvent , DataTableEventName , IctuDataTable , IctuDataTablePaginatorInfo } from '@models/datatable';
import { map , Observable , Subject , switchMap , takeUntil } from "rxjs";
import { filter } from "rxjs/operators";
import { IctuDeletingAnimationControl } from "@models/ictu-deleting-animation-control";
import { DtoObject } from "@models/dto";

@Component( {
	selector    : 'app-ceo-training-fields' ,
	imports     : [ Drawer , FormsModule , IctuPaginatorComponent , InputText , LoadingProgressComponent , MatButton , MatCheckbox , ReactiveFormsModule , Select ] ,
	templateUrl : './ceo-training-fields.component.html' ,
	styleUrls   : [ './ceo-training-fields.component.css' ]
} )
export default class CeoTrainingFieldsComponent implements OnInit , OnDestroy {

	optionList : IctuDropdownOption<number>[] = [
		{ value : 0 , label : 'Không kích hoạt' } ,
		{ value : 1 , label : 'Kích hoạt' }
	];

	private service : LinhVucDaoTaoService = inject( LinhVucDaoTaoService );

	private notification : NotificationService = inject( NotificationService );

	parentDropdownField : IctuDropdownField = new IctuDropdownField( this.service.loadParentOptions() , 'Chọn lĩnh vực cha' );

	state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	private fb : FormBuilder = inject( FormBuilder );

	readonly drawer : Signal<Drawer> = viewChild<Drawer>( 'pDrawer' );

	formControl : IctuFormControl2<LinhVucDaoTao> = new IctuFormControl2<LinhVucDaoTao>( {
		dropdownFields : [ this.parentDropdownField ] ,
		formGroup      : this.fb.group( {
			ten       : [ '' , [ Validators.required , Validators.minLength( 2 ) , Validators.maxLength( 255 ) ] ] ,
			parent_id : [ 0 ] ,
			trangthai : [ 0 ]
		} ) ,
		drawer         : this.drawer
	} );

	private handelEvent : Record<DataTableEventName , ( data : LinhVucDaoTao ) => void> = {
		OPEN_FORM_ADD        : () : void => {
			this.formControl.formGroup.reset( {
				ten       : '' ,
				trangthai : 0 ,
				parent_id : 0
			} );
			this.formControl.openFormAdd();
		} ,
		OPEN_FORM_UPDATE     : ( data : LinhVucDaoTao ) : void => {
			this.formControl.formGroup.reset( {
				ten       : data.ten ,
				trangthai : data.trangthai ,
				parent_id : data.parent_id
			} );
			this.formControl.openFormEdit( data );
		} ,
		DELETE_SINGLE_ROW    : ( { id } : LinhVucDaoTao ) : void => {
			this.requestDeletingData( [ id ] );
		} ,
		DELETE_SELECTED_ROWS : () : void => {
			const ids : number[] = this.dataTable.getSelectedData().map( ( { id } : LinhVucDaoTao ) : number => id );
			if ( ids.length ) {
				this.requestDeletingData( ids );
			}
		} ,
		SUBMIT_FORM          : () : void => {
			if ( this.formControl.canSubmit ) {
				const info : Partial<LinhVucDaoTao> = {
					ten       : this.formControl.formGroup.get( 'ten' ).value ,
					trangthai : this.formControl.formGroup.get( 'trangthai' ).value ,
					parent_id : this.formControl.formGroup.get( 'parent_id' ).value
				}
				const request : Observable<any>     = this.formControl.isFormAdd ? this.service.create( info ) : this.service.update( this.formControl.object.id , info )
				const message : string              = this.formControl.isFormAdd ? 'Thêm mới thành công' : 'Cập nhật thành công';
				this.formControl.submit( request ).subscribe( {
					next  : () : void => {
						this.notification.toastSuccess( message , 'Thông báo' );
						if ( this.formControl.isFormAdd ) {
							this.formControl.formGroup.reset( {
								ten       : '' ,
								trangthai : 0 ,
								parent_id : 0
							} );
							if ( info.parent_id === 0 ) {
								this.parentDropdownField.markAsDirty();
							}
							this.formControl.preparation();
						}
						else {
							this.parentDropdownField.markAsDirty();
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

	private eventObserver$ : Subject<DataTableEvent<LinhVucDaoTao>> = new Subject<DataTableEvent<LinhVucDaoTao>>();

	private onDestroy$ : Subject<string> = new Subject<string>();

	private _temp : IctuDataTablePaginatorInfo = { paged : 1 , resetPaginator : true };

	_search : string = '';

	dataTable : IctuDataTable<LinhVucDaoTao> = new IctuDataTable<LinhVucDaoTao>()

	get search () : string {
		return this._search;
	}

	constructor () {
		this.eventObserver$.asObservable().pipe(
			takeUntil( this.onDestroy$ )
		).subscribe( ( { name , data } : DataTableEvent<LinhVucDaoTao> ) : void => this.handelEvent[ name ]( data ) );
	}

	ngOnInit () : void {
		this.loadData( 1 , true );
	}

	private requestDeletingData ( ids : number[] ) : void {
		this.notification.confirmDelete( ids.length ).pipe(
			filter( ( confirm : boolean ) : boolean => confirm ) ,
			map( () : IctuDeletingAnimationControl<LinhVucDaoTao> => new IctuDeletingAnimationControl( ids , this.service ) ) ,
			switchMap( ( deleteController : IctuDeletingAnimationControl<LinhVucDaoTao> ) : Observable<boolean> => {
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
		this.service.load( this.search , {
			limit : this.dataTable.paginator.rows() ,
			paged
		} ).pipe(
			map( ( res : DtoObject<LinhVucDaoTao[]> ) : LinhVucDaoTao[] => {
				if ( resetPaginator ) {
					return this.dataTable.paginator.setupPaginator( res )
				}
				else {
					this.dataTable.paginator.changePage( paged );
					return res.data;
				}
			} )
		).subscribe( {
			next  : ( data : LinhVucDaoTao[] ) : void => {
				this.dataTable.fillData( data );
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.state.set( 'error' )
			}
		} )
	}

	deleteRow ( data : LinhVucDaoTao ) : void {
		this.eventObserver$.next( { name : 'DELETE_SINGLE_ROW' , data } );
	}

	deleteSelectedRows () : void {
		this.eventObserver$.next( { name : 'DELETE_SELECTED_ROWS' , data : null } );
	}

	editRow ( data : LinhVucDaoTao ) : void {
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
