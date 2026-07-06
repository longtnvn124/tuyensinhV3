import { Component , computed , inject , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { DatePipe , NgClass , NgTemplateOutlet } from '@angular/common';
import { Dialog } from 'primeng/dialog';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButton } from '@angular/material/button';
import { MatMenu , MatMenuContent , MatMenuItem , MatMenuTrigger } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { Tooltip } from 'primeng/tooltip';
import { Dayjs } from 'dayjs';
import { AuthenticationService } from '@services/authentication.service';
import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';
import { ClassSessionService } from '@services/class-session.service';
import { debounceTime , forkJoin , map , merge , Observable , of , Subject , switchMap , takeUntil , timer } from 'rxjs';
import { AppState } from '@models/app-state';
import { CoSoDaoTao } from '@models/co-so-dao-tao';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { ClassSession , ClassSessionFitter , ClassSessionHocSinh , ClassSessionRelative } from '@models/class-session';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { filter } from 'rxjs/operators';
import { ClassTimeSlotInfoPipe } from '@pages/admin/children/training-management/children/tm-calendar3/pipes/class-time-slot-info.pipe';
import { TmFormEditClassSessionComponent } from '@pages/admin/children/training-management/children/tm-form-edit-class-session/tm-form-edit-class-session.component';
import { MatProgressBar } from '@angular/material/progress-bar';
import dayjs from '@setup/dayjs';
import { Employee } from '@models/employee';
import { NgScrollbar } from 'ngx-scrollbar';
import { StudentAvatarPipe } from '@pipes/student-avatar.pipe';
import { MatTooltip } from '@angular/material/tooltip';
import { HocSinh } from '@app/models/hoc-sinh';
import { IctuDataTable2 } from '@app/models/datatable';
import { HocSinhSearchInfo , HocSinhService } from '@app/services/hoc-sinh.service';
import { IctuPaginatorComponent } from '@app/theme/components/ictu-paginator/ictu-paginator.component';
import { MatCheckbox } from '@angular/material/checkbox';
import { InputText } from 'primeng/inputtext';
import { HocSinhLopHocService } from '@app/services/hoc-sinh-lop-hoc.service';
import { DiemDanhService } from '@app/services/diem-danh.service';
import { ClassesService } from '@app/services/classes.service';
import { NotificationService } from '@app/services/notification.service';
import { WeekDate } from '@models/ictu-schedule';

export interface TmCalendarDate extends WeekDate<ClassSessionRelative> {}

type TmCalendarViewMode = 'week' | 'month';

const sortClassSessionByAscending : ( data : ClassSessionRelative[] ) => ClassSessionRelative[] = ( data : ClassSessionRelative[] ) : ClassSessionRelative[] => {
	return data.sort( ( a : ClassSessionRelative , b : ClassSessionRelative ) : number => {
		const _dateA : Date = new Date( a.time_start );
		const _dateB : Date = new Date( b.time_start );
		return _dateA.getTime() - _dateB.getTime();
	} );
};

type TMCalendarEventName = 'EDIT_CLASS_SESSION' | 'RESCHEDULE';

interface TMCalendarEvent {
	classSessionID : number;
	name : TMCalendarEventName;
}

interface ChangeObjectStatusEvent {
	object : ClassSessionRelative,
	status : number
}

interface ClassSessionHocSinhExtra extends ClassSessionHocSinh {
	isAttendance : boolean;
}

interface ClassSessionExtra extends ClassSession {
	extra_students : ClassSessionHocSinh[];
}

type TypeViewDialog = 'all' | 'current';

@Component( {
	selector    : 'app-tm-calendar3' ,
	imports     : [ LoadingProgressComponent , DatePipe , NgClass , Tooltip , FormsModule , Dialog , MatMenu , MatMenuItem , MatMenuTrigger , MatButton , NgTemplateOutlet , ClassTimeSlotInfoPipe , TmFormEditClassSessionComponent , MatProgressBar , NgScrollbar , MatMenuContent , StudentAvatarPipe , MatTooltip , IctuPaginatorComponent , MatCheckbox , InputText ] ,
	templateUrl : './tm-calendar3.component.html' ,
	styleUrl    : './tm-calendar3.component.css'
} )
export default class TmCalendar3Component implements OnDestroy {

	private auth : AuthenticationService = inject( AuthenticationService );

	private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

	private classSessionService : ClassSessionService = inject( ClassSessionService );

	private hocsinhService : HocSinhService = inject( HocSinhService );

	private classStudentService : HocSinhLopHocService = inject( HocSinhLopHocService );

	private diemdanhService : DiemDanhService = inject( DiemDanhService );

	private classService : ClassesService = inject( ClassesService );

	private notification : NotificationService = inject( NotificationService );

	private destroyed$ : Subject<void> = new Subject<void>();

	get donViID() : number {
		return this.auth.user.donvi_id;
	}

	readonly state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	readonly state_dialog : WritableSignal<AppState> = signal<AppState>( 'loading' );

	readonly type_view_dialog : WritableSignal<TypeViewDialog> = signal<TypeViewDialog>( 'current' );

	readonly listAgent : WritableSignal<CoSoDaoTao[]> = signal<CoSoDaoTao[]>( [] );

	readonly activeAgent : WritableSignal<CoSoDaoTao> = signal<CoSoDaoTao>( null );

	readonly activeClassSession : WritableSignal<ClassSession> = signal<ClassSession>( null );

	readonly activeAgentName : Signal<string> = computed( () : string => this.activeAgent() ? this.activeAgent().ten : 'Chọn cơ sở đào tạo' );

	readonly selectDate : WritableSignal<Date> = signal<Date>( new Date() );

	readonly weekDays : WritableSignal<TmCalendarDate[]> = signal<TmCalendarDate[]>( [] );

	protected monthDays : WritableSignal<TmCalendarDate[]> = signal<TmCalendarDate[]>( [] );

	readonly viewMode : WritableSignal<TmCalendarViewMode> = signal<TmCalendarViewMode>( 'week' );

	public dataTable_hoc_sinh : IctuDataTable2<HocSinh> = new IctuDataTable2<HocSinh>();

	public dataTable_extra_hoc_sinh : IctuDataTable2<ClassSessionHocSinhExtra> = new IctuDataTable2<ClassSessionHocSinhExtra>();

	readonly monday : Signal<Date> = computed( () : Date => {
		return dayjs( this.selectDate() ).startOf( 'isoWeek' ).toDate();
	} );

	readonly heading : Signal<string> = computed( () : string => {
		let suffix : string = '';
		if ( this.viewMode() === 'week' ) {
			suffix = `tuần ${ dayjs( this.monday() ).week() } (${ dayjs( this.monday() ).format( 'DD/MM/YYYY' ) } - ${ dayjs( this.monday() ).add( 6 , 'days' ).format( 'DD/MM/YYYY' ) })`;
		} else {
			suffix = `tháng ${ ( 1 + this.selectDate().getMonth() ) } năm ${ this.selectDate().getFullYear() } `;
		}
		return `Lịch học ${ suffix }`;
	} );

	searchInfoAddHS : HocSinhSearchInfo = {
		search : ''
	};

	visibleDialog : boolean = false;

	private readonly loadDataObserver : Subject<void> = new Subject<void>();

	protected visibleEditClassSessionDialog : boolean = false;

	private readonly _selectDateObserver : Observable<Date> = toObservable<Date>( this.selectDate );

	private readonly _viewModeObserver : Observable<TmCalendarViewMode> = toObservable<TmCalendarViewMode>( this.viewMode );

	protected readonly updateClassSession : WritableSignal<TmCalendarDate> = signal<TmCalendarDate>( null );

	private readonly updateClassSessionObserver : Observable<TmCalendarDate> = toObservable<TmCalendarDate>( this.updateClassSession );

	public employeeStore : Employee[] = [];

	protected readonly weekDayNumbers : Signal<number[]> = signal( [ 0 , 1 , 2 , 3 , 4 , 5 , 6 ] );

	readonly calendarEvent : WritableSignal<TMCalendarEvent> = signal( null );

	readonly selectedClassSessionID : Signal<number> = computed( () : number => this.calendarEvent()?.classSessionID ?? 0 );

	private changeObjectStatusEventObserver : Subject<ChangeObjectStatusEvent> = new Subject<ChangeObjectStatusEvent>();

	constructor() {
		toObservable<Date>( this.monday ).pipe(
			takeUntilDestroyed() ,
			filter( () : boolean => this.viewMode() === 'week' )
		).subscribe( ( monday : Date ) : void => {
			this.weekDays.set( this.buildWeekDaysList( monday ) );
		} );

		this._selectDateObserver.pipe(
			takeUntilDestroyed() ,
			filter( () : boolean => this.viewMode() === 'month' )
		).subscribe( ( firstDayOfMonth : Date ) : void => {
			this.monthDays.set( this.buildMonthDaysList( firstDayOfMonth ) );
		} );

		this.updateClassSessionObserver.pipe(
			takeUntilDestroyed() ,
			map( ( data : TmCalendarDate ) : boolean => !!data )
		).subscribe( ( visible : boolean ) : void => {
			this.visibleEditClassSessionDialog = visible;
		} );

		merge<any>( this._selectDateObserver , this._viewModeObserver ).pipe(
			takeUntilDestroyed() ,
			debounceTime( 100 )
		).subscribe( () : void => {
			this.loadData();
		} );

		toObservable( this.calendarEvent ).pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 ) ,
			filter( ( event : TMCalendarEvent ) : boolean => [ 'RESCHEDULE' , 'EDIT_CLASS_SESSION' ].includes( event?.name ) && !this.visibleEditClassSessionDialog )
		).subscribe( () : void => {
			this.visibleEditClassSessionDialog = true;
		} );

		this.changeObjectStatusEventObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 )
		).subscribe( ( event : ChangeObjectStatusEvent ) : void => {
			this.updateObjectStatus( event );
		} );
	}

	private buildWeekDaysList( monday : Date ) : TmCalendarDate[] {
		return [ ... Array.from( { length : 7 } , ( _ : any , index : number ) : number => index ) ].reduce( ( reducer : TmCalendarDate[] , index : number ) : TmCalendarDate[] => {
			const _dayjs : Dayjs = dayjs( monday ).add( index , 'days' );
			return [ ... reducer , {
				order   : index ,
				data    : [] ,
				date    : _dayjs.toDate() ,
				slug    : _dayjs.format( 'DD-MM-YYYY' ) ,
				isToday : dayjs( new Date() ).format( 'DD-MM-YYYY' ) === _dayjs.format( 'DD-MM-YYYY' ) ,
				visible : true
			} ];
		} , new Array<TmCalendarDate>() );
	}

	private buildMonthDaysList( monday : Date ) : TmCalendarDate[] {
		const _firstDayOfMonth : Dayjs           = dayjs( monday ).startOf( 'month' );
		const totalEmptyElements : number        = _firstDayOfMonth.weekday();
		const _fillEmptyDates : TmCalendarDate[] = Array.from<number>( { length : totalEmptyElements } ).fill( 0 ).reduce( ( reducer : TmCalendarDate[] , _ : number , index : number ) : TmCalendarDate[] => {
			const _dayjs : Dayjs = _firstDayOfMonth.subtract( ( totalEmptyElements - index ) , 'days' );
			return [ ... reducer , {
				order   : -1 ,
				data    : [] ,
				date    : _dayjs.toDate() ,
				slug    : _dayjs.format( 'DD-MM-YYYY' ) ,
				isToday : false ,
				visible : false
			} ];
		} , new Array<TmCalendarDate>() );
		return [
			... _fillEmptyDates ,
			... Array.from( { length : dayjs( monday ).daysInMonth() } , ( _ : any , index : number ) : number => index ).reduce( ( reducer : TmCalendarDate[] , index : number ) : TmCalendarDate[] => {
				const _dayjs : Dayjs     = _firstDayOfMonth.add( index , 'days' );
				const _dateSlug : string = _dayjs.format( 'DD-MM-YYYY' );
				return [ ... reducer , {
					order   : index ,
					data    : [] ,
					date    : _dayjs.toDate() ,
					slug    : _dateSlug ,
					isToday : dayjs( new Date() ).format( 'DD-MM-YYYY' ) === _dateSlug ,
					visible : true
				} ];
			} , new Array<TmCalendarDate>() )
		];
	}

	private loadData() : void {
		this.state.set( 'loading' );
		this.loadDataObserver.next();
		this.filterByAgent().pipe(
			takeUntil( merge( this.loadDataObserver , this.destroyed$ ) ) ,
			switchMap( ( branchID : number ) : Observable<ClassSession[]> => this.loadSession( branchID ) ) ,
			map( ( response : ClassSession[] ) : ClassSessionRelative[] => response.map( ( item : ClassSession ) : ClassSessionRelative => {
				return {
					... item ,
					assistants    : item[ 'assistants' ] ?? null ,
					course_lesson : item[ 'course_lesson' ] ?? null ,
					class         : item[ 'class' ] ?? null ,
					room          : item[ 'room' ] ?? null ,
					teacher       : item[ 'teacher' ] ?? null
				};
			} ) )
		).subscribe( {
			next  : ( response : ClassSessionRelative[] ) : void => {
				if ( this.viewMode() === 'week' ) {
					this.weekDays.update( () : TmCalendarDate[] => {
						const data : TmCalendarDate[] = this.buildWeekDaysList( this.monday() );
						response.forEach( ( _session : ClassSessionRelative ) : void => {
							const _index : number = data.findIndex( ( o : TmCalendarDate ) : boolean => o.slug === dayjs( _session.time_start ).format( 'DD-MM-YYYY' ) );
							if ( _index !== -1 ) {
								data[ _index ].data.push( _session );
							}
						} );
						return data.map( ( item : TmCalendarDate ) : TmCalendarDate => {
							item.data = sortClassSessionByAscending( item.data );
							return item;
						} );
					} );
				} else {
					this.monthDays.update( ( monthDays : TmCalendarDate[] ) : TmCalendarDate[] => {
						return [ ... monthDays ].map( ( _dateInMonth : TmCalendarDate ) : TmCalendarDate => {
							const _sessions : ClassSessionRelative[] = response.filter( ( __session : ClassSessionRelative ) : boolean => _dateInMonth.slug === dayjs( __session.time_start ).format( 'DD-MM-YYYY' ) );
							return { ... _dateInMonth , data : _sessions.length ? sortClassSessionByAscending( _sessions ) : [] };
						} );
					} );
				}
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.state.set( 'error' );
			}
		} );
	}

	private loadSession( csdt_id : number ) : Observable<ClassSession[]> {
		if ( csdt_id ) {
			const donvi_id : number           = this.donViID;
			const _arrDays : TmCalendarDate[] = this.viewMode() === 'week' ? this.weekDays() : this.monthDays();
			const filter : ClassSessionFitter = _arrDays.filter( ( date : TmCalendarDate ) : boolean => date.visible ).reduce( ( reducer : ClassSessionFitter , d : TmCalendarDate ) : ClassSessionFitter => {
				if ( !reducer.timeStart ) {
					const _startDate : Date = new Date( d.date );
					_startDate.setHours( 0 , 0 , 0 , 0 );
					reducer.timeStart = dayjs( _startDate ).format( 'YYYY-MM-DD HH:mm:ss' );
				} else {
					const _endDate : Date = new Date( d.date );
					_endDate.setHours( 23 , 59 , 59 , 0 );
					reducer.timeEnd = dayjs( _endDate ).format( 'YYYY-MM-DD HH:mm:ss' );
				}
				return reducer;
			} , { csdt_id , donvi_id , timeStart : '' , timeEnd : '' } );
			return this.classSessionService.loadSession( filter , { paged : 1 , limit : -1 , with : 'class,room,teacher,assistants,hocsinh,parent_class' } );
		} else {
			return of( [] );
		}
	}

	private filterByAgent() : Observable<number> {
		if ( this.activeAgent() ) {
			return of( this.activeAgent().id );
		} else {
			if ( this.listAgent().length > 0 ) {
				this.activeAgent.set( this.listAgent()[ 0 ] );
				return of( this.activeAgent().id );
			} else {
				const conditions : IctuConditionParam[] = [];
				const queryParams : IctuQueryParams     = { include : this.donViID , include_by : 'donvi_id' };
				return this.coSoDaoTaoService.query( conditions , queryParams ).pipe(
					map( ( response : DtoObject<CoSoDaoTao[]> ) : number => {
						if ( response.data.length ) {
							this.listAgent.set( response.data );
							this.activeAgent.set( response.data[ 0 ] );
							return this.activeAgent().id;
						} else {
							return 0;
						}
					} )
				);
			}
		}
	}

	protected btnReload( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData();
	}

	protected btnSetViewMode( mode : TmCalendarViewMode ) : void {
		this.btnResetDate();
		this.viewMode.set( mode );
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

	protected btnResetDate() : void {
		this.selectDate.set( new Date() );
	}

	protected btnChangeAgent( agent : CoSoDaoTao ) : void {
		if ( !this.activeAgent() || this.activeAgent().id !== agent.id ) {
			this._changeActiveAgent( agent );
		}
	}

	private _changeActiveAgent( agent : CoSoDaoTao ) : void {
		this.activeAgent.set( agent );
		this.loadData();
	}

	protected closeRegistrationFormDialog( dirty : boolean ) : void {
		this.visibleEditClassSessionDialog = false;
		// waiting for animation complete
		timer( 500 ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( () : void => {
			this.calendarEvent.set( null );
		} );
		if ( dirty ) {
			this.loadData();
		}
	}

	protected btnEmitCalendarEvent( name : TMCalendarEventName , classSessionID : number ) : void {
		this.calendarEvent.set( { name , classSessionID } );
	}

	protected btnChangeObjectStatus( object : ClassSessionRelative , status : number ) : void {
		object[ 'loading' ] = true;
		this.changeObjectStatusEventObserver.next( { object , status } );
	}

	private updateObjectStatus( event : ChangeObjectStatusEvent ) : void {
		this.classSessionService.update( event.object.id , { status : event.status } ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : () : void => {
				event.object.status  = event.status;
				event.object.loading = false;
			} ,
			error : () : void => {
				event.object.loading = false;
			}
		} );
	}

	protected avoidCloseMenuByClicking( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
	}

	openDialogHocSinh( value : ClassSession ) : void {
		this.activeClassSession.set( value );
		this.type_view_dialog.set( 'current' );
		this.visibleDialog = true;
		this.loadExtraHocSinh();
	}

	loadHocsinh( paged : number , resetPaginator : boolean ) : void {
		this.state_dialog.set( 'loading' );
		this.classService.query( [ { conditionName : 'course_id' , value : this.activeClassSession().course_id.toString() , condition : IctuQueryCondition.equal } ] ,
			{ limit : -1 , paged : 1 } ).pipe( switchMap( ( resClass ) => {
			const class_ids = resClass.data.map( ( item ) => item.id ).join( ',' ) ?? '-1';
			return this.classStudentService.query( [] ,
				{ limit : -1 , paged : 1 , include : class_ids , include_by : 'class_id' , select : 'hocsinh_id,class_id' }
			).pipe( switchMap( res => {

					const student             = [ ... new Map( res.data.map( item => [ item.hocsinh_id , item ] ) ).values() ];
					const student_ids_exclude = student.filter( ( item ) => item.class_id == this.activeClassSession().class_id ).map( ( item ) => item.hocsinh_id ).join( ',' ) || '-1';
					const student_ids_include = student.filter( ( item ) => item.class_id != this.activeClassSession().class_id ).map( ( item ) => item.hocsinh_id ).join( ',' ) || '-1';
					return this.hocsinhService.load(
						this.searchInfoAddHS ,
						this.donViID ,
						{
							limit      : 20 ,
							paged      : paged ,
							include    : student_ids_include ,
							include_by : 'id' ,
							// exclude: student_ids_exclude,
							// exclude_by: 'id',
							order   : 'ASC' ,
							orderby : 'full_name'
						}
					);
				} )
			).pipe(
				map( res => {
					if ( resetPaginator ) {
						this.dataTable_hoc_sinh.paginator.setupPaginator( res );
					} else {
						this.dataTable_hoc_sinh.paginator.changePage( paged );
					}
					return res.data;
				} )
			);
		} ) ).subscribe( {
			next  : ( res ) : void => {
				this.dataTable_hoc_sinh.fillData( res );
				this.state_dialog.set( 'success' );
			} ,
			error : ( err ) : void => {
				console.error( err );
				this.state_dialog.set( 'error' );
			}
		} );

	}

	loadExtraHocSinh() : void {
		this.state_dialog.set( 'loading' );
		forkJoin( {
			class_session : this.classSessionService.query(
				[ { conditionName : 'id' , value : this.activeClassSession().id.toString() , condition : IctuQueryCondition.equal } ] ,
				{ limit : 1 , paged : 1 , with : 'diemdanh,extra_students' }
			) ,
			diemdanh      : this.diemdanhService.query(
				[ { conditionName : 'assigned_class_session_id' , value : this.activeClassSession().id.toString() , condition : IctuQueryCondition.equal } ] ,
				{ limit : -1 , paged : 1 }
			)
		} ).pipe(
			map( response => {
				const class_session : ClassSessionExtra[] = response.class_session.data.map( ( item : ClassSession ) => ( {
					... item ,
					extra_students : item[ 'extra_students' ] ?? []
				} ) );
				const diemdanh                            = response.diemdanh.data;
				return {
					class_session ,
					diemdanh
				};
			} )
		).subscribe( {
			next  : ( res ) => {
				const tam : ClassSessionHocSinhExtra[] = res.class_session[ 0 ].extra_students.map( ( item ) => {
					const isAttendance = res.diemdanh.find( ( item1 ) => item1.hocsinh_id == item.id ) ? true : false;
					return { ... item , isAttendance };
				} );
				this.dataTable_extra_hoc_sinh.fillData( tam );
				this.state_dialog.set( 'success' );
			} ,
			error : ( err ) => {
				this.state_dialog.set( 'error' );
			}
		} );
	}

	onSearchHocSinh() : void {
		this.loadHocsinh( 1 , true );
	}

	changeTypeViewDialog( type : TypeViewDialog ) : void {
		this.type_view_dialog.set( type );
		if ( type == 'current' ) {
			this.loadExtraHocSinh();
		} else {
			this.loadHocsinh( 1 , true );
		}
	}

	onChangePageHocSinh( paged : number ) : void {
		this.loadHocsinh( paged , false );
	}

	submitExtraHocSinh() : void {
		this.classSessionService.query(
			[ { conditionName : 'id' , value : this.activeClassSession().id.toString() , condition : IctuQueryCondition.equal } ] ,
			{ limit : 1 , paged : 1 }
		).pipe( switchMap( ( res ) => {
			const extra_student_ids = res.data[ 0 ].extra_student_ids;
			const tam               = this.dataTable_hoc_sinh.data().filter( ( item ) => item._ictuDataTableRowChecked ).map( ( item ) => item.id );
			const merged            = [ ... new Set( [
				... extra_student_ids ,
				... tam
			] ) ];
			return this.classSessionService.update( this.activeClassSession().id , { extra_student_ids : merged } );
		} ) ).subscribe( {
			next  : () => {
				this.type_view_dialog.set( 'current' );
				this.loadExtraHocSinh();
			} ,
			error : () => {
				this.state_dialog.set( 'error' );
			}
		} );
	}

	openDelExtraHocSinh( row : ClassSessionHocSinhExtra ) : void {
		this.notification.confirmDelete2( {
			htmlMessage : 'Bạn chắc chắn muốn xóa?'
		} ).subscribe( res => {
			if ( res ) {
				this.delExtraHocSinh( row );
			}
		} );
	}

	delExtraHocSinh( row : ClassSessionHocSinhExtra ) : void {
		this.state_dialog.set( 'loading' );
		forkJoin( {
			class_session     : this.classSessionService.query(
				[ { conditionName : 'id' , value : this.activeClassSession().id.toString() , condition : IctuQueryCondition.equal } ] ,
				{ limit : 1 , paged : 1 }
			) ,
			diemdanh          : this.diemdanhService.query(
				[ { conditionName : 'class_session_id' , value : this.activeClassSession().id.toString() , condition : IctuQueryCondition.equal } ,
				  { conditionName : 'hocsinh_id' , value : row.id.toString() , condition : IctuQueryCondition.equal }
				] ,
				{ limit : 1 , paged : 1 }
			) ,
			diemdanh_assigned : row.isAttendance ? this.diemdanhService.query(
				[ { conditionName : 'assigned_class_session_id' , value : this.activeClassSession().id.toString() , condition : IctuQueryCondition.equal } ,
				  { conditionName : 'hocsinh_id' , value : row.id.toString() , condition : IctuQueryCondition.equal }
				] ,
				{ limit : 1 , paged : 1 }
			) : of( { data : [] } )
		} ).pipe( switchMap( ( res ) => {
			const extra_student_ids    = res.class_session.data[ 0 ].extra_student_ids.filter( ( item ) => item != row.id );
			const diemdanh_id          = res.diemdanh.data.length ? res.diemdanh.data[ 0 ].id : 0;
			const diemdanh_id_assigned = res.diemdanh_assigned.data.length ? res.diemdanh_assigned.data[ 0 ].id : 0;
			if ( diemdanh_id == 0 ) {
				const calls = [
					this.classSessionService.update( this.activeClassSession().id , { extra_student_ids } )
				];
				if ( row.isAttendance && diemdanh_id_assigned != 0 ) {
					calls.push( this.diemdanhService.update( diemdanh_id_assigned , { assigned_class_session_id : 0 , class_assigned_id : 0 } ) );

				}
				return forkJoin( calls );
			} else {
				const calls = [
					this.classSessionService.update( this.activeClassSession().id , { extra_student_ids } ) ,
					this.diemdanhService.delete( diemdanh_id )
				];

				if ( row.isAttendance && diemdanh_id_assigned != 0 ) {
					calls.push( this.diemdanhService.update( diemdanh_id_assigned , { assigned_class_session_id : 0 , class_assigned_id : 0 } ) );
				}
				return forkJoin( calls );
			}
		} ) ).subscribe( {
			next  : () : void => {
				this.loadExtraHocSinh();
			} ,
			error : () : void => {
				this.state_dialog.set( 'error' );
			}
		} );
	}

	reloadHocSinh( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadHocsinh( 1 , true );
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
