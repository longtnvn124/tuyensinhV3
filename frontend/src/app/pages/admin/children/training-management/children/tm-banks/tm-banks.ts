import { Component , inject , OnDestroy , OnInit , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { IctuPaginatorComponent } from "@theme/components/ictu-paginator/ictu-paginator.component";
import { InputText } from "primeng/inputtext";
import { LoadingProgressComponent } from "@theme/components/loading-progress/loading-progress.component";
import { MatButton } from "@angular/material/button";
import { MatCheckbox } from "@angular/material/checkbox";
import { SharedModule } from "@shared/shared.module";
import { Tooltip } from "primeng/tooltip";
import { IctuDropdownField , IctuDropdownOption } from "@models/ictu-dropdown-option";
import { AppState } from "@models/app-state";
import { AuthenticationService } from "@services/authentication.service";
import { forkJoin , map , Observable , Subject , switchMap , takeUntil } from "rxjs";
import { DataTableEvent , DataTableEventName , IctuDataTable2 } from "@models/datatable";
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from "@models/dto";
import { BanksService } from "@services/banks.service";
import { Bank } from "@models/bank";
import { filter } from "rxjs/operators";
import { IctuDeletingAnimationControl } from "@models/ictu-deleting-animation-control";
import { NotificationService } from "@services/notification.service";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { IctuBasePermission , IctuPermissionControl } from "@models/ictu-base-model";
import { IctuFormControl2 } from "@models/ictu-form-control";
import { Drawer } from "primeng/drawer";
import { FormGroupType } from "@models/common";
import { FormControl , FormGroup , Validators } from "@angular/forms";
import { CoursesService } from "@services/course.service";
import { IctuBankModule } from "@module/ictu-bank/ictu-bank.module";
import { Dialog } from "primeng/dialog";
import { BankEditorQueryParams } from "@pages/bank-editor/bank-editor.component";
import { Router } from "@angular/router";

type BankFormGroup = FormGroupType<Pick<Bank , 'name' | 'code' | 'course_id' | 'donvi_id' | 'desc' | 'status'>>;

@Component( {
	selector    : 'app-tm-banks' ,
	imports     : [ IctuPaginatorComponent , InputText , LoadingProgressComponent , MatButton , MatCheckbox , SharedModule , Tooltip , IctuBankModule , Dialog ] ,
	templateUrl : './tm-banks.html' ,
	styleUrl    : './tm-banks.css'
} )
export default class TmBanks implements OnInit , OnDestroy , IctuBasePermission {

	private auth : AuthenticationService = inject( AuthenticationService );

	private service : BanksService = inject( BanksService );

	private notification : NotificationService = inject( NotificationService );

	private coursesService : CoursesService = inject( CoursesService );

	private router : Router = inject( Router );

	readonly permissionControl : Signal<IctuPermissionControl> = signal<IctuPermissionControl>( new IctuPermissionControl( this.auth.getUserPermission( 'training-management/banks' ) ) );

	optionList : IctuDropdownOption<number>[] = [
		{ value : 0 , label : 'Dừng hoạt động' } ,
		{ value : 1 , label : 'Đang hoạt động' }
	];

	get donViID () : number {
		return this.auth.user.donvi_id;
	}

	state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	private destroyed$ : Subject<void> = new Subject<void>();

	private _temp : { paged : number; resetPaginator : boolean } = {
		paged          : 1 ,
		resetPaginator : true
	};

	protected readonly search : WritableSignal<string> = signal<string>( '' );

	protected dataTable : IctuDataTable2<Bank> = new IctuDataTable2<Bank>();

	protected searchText : string = '';

	private handelEvent : Record<DataTableEventName , ( data : Bank ) => void> = {
		OPEN_FORM_ADD        : () : void => {
			// this.activeBankID  = 0;
			// this.visibleDialog = true;
			this.getToBankEditor( 0 )
		} ,
		OPEN_FORM_UPDATE     : ( { id } : Bank ) : void => {
			this.getToBankEditor( id );
			// this.activeBankID  = id;
			// this.visibleDialog = true;
		} ,
		DELETE_SINGLE_ROW    : ( { id } : Bank ) : void => {
			this.requestDeletingData( [ id ] );
		} ,
		DELETE_SELECTED_ROWS : () : void => {
			const ids : number[] = this.dataTable.getSelectedData().map( ( { id } : Bank ) : number => id );
			if ( ids.length ) {
				this.requestDeletingData( ids );
			}
		} ,
		SUBMIT_FORM          : () : void => {
		}
	};

	private eventObserver$ : Subject<DataTableEvent<Bank>> = new Subject<DataTableEvent<Bank>>();

	readonly drawer : Signal<Drawer> = viewChild<Drawer>( 'pDrawer' );

	readonly courseDropdownField : IctuDropdownField = new IctuDropdownField( this.coursesService.loadOptions( this.donViID ) , 'Chọn môn học' );

	private _formGroup : BankFormGroup = new FormGroup( {
		name      : new FormControl<string>( '' , [ Validators.required , Validators.minLength( 1 ) , Validators.maxLength( 255 ) ] ) ,
		code      : new FormControl<string>( '' , [ Validators.required , Validators.minLength( 1 ) , Validators.maxLength( 255 ) ] ) ,
		desc      : new FormControl<string>( '' , [ Validators.maxLength( 255 ) ] ) ,
		donvi_id  : new FormControl<number>( this.donViID , [ Validators.required ] ) ,
		course_id : new FormControl<number>( 0 , [ Validators.required , Validators.min( 1 ) ] ) ,
		status    : new FormControl<number>( 0 , [ Validators.required ] )
	} );

	readonly formControl : IctuFormControl2<Bank> = new IctuFormControl2<Bank>( {
		dropdownFields : [
			this.courseDropdownField
		] ,
		formGroup      : this._formGroup ,
		objectName     : 'ngân hàng' ,
		drawer         : this.drawer
	} );

	protected visibleDialog : boolean = false;

	activeBankID : number = 0;

	constructor () {
		this.eventObserver$.pipe(
			takeUntilDestroyed()
		).subscribe( ( { name , data } : DataTableEvent<Bank> ) : void => {
			this.handelEvent[ name ]( data );
		} );
	}

	ngOnInit () : void {
		this.loadData( 1 , true );
	}

	private requestDeletingData ( ids : number[] ) : void {
		this.notification.confirmDelete( ids.length ).pipe(
			filter( ( confirm : boolean ) : boolean => confirm ) ,
			map( () : IctuDeletingAnimationControl<Bank> => new IctuDeletingAnimationControl( ids , this.service ) ) ,
			switchMap( ( deleteController : IctuDeletingAnimationControl<Bank> ) : Observable<boolean> => {
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

	protected reload ( event : MouseEvent ) : void {
		if ( event ) {
			event.preventDefault();
			event.stopPropagation();
		}
		this.loadData( this._temp.paged , this._temp.resetPaginator );
	}

	onChangePage ( paged : number ) : void {
		this.loadData( paged , false );
	}

	onSearchData () : void {
		this.loadData( 1 , true );
	}

	private loadData ( paged : number = 1 , resetPaginator : boolean = true ) : void {
		this.state.set( 'loading' );
		this._temp                              = { paged , resetPaginator };
		const conditions : IctuConditionParam[] = [
			{
				conditionName : 'donvi_id' ,
				value         : this.donViID.toString( 10 ) ,
				condition     : IctuQueryCondition.equal
			}
		];
		if ( this.searchText != '' ) {
			conditions.push( {
				conditionName : 'name' ,
				value         : `%${ this.searchText }%` ,
				condition     : IctuQueryCondition.like ,
				orWhere       : 'and'
			} );
		}
		const queryParams : IctuQueryParams = {
			limit   : this.dataTable.paginator.rows() ,
			paged ,
			order   : 'ASC' ,
			orderby : 'name'
		};
		forkJoin<{
			loadCourse : Observable<any>,
			loadData : Observable<DtoObject<Bank[]>>
		}>( {
			loadCourse : this.courseDropdownField.load() ,
			loadData   : this.service.query( conditions , queryParams )
		} ).pipe(
			map( ( { loadData } : { loadData : DtoObject<Bank[]> } ) : DtoObject<Bank[]> => loadData ) ,
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( response : DtoObject<Bank[]> ) : void => {
				this.dataTable.fillRawData( response , { paged , resetPaginator } );
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.state.set( 'error' );
			}
		} );
	}

	deleteRow ( data : Bank ) : void {
		this.eventObserver$.next( { name : 'DELETE_SINGLE_ROW' , data } );
	}

	deleteSelectedRows () : void {
		this.eventObserver$.next( { name : 'DELETE_SELECTED_ROWS' , data : null } );
	}

	protected editRow ( data : Bank ) : void {
		this.eventObserver$.next( { name : 'OPEN_FORM_UPDATE' , data } );
	}

	protected addNewItem () : void {
		this.eventObserver$.next( { name : 'OPEN_FORM_ADD' , data : null } );
	}

	protected disabledCheckbox () : boolean {
		return ! this.dataTable.data().length || ! this.permissionControl().canDelete
	}

	protected onDrawerHide () : void {
		if ( this.formControl.submitted ) {
			this.loadData( this._temp.paged , this._temp.resetPaginator );
		}
	}

	protected onBankFormClosed ( dirty : boolean ) : void {
		if ( dirty ) {
			this.reload( null );
		}
		this.visibleDialog = false;
	}

	private getToBankEditor ( bankID : number ) : void {
		const queryParams : BankEditorQueryParams = {
			bankID ,
			userID  : this.auth.user.id ,
			donViID : this.donViID ,
			role    : 'training_management'
		}
		void this.router.navigate( [ '/bank-editor' ] , {
			queryParams : {
				hashcode : this.auth.encrypt( JSON.stringify( queryParams ) )
			}
		} );
	}

	ngOnDestroy () : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
