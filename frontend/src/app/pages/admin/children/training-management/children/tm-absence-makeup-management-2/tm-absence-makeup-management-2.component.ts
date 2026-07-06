import { Component , computed , inject , OnDestroy , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { FormControl , FormGroup , ReactiveFormsModule , Validators } from '@angular/forms';
import { SharedModule } from '@shared/shared.module';
import { catchError , concatMap , debounceTime , delay , distinctUntilChanged , filter , map , merge , Observable , of , Subject , switchMap , takeUntil , tap } from 'rxjs';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { AppState } from '@models/app-state';
import { IctuDataTable , IctuDataTableRow } from '@models/datatable';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { DiemDanhService } from '@services/diem-danh.service';
import { DatePicker } from 'primeng/datepicker';
import dayjs from '@setup/dayjs';
import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';
import { Tooltip } from 'primeng/tooltip';
import { CoSoDaoTao } from '@models/co-so-dao-tao';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { CHECK_IN_STATUS_OPTIONS , CheckAssignmentProgress , DiemDanh } from '@models/diem-danh';
import { HocSinhService } from '@services/hoc-sinh.service';
import { HocSinh , studentAvatar } from '@models/hoc-sinh';
import { ClassesService } from '@services/classes.service';
import { joinSources } from '@utilities/join-sources';
import { Class } from '@models/class';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { ClassSession } from '@models/class-session';
import { SafeUrlPipe } from '@pipes/safe-url.pipe';
import { Employee , SimpleEmployee } from '@models/employee';
import { DatePipe , NgClass } from '@angular/common';
import { MatMenuTrigger } from '@angular/material/menu';
import { IctuDropdownOptionElement } from '@models/ictu-dropdown-option';
import { cloneDeep } from 'lodash-es';
import { FormGroupType } from '@models/common';
import { EmployeesService } from '@services/employees.service';
import { BUTTON_NO , BUTTON_YES , ButtonBase } from '@models/button';
import { FindInArrayPipe } from '@pipes/find-in-array.pipe';
import { Dialog } from 'primeng/dialog';
import { Str2datePipe } from '@pipes/str2date.pipe';
import { StaffControlComponent } from '@components/form-controls/staff-control/staff-control.component';
import { EmployeePhotoPipe } from '@pipes/employee-photo.pipe';
import { IctuCustomMatMenuComponent } from '@components/form-controls/ictu-custom-mat-menu/ictu-custom-mat-menu.component';
import { StudentAvatarPipe } from '@pipes/student-avatar.pipe';
import { Course } from '@models/course';
import { Dayjs } from 'dayjs';

interface SearchInfo {
	progress : CheckAssignmentProgress,
	staff_id : number,
	branchID : number,
	from : string;
	to : string;
}

interface CheckIn extends DiemDanh {
	class_session : Pick<ClassSession , 'id' | 'type' | 'title' | 'topic'>
	teacher : SimpleEmployee,
	student : HocSinh,
	_class : AbsenceMakeupManagementRelatedClass,
	course : Pick<Course , 'id' | 'title' | 'lecture_format' | 'type'>,
	avatar : string,
	lblDeadline : string
}

type AbsenceMakeupManagementRelatedClass = Pick<Class , 'id' | 'name' | 'course_id' | 'donvi_id' | 'csdt_id' | 'code' | 'desc' | 'teacher_ids' | 'assistant_ids'>

type SupportTeacherFormFields = Pick<DiemDanh , 'assigned_teacher' | 'progress' | 'deadline'>

type SupportTeacherForm = FormGroupType<SupportTeacherFormFields>;

type AbsenceSupportCommandName = 'SCHEDULE' | 'REJECT';

interface AbsenceSupportCommand {
	action : AbsenceSupportCommandName,
	items : CheckIn[]
}

const getWeekBoundaryDates : ( date : Dayjs | string | Date ) => Date[] = ( date : Dayjs | string | Date ) : Date[] => {
	const _date : Dayjs = dayjs( date );
	return [ _date.startOf( 'isoWeek' ).toDate() , _date.endOf( 'isoWeek' ).toDate() ];
}
@Component( {
	selector    : 'app-tm-absence-makeup-management-2' ,
	standalone  : true ,
	imports     : [ IctuPaginatorComponent , LoadingProgressComponent , MatButton , MatCheckbox , MatTooltip , ReactiveFormsModule , SharedModule , DatePicker , Tooltip , SafeUrlPipe , DatePipe , FindInArrayPipe , NgClass , Dialog , Str2datePipe , StaffControlComponent , EmployeePhotoPipe , IctuCustomMatMenuComponent , StudentAvatarPipe ] ,
	templateUrl : './tm-absence-makeup-management-2.component.html' ,
	styleUrl    : './tm-absence-makeup-management-2.component.css'
} )
export default class TmAbsenceMakeupManagement2Component implements OnDestroy {

	private destroyed$ : Subject<void> = new Subject<void>();

	private auth : AuthenticationService = inject( AuthenticationService );

	private notification : NotificationService = inject( NotificationService );

	private hocSinhService : HocSinhService = inject( HocSinhService );

	private classesService : ClassesService = inject( ClassesService );

	private diemDanhService : DiemDanhService = inject( DiemDanhService );

	private employeesService : EmployeesService = inject( EmployeesService );

	protected rangeDates : WritableSignal<Date[]> = signal( getWeekBoundaryDates( new Date() ) );

	private readonly dateStart : Signal<string> = computed( () : string => {
		return this.rangeDates()[ 0 ] ? [ dayjs( this.rangeDates()[ 0 ] ).format( 'YYYY-MM-DD' ) , '00:00:00' ].join( ' ' ) : '';
	} );

	private readonly dateEnd : Signal<string> = computed( () : string => {
		return this.rangeDates()[ 1 ] ? [ dayjs( this.rangeDates()[ 1 ] ).format( 'YYYY-MM-DD' ) , '23:23:00' ].join( ' ' ) : '';
	} );

	get donViID () : number {
		return this.auth.user.donvi_id;
	}

	state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	dataTable : IctuDataTable<CheckIn> = new IctuDataTable<CheckIn>();

	private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

	readonly branchOptions : WritableSignal<CoSoDaoTao[]> = signal<CoSoDaoTao[]>( [] );

	readonly classes : WritableSignal<AbsenceMakeupManagementRelatedClass[]> = signal<AbsenceMakeupManagementRelatedClass[]>( [] );

	readonly branchActive : WritableSignal<CoSoDaoTao> = signal( null );

	readonly branchID : Signal<number> = computed( () : number => this.branchActive()?.id ?? 0 );

	private _temp : { paged : number; resetPaginator : boolean } = {
		paged          : 1 ,
		resetPaginator : true
	};

	readonly checkInStatusOptions : IctuDropdownOptionElement<CheckAssignmentProgress>[] = CHECK_IN_STATUS_OPTIONS;

	readonly checkInStatusCssClassOptions : IctuDropdownOptionElement<CheckAssignmentProgress>[] = [
		{ value : -1 , label : 'ictu-badge--danger' } ,
		{ value : 0 , label : 'ictu-badge--secondary' } ,
		{ value : 1 , label : 'ictu-badge--primary' } ,
		{ value : 2 , label : 'ictu-badge--warning' } ,
		{ value : 3 , label : 'ictu-badge--success' }
	];

	// readonly classFilterOptions : Signal<IctuDropdownOptionElement<number>[]> = computed( () : IctuDropdownOptionElement<number>[] => {
	//     return [ { value : 0 , label : 'Tất cả các lớp học' , disabled : false } , ... ( this.classes().length ? sortBy( this.classes().map( ( { id , name } : AbsenceMakeupManagementRelatedClass ) : IctuDropdownOptionElement<number> => ( { value : id , label : name , disabled : false } ) ) , 'label' ) : [] ) ];
	// } );

	protected filterProgress : WritableSignal<CheckAssignmentProgress> = signal( 0 );

	protected filterClassID : WritableSignal<number> = signal( 0 );

    protected employees : WritableSignal<SimpleEmployee[]> = signal<SimpleEmployee[]>( [] );

    protected filterByStaffID : WritableSignal<number> = signal<number>( null );

	readonly highlightItemID : WritableSignal<number> = signal( 0 );

	readonly syncItems : WritableSignal<CheckIn[]> = signal<CheckIn[]>( [] );

	readonly enableProgress : Signal<boolean> = computed( () : boolean => this.syncItems().length > 0 );

	readonly syncSuccessItemsCounter : WritableSignal<number> = signal( 0 );

	readonly syncProgress : Signal<number> = computed( () : number => {
		return this.syncItems().length ? Math.floor( ( this.syncSuccessItemsCounter() / this.syncItems().length ) * 100 ) : 0;
	} );

	visibleDialog : boolean = false;

	formGroup : SupportTeacherForm = new FormGroup( {
		progress         : new FormControl<CheckAssignmentProgress>( 1 ) ,
		assigned_teacher : new FormControl<number>( null , [ Validators.required ] ) ,
		deadline         : new FormControl<string>( null , [ Validators.required ] )
	} );

	protected expiredDate : Date | undefined;

	calendarMenu : Signal<MatMenuTrigger> = viewChild<MatMenuTrigger>( 'calendarMenuTrigger' );

	readonly command : WritableSignal<AbsenceSupportCommand> = signal( null );

	constructor () {
		merge<[ number , number , number , Date[] ]>(
			toObservable( this.branchID ) ,
			toObservable( this.filterByStaffID ) ,
			toObservable( this.filterProgress ) ,
			toObservable( this.rangeDates ).pipe(
				filter( ( rangeDates : Date[] ) : boolean => rangeDates.reduce( ( reducer : boolean , _date : Date ) : boolean => reducer && ( !! _date ) , true ) )
			)
		).pipe(
			takeUntilDestroyed() ,
			map( () : SearchInfo => ( {
				staff_id : this.filterByStaffID() ?? 0 ,
				progress : this.filterProgress() ,
				branchID : this.branchID() ,
				from     : this.dateStart() ,
				to       : this.dateEnd()
			} ) ) ,
			debounceTime( 100 ) ,
			distinctUntilChanged( ( p : SearchInfo , c : SearchInfo ) : boolean => [ p.branchID , p.from , p.to , p.staff_id , p.progress ].join( '' ) === [ c.branchID , c.from , c.to , c.staff_id , c.progress ].join( '' ) )
		).subscribe( () : void => {
			this.loadData( 1 , true );
		} );

		toObservable( this.command ).pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 ) ,
			filter( Boolean )
		).subscribe( ( command : AbsenceSupportCommand ) : void => {
			switch ( command.action ) {
				case 'REJECT':
					this.rejectItems( command );
					break;
				case 'SCHEDULE':
					this.formGroup.reset( {
						progress         : 1 ,
						deadline         : command.items.length === 1 ? command.items[ 0 ].deadline : null ,
						assigned_teacher : command.items.length === 1 ? command.items[ 0 ].assigned_teacher : null
					} );
					this.visibleDialog = true;
					break;
				default:
					break;
			}
		} )
	}

	private loadData ( paged : number = 1 , resetPaginator : boolean = true ) : void {
		this._temp = { paged , resetPaginator };
		this.state.set( 'loading' );
		this.highlightItemID.set( 0 );
		if ( this.branchID() ) {
			const conditions : IctuConditionParam[] = [
				{ conditionName : 'created_at' , condition : IctuQueryCondition.greaterThanToEqualsTo , value : this.dateStart() } ,
				{ conditionName : 'created_at' , condition : IctuQueryCondition.lessThanOrEqualsTo , value : this.dateEnd() , orWhere : 'and' } ,
				{ conditionName : 'parent_id' , condition : IctuQueryCondition.equal , value : '0' , orWhere : 'and' } ,
				{ conditionName : 'progress' , condition : IctuQueryCondition.equal , value : this.filterProgress().toString() , orWhere : 'and' } ,
				{ conditionName : 'csdt_id' , condition : IctuQueryCondition.equal , value : this.branchID().toString() , orWhere : 'and' } ,
				{ conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString() , orWhere : 'and' }
			];
			//  'PRESENT' | 'UNEXCUSED' | 'EXCUSED' | 'LATE' | 'WAITING' | 'NOT_ATTENDED_YET'
			const queryParams : IctuQueryParams     = {
				limit      : this.dataTable.paginator.rows() ,
				paged ,
				exclude    : [ 'PRESENT' , 'LATE' ].join( ',' ) ,
				exclude_by : 'status' ,
				with       : 'class_session'
			};

			if ( this.filterByStaffID() ) {
				if ( this.filterProgress() > 0 ) {
					conditions.push( { conditionName : 'assigned_teacher' , condition : IctuQueryCondition.equal , value : this.filterByStaffID().toString() , orWhere : 'and' } );
				}
				else {
					const classIDs : number[] = this.classes().reduce( ( reducer : number[] , _class : Class ) : number[] => {
						if ( _class.assistant_ids?.includes( this.filterByStaffID() ) ) {
							reducer.push( _class.id );
						}
						return reducer;
					} , new Array<number>() );
					if ( classIDs.length > 0 ) {
						queryParams[ 'include' ]    = classIDs.join( ',' );
						queryParams[ 'include_by' ] = 'class_id';
					}
				}
			}
			this.diemDanhService.query( conditions , queryParams ).pipe(
				takeUntil( this.destroyed$ ) ,
				switchMap( ( response : DtoObject<DiemDanh[]> ) : Observable<DtoObject<CheckIn[]>> => this.loadRelatedSources( response ) ) ,
				map( ( response : DtoObject<CheckIn[]> ) : CheckIn[] => {
					if ( resetPaginator ) {
						return this.dataTable.paginator.setupPaginator( response );
					}
					else {
						this.dataTable.paginator.changePage( paged );
						return response.data;
					}
				} )
			).subscribe( {
				next  : ( checkIns : CheckIn[] ) : void => {
					this.dataTable.fillData( checkIns );
					this.state.set( 'success' );
				} ,
				error : () : void => {
					this.state.set( 'error' );
				}
			} )
		}
		else {
			this.loadBranchOptions().pipe(
				takeUntil( this.destroyed$ )
			).subscribe( {
				next  : ( branches : CoSoDaoTao[] ) : void => {
					this.branchOptions.set( branches );
					if ( branches.length ) {
						this.branchActive.set( branches[ 0 ] );
					}
				} ,
				error : () : void => {
					this.state.set( 'error' );
				}
			} )
		}
	}

	private loadRelatedSources ( info : DtoObject<DiemDanh[]> ) : Observable<DtoObject<CheckIn[]>> {
		const classIDs : number[] = info.data.filter( ( i : DiemDanh ) : boolean => !! i.class_id ).map( ( i : DiemDanh ) : number => i.class_id );
		return joinSources<{
			students : HocSinh[],
			classes : AbsenceMakeupManagementRelatedClass[],
			employees : SimpleEmployee[]
		}>( {
			students  : this.loadRelatedSourceFromCheckin( info , this.hocSinhService , 'hocsinh_id' , { select : 'id,donvi_id,full_name,name,phuhuynh_id,dob,gender,avatar,english_name' } ) ,
			classes   : this.loadClasses() ,
			employees : this.loadEmployees()
		} ).pipe(
			map( ( { students , classes , employees } : { students : HocSinh[], classes : AbsenceMakeupManagementRelatedClass[], employees : Employee[] } ) : DtoObject<CheckIn[]> => {
				return {
					... info ,
					data : info.data.map( ( _checkIn : DiemDanh ) : CheckIn => {
						const student : HocSinh                            = students.find( ( s : HocSinh ) : boolean => s.id === _checkIn.hocsinh_id );
						const _class : AbsenceMakeupManagementRelatedClass = classes.find( ( s : Class ) : boolean => s.id === _checkIn.class_id );
						return {
							... _checkIn ,
							student ,
							class_session : _checkIn[ 'class_session' ] ,
							teacher       : _checkIn.assigned_teacher ? employees.find( ( e : SimpleEmployee ) : boolean => e.user_id === _checkIn.assigned_teacher ) : null ,
							_class ,
							course        : _class ? _class[ 'course' ] : undefined ,
							avatar        : studentAvatar( student ) ,
							lblDeadline   : _checkIn.deadline ? dayjs( _checkIn.deadline ).format( 'DD/MM/YYYY' ) : ''
						};
					} )
				}
			} )
		)
	}

	private loadRelatedSourceFromCheckin<T> ( info : DtoObject<DiemDanh[]> , service : IctuBaseServiceClass<T> , key : keyof Pick<DiemDanh , 'class_session_id' | 'class_id' | 'hocsinh_id'> , queryParams? : IctuQueryParams ) : Observable<T[]> {
		const _ids : number[] = info.data?.map( ( _diemDanh : DiemDanh ) : number => _diemDanh[ key ] ) ?? [];
		if ( ! _ids.length ) {
			return of( [] );
		}
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString() }
		];
		const _queryParams : IctuQueryParams    = Object.assign( {
			limit      : this.dataTable.paginator.rows() ,
			paged      : 1 ,
			include    : _ids.join( ',' ) ,
			include_by : 'id'
		} , queryParams );
		return service.query( conditions , _queryParams ).pipe(
			map( ( response : DtoObject<T[]> ) : T[] => response.data )
		)
	}

	reload ( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData( this._temp.paged , this._temp.resetPaginator );
	}

	private loadBranchOptions () : Observable<CoSoDaoTao[]> {
		if ( this.branchOptions().length > 0 ) {
			return of( this.branchOptions() );
		}
		const queryParams : IctuQueryParams     = {
			limit      : 20 ,
			paged      : 1 ,
			include    : this.donViID ,
			include_by : 'donvi_id' ,
			order      : 'ASC' ,
			orderby    : 'ten' ,
			select     : 'id,ten,address'
		};
		const conditions : IctuConditionParam[] = [];
		return this.coSoDaoTaoService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<CoSoDaoTao[]> ) : CoSoDaoTao[] => {
				this.branchOptions.set( response.data );
				return this.branchOptions();
			} )
		);
	}

	private loadClasses () : Observable<AbsenceMakeupManagementRelatedClass[]> {
		if ( this.classes().length ) {
			return of( this.classes() );
		}
		else {
			const conditions : IctuConditionParam[] = [
				{ conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString() }
			];
			const _queryParams : IctuQueryParams    = {
				limit  : -1 ,
				paged  : 1 ,
				select : 'id,name,course_id,donvi_id,csdt_id,code,desc,teacher_ids,assistant_ids' ,
				with   : 'course,assistants,teachers'
			};
			return this.classesService.query( conditions , _queryParams ).pipe(
				map( ( response : DtoObject<Class[]> ) : AbsenceMakeupManagementRelatedClass[] => {
					this.classes.set( response.data );
					return this.classes();
				} )
			)
		}
	}

	private loadEmployees () : Observable<SimpleEmployee[]> {
		if ( this.employees().length ) {
			return of( this.employees() )
		}
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'donvi_id' , condition : IctuQueryCondition.greaterThanToEqualsTo , value : this.donViID.toString() }
		];
		const queryParams : IctuQueryParams     = {
			limit  : -1 ,
			paged  : 1 ,
			select : 'id,photo,department_id,user_id,email,phone,name,full_name,code,donvi_id,csdt_id,gender,dob,status'
		};
		return this.employeesService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<SimpleEmployee[]> ) : SimpleEmployee[] => {
				this.employees.set( response.data );
				return this.employees();
			} )
		)
	}

	onChangePage ( paged : number ) : void {
		this.loadData( paged , false );
	}

	btnChangeBranch ( branch : CoSoDaoTao ) : void {
		this.branchActive.set( branch );
	}

	protected avoidCloseMenuByClicking ( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
	}

	protected btnAddCommand ( action : AbsenceSupportCommandName , items : CheckIn[] ) : void {
		this.command.set( { action , items } );
		if ( items.length === 1 ) {
			this.highlightItemID.set( items[ 0 ].id );
		}
	}

	private rejectItems ( command : AbsenceSupportCommand ) : void {
		this.notification.confirm( {
			heading : 'Xác nhận hành động' ,
			message : `<p class="text-center f-roboto f-14 m-0">Bạn có chắc chắn muốn hủy yêu cầu học bổ trợ cho ${ command.items.length } học sinh không.</p>` ,
			buttons : [ BUTTON_YES , BUTTON_NO ]
		} ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( btn : ButtonBase ) : void => {
				if ( btn.name === BUTTON_YES.name ) {
					this.updateItems( { progress : -1 , deadline : null , assigned_teacher : 0 } );
				}
				else {
					this.closeUpdateProgress( false );
				}
			} ,
			error : () : void => {
			}
		} );
	}

	private updateItems ( info : SupportTeacherFormFields ) : void {
		this.syncItems.set( this.command().items );
		this.updateItemsSequentially( this.syncItems() , info ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( success : boolean ) : void => {
				if ( success ) {
					this.notification.toastSuccess( 'Thao tác thành công' );
				}
				this.closeUpdateProgress( true );
			} ,
			error : () : void => {
				this.closeUpdateProgress( true );
			}
		} );
	}

	private updateItemsSequentially ( list : CheckIn[] , info : SupportTeacherFormFields ) : Observable<boolean> {
		this.syncSuccessItemsCounter.set( 0 );
		return list.reduce( ( reducer : Observable<number> , item : CheckIn ) : Observable<number> => {
			return reducer.pipe(
				concatMap( ( complete : number ) : Observable<number> => {
					const _info : SupportTeacherFormFields = cloneDeep( info );
					if ( _info.deadline && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/gi.test( _info.deadline ) ) {
						_info.deadline = dayjs( _info.deadline ).format( 'YYYY-MM-DD' ) + ' 00:00:00';
					}
					return this.diemDanhService.update( item.id , _info ).pipe(
						map( () : number => ( 1 + complete ) ) ,
						catchError( () : Observable<number> => of( complete ) ) , // Nếu có lỗi, vẫn tiếp tục
						tap( ( totalComplete : number ) : void => {
							this.dataTable.data.update( ( list : IctuDataTableRow<CheckIn>[] ) : IctuDataTableRow<CheckIn>[] => {
								return [ ... list ].map( ( row : IctuDataTableRow<CheckIn> ) : IctuDataTableRow<CheckIn> => {
									if ( row.id === item.id ) {
										return {
											... row ,
											... info ,
											teacher     : info.assigned_teacher ? this.employees().find( ( e : SimpleEmployee ) : boolean => e.user_id === info.assigned_teacher ) : null ,
											lblDeadline : info.deadline ? dayjs( info.deadline ).format( 'DD/MM/YYYY' ) : ''
										}
									}
									return row;
								} );
							} );
							this.syncSuccessItemsCounter.set( totalComplete );
						} ) , // update counter
						delay( 100 )
					);
				} )
			);
		} , of( 0 ) ).pipe(
			map( ( totalCompleted : number ) : boolean => ( this.syncItems().length === totalCompleted ) )
		)
	}

	protected getControl<K extends keyof SupportTeacherFormFields> ( key : K ) : FormControl<SupportTeacherFormFields[K]> {
		return this.formGroup.controls[ key ];
	}

	protected registerExpiredDate ( date : Date ) : void {
		this.getControl( 'deadline' ).setValue( dayjs( date ).format( 'YYYY-MM-DD HH:mm:ss' ) );
		this.getControl( 'deadline' ).markAsTouched();
		this.calendarMenu().closeMenu();
	}

	private closeUpdateProgress ( dirty : boolean ) : void {
		this.visibleDialog = false;
		this.command.set( null );
		this.syncItems.set( [] );
		this.highlightItemID.set( 0 );
		if ( dirty ) {
			this.loadData( this._temp.paged , this._temp.resetPaginator );
		}
	}

	protected btnCloseDialog ( dirty : boolean ) : void {
		this.closeUpdateProgress( dirty );
	}

	protected btnSaveForm () : void {
		this.visibleDialog = false;
		if ( this.formGroup.valid ) {
			this.updateItems( this.formGroup.value as SupportTeacherFormFields )
		}
	}

	protected btnAddNewRequest () : void {
		this.notification.toastInfo( 'Chức năng chưa hoàn thiện. Vui lòng quay trở lại sau.' );
	}

	ngOnDestroy () : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
