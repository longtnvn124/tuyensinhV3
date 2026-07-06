import { Component , computed , inject , OnDestroy , OnInit , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { forkJoin , map , merge , Observable , of , Subject , takeUntil } from "rxjs";
import { AppState } from "@models/app-state";
import { LoadingProgressComponent } from "@theme/components/loading-progress/loading-progress.component";
import { FormsModule } from "@angular/forms";
import { IctuPaginatorComponent } from "@theme/components/ictu-paginator/ictu-paginator.component";
import { InputText } from "primeng/inputtext";
import { IctuDataTable2 , IctuDataTablePaginatorInfo } from "@models/datatable";
import { Employee , EMPLOYEE_CONTRACT_STATUS_OPTIONS , EMPLOYEE_PHOTO_PLACEHOLDER , EMPLOYEE_POSITION_OPTIONS , EmployeeContractStatus , EmployeePositionTag , EmployeePositionTagOrdering , Gender , GENDER_OPTIONS } from "@models/employee";
import { EmployeesService } from "@services/employees.service";
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from "@models/dto";
import { AuthenticationService } from "@services/authentication.service";
import { IctuDropdownOption , IctuDropdownOption2 , IctuDropdownOptionElement } from "@models/ictu-dropdown-option";
import { DepartmentsService } from "@services/departments.service";
import { Department , DepartmentOptionLoader } from "@models/department";
import { IctuDropdownOptionMapPipe } from "@pipes/ictu-dropdown-option-map.pipe";
import { Tooltip } from "primeng/tooltip";
import { NgClass } from "@angular/common";
import { Helper } from "@utilities/helper";
import { Select } from "primeng/select";
import { MatButton } from "@angular/material/button";
import { Drawer } from "primeng/drawer";
import { toObservable } from "@angular/core/rxjs-interop";
import { GmEmployeesFormComponent } from "@pages/admin/children/general-management/children/gm-employees-form/gm-employees-form.component";
import { EmployeePhotoPipe } from "@pipes/employee-photo.pipe";

export interface EmployeeExtend extends Employee {
	positionTags : EmployeePositionTag[];
}

export type EmployeeExtendEventName = 'add' | 'edit' | 'delete';

export interface EmployeeExtendEvent {
	name : EmployeeExtendEventName,
	data : EmployeeExtend
}

@Component( {
	selector    : 'app-gm-employees' ,
	imports     : [ LoadingProgressComponent , FormsModule , IctuPaginatorComponent , InputText , IctuDropdownOptionMapPipe , Tooltip , NgClass , Select , MatButton , Drawer , GmEmployeesFormComponent , EmployeePhotoPipe ] ,
	templateUrl : './gm-employees.component.html' ,
	styleUrl    : './gm-employees.component.css'
} )
export default class GmEmployeesComponent implements OnInit , OnDestroy {

	private auth : AuthenticationService = inject<AuthenticationService>( AuthenticationService );

	private employeesService : EmployeesService = inject<EmployeesService>( EmployeesService )

	private departmentsService : DepartmentsService = inject<DepartmentsService>( DepartmentsService )

	private destroy$ : Subject<void> = new Subject<void>();

	private observeLoadData : Subject<void> = new Subject<void>();

	private observeChangeEvent : Subject<EmployeeExtendEvent> = new Subject<EmployeeExtendEvent>();

	protected readonly state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	protected readonly dataTable : IctuDataTable2<EmployeeExtend> = new IctuDataTable2<EmployeeExtend>();

	private _temp : IctuDataTablePaginatorInfo = {
		paged          : 1 ,
		resetPaginator : true
	};

	protected search : WritableSignal<string> = signal<string>( '' );

	protected filterByPosition : WritableSignal<string> = signal<string>( '' );

	private readonly donviID : number = this.auth.user?.donvi_id ?? 0;

	readonly departmentOptions : WritableSignal<DepartmentOptionLoader> = signal<DepartmentOptionLoader>( { loaded : false , options : [] } );

	protected readonly GENDER_OPTIONS : IctuDropdownOptionElement<Gender>[] = GENDER_OPTIONS;

	protected readonly EMPLOYEE_CONTRACT_STATUS_OPTIONS : IctuDropdownOptionElement<EmployeeContractStatus>[] = EMPLOYEE_CONTRACT_STATUS_OPTIONS;

	protected readonly employeePhotoPlaceholder : Signal<string> = signal<string>( EMPLOYEE_PHOTO_PLACEHOLDER );

	protected readonly emptyMessage : WritableSignal<string> = signal<string>( 'Không có nhân viên nào.' );

	protected readonly EMPLOYEE_POSITION_OPTIONS : IctuDropdownOptionElement<string>[] = EMPLOYEE_POSITION_OPTIONS;

	protected dirty : boolean = false;

	readonly drawer : Signal<Drawer> = viewChild<Drawer>( 'pDrawer' );

	protected readonly formEvent : WritableSignal<EmployeeExtendEvent> = signal<EmployeeExtendEvent>( null );

	protected readonly formTitle : Signal<string> = computed( () : string => this.formEvent()?.name === 'add' ? 'Thêm mới nhân sự' : 'Cập nhật nhân sự' );

	protected drawerOpen : boolean = false;

	constructor () {
		toObservable<EmployeeExtendEvent>( this.formEvent ).pipe(
			takeUntil( this.destroy$ ) ,
			map( ( e : EmployeeExtendEvent ) : boolean => !! e )
		).subscribe( ( isOpen : boolean ) : void => {
			this.drawerOpen = isOpen;
		} );

		this.observeChangeEvent.pipe(
			takeUntil( this.destroy$ )
		).subscribe( ( _event : EmployeeExtendEvent ) : void => this.formEvent.set( _event ) )
	}

	ngOnInit () : void {
		this.onSearchData();
	}

	private loadData ( paginatorInfo : IctuDataTablePaginatorInfo ) : void {
		this.state.set( 'loading' );
		this._temp = paginatorInfo;
		forkJoin<{
			departments : Observable<any>,
			employees : Observable<DtoObject<Employee[]>>
		}>( {
			departments : this.loadDepartmentsOnce() ,
			employees   : this.loadEmployees( paginatorInfo )
		} ).pipe(
			takeUntil( merge( this.observeLoadData , this.destroy$ ) ) ,
			map( ( { employees } : { employees : DtoObject<Employee[]> } ) : DtoObject<EmployeeExtend[]> => {
				return {
					... employees , data : employees.data.map( ( e : Employee ) : EmployeeExtend => {
						const _positionTags : EmployeePositionTag[] = e.positions.split( '|' ).map( ( position : string ) : EmployeePositionTag => position ? ( EmployeePositionTagOrdering[ position ] ?? null ) : null ).filter( Boolean );
						return { ... e , positionTags : _positionTags.length ? Helper.arraySort<EmployeePositionTag>( _positionTags , "ordering" , 1 ) : [] };
					} )
				};
			} )
		).subscribe( {
			next  : ( response : DtoObject<EmployeeExtend[]> ) : void => {
				this.dataTable.fillRawData( response , paginatorInfo );
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.state.set( 'error' );
			}
		} );
	}

	private loadDepartmentsOnce () : Observable<IctuDropdownOption<number>[]> {
		return this.departmentOptions().loaded ? of( this.departmentOptions().options ) : this.departmentsService.query(
			[ { conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donviID.toString( 10 ) } ] ,
			{ limit : -1 , paged : 1 , select : 'id,name' , order : 'ASC' , orderby : 'name' }
		).pipe(
			map( ( response : DtoObject<Department[]> ) : IctuDropdownOption<number>[] => {
				const options : IctuDropdownOption2<Department , number>[] = response.data.map( ( _dpm : Department ) : IctuDropdownOption2<Department , number> => ( { raw : _dpm , value : _dpm.id , label : _dpm.name } ) );
				this.departmentOptions.update( () : DepartmentOptionLoader => ( { loaded : true , options } ) );
				return options;
			} )
		)
	}

	private loadEmployees ( { paged } : IctuDataTablePaginatorInfo ) : Observable<DtoObject<Employee[]>> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donviID.toString( 10 ) }
		];
		const searchText : string               = this.search().trim();
		if ( searchText.length ) {
			conditions.push( {
				conditionName : 'full_name' ,
				condition     : IctuQueryCondition.like ,
				value         : `%${ searchText }%` ,
				orWhere       : "and"
			} );
			this.emptyMessage.update( () : string => `Không tìm thấy nhân viên nào có tên là "${ searchText }"` );
		}
		else {
			this.emptyMessage.update( () : string => 'Không có nhân viên nào.' );
		}

		if ( this.filterByPosition() ) {
			conditions.push( {
				conditionName : 'positions' ,
				condition     : IctuQueryCondition.like ,
				value         : `%${ this.filterByPosition() }%` ,
				orWhere       : "and"
			} );
		}
		const queryParams : IctuQueryParams = {
			limit : this.dataTable.paginator.rows() ,
			paged
		};
		return this.employeesService.query( conditions , queryParams );
	}

	protected reload ( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData( this._temp );
	}

	protected onChangePage ( paged : number ) : void {
		this.loadData( { paged , resetPaginator : false } );
	}

	protected onSearchData () : void {
		this.loadData( { paged : 1 , resetPaginator : true } );
	}

	protected btnCallEvent ( name : EmployeeExtendEventName , data : EmployeeExtend ) : void {
		this.state.set( 'loading' );
		this.observeChangeEvent.next( { name , data } )
	}

	protected onDrawerHide () : void {
		if ( this.dirty ) {
			this.loadData( this._temp );
		}
		else {
			this.state.set( 'success' );
		}
		this.formEvent.set( null ); // set null to destroy gm-employees-form component
	}

	ngOnDestroy () : void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}
