import { Component , inject , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { debounceTime , map , merge , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { AppState } from '@models/app-state';
import { DatePicker } from 'primeng/datepicker';
import { FindInArrayPipe } from '@pipes/find-in-array.pipe';
import { Tooltip } from 'primeng/tooltip';
import { NotificationService } from '@services/notification.service';
import { AuthenticationService } from '@services/authentication.service';
import { ClassMediaService } from '@services/class-media.service';
import { CoSoDaoTao } from '@models/co-so-dao-tao';
import { CoSoDaoTaoService , selectDefaultBranch } from '@services/co-so-dao-tao.service';
import { ClassSessionService } from '@services/class-session.service';
import { SharedModule } from '@shared/shared.module';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import dayjs from '@setup/dayjs';
import { ClassSession } from '@models/class-session';
import { NgClass } from '@angular/common';
import { ClassMedia } from '@models/class-media';
import { joinSources } from '@utilities/join-sources';
import { ClassActivitiesService } from '@services/class-activities.service';
import { ClassActivity } from '@models/class-activities';
import { EmployeePhotoPipe } from '@pipes/employee-photo.pipe';

type DataCounterCssClass = 'text-warning' | 'text-danger' | 'text-success' | 'text-primary';

interface DataCounter {
	total : number;
	percentage : number; // number of completed (unit %)
	cssClass : DataCounterCssClass;
}

interface ClassSessionCounter extends ClassSession {
	_className : string;
	mediaCounter : DataCounter & { completed : number };
	commentsCounter : DataCounter & { completed : number };
}

type ClassMediaModeration = Pick<ClassMedia , 'id' | 'donvi_id' | 'class_id' | 'class_session_id' | 'type' | 'status'>

const percent2CssClass : ( percent : number ) => DataCounterCssClass = ( percent : number ) : DataCounterCssClass => {
	const _percent : number = Math.max( Math.min( 100 , percent ) , 0 );
	switch ( true ) {
		case 25 > _percent :
			return 'text-danger';
		case 80 > _percent :
			return 'text-warning';
		case 99 > _percent :
			return 'text-primary';
		default:
			return 'text-success';
	}
};

@Component( {
	selector    : 'app-moderation-dashboard' ,
	imports     : [ LoadingProgressComponent , DatePicker , FindInArrayPipe , Tooltip , SharedModule , NgClass , EmployeePhotoPipe ] ,
	templateUrl : './moderation-dashboard.component.html' ,
	styleUrl    : './moderation-dashboard.component.css'
} )
export default class ModerationDashboardComponent implements OnDestroy {

	private auth : AuthenticationService = inject( AuthenticationService );

	private classMediaService : ClassMediaService = inject( ClassMediaService );

	private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

	private classSessionService : ClassSessionService = inject( ClassSessionService );

	private classActivitiesService : ClassActivitiesService = inject( ClassActivitiesService );

	readonly branches : WritableSignal<CoSoDaoTao[]> = signal<CoSoDaoTao[]>( [] );

	readonly branchID : WritableSignal<number> = signal<number>( 0 );

	private destroyed$ : Subject<void> = new Subject();

	protected readonly state : WritableSignal<AppState> = signal( 'loading' );

	protected readonly filterByDate : WritableSignal<Date> = signal<Date>( new Date() );

	protected readonly filterByStatus : WritableSignal<number> = signal<number>( 0 );

	private loadDataObserver : Subject<void> = new Subject();

	// readonly calendarIcon : WritableSignal<string> = signal('<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M5 22q-.825 0-1.412-.587T3 20V6q0-.825.588-1.412T5 4h1V3q0-.425.288-.712T7 2t.713.288T8 3v1h8V3q0-.425.288-.712T17 2t.713.288T18 3v1h1q.825 0 1.413.588T21 6v14q0 .825-.587 1.413T19 22zm0-2h14V10H5zM5 8h14V6H5zm0 0V6zm7 6q-.425 0-.712-.288T11 13t.288-.712T12 12t.713.288T13 13t-.288.713T12 14m-4 0q-.425 0-.712-.288T7 13t.288-.712T8 12t.713.288T9 13t-.288.713T8 14m8 0q-.425 0-.712-.288T15 13t.288-.712T16 12t.713.288T17 13t-.288.713T16 14m-4 4q-.425 0-.712-.288T11 17t.288-.712T12 16t.713.288T13 17t-.288.713T12 18m-4 0q-.425 0-.712-.288T7 17t.288-.712T8 16t.713.288T9 17t-.288.713T8 18m8 0q-.425 0-.712-.288T15 17t.288-.712T16 16t.713.288T17 17t-.288.713T16 18"></path></svg>');

	get donViId() : number {
		return this.auth.user.donvi_id;
	}

	protected readonly greeting : Signal<string> = signal( ( () : string => {
		//Good Evening, Captain!
		return `Xin chào ${ this.auth.user.display_name }`;
	} )() );

	protected readonly subHeading : Signal<string> = signal( ( () : string => {
		//See what's happening in real-time
		return 'Xem những gì đang diễn ra ngay lúc này.';
	} )() );

	protected readonly mediaCounter : WritableSignal<DataCounter> = signal( { total : 0 , percentage : 0 , cssClass : percent2CssClass( 100 ) } );

	protected readonly commentsCounter : WritableSignal<DataCounter> = signal( { total : 0 , percentage : 0 , cssClass : percent2CssClass( 100 ) } );

	protected readonly data : WritableSignal<ClassSessionCounter[]> = signal( [] );

	constructor() {
		merge(
			toObservable( this.branchID ).pipe(
				distinctUntilChanged()
			) ,
			toObservable( this.filterByDate ).pipe(
				distinctUntilChanged( ( previous : Date , current : Date ) : boolean => [ current.getDate() , current.getMonth() , current.getFullYear() ].join( '-' ) === [ previous.getDate() , previous.getMonth() , previous.getFullYear() ].join( '-' ) )
			)
		).pipe(
			takeUntilDestroyed() ,
			debounceTime( 200 )
		).subscribe( () : void => {
			this.loadData();
		} );
	}

	private loadData() : void {
		this.state.set( 'loading' );
		this.loadDataObserver.next();
		if ( this.branchID() ) {
			this.loadClassSessions( this.branchID() ).pipe(
				takeUntil( merge( this.loadDataObserver , this.destroyed$ ) ) ,
				switchMap( ( classSessions : ClassSession[] ) : Observable<{
					classSessions : ClassSession[],
					classMedias : ClassMediaModeration[],
					classActivities : ClassActivity[],
				}> => {
					return joinSources<{
						classSessions : ClassSession[],
						classMedias : ClassMediaModeration[],
						classActivities : ClassActivity[],
					}>( {
						classSessions   : of( classSessions ) ,
						classMedias     : classSessions.length ? this.loadClassMedia( classSessions ) : of( [] ) ,
						classActivities : classSessions.length ? this.loadClassActivities( classSessions ) : of( [] )
					} );
				} )
			).subscribe( {
				next  : ( { classSessions , classMedias , classActivities } : {
					classSessions : ClassSession[],
					classMedias : ClassMediaModeration[],
					classActivities : ClassActivity[],
				} ) : void => {
					if ( classSessions.length ) {
						const totalApproved : number         = classMedias.reduce( ( reducer : number , item : ClassMediaModeration ) : number => reducer + ( item.status !== 'PENDING_REVIEW' ? 1 : 0 ) , 0 );
						const totalCommentsApproved : number = classActivities.reduce( ( reducer : number , item : ClassActivity ) : number => reducer + ( item.status !== 'PENDING_REVIEW' ? 1 : 0 ) , 0 );

						this.mediaCounter.set( { total : classMedias.length , percentage : classMedias.length ? Math.floor( ( totalApproved / classMedias.length ) * 100 ) : 0 , cssClass : 'text-success' } );
						this.commentsCounter.set( { total : classActivities.length , percentage : classActivities.length ? Math.floor( ( totalCommentsApproved / classActivities.length ) * 100 ) : 0 , cssClass : 'text-success' } );

						this.mediaCounter.update( ( data : DataCounter ) : DataCounter => ( { ... data , cssClass : data.total > 0 ? percent2CssClass( data.percentage ) : percent2CssClass( 100 ) } ) );
						this.commentsCounter.update( ( data : DataCounter ) : DataCounter => ( { ... data , cssClass : data.total > 0 ? percent2CssClass( data.percentage ) : percent2CssClass( 100 ) } ) );

						this.data.set( classSessions.map( ( _classSession : ClassSession ) : ClassSessionCounter => {
							const mediaCounter : DataCounter & { completed : number } = classMedias.filter( ( m : ClassMediaModeration ) : boolean => m.class_session_id === _classSession.id ).reduce( ( reducer : DataCounter & { completed : number } , media : ClassMediaModeration ) : DataCounter & {
								completed : number
							} => {
								reducer.total += 1;
								reducer.completed += media.status !== 'PENDING_REVIEW' ? 1 : 0;
								return reducer;
							} , { total : 0 , percentage : 0 , cssClass : 'text-success' , completed : 0 } );
							mediaCounter.percentage                                   = mediaCounter.total ? Math.floor( ( mediaCounter.completed / mediaCounter.total ) * 100 ) : 0;
							mediaCounter.cssClass                                     = mediaCounter.total > 0 ? percent2CssClass( mediaCounter.percentage ) : 'text-primary';

							const commentsCounter : DataCounter & { completed : number } = classActivities.filter( ( a : ClassActivity ) : boolean => a.class_session_id === _classSession.id ).reduce( ( reducer : DataCounter & { completed : number } , activity : ClassActivity ) : DataCounter & {
								completed : number
							} => {
								reducer.total += 1;
								reducer.completed += activity.status !== 'PENDING_REVIEW' ? 1 : 0;
								return reducer;
							} , { total : 0 , percentage : 0 , cssClass : 'text-success' , completed : 0 } );
							commentsCounter.percentage                                   = commentsCounter.total ? Math.floor( ( commentsCounter.completed / commentsCounter.total ) * 100 ) : 0;
							commentsCounter.cssClass                                     = commentsCounter.total > 0 ? percent2CssClass( commentsCounter.percentage ) : 'text-primary';
							return {
								... _classSession ,
								mediaCounter ,
								commentsCounter ,
								_className : _classSession[ 'parent_class' ] ? _classSession[ 'parent_class' ].name : _classSession[ 'class' ]?.name ?? ''
							};
						} ) );
					} else {
						this.mediaCounter.set( { total : 0 , percentage : 0 , cssClass : 'text-success' } );
						this.commentsCounter.set( { total : 0 , percentage : 0 , cssClass : 'text-success' } );
						this.data.set( [] );
					}
					this.state.set( 'success' );
				} ,
				error : () : void => {
					this.state.set( 'error' );
				}
			} );
		} else {
			this.loadBranches().pipe(
				takeUntil( merge( this.loadDataObserver , this.destroyed$ ) )
			).subscribe( {
				next  : ( branches : CoSoDaoTao[] ) : void => {
					this.branches.set( branches );
					this.branchID.set( selectDefaultBranch( this.auth.employee , branches )?.id || 0 );
				} ,
				error : () : void => {
					this.state.set( 'error' );
				}
			} );
		}
	}

	private loadBranches() : Observable<CoSoDaoTao[]> {
		const conditions : IctuConditionParam[] = [];
		const queryParams : IctuQueryParams     = {
			limit      : -1 ,
			paged      : 1 ,
			include    : this.donViId.toString() ,
			include_by : 'donvi_id' ,
			select     : 'id,donvi_id,ten,address'
		};
		return this.coSoDaoTaoService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<CoSoDaoTao[]> ) : CoSoDaoTao[] => response.data )
		);
	}

	private loadClassSessions( branchID : number ) : Observable<ClassSession[]> {
		const conditions : IctuConditionParam[] = [
			{
				conditionName : 'donvi_id' ,
				condition     : IctuQueryCondition.equal ,
				value         : this.donViId.toString( 10 )
			} ,
			{
				conditionName : 'csdt_id' ,
				condition     : IctuQueryCondition.equal ,
				value         : branchID.toString() ,
				orWhere       : 'and'
			} ,
			{
				conditionName : 'status' ,
				condition     : IctuQueryCondition.equal ,
				value         : '2' ,
				orWhere       : 'and'
			} ,
			{
				conditionName : 'time_start' ,
				condition     : IctuQueryCondition.greaterThanToEqualsTo ,
				value         : dayjs( this.filterByDate() ).format( 'YYYY-MM-DD 00:00:00' ) ,
				orWhere       : 'and'
			} ,
			{
				conditionName : 'time_start' ,
				condition     : IctuQueryCondition.lessThanOrEqualsTo ,
				value         : dayjs( this.filterByDate() ).format( 'YYYY-MM-DD 23:59:00' ) ,
				orWhere       : 'and'
			}
		];
		const queryParams : IctuQueryParams     = {
			limit  : -1 ,
			paged  : 1 ,
			with   : 'class,parent_class,teacher,assistants,course' ,
			select : 'id,topic,title,type,donvi_id,class_id,learning_mode,course_id,course_lesson_id,csdt_id,status,media_approved,comment_approved,time_start,teacher_id,assistant_id'
		};
		return this.classSessionService.query( conditions , queryParams ).pipe(
			map( ( res : DtoObject<ClassSession[]> ) : ClassSession[] => res.data )
		);
	}

	private loadClassMedia( sessions : ClassSession[] ) : Observable<ClassMediaModeration[]> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViId.toString() } ,
			{ conditionName : 'type' , condition : IctuQueryCondition.equal , value : 'ACTIVITY' , orWhere : 'and' }
		];
		const queryParams : IctuQueryParams     = {
			limit      : -1 ,
			paged      : 1 ,
			select     : 'id,donvi_id,class_id,class_session_id,type,approved,is_approved' ,
			include    : sessions.map( ( i : ClassSession ) : number => i.id ).join( ',' ) ,
			include_by : 'class_session_id'
		};
		return this.classMediaService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassMedia[]> ) : ClassMediaModeration[] => response.data )
		);
	}

	private loadClassActivities( sessions : ClassSession[] ) : Observable<ClassActivity[]> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViId.toString() } ,
			{ conditionName : 'type' , condition : IctuQueryCondition.notEqualTo , value : 'notEqualTo' , orWhere : 'and' }
		];
		const queryParams : IctuQueryParams     = {
			limit      : -1 ,
			paged      : 1 ,
			select     : 'id,donvi_id,class_id,class_session_id,type,approved' ,
			include    : sessions.map( ( i : ClassSession ) : number => i.id ).join( ',' ) ,
			include_by : 'class_session_id'
		};
		return this.classActivitiesService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassActivity[]> ) : ClassActivity[] => response.data )
		);
	}

	protected btnChangeAgent( agentID : number ) : void {
		if ( this.branchID() !== agentID ) {
			this.branchID.set( agentID );
		}
	}

	protected reload( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData();
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
