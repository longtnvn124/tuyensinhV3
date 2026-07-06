import { Component , computed , inject , input , InputSignal , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { debounceTime , map , merge , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { AppState } from '@models/app-state';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { CommonModule , DatePipe , NgClass } from '@angular/common';
import { Tooltip } from 'primeng/tooltip';
import dayjs , { Dayjs } from 'dayjs';
import { ClassSession , ClassSessionCommand , ClassSessionRelative } from '@models/class-session';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import updateLocale from 'dayjs/plugin/updateLocale';
import isoWeek from 'dayjs/plugin/isoWeek';
import WeekOfYear from 'dayjs/plugin/weekOfYear';
import { ClassSessionService } from '@services/class-session.service';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { AuthenticationService } from '@services/authentication.service';
import { SysRoleName } from '@app/models/role';
import { PROVIDED_ROLE } from '@app/providers/admin-role.provider';
import { Router } from '@angular/router';
import { CoSoDaoTao } from '@app/models/co-so-dao-tao';
import { FormsModule , ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { CoSoDaoTaoService } from '@app/services/co-so-dao-tao.service';
import { NgScrollbar } from 'ngx-scrollbar';
import { ClassTimeSlotInfoPipe } from '@pages/admin/children/training-management/children/tm-calendar3/pipes/class-time-slot-info.pipe';
import { StudentAvatarPipe } from '@pipes/student-avatar.pipe';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu , MatMenuContent , MatMenuTrigger } from '@angular/material/menu';

type DateAssignmentViewMode = 'week' | 'month';

type DateAssignmentViewModeType = 'session' | 'default';

interface ClassSessionAssignment extends ClassSession {
	disabled? : boolean;
}

export interface TmCalendarDate {
	order : number; // day of week starts from 0 to 6
	slug : string; // DD-MM-YYYY
	date : Date;
	data : ClassSessionRelative[],
	isToday : boolean,
	visible : boolean
}

interface RegistrationApproval {
	object : ClassSessionAssignment;
	calendarRow : TmCalendarDate;
}

// Kích hoạt plugin updateLocale
dayjs.extend( updateLocale );
dayjs.extend( isoWeek );
dayjs.extend( WeekOfYear );

// Đặt ngày bắt đầu tuần là thứ Hai (Monday)
dayjs.updateLocale( 'en' , {
	weekStart : 1  // 1 = Monday
} );

@Component( {
	selector    : 'app-calendar-component' ,
	imports     : [ LoadingProgressComponent , DatePipe , Tooltip , NgClass , CommonModule , FormsModule , SelectModule , ReactiveFormsModule , NgScrollbar , ClassTimeSlotInfoPipe , StudentAvatarPipe , MatTooltip , MatMenu , MatMenuContent , MatMenuTrigger ] ,
	templateUrl : './calendar-component.html' ,
	styleUrl    : './calendar-component.css'
} )
export class CalendarComponent implements OnDestroy {

	private destroyed$ : Subject<void> = new Subject();

	protected readonly state : WritableSignal<AppState> = signal( 'loading' );

	readonly selectDate : WritableSignal<Date> = signal<Date>( new Date() );

	positions : InputSignal<string> = input.required<string>();

	private roleUsed : SysRoleName = inject( PROVIDED_ROLE );

	private router : Router = inject( Router );

	readonly weekDays : Signal<TmCalendarDate[]> = computed( () : TmCalendarDate[] => {
		return [ ... Array.from( { length : 7 } , ( _ : any , index : number ) : number => index ) ].reduce( ( reducer : TmCalendarDate[] , index : number ) : TmCalendarDate[] => {
				const _dayjs : Dayjs = dayjs( this.monday() ).add( index , 'days' );
				return [
					... reducer ,
					{
						order   : index ,
						data    : [] ,
						date    : _dayjs.toDate() ,
						slug    : _dayjs.format( 'DD-MM-YYYY' ) ,
						isToday : dayjs( new Date() ).format( 'DD-MM-YYYY' ) === _dayjs.format( 'DD-MM-YYYY' ) ,
						visible : true
					}
				];
			} ,
			new Array<TmCalendarDate>()
		);
	} );

	readonly monthDays : Signal<TmCalendarDate[]> = computed( () : TmCalendarDate[] => {
		const _firstDayOfMonth : Dayjs           = dayjs( this.selectDate() ).startOf( 'month' );
		const totalEmptyElements : number        = _firstDayOfMonth.weekday();
		const _fillEmptyDates : TmCalendarDate[] = Array.from<number>( { length : totalEmptyElements } ).fill( 0 ).reduce( ( reducer : TmCalendarDate[] , _ : number , index : number ) : TmCalendarDate[] => {
				const _dayjs : Dayjs = _firstDayOfMonth.subtract( totalEmptyElements - index , 'days' );
				return [
					... reducer ,
					{
						order   : -1 ,
						data    : [] ,
						date    : _dayjs.toDate() ,
						slug    : _dayjs.format( 'DD-MM-YYYY' ) ,
						isToday : false ,
						visible : false
					}
				];
			} ,
			new Array<TmCalendarDate>()
		);
		return [ ... _fillEmptyDates , ... Array.from( { length : dayjs( this.selectDate() ).daysInMonth() } , ( _ : any , index : number ) : number => index ).reduce( ( reducer : TmCalendarDate[] , index : number ) : TmCalendarDate[] => {
			const _dayjs : Dayjs = _firstDayOfMonth.add( index , 'days' );
			return [
				... reducer ,
				{
					order   : index ,
					data    : [] ,
					date    : _dayjs.toDate() ,
					slug    : _dayjs.format( 'DD-MM-YYYY' ) ,
					isToday : dayjs( new Date() ).format( 'DD-MM-YYYY' ) === _dayjs.format( 'DD-MM-YYYY' ) ,
					visible : true
				}
			];
		} , new Array<TmCalendarDate>() ) ];
	} );

	readonly viewMode : WritableSignal<DateAssignmentViewMode> = signal<DateAssignmentViewMode>( 'week' );

	readonly viewModeType : WritableSignal<DateAssignmentViewModeType> = signal<DateAssignmentViewModeType>( 'default' );

	readonly monday : Signal<Date> = computed( () : Date => {
		return dayjs( this.selectDate() ).startOf( 'isoWeek' ).toDate();
	} );

	readonly heading : Signal<string> = computed( () : string => {
		let suffix : string = '';
		if ( this.viewMode() === 'week' ) {
			suffix = `tuần ${ dayjs( this.monday() ).week() } (${ dayjs( this.monday() ).format( 'DD/MM/YYYY' ) } - ${ dayjs( this.monday() ).add( 6 , 'days' ).format( 'DD/MM/YYYY' ) })`;
		} else {
			suffix = `tháng ${ 1 + this.selectDate().getMonth() } năm ${ this.selectDate().getFullYear() } `;
		}
		return `Lịch học ${ suffix }`;
	} );

	private classSessionService : ClassSessionService = inject<ClassSessionService>( ClassSessionService );

	private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

	private auth : AuthenticationService = inject<AuthenticationService>( AuthenticationService );

	get userID() : number {
		return this.auth.user.id;
	}

	get donViID() : number {
		return this.auth.user?.donvi_id ?? 0;
	}

	get userBranchID() : number {
		return this.auth.employee?.csdt_id ?? 0;
	}

	protected readonly branches : WritableSignal<CoSoDaoTao[]> = signal<CoSoDaoTao[]>( [] );

	protected selectedBranch : WritableSignal<CoSoDaoTao> = signal<CoSoDaoTao>( null );

	protected readonly selectedBranchID : Signal<number> = computed( () : number => this.selectedBranch()?.id ?? this.userBranchID );

	constructor() {
		merge(
			toObservable<Date>( this.selectDate ) ,
			toObservable<DateAssignmentViewMode>( this.viewMode )
		).pipe(
			takeUntilDestroyed() ,
			debounceTime( 100 )
		).subscribe( () : void => {
			this.loadData();
		} );
	}

	protected btnSetViewMode( mode : DateAssignmentViewMode ) : void {
		this.viewMode.set( mode );
	}

	protected btnSetViewModeType( mode : DateAssignmentViewModeType ) : void {
		this.viewModeType.set( mode );
	}

	protected btnNextDate() : void {
		this.selectDate.update( ( selectDate : Date ) : Date => {
			const _dayJs : Dayjs = dayjs( selectDate );
			return this.viewMode() === 'week' ? _dayJs.add( 1 , 'week' ).toDate() : _dayJs.add( 1 , 'month' ).toDate();
		} );
	}

	protected btnPrevDate() : void {
		this.selectDate.update( ( selectDate : Date ) : Date => {
			const _dayJs : Dayjs = dayjs( selectDate );
			return this.viewMode() === 'week' ? _dayJs.subtract( 1 , 'week' ).toDate() : _dayJs.subtract( 1 , 'month' ).toDate();
		} );
	}

	protected btnResetToCurrentDate() : void {
		this.selectDate.set( new Date() );
	}

	private preload() : Observable<CoSoDaoTao> {
		const loadBranches : Observable<CoSoDaoTao[]> = this.branches().length ? of( this.branches() ) : this.coSoDaoTaoService.load( '' , this.donViID , { limit : -1 , paged : 1 } ).pipe( map( ( response : DtoObject<CoSoDaoTao[]> ) : CoSoDaoTao[] => {
			this.branches.set( response.data );
			return this.branches();
		} ) );
		return loadBranches.pipe(
			map( ( branches : CoSoDaoTao[] ) : CoSoDaoTao => {
				if ( !this.selectedBranch() && branches.length ) {
					const myBranch : CoSoDaoTao = branches.find( ( item : CoSoDaoTao ) : boolean => item.id == this.userBranchID );
					this.selectedBranch.set( myBranch ?? branches[ 0 ] );
				}
				return this.selectedBranch();
			} )
		);
	}

	private loadClassSession( filterByBranchID : number ) : Observable<ClassSessionRelative[]> {
		const queryParams : IctuQueryParams                                      = {
			include    : this.donViID ,
			include_by : 'donvi_id' ,
			limit      : -1 ,
			paged      : 1 ,
			with       : 'room,class,teacher,assistants,hocsinh,parent_class'
		};
		const filterByPosition : 'teacher_id' | 'assistant_id'                   = this.positions() == 'TA' ? 'assistant_id' : 'teacher_id';
		const _arrDays : TmCalendarDate[]                                        = this.viewMode() === 'week' ? this.weekDays() : this.monthDays();
		const { timeStart , timeEnd } : { timeStart : string, timeEnd : string } = _arrDays.filter( ( date : TmCalendarDate ) : boolean => date.visible ).reduce( ( reducer : { timeStart : string, timeEnd : string } , d : TmCalendarDate ) : { timeStart : string, timeEnd : string } => {
			if ( !reducer.timeStart ) {
				reducer.timeStart = `${ dayjs( d.date ).format( 'YYYY-MM-DD' ) } 00:00:00`;
			} else {
				reducer.timeEnd = `${ dayjs( d.date ).format( 'YYYY-MM-DD' ) } 23:59:00`;
			}
			return reducer;
		} , { timeStart : '' , timeEnd : '' } );

		const conditions : IctuConditionParam[] = [
			{ conditionName : filterByPosition , condition : IctuQueryCondition.equal , value : this.auth.user.id.toString() } ,
			{ conditionName : 'time_start' , condition : IctuQueryCondition.greaterThanToEqualsTo , value : timeStart , orWhere : 'and' } ,
			{ conditionName : 'time_end' , condition : IctuQueryCondition.lessThanOrEqualsTo , value : timeEnd , orWhere : 'and' } ,
			{ conditionName : 'csdt_id' , condition : IctuQueryCondition.equal , value : filterByBranchID.toString() , orWhere : 'and' }
		];
		return this.classSessionService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassSession[]> ) : ClassSessionRelative[] => response.data as ClassSessionRelative[] )
		);
	}

	private loadData() : void {
		this.state.set( 'loading' );
		this.preload().pipe(
			takeUntil( this.destroyed$ ) ,
			switchMap( () : Observable<ClassSessionRelative[]> => this.loadClassSession( this.selectedBranchID() ) )
		).subscribe( {
			next  : ( data : ClassSessionRelative[] ) : void => {
				if ( this.viewMode() == 'week' ) {
					for ( let _dayInWeek of this.weekDays() ) {
						_dayInWeek.data = data.filter( ( classSession : ClassSessionRelative ) : boolean => classSession.time_start && dayjs( classSession.time_start ).format( 'DD-MM-YYYY' ) === dayjs( _dayInWeek.date ).format( 'DD-MM-YYYY' ) );
					}
				} else {
					for ( let _date of this.monthDays() ) {
						_date.data = data.filter( ( classSession : ClassSessionRelative ) : boolean => classSession.time_start && dayjs( classSession.time_start ).format( 'DD-MM-YYYY' ) === dayjs( _date.date ).format( 'DD-MM-YYYY' ) );
					}
				}
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.state.set( 'error' );
			}
		} );
	}

	reload( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData();
	}

	protected getToClassProgress( session : ClassSession ) : void {
		const command : ClassSessionCommand = {
			id       : session.id ,
			class_id : Math.max( session.class_id , session.parent_class_id ) ,
			role     : this.roleUsed ,
			userId   : this.auth.user.id
		};
		void this.router.navigate( [ 'class-progress' ] , {
			queryParams : {
				hashcode : this.auth.encrypt( JSON.stringify( command ) ) ,
				viewer   : 'by_'.concat( this.roleUsed )
			}
		} );
	}

	getCalendarSession( weekDay : TmCalendarDate , time_slot_order : number ) : ClassSession[] {
		return weekDay.data.filter( ( item : ClassSessionRelative ) : boolean => item.time_slot_order === time_slot_order );
	}

	onSelectBranch() : void {
		this.loadData();
	}

	protected avoidCloseMenuByClicking( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
