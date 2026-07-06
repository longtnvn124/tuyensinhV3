import { Component , computed , inject , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { ClassSession } from '@models/class-session';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { AppState } from '@models/app-state';
import { MatTooltip } from '@angular/material/tooltip';
import { WeekDate } from '@models/ictu-schedule';
import dayjs from '@setup/dayjs';
import { NgClass , NgTemplateOutlet } from '@angular/common';
import { filter , map , merge , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { ClassSessionService } from '@services/class-session.service';
import { AmsParent , AuthenticationService } from '@services/authentication.service';
import { HocSinh } from '@models/hoc-sinh';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { map as _map , filter as _filter , find as _find } from 'lodash-es';
import { HocSinhLopHoc } from '@models/hoc-sinh-lop-hoc';
import { HocSinhLopHocService } from '@services/hoc-sinh-lop-hoc.service';
import { ClassTimeSlotInfoPipe } from '@pages/admin/children/training-management/children/tm-calendar3/pipes/class-time-slot-info.pipe';
import { BaseEmployeeInfo } from '@models/employee';
import { CoSoDaoTao } from '@models/co-so-dao-tao';
import { Class } from '@models/class';
import { ClassesService } from '@services/classes.service';
import { StudentAvatarPipe } from '@pipes/student-avatar.pipe';
import { MatMenu , MatMenuContent , MatMenuTrigger } from '@angular/material/menu';
import { isDateInRange } from '@utilities/helper';

export type ViewMode = 'week' | 'month';

interface ScheduleClassSession extends ClassSession {
	className : string;
	teacher : BaseEmployeeInfo,
	assistants : BaseEmployeeInfo,
	children : HocSinh[],
	timeSlots : CoSoDaoTao['time_slots']
}

type MonthGridRow = WeekDate<ScheduleClassSession>[];

interface MonthGrid {
	rows : MonthGridRow[],
	start : Date,
	end : Date
}

interface ClassExtend extends Pick<Class , 'id' | 'course_id' | 'name' | 'csdt_id'> {
	csdt : Pick<CoSoDaoTao , 'id' | 'time_slots' | 'ten'>;
}

type ClassStudent = Pick<HocSinhLopHoc , 'id' | 'class_id' | 'status' | 'hocsinh_id'>

function date2Slug( date : Date | string ) : string {
	return dayjs( date ).format( 'DD-MM-YYYY' );
}

const TO_DAY_SLUG : string = date2Slug( new Date() );

function isToday( date : Date ) : boolean {
	return date2Slug( date ) === TO_DAY_SLUG;
}

function getMonday( d : Date ) : Date {
	const date          = new Date( d );
	const day : number  = date.getDay(); // 0=Sun
	const diff : number = day === 0 ? -6 : 1 - day;
	date.setDate( date.getDate() + diff );
	date.setHours( 0 , 0 , 0 , 0 );
	return date;
}

function addDays( d : Date , n : number ) : Date {
	const r = new Date( d );
	r.setDate( r.getDate() + n );
	return r;
}

function getMonthDateRange( year : number , month : number ) : { start : Date; end : Date } {
	const start = new Date( year , month - 1 , 1 );
	const end   = new Date( year , month , 0 ); // last day of month
	return { start , end };
}

function getWeekDays( baseDate : Date ) : Date[] {
	const mon : Date = getMonday( baseDate );
	return Array.from( { length : 7 } , ( _ : unknown , i : number ) : Date => addDays( mon , i ) );
}

function getMonthGrid( year : number , month : number ) : MonthGrid {
	const { start , end }       = getMonthDateRange( year , month );
	const startDow : number     = start.getDay() === 0 ? 6 : start.getDay() - 1; // Mon=0
	const totalCells : number   = Math.ceil( ( startDow + end.getDate() ) / 7 ) * 7;
	const rows : MonthGridRow[] = [];
	let row : MonthGridRow      = [];
	let current : Date          = new Date( start );
	current.setDate( current.getDate() - startDow );
	for ( let i : number = 0 ; i < totalCells ; i++ ) {
		row.push( {
			order   : current.getDay() ,
			slug    : date2Slug( current ) ,
			date    : dayjs( current ).toDate() ,
			data    : [] ,
			isToday : isToday( current ) ,
			visible : isDateInRange( current , start , end )
		} );
		current.setDate( current.getDate() + 1 );
		if ( row.length === 7 ) {
			rows.push( row );
			row = [];
		}
	}
	return { rows , start , end };
}

@Component( {
	selector    : 'app-parent-schedule' ,
	imports     : [ LoadingProgressComponent , MatTooltip , NgTemplateOutlet , ClassTimeSlotInfoPipe , StudentAvatarPipe , NgClass , MatMenu , MatMenuContent , MatMenuTrigger ] ,
	templateUrl : './parent-schedule.component.html' ,
	styleUrl    : './parent-schedule.component.css'
} )
export default class ParentScheduleComponent implements OnDestroy {

	readonly viewMode : WritableSignal<ViewMode> = signal<ViewMode>( 'week' );

	protected readonly prefix : Signal<string> = computed( () : string => `Lịch ${ this.viewMode() === 'week' ? 'tuần' : 'tháng' }` );

	readonly referenceDate : WritableSignal<Date> = signal<Date>( this.today() );

	private classesService : ClassesService = inject( ClassesService );

	private classSessionService : ClassSessionService = inject( ClassSessionService );

	private readonly hocSinhLopHocService : HocSinhLopHocService = inject( HocSinhLopHocService );

	private auth : AuthenticationService = inject( AuthenticationService );

	readonly heading : Signal<string> = computed( () : string => {
		const ref : Date     = this.referenceDate();
		const month : number = ref.getMonth() + 1;
		const year : number  = ref.getFullYear();
		if ( this.viewMode() === 'week' ) {
			const weekDays : Date[] = getWeekDays( ref );
			const start : Date      = weekDays[ 0 ];
			const end : Date        = weekDays[ 6 ];
			return `Lịch học từ ngày ${ start.getDate().toString( 10 ).padStart( 2 , '0' ) } đến ngày ${ end.getDate().toString( 10 ).padStart( 2 , '0' ) } tháng ${ month.toString( 10 ).padStart( 2 , '0' ) } năm ${ year }`;
		}
		return `Lịch học tháng ${ month.toString( 10 ).padStart( 2 , '0' ) } năm ${ year }`;
	} );

	readonly weekDays : WritableSignal<WeekDate<ScheduleClassSession>[]> = signal( this.createWeekDays() );

	readonly monthGrid : WritableSignal<MonthGrid> = signal( this.createMonthGrid() );

	readonly monthGridRows : Signal<MonthGridRow[]> = computed( () : MonthGridRow[] => this.monthGrid()?.rows || [] );

	protected readonly state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	private sessionID : WritableSignal<number> = signal( 0 );

	private destroyed$ : Subject<void> = new Subject<void>();

	private loadDataObserver : Subject<number> = new Subject<number>();

	private students : WritableSignal<HocSinh[]> = signal( [] );

	private classStudents : ClassStudent[] = [];

	private classes : ClassExtend[] = [];

	constructor() {
		this.loadDataObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this._loadData();
		} );

		merge(
			toObservable( this.referenceDate ) ,
			toObservable( this.viewMode )
		).pipe(
			takeUntilDestroyed() ,
			filter( () : boolean => this.students().length > 0 )
		).subscribe( () : void => {
			this.callLoadData();
		} );

		this.auth.onParentSetup.pipe(
			takeUntilDestroyed()
		).subscribe( ( p : AmsParent ) : void => {
			this.students.set( p?.hocsinhs || [] );
			this.callLoadData();
		} );
	}

	private createWeekDays() : WeekDate<ScheduleClassSession>[] {
		return getWeekDays( this.referenceDate() ).map( ( _date : Date ) : WeekDate<ScheduleClassSession> => ( {
			order   : _date.getDay() ,
			slug    : date2Slug( _date ) ,
			date    : _date ,
			data    : [] ,
			isToday : isToday( _date ) ,
			visible : true
		} ) );
	}

	private createMonthGrid() : MonthGrid {
		const ref : Date = this.referenceDate();
		return getMonthGrid( ref.getFullYear() , ref.getMonth() + 1 );
	}

	private today() : Date {
		const d = new Date();
		d.setHours( 0 , 0 , 0 , 0 );
		return d;
	}

	protected setViewMode( mode : ViewMode ) : void {
		this.viewMode.set( mode );
		this.goToday();
	}

	protected goToday() : void {
		this.referenceDate.set( this.today() );
	}

	protected goBack() : void {
		const ref : Date = this.referenceDate();
		if ( this.viewMode() === 'week' ) {
			this.referenceDate.set( addDays( ref , -7 ) );
		} else {
			const d = new Date( ref );
			d.setMonth( d.getMonth() - 1 );
			this.referenceDate.set( d );
		}
	}

	protected goForward() : void {
		const ref : Date = this.referenceDate();
		if ( this.viewMode() === 'week' ) {
			this.referenceDate.set( addDays( ref , 7 ) );
		} else {
			const d = new Date( ref );
			d.setMonth( d.getMonth() + 1 );
			this.referenceDate.set( d );
		}
	}

	protected preventUserFromClosingMenu( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
	}

	protected btnReload( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.callLoadData();
	}

	private increateSessionID() : void {
		this.sessionID.update( ( id : number ) : number => 1 + id );
	}

	private _loadData() : void {
		if ( this.students().length ) {
			this.state.set( 'loading' );
			if ( this.viewMode() === 'week' ) {
				this.weekDays.set( this.createWeekDays() );
			} else {
				this.monthGrid.set( this.createMonthGrid() );
			}
			this.getStudentClasses().pipe(
				takeUntil( this.destroyed$ ) ,
				switchMap( ( _classes : ClassExtend[] ) : Observable<ClassSession[]> => _classes.length ? this.loadClassSession( _map( _classes , 'id' ) ) : of( [] ) )
			).subscribe( {
				next  : ( sessions : ClassSession[] ) : void => {
					const clasIDs : number[]                             = [ ... new Set( _map( this.classStudents , 'class_id' ) ) ];
					const classStudentMap : Map<number , HocSinh[]>      = clasIDs.reduce( ( reducer : Map<number , HocSinh[]> , _classID : number ) : Map<number , HocSinh[]> => {
						const _studentIDs : number[] = _map( _filter<ClassStudent>( this.classStudents , { class_id : _classID } ) , 'hocsinh_id' );
						reducer.set( _classID , _filter( this.students() , ( _s : HocSinh ) : boolean => _studentIDs.includes( _s.id ) ) );
						return reducer;
					} , new Map<number , HocSinh[]>() );
					const scheduleClassSessions : ScheduleClassSession[] = _map( sessions , ( _s : ClassSession ) : ScheduleClassSession => {
						const _class : ClassExtend = _find( this.classes , { id : _s.class_id } );
						return {
							... _s ,
							className  : _class?.name || 'Unknown' ,
							teacher    : _s[ 'teacher' ] ,
							assistants : _s[ 'assistants' ] ,
							children   : classStudentMap.has( _s.class_id ) ? classStudentMap.get( _s.class_id ) : [] ,
							timeSlots  : _class?.csdt?.time_slots || []
						};
					} );
					if ( this.viewMode() === 'week' ) {
						// this.weekDays.set( this.createWeekDays( scheduleClassSessions ) );
						this.weekDays.update( ( schedule : WeekDate<ScheduleClassSession>[] ) : WeekDate<ScheduleClassSession>[] => {
							return _map( schedule , ( day : WeekDate<ScheduleClassSession> ) : WeekDate<ScheduleClassSession> => ( { ... day , data : _filter( scheduleClassSessions , ( s : ScheduleClassSession ) : boolean => date2Slug( s.time_start ) === date2Slug( day.date ) ) } ) );
						} );
					} else {
						this.monthGrid.update( ( monGrid : MonthGrid ) : MonthGrid => {
							return {
								... monGrid ,
								rows : monGrid.rows.map( ( row : MonthGridRow ) : MonthGridRow => {
									return _map( row , ( day : WeekDate<ScheduleClassSession> ) : WeekDate<ScheduleClassSession> => ( {
										... day ,
										data : _filter( scheduleClassSessions , ( s : ScheduleClassSession ) : boolean => date2Slug( s.time_start ) === date2Slug( day.date ) )
									} ) );
								} )
							};
						} );
					}
					this.increateSessionID();
					this.state.set( 'success' );
				} ,
				error : () : void => {
					this.increateSessionID();
					this.state.set( 'error' );
				}
			} );
		} else {
			this.state.set( 'success' );
		}
	}

	private loadClassSession( classIDs : number[] ) : Observable<ClassSession[]> {
		const [ start , end ] : [ Date , Date ] = this.viewMode() === 'week' ? [ this.weekDays()[ 0 ].date , this.weekDays()[ 6 ].date ] : [ this.monthGrid().start , this.monthGrid().end ];
		const conditions : IctuConditionParam[] = [
			{
				conditionName : 'time_start' ,
				condition     : IctuQueryCondition.greaterThanToEqualsTo ,
				value         : dayjs( start ).format( 'YYYY-MM-DD 00:00:00' )
			} ,
			{
				conditionName : 'time_end' ,
				condition     : IctuQueryCondition.lessThanOrEqualsTo ,
				value         : dayjs( end ).format( 'YYYY-MM-DD 23:59:59' ) ,
				orWhere       : 'and'
			}
		];
		const queryParams : IctuQueryParams     = {
			paged      : 1 ,
			limit      : -1 ,
			include    : classIDs.join( ',' ) ,
			include_by : 'class_id' ,
			with       : 'class,room,teacher,assistants'
		};
		return this.classSessionService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassSession[]> ) : ClassSession[] => response.data )
		);
	}

	private getStudentClasses() : Observable<ClassExtend[]> {
		if ( this.classes.length ) {
			return of( this.classes );
		}
		return this.getClassStudents().pipe(
			switchMap( ( classStudents : HocSinhLopHoc[] ) : Observable<Class[]> => {
				if ( !classStudents.length ) {
					return of( [] );
				}
				const conditions : IctuConditionParam[] = [];
				const queryParams : IctuQueryParams     = {
					include    : [ ... new Set( _map( classStudents , 'class_id' ) ) ].join( ',' ) ,
					include_by : 'id' ,
					select     : 'id,course_id,name,csdt_id' ,
					with       : 'csdt'
				};
				return this.classesService.query( conditions , queryParams ).pipe(
					map( ( response : DtoObject<Class[]> ) : Class[] => response.data )
				);
			} ) ,
			map( ( _classes : Class[] ) : ClassExtend[] => {
				this.classes = _map( _classes , ( _class : Class ) : ClassExtend => ( {
					... _class ,
					csdt : _class[ 'csdt' ]
				} ) );
				return this.classes;
			} )
		);
	}

	private getClassStudents() : Observable<ClassStudent[]> {
		if ( this.classStudents.length ) {
			return of( this.classStudents );
		}
		const studentIDs : number[]             = _map( this.students() , 'id' );
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'status' , condition : IctuQueryCondition.equal , value : '1' }
		];
		const queryParams : IctuQueryParams     = {
			include    : studentIDs.join( ',' ) ,
			include_by : 'hocsinh_id' ,
			select     : 'id,class_id,status,hocsinh_id'
		};
		return this.hocSinhLopHocService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<HocSinhLopHoc[]> ) : ClassStudent[] => {
				this.classStudents = response.data;
				return this.classStudents;
			} )
		);
	}

	private callLoadData() : void {
		this.loadDataObserver.next( this.sessionID() );
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
