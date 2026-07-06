import { Component , inject , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { AuthenticationService } from '@services/authentication.service';
import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';
import { debounceTime , forkJoin , map , merge , Observable , of , Subject , takeUntil } from 'rxjs';
import { AppState } from '@models/app-state';
import { IctuDropdownOption , IctuDropdownOptionElement } from '@models/ictu-dropdown-option';
import { IctuDataTable2 , IctuDataTablePaginatorInfo } from '@models/datatable';
import { ACADEMIC_DEGREE_OPTIONS , ACADEMIC_RANK_OPTIONS , AcademicDegree , AcademicRank , Employee , EMPLOYEE_CONTRACT_STATUS_OPTIONS , EMPLOYEE_LANGUAGE_OPTIONS , EMPLOYEE_PHOTO_PLACEHOLDER , EmployeeContractStatus , Gender , GENDER_OPTIONS , SystemLanguageName } from '@models/employee';
import { EmployeesService } from '@services/employees.service';
import { DtoObject , IctuConditionParam , IctuQueryParams } from '@models/dto';
import { FormsModule , ReactiveFormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { MatButton } from '@angular/material/button';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { MatTooltip } from '@angular/material/tooltip';
import { Drawer } from 'primeng/drawer';
import { User } from '@models/user';
import { LinhVucDaoTaoService } from '@services/linh-vuc-dao-tao.service';
import { IctuDropdownOptionMapPipe } from '@pipes/ictu-dropdown-option-map.pipe';
import { IctuMediaLoaderDirective } from '@app/directives/ictu-media-loader.directive';
import { TeacherComponent } from '@app/components/teacher-component/teacher-component';

interface BranchesLoader {
	loaded : boolean;
	options : IctuDropdownOption<number>[];
}

// type TmTeacherEvent = 'import' | 'add' | 'edit' | 'delete';
type TmTeacherEvent = 'password' | 'info';

interface TmTeacherEventData {
	name : TmTeacherEvent,
	data : Employee
}

// LoadingProgressComponent, FormsModule, InputText, MatButton, IctuPaginatorComponent, MatTooltip, Drawer, ReactiveFormsModule, IctuDropdownOptionMapPipe, IctuMediaLoaderDirective,
@Component( {
	selector    : 'app-tm-teachers' ,
	imports     : [ TeacherComponent ] ,
	templateUrl : './tm-teachers.component.html' ,
	styleUrl    : './tm-teachers.component.css'
} )
export default class TmTeachersComponent {

	// private employeesService : EmployeesService = inject( EmployeesService );

	// private auth : AuthenticationService = inject( AuthenticationService );

	// private linhVucDaoTaoService : LinhVucDaoTaoService = inject( LinhVucDaoTaoService );

	// private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

	// private destroy$ : Subject<void> = new Subject<void>();

	// protected readonly submitter : Signal<User> = signal<User>( this.auth.user );

	// get donviId () : number {
	// 	return this.auth.user.donvi_id;
	// }

	// readonly state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	// readonly branches : WritableSignal<BranchesLoader> = signal<BranchesLoader>( { loaded : false , options : [] } );

	// readonly dataTable : IctuDataTable2<Employee> = new IctuDataTable2<Employee>();

	// private paginatorInfo : IctuDataTablePaginatorInfo = {
	// 	paged          : 1 ,
	// 	resetPaginator : true
	// };

	// readonly search : WritableSignal<string> = signal<string>( '' );

	// readonly drawer : Signal<Drawer> = viewChild<Drawer>( 'pDrawer' );

	// protected readonly employee : WritableSignal<Employee> = signal<Employee>( null );

	// private handleEvents : Record<TmTeacherEvent , ( data : Employee ) => void> = {
	// 	password : ( data : Employee ) : void => {
	// 		this.state.update( () : AppState => 'success' );
	// 		this.formHeading.set( 'Cập nhật thông tin giáo viên' );
	// 		this.employee.set( data );
	// 		this.formVisible = true;
	// 	} ,
	// 	info     : ( data : Employee ) : void => {
	// 		this.state.update( () : AppState => 'success' );
	// 		this.formHeading.set( 'Thông tin giáo viên' );
	// 		this.employee.set( data );
	// 		this.formVisible = true;
	// 		this.loadTrainingMajor();
	// 	}
	// }

	// private eventsObserver : Subject<TmTeacherEventData> = new Subject<TmTeacherEventData>();

	// private loadTrainingMajorObserver : Subject<void> = new Subject<void>();

	// protected formVisible : boolean = false;

	// readonly formHeading : WritableSignal<string> = signal<string>( '' );

	// protected readonly trainingMajorOptions : WritableSignal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>( [] );

	// protected readonly profilePhotoPlaceholder : Signal<string> = signal<string>( EMPLOYEE_PHOTO_PLACEHOLDER );

	// protected readonly formState : WritableSignal<AppState> = signal<AppState>( 'loading' );

	// protected readonly GENDER_OPTIONS : IctuDropdownOptionElement<Gender>[] = GENDER_OPTIONS;

	// protected readonly ACADEMIC_RANK_OPTIONS : IctuDropdownOptionElement<AcademicRank>[] = ACADEMIC_RANK_OPTIONS;

	// protected readonly ACADEMIC_DEGREE_OPTIONS : IctuDropdownOptionElement<AcademicDegree>[] = ACADEMIC_DEGREE_OPTIONS;

	// protected readonly EMPLOYEE_LANGUAGE_OPTIONS : IctuDropdownOptionElement<SystemLanguageName>[] = EMPLOYEE_LANGUAGE_OPTIONS;

	// protected readonly EMPLOYEE_CONTRACT_STATUS_OPTIONS : IctuDropdownOptionElement<EmployeeContractStatus>[] = EMPLOYEE_CONTRACT_STATUS_OPTIONS;

	// constructor () {
	// 	this.eventsObserver.pipe(
	// 		takeUntil( this.destroy$ ) ,
	// 		debounceTime( 500 )
	// 	).subscribe( ( { name , data } : TmTeacherEventData ) : void => this.handleEvents[ name ]( data ) );
	// }

	// ngOnInit () : void {
	// 	this.searchData();
	// }

	// searchData () : void {
	// 	this.loadData( { paged : 1 , resetPaginator : true } );
	// }

	// reload ( event : MouseEvent ) : void {
	// 	event.preventDefault();
	// 	event.stopPropagation();
	// 	this.loadData( this.paginatorInfo );
	// }

	// private loadData ( paginatorInfo : IctuDataTablePaginatorInfo ) : void {
	// 	this.state.set( 'loading' );
	// 	forkJoin<{
	// 		preload : Observable<any>,
	// 		employees : Observable<DtoObject<Employee[]>>
	// 	}>( {
	// 		preload   : this.loadBranches() ,
	// 		employees : this.loadEmployees( paginatorInfo )
	// 	} ).pipe(
	// 		takeUntil( this.destroy$ )
	// 	).subscribe( {
	// 		next  : ( { employees } : { employees : DtoObject<Employee[]> } ) : void => {
	// 			this.dataTable.fillRawData( employees , paginatorInfo );
	// 			this.state.set( 'success' );
	// 		} ,
	// 		error : () : void => {
	// 			this.state.set( 'error' );
	// 		}
	// 	} );
	// }

	// private loadBranches () : Observable<IctuDropdownOption<number>[]> {
	// 	return this.branches().loaded ? of( this.branches().options ) : this.coSoDaoTaoService.loadOptions( this.donviId ).pipe(
	// 		map( ( branches : IctuDropdownOption<number>[] ) : IctuDropdownOption<number>[] => {
	// 			this.branches.update( () : BranchesLoader => ( { loaded : true , options : branches } ) );
	// 			return branches;
	// 		} )
	// 	)
	// }

	// private loadEmployees ( { paged , resetPaginator } : IctuDataTablePaginatorInfo ) : Observable<DtoObject<Employee[]>> {
	// 	this.paginatorInfo                      = { paged , resetPaginator };
	// 	const conditions : IctuConditionParam[] = [];
	// 	const queryParams : IctuQueryParams     = {};
	// 	return this.employeesService.query( conditions , queryParams );
	// }

	// btnClick ( name : TmTeacherEvent , data? : Employee ) : void {
	// 	this.state.update( () : AppState => 'loading' );
	// 	this.eventsObserver.next( { name , data } );
	// }

	// onDrawerHide () : void {

	// }

	// onChangePage ( paged : number ) : void {
	// 	this.loadData( { paged , resetPaginator : false } );
	// }

	// submitForm () : void {
	// }

	// private loadTrainingMajor () : void {
	// 	if ( this.trainingMajorOptions().length ) {
	// 		this.formState.set( 'success' );
	// 		return;
	// 	}
	// 	this.loadTrainingMajorObserver.next();
	// 	this.formState.set( 'loading' );
	// 	this.linhVucDaoTaoService.loadOptions( null , false ).pipe(
	// 		takeUntil( merge( this.loadTrainingMajorObserver , this.destroy$ ) )
	// 	).subscribe( {
	// 		next  : ( response : IctuDropdownOption<number>[] ) : void => {
	// 			this.trainingMajorOptions.set( response );
	// 			this.formState.set( 'success' );
	// 		} ,
	// 		error : () : void => {
	// 			this.formState.set( 'error' );
	// 		}
	// 	} )
	// }

	// protected reloadTrainingMajor ( event : MouseEvent ) : void {
	// 	event.preventDefault();
	// 	event.stopPropagation();
	// 	this.loadTrainingMajor();
	// }

	// ngOnDestroy () : void {
	// 	this.destroy$.next();
	// 	this.destroy$.complete();
	// }
}
