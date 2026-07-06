import { Component , inject , OnDestroy , signal , WritableSignal } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { DatePicker } from 'primeng/datepicker';
import { Tooltip } from 'primeng/tooltip';
import { filter , map , merge , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { getMonthRange } from '@utilities/helper';
import { Select } from 'primeng/select';
import { CoSoDaoTao } from '@models/co-so-dao-tao';
import { AppState } from '@models/app-state';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { AuthenticationService } from '@services/authentication.service';
import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';
import { ClassSessionService } from '@services/class-session.service';
import { ClassSession , ClassSessionFitter } from '@models/class-session';
import dayjs from '@setup/dayjs';
import { DiemDanhService } from '@services/diem-danh.service';
import { DiemDanh } from '@models/diem-danh';
import { joinSources } from '@utilities/join-sources';
import { map as _map , find as _find , filter as _filter } from 'lodash-es';
import { ClassesService } from '@services/classes.service';
import { Class , ClassPlanningCommand } from '@models/class';
import { Course } from '@models/course';
import { CoursesService } from '@services/course.service';
import { ClassProgressCalculatorComponent } from '@components/class-progress-calculator/class-progress-calculator.component';
import { Router } from '@angular/router';

interface ReportInfo {
	totalStudents : number,
	totalSessions : number,
	totalAbsentees : number,
	totalClasses : number,
	totalTeachingDays : number
}

interface LoadDataResponse {
	sessions : ClassSession[],
	checkIns : Pick<DiemDanh , 'id' | 'class_session_id' | 'status' | 'donvi_id' | 'csdt_id' | 'class_id' | 'hocsinh_id'>[]
}

interface CheckInReport {
	setStudents : Set<number>;
	setAbsentees : Set<number>;
}

interface SessionReport {
	setClasses : Set<number>;
	setTeachingDays : Set<string>;
}

interface MyActiveClassesTableData extends Pick<Class , 'id' | 'name' | 'course_id' | 'started_date' | 'donvi_id' | 'csdt_id' | 'code' | 'teacher_ids' | 'assistant_ids' | 'status' | 'total_student'> {
	progress : number;
	courseName : string;
}

type PickCourse = Pick<Course , 'id' | 'donvi_id' | 'title'>;

interface MyActiveClassDto {
	myActiveClasses : Class[];
	courses : PickCourse[];
}

@Component( {
	selector    : 'app-teacher-dashboard' ,
	imports     : [ SharedModule , DatePicker , Tooltip , Select , NgTemplateOutlet , ClassProgressCalculatorComponent ] ,
	templateUrl : './teacher-dashboard.component.html' ,
	styleUrl    : './teacher-dashboard.component.css'
} )
export default class TeacherDashboardComponent implements OnDestroy {

	private readonly auth : AuthenticationService = inject<AuthenticationService>( AuthenticationService );

	private readonly coSoDaoTaoService : CoSoDaoTaoService = inject<CoSoDaoTaoService>( CoSoDaoTaoService );

	private readonly classSessionService : ClassSessionService = inject<ClassSessionService>( ClassSessionService );

	private readonly diemDanhService : DiemDanhService = inject( DiemDanhService );

	private readonly classesService : ClassesService = inject( ClassesService );

	private readonly coursesService : CoursesService = inject( CoursesService );

	private readonly router : Router = inject( Router );

	protected rangeDates : WritableSignal<Date[]> = signal( getMonthRange( new Date() ) );

	readonly branches : WritableSignal<CoSoDaoTao[]> = signal<CoSoDaoTao[]>( [] );

	protected selectedBranch : WritableSignal<CoSoDaoTao> = signal<CoSoDaoTao>( null );

	protected readonly state : WritableSignal<AppState> = signal( 'loading' );

	protected readonly branchesState : WritableSignal<AppState> = signal( 'loading' );

	protected readonly report : WritableSignal<ReportInfo> = signal( {
		totalStudents     : 0 ,
		totalSessions     : 0 ,
		totalAbsentees    : 0 ,
		totalClasses      : 0 ,
		totalTeachingDays : 0
	} );

	private destroyed$ : Subject<void> = new Subject<void>();

	private loadDataObserver : Subject<number> = new Subject<number>();

	private loadBranchesObserver : Subject<number> = new Subject<number>();

	private reloadMyActiveClassesObserver : Subject<number> = new Subject<number>();

	private loadMyActiveClassesObserver : Subject<void> = new Subject<void>();

	private section : number = 0;

	get donViID() : number {
		return this.auth.user.donvi_id;
	}

	get userID() : number {
		return this.auth.user.id;
	}

	protected readonly classesTableState : WritableSignal<AppState> = signal( 'loading' );

	protected readonly myActiveClassesTable : WritableSignal<MyActiveClassesTableData[]> = signal( [] );

	constructor() {
		merge<[ any , any ]>(
			toObservable( this.rangeDates ).pipe(
				filter( ( rangeDates : Date[] ) : boolean => rangeDates.every( Boolean ) )
			) ,
			toObservable( this.selectedBranch )
		).pipe(
			takeUntilDestroyed() ,
			filter( () : boolean => this.rangeDates().every( Boolean ) && !!this.selectedBranch() )
		).subscribe( () : void => {
			this.loadCardContent();
		} );

		this.loadBranchesObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this.loadBranches();
		} );

		merge(
			toObservable( this.selectedBranch ).pipe(
				filter( Boolean ) ,
				map( ( branch : CoSoDaoTao ) : number => branch?.id ) ,
				distinctUntilChanged()
			) ,
			this.reloadMyActiveClassesObserver.asObservable().pipe(
				distinctUntilChanged() ,
				map( () : number => this.selectedBranch().id )
			)
		).pipe(
			takeUntilDestroyed()
		).subscribe( ( branchID : number ) : void => {
			this.loadMyActiveClassesTable( branchID );
		} );

		this.loadBranchesObserver.next( this.section );
	}

	private loadCardContent() : void {
		this.state.set( 'loading' );
		this._loadSession().pipe(
			takeUntil( this.destroyed$ ) ,
			switchMap( ( sessions : ClassSession[] ) : Observable<LoadDataResponse> => {
				const classSessionIDs : number[] = _map( sessions , 'id' );
				return joinSources<LoadDataResponse>( {
					sessions : of( sessions ) ,
					checkIns : this._loadCheckIns( classSessionIDs )
				} );
			} ) ,
			map( ( { sessions , checkIns } : LoadDataResponse ) : ReportInfo => {
				const { setStudents , setAbsentees } : CheckInReport = checkIns.reduce( ( reducer : CheckInReport , { hocsinh_id , id , status } : DiemDanh ) : CheckInReport => {
					if ( [ 'UNEXCUSED' , 'EXCUSED' ].includes( status ) ) {
						reducer.setAbsentees.add( id );
					}
					reducer.setAbsentees.add( hocsinh_id );
					return reducer;
				} , {
					setStudents  : new Set<number>() ,
					setAbsentees : new Set<number>()
				} );

				const { setClasses , setTeachingDays } : SessionReport = sessions.reduce( ( reducer : SessionReport , { class_id , time_start } : ClassSession ) : SessionReport => {
					reducer.setClasses.add( class_id );
					if ( time_start ) {
						reducer.setTeachingDays.add( dayjs( new Date( time_start ) ).format( 'DD-MM-YYYY' ) );
					}
					return reducer;
				} , {
					setClasses      : new Set<number>() ,
					setTeachingDays : new Set<string>()
				} );
				return {
					totalStudents     : setStudents.size ,
					totalSessions     : sessions.length ,
					totalAbsentees    : setAbsentees.size ,
					totalClasses      : setClasses.size ,
					totalTeachingDays : setTeachingDays.size
				};
			} )
		).subscribe( {
			next  : ( report : ReportInfo ) : void => {
				this.report.set( report );
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.state.set( 'error' );
			}
		} );
	}

	private _loadSession() : Observable<ClassSession[]> {
		const filter : ClassSessionFitter   = {
			timeStart : [ dayjs( this.rangeDates()[ 0 ] ).format( 'YYYY-MM-DD' ) , '00:00:00' ].join( ' ' ) ,
			timeEnd   : [ dayjs( this.rangeDates()[ 1 ] ).format( 'YYYY-MM-DD' ) , '23:59:59' ].join( ' ' ) ,
			donvi_id  : this.donViID ,
			csdt_id   : this.selectedBranch().id
		};
		const queryParams : IctuQueryParams = {
			limit      : -1 ,
			paged      : 1 ,
			select     : 'id,donvi_id,csdt_id,class_id,time_start,time_end,teacher_id' ,
			include    : this.userID ,
			include_by : 'teacher_id'
		};
		return this.classSessionService.loadSession( filter , queryParams );
	}

	private _loadCheckIns( classSessionIDs : number[] ) : Observable<DiemDanh[]> {
		if ( !classSessionIDs.length ) {
			return of( [] );
		}
		const conditions : IctuConditionParam[] = [];
		const queryParams : IctuQueryParams     = {
			limit      : -1 ,
			paged      : 1 ,
			select     : 'id,class_session_id,status,donvi_id,csdt_id,class_id,hocsinh_id' ,
			include    : classSessionIDs.join( ',' ) ,
			include_by : 'class_session_id'
		};
		return this.diemDanhService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<DiemDanh[]> ) : DiemDanh[] => response.data )
		);
	}

	protected reloadData( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadDataObserver.next( this.section );
	}

	private loadBranches() : void {
		this.branchesState.set( 'loading' );
		this._branchesLoader().pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( branches : CoSoDaoTao[] ) : void => {
				this.increaseSection();
				this.branches.set( branches );
				this.branchesState.set( 'success' );
				if ( branches.length ) {
					this.selectedBranch.set( branches[ 0 ] );
				}
			} ,
			error : () : void => {
				this.increaseSection();
				this.branchesState.set( 'error' );
			}
		} );
	}

	private increaseSection() : void {
		this.section += 1;
	}

	private _branchesLoader() : Observable<CoSoDaoTao[]> {
		const conditions : IctuConditionParam[] = [];
		const queryParams : IctuQueryParams     = {
			limit      : -1 ,
			paged      : 1 ,
			include    : this.donViID.toString() ,
			include_by : 'donvi_id' ,
			select     : 'id,donvi_id,ten,address'
		};
		return this.coSoDaoTaoService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<CoSoDaoTao[]> ) : CoSoDaoTao[] => response.data )
		);
	}

	protected reloadBranches( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadBranchesObserver.next( this.section );
	}

	private loadMyActiveClassesTable( branchID : number ) : void {
		this.classesTableState.set( 'loading' );
		this.loadMyActiveClassesObserver.next();
		this.myActiveClassesLoader( branchID ).pipe(
			takeUntil( merge( this.destroyed$ , this.loadMyActiveClassesObserver ) ) ,
			switchMap( ( myActiveClasses : Class[] ) : Observable<MyActiveClassDto> => {
				return joinSources<MyActiveClassDto>( {
					myActiveClasses : of( myActiveClasses ) ,
					courses         : this.coursesLoader( _map( myActiveClasses , 'course_id' ) )
				} );
			} ) ,
			map( ( { myActiveClasses , courses } : MyActiveClassDto ) : MyActiveClassesTableData[] => {
				return myActiveClasses.map( ( _class : Class ) : MyActiveClassesTableData => {
					return {
						... _class ,
						progress   : _class.class_sessions.length ? Math.ceil( ( _filter( _class.class_sessions , { status : 2 } ).length / _class.class_sessions.length ) * 100 ) : 0 ,
						courseName : _find( courses , { id : _class.course_id } )?.title ?? ''
					};
				} );
			} )
		).subscribe( {
			next  : ( response : MyActiveClassesTableData[] ) : void => {
				this.increaseSection();
				this.myActiveClassesTable.set( response );
				this.classesTableState.set( 'success' );
			} ,
			error : () : void => {
				this.increaseSection();
				this.classesTableState.set( 'error' );
			}
		} );
	}

	private myActiveClassesLoader( branchID : number ) : Observable<Class[]> {
		const conditions : IctuConditionParam[] = [
			{
				conditionName : 'donvi_id' ,
				condition     : IctuQueryCondition.equal ,
				value         : this.donViID.toString()
			} ,
			{
				conditionName : 'csdt_id' ,
				condition     : IctuQueryCondition.equal ,
				value         : branchID.toString() ,
				orWhere       : 'and'
			}
		];
		const queryParams : IctuQueryParams     = {
			limit   : 20 ,
			paged   : 1 ,
			select  : 'id,name,course_id,started_date,donvi_id,csdt_id,code,teacher_ids,assistant_ids,status,total_student' ,
			order   : 'ASC' ,
			orderby : 'name' ,
			with    : 'class_sessions'
		};
		queryParams[ 'teacher_ids' ]            = this.userID.toString();
		return this.classesService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<Class[]> ) : Class[] => response.data )
		);
	}

	private coursesLoader( courseIDs : number[] ) : Observable<PickCourse[]> {
		if ( !courseIDs || !courseIDs.length ) {
			return of( [] );
		}
		const conditions : IctuConditionParam[] = [
			{
				conditionName : 'donvi_id' ,
				condition     : IctuQueryCondition.equal ,
				value         : this.donViID.toString()
			}
		];
		const queryParams : IctuQueryParams     = {
			paged      : 1 ,
			limit      : courseIDs.length ,
			select     : 'id,donvi_id,title' ,
			include    : courseIDs.join( ',' ) ,
			include_by : 'id'
		};
		return this.coursesService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<Course[]> ) : PickCourse[] => response.data )
		);
	}

	protected btnReloadMyActiveClasses( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.reloadMyActiveClassesObserver.next( this.section );
	}

	protected getToClassPlanning( classId : number , event? : MouseEvent | KeyboardEvent ) : void {
		if ( event ) {
			event.preventDefault();
			event.stopPropagation();
		}
		const _hashcode : ClassPlanningCommand = {
			classId : classId ,
			role    : 'teacher' ,
			userId  : this.userID
		};
		void this.router.navigate( [ 'class-planning' ] , {
			queryParams : {
				hashcode : this.auth.encrypt( JSON.stringify( _hashcode ) ) ,
				viewer   : 'by_'.concat( 'teacher' )
			}
		} );
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
