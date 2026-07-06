import { Component , computed , inject , OnDestroy , OnInit , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { BacDaoTaoService } from "@services/bac-dao-tao.service";
import { LoadingProgressComponent } from "@theme/components/loading-progress/loading-progress.component";
import { AuthenticationService } from "@services/authentication.service";
import { map , Observable , Subject , switchMap , takeUntil } from "rxjs";
import { IctuPaginator } from "@models/dto";
import { BacDaoTao } from "@models/bac-dao-tao";
import { IctuPaginatorControl } from "@theme/components/ictu-paginator/ictu-paginator-control";
import { AppState } from "@models/app-state";
import { InputText } from "primeng/inputtext";
import { MatButton } from "@angular/material/button";
import { MatCheckbox } from "@angular/material/checkbox";
import { IctuPaginatorComponent } from "@theme/components/ictu-paginator/ictu-paginator.component";
import { Drawer } from "primeng/drawer";
import { FormBuilder , FormGroup , FormsModule , ReactiveFormsModule , Validators } from "@angular/forms";
import { IctuFormControl } from "@models/ictu-form-control";
import { Select } from "primeng/select";
import { IctuDropdownOption } from "@models/ictu-dropdown-option";
import { NotificationService } from "@services/notification.service";
import { filter } from "rxjs/operators";
import { IctuDeletingAnimationControl } from "@models/ictu-deleting-animation-control";
import { DataTableEvent , IctuDataTablePaginatorInfo } from '@models/datatable';

interface BacDaoTaoExtend extends BacDaoTao {
	checked : boolean;
}

type EventName = 'OPEN_FORM_ADD' | 'DELETE_SINGLE_ROW' | 'OPEN_FORM_UPDATE' | 'DELETE_SELECTED_ROWS' | 'SUBMIT_FORM';

@Component( {
	selector    : 'app-bac-dao-tao' ,
	imports     : [
		LoadingProgressComponent ,
		InputText ,
		MatButton ,
		MatCheckbox ,
		IctuPaginatorComponent ,
		Drawer ,
		Select ,
		ReactiveFormsModule ,
		FormsModule
	] ,
	templateUrl : './bac-dao-tao.component.html' ,
	standalone  : true ,
	styleUrl    : './bac-dao-tao.component.css'
} )
export default class BacDaoTaoComponent implements OnInit , OnDestroy {

	optionList : IctuDropdownOption<number>[] = [
		{ value : 0 , label : 'Không kích hoạt' } ,
		{ value : 1 , label : 'Kích hoạt' }
	]

	paginatorControl : Signal<IctuPaginatorControl> = signal<IctuPaginatorControl>( new IctuPaginatorControl( {
		pageLinkSize      : 5 ,
		rows              : 20 ,
		showFirstLastIcon : true
	} ) );

	private bacDaoTaoService : BacDaoTaoService = inject( BacDaoTaoService );

	private auth : AuthenticationService = inject( AuthenticationService );

	private notification : NotificationService = inject( NotificationService );

	data : WritableSignal<BacDaoTaoExtend[]> = signal<BacDaoTaoExtend[]>( [] );

	state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	readonly partiallyChecked : Signal<boolean> = computed( () : boolean => this.someItemsChecked() && ! this.totalChecked() );

	readonly totalChecked : Signal<boolean> = computed( () : boolean => {
		const elements : BacDaoTaoExtend[] = this.data();
		if ( ! elements.length ) {
			return false;
		}
		return elements.every( ( e : BacDaoTaoExtend ) : boolean => e.checked );
	} );

	readonly someItemsChecked : Signal<boolean> = computed( () : boolean => {
		const elements : BacDaoTaoExtend[] = this.data();
		if ( ! elements.length ) {
			return false;
		}
		return elements.some( ( row : BacDaoTaoExtend ) : boolean => row.checked );
	} );

	private fb : FormBuilder = inject( FormBuilder );

	private _form : FormGroup = this.fb.group( {
		ten       : [ '' , [ Validators.required , Validators.minLength( 2 ) , Validators.maxLength( 255 ) ] ] ,
		trangthai : [ 0 ] ,
		donvi_id  : [ this.auth.user.donvi_id ]
	} );

	formControl : WritableSignal<IctuFormControl<BacDaoTaoExtend>> = signal<IctuFormControl<BacDaoTaoExtend>>( {
		type       : 'FORM_ADD' ,
		heading    : '' ,
		formGroup  : this._form ,
		object     : null ,
		visible    : false ,
		dirty      : false ,
		submitting : false
	} );

	private handelEvent : Record<EventName , ( data : BacDaoTao ) => void> = {
		OPEN_FORM_ADD        : () : void => {
			this.formControl.update( ( fc : IctuFormControl<BacDaoTaoExtend> ) : IctuFormControl<BacDaoTaoExtend> => {
				fc.type    = 'FORM_ADD';
				fc.heading = 'Thêm mới bậc đào tạo';
				fc.formGroup.reset( {
					ten       : '' ,
					trangthai : '' ,
					donvi_id  : this.auth.user.donvi_id
				} );
				fc.object     = null;
				fc.dirty      = false;
				fc.visible    = true;
				fc.submitting = false;
				return { ... fc };
			} );
		} ,
		OPEN_FORM_UPDATE     : ( data : BacDaoTaoExtend ) : void => {
			this.formControl.update( ( fc : IctuFormControl<BacDaoTaoExtend> ) : IctuFormControl<BacDaoTaoExtend> => {
				fc.type    = 'FORM_EDIT';
				fc.heading = 'Cập nhật bậc đào tạo';
				fc.formGroup.reset( {
					ten       : data.ten ,
					trangthai : data.trangthai ,
					donvi_id  : this.auth.user.donvi_id
				} );
				fc.object     = data;
				fc.dirty      = false;
				fc.visible    = true;
				fc.submitting = false;
				return { ... fc };
			} );
		} ,
		DELETE_SINGLE_ROW    : ( { id } : BacDaoTaoExtend ) : void => {
			this.requestDeletingData( [ id ] );
		} ,
		DELETE_SELECTED_ROWS : () : void => {
			const ids : number[] = this.data().filter( ( i : BacDaoTaoExtend ) : boolean => i.checked ).map( ( { id } : BacDaoTaoExtend ) : number => id );
			if ( ids.length ) {
				this.requestDeletingData( ids );
			}
		} ,
		SUBMIT_FORM          : () : void => {
			const { type , formGroup , object , submitting } : IctuFormControl<BacDaoTaoExtend> = this.formControl();
			if ( formGroup.valid && ! submitting ) {
				const data : Partial<BacDaoTao> = {
					ten       : formGroup.get( 'ten' ).value ,
					trangthai : formGroup.get( 'trangthai' ).value ,
					donvi_id  : this.auth.user.donvi_id
				}
				const request : Observable<any> = type === 'FORM_ADD' ? this.bacDaoTaoService.create( data ) : this.bacDaoTaoService.update( object.id , data );
				this.formControl.update( ( control : IctuFormControl<BacDaoTaoExtend> ) : IctuFormControl<BacDaoTaoExtend> => ( {
					... control ,
					submitting : true
				} ) );
				request.subscribe( {
					next  : () : void => {
						this.formControl.update( ( control : IctuFormControl<BacDaoTaoExtend> ) : IctuFormControl<BacDaoTaoExtend> => {
							control.formGroup.reset( {
								ten       : '' ,
								trangthai : '' ,
								donvi_id  : this.auth.user.donvi_id
							} );
							return {
								... control ,
								dirty      : true ,
								submitting : false ,
								visible    : type === 'FORM_ADD'
							}
						} );
						if ( type !== 'FORM_ADD' ) {
							this.drawer().hide( true );
						}
						this.notification.toastSuccess( type === 'FORM_ADD' ? 'Dữ liệu đã được thêm mới' : 'Dữ liệu đã được cập nhật' , 'Thành công' );
					} ,
					error : () : void => {
						this.formControl.update( ( control : IctuFormControl<BacDaoTaoExtend> ) : IctuFormControl<BacDaoTaoExtend> => ( {
							... control ,
							submitting : false
						} ) );
					}
				} );
			}
		}
	}

	private observeEvents : Subject<DataTableEvent<BacDaoTao>> = new Subject<DataTableEvent<BacDaoTao>>();

	private destroyed$ : Subject<void> = new Subject<void>();

	readonly drawer : Signal<Drawer> = viewChild<Drawer>( 'pDrawer' );

	private _temp : IctuDataTablePaginatorInfo = { paged : 1 , resetPaginator : true };

	_search : string = '';

	get search () : string {
		return this._search;
	}

	ngOnInit () : void {
		this.observeEvents.asObservable().pipe(
			takeUntil( this.destroyed$ )
		).subscribe( ( { name , data } : DataTableEvent<BacDaoTao> ) : void => this.handelEvent[ name ]( data ) );
		this.loadData( 1 , true );
	}

	private requestDeletingData ( ids : number[] ) : void {
		this.notification.confirmDelete( ids.length ).pipe(
			filter( ( confirm : boolean ) : boolean => confirm ) ,
			map( () : IctuDeletingAnimationControl<BacDaoTao> => new IctuDeletingAnimationControl( ids , this.bacDaoTaoService ) ) ,
			switchMap( ( deleteController : IctuDeletingAnimationControl<BacDaoTao> ) : Observable<boolean> => {
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
		this.bacDaoTaoService.list( this.auth.user?.donvi_id , this.search , {
			limit : this.paginatorControl().rows() ,
			paged
		} ).pipe(
			map( ( res : IctuPaginator<BacDaoTao> ) : BacDaoTao[] => {
				if ( resetPaginator ) {
					return this.paginatorControl().setupPaginator( res )
				}
				else {
					this.paginatorControl().changePage( paged );
					return res.data;
				}
			} ) ,
			map( ( res : BacDaoTao[] ) : BacDaoTaoExtend[] => res.map( ( row : BacDaoTao ) : BacDaoTaoExtend => ( {
				... row ,
				checked : false
			} ) ) )
		).subscribe( {
			next  : ( data : BacDaoTaoExtend[] ) : void => {
				this.data.set( data );
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.state.set( 'error' )
			}
		} )
	}

	selectRow ( checked : boolean , index? : number ) : void {
		this.data.update( ( data : BacDaoTaoExtend[] ) : BacDaoTaoExtend[] => {
			if ( index === undefined ) {
				return data.map( ( row : BacDaoTaoExtend ) : BacDaoTaoExtend => {
					row.checked = checked;
					return row;
				} );
			}
			else {
				data[ index ].checked = checked;
				return [ ... data ];
			}
		} );
	}

	deleteRow ( data : BacDaoTaoExtend ) : void {
		this.observeEvents.next( { name : 'DELETE_SINGLE_ROW' , data } );
	}

	deleteSelectedRows () : void {
		this.observeEvents.next( { name : 'DELETE_SELECTED_ROWS' , data : null } );
	}

	editRow ( data : BacDaoTaoExtend ) : void {
		this.observeEvents.next( { name : 'OPEN_FORM_UPDATE' , data } );
	}

	reload ( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData( this._temp.paged , this._temp.resetPaginator );
	}

	addNewItem () : void {
		this.observeEvents.next( { name : 'OPEN_FORM_ADD' , data : null } );
	}

	submitForm () : void {
		this.observeEvents.next( { name : 'SUBMIT_FORM' , data : null } );
	}

	onDrawerHide () : void {
		if ( this.formControl().dirty ) {
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
		this.destroyed$.next();
		this.destroyed$.complete();
	}

}
