import { Component , computed , inject , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { DatePicker } from 'primeng/datepicker';
import { EmployeePhotoPipe } from '@pipes/employee-photo.pipe';
import { FindInArrayPipe } from '@pipes/find-in-array.pipe';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatMenu , MatMenuItem , MatMenuTrigger } from '@angular/material/menu';
import { Tooltip } from 'primeng/tooltip';
import { AuthenticationService } from '@services/authentication.service';
import { ClassMediaService } from '@services/class-media.service';
import { BranchOption , CoSoDaoTaoService , selectDefaultBranch } from '@services/co-so-dao-tao.service';
import { ClassSessionService } from '@services/class-session.service';
import { ClassActivitiesService } from '@services/class-activities.service';
import { CoSoDaoTao } from '@models/co-so-dao-tao';
import { filter , map , merge , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { AppState } from '@models/app-state';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { ClassSession } from '@models/class-session';
import { ClassActivity } from '@models/class-activities';
import { joinSources } from '@utilities/join-sources';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import dayjs from '@setup/dayjs';
import { ClassMedia } from '@models/class-media';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { getMonthBoundaryDates , isSameRange } from '@utilities/helper';

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

interface ContentReviewerDto {
	classSessions : ClassSession[],
	classMedias : ClassMediaModeration[],
	classActivities : ClassActivity[],
}

@Component( {
	selector    : 'app-cr-dashboard' ,
	imports     : [ DatePicker , EmployeePhotoPipe , FindInArrayPipe , LoadingProgressComponent , MatMenu , MatMenuItem , Tooltip , FormsModule , NgClass , MatTooltip , MatMenuTrigger ] ,
	templateUrl : './cr-dashboard.component.html' ,
	styleUrl    : './cr-dashboard.component.css'
} )
export default class CrDashboardComponent implements OnDestroy {

	private auth : AuthenticationService = inject( AuthenticationService );

	private classMediaService : ClassMediaService = inject( ClassMediaService );

	private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

	private classSessionService : ClassSessionService = inject( ClassSessionService );

	private classActivitiesService : ClassActivitiesService = inject( ClassActivitiesService );

	readonly branches : WritableSignal<BranchOption[]> = signal<BranchOption[]>( [] );

	readonly branchID : WritableSignal<number> = signal<number>( 0 );

	private destroyed$ : Subject<void> = new Subject();

	protected readonly state : WritableSignal<AppState> = signal( 'loading' );

	protected rangeDates : WritableSignal<Date[]> = signal( getMonthBoundaryDates( new Date() ) );

	private readonly dateStart : Signal<string> = computed( () : string => {
		return this.rangeDates()[ 0 ] ? [ dayjs( this.rangeDates()[ 0 ] ).format( 'YYYY-MM-DD' ) , '00:00:00' ].join( ' ' ) : '';
	} );

	private readonly dateEnd : Signal<string> = computed( () : string => {
		return this.rangeDates()[ 1 ] ? [ dayjs( this.rangeDates()[ 1 ] ).format( 'YYYY-MM-DD' ) , '23:23:00' ].join( ' ' ) : '';
	} );

	private loadDataObserver : Subject<number> = new Subject<number>();

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

	private section : number = 0;

	constructor() {
		merge(
			toObservable( this.branchID ).pipe(
				distinctUntilChanged()
			) ,
			toObservable( this.rangeDates ).pipe(
				filter( ( rangeDates : Date[] ) : boolean => rangeDates.every( Boolean ) ) ,
				distinctUntilChanged( ( previous : Date[] , current : Date[] ) : boolean => previous ? isSameRange( previous , current ) : false )
			)
		).pipe(
			takeUntilDestroyed()
		).subscribe( () : void => {
			this.loadData();
		} );

		this.loadDataObserver.asObservable().pipe(
			distinctUntilChanged()
		).subscribe( () : void => {
			this._loadData();
		} );
	}

	private loadData() : void {
		this.loadDataObserver.next( this.section );
	}

	private _loadData() : void {
		this.state.set( 'loading' );
		if ( this.branchID() ) {
			this.loadClassSessions( this.branchID() ).pipe(
				takeUntil( this.destroyed$ ) ,
				switchMap( ( classSessions : ClassSession[] ) : Observable<ContentReviewerDto> => {
					return joinSources<ContentReviewerDto>( {
						classSessions   : of( classSessions ) ,
						classMedias     : classSessions.length ? this.loadClassMedia( classSessions ) : of( [] ) ,
						classActivities : classSessions.length ? this.loadClassActivities( classSessions ) : of( [] )
					} );
				} )
			).subscribe( {
				next  : ( { classSessions , classMedias , classActivities } : ContentReviewerDto ) : void => {
					this.increateSectionID();
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
					this.increateSectionID();
					this.state.set( 'error' );
				}
			} );
		} else {
			this.coSoDaoTaoService.loadMyBranches().pipe(
				takeUntil( this.destroyed$ )
			).subscribe( {
				next  : ( branches : CoSoDaoTao[] ) : void => {
					this.increateSectionID();
					this.branches.set( branches );
					this.branchID.set( selectDefaultBranch( this.auth.employee , branches )?.id || 0 );
				} ,
				error : () : void => {
					this.increateSectionID();
					this.state.set( 'error' );
				}
			} );
		}
	}

	private increateSectionID() : void {
		this.section += 1;
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
				value         : this.dateStart() ,
				orWhere       : 'and'
			} ,
			{
				conditionName : 'time_start' ,
				condition     : IctuQueryCondition.lessThanOrEqualsTo ,
				value         : this.dateEnd() ,
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
			select     : 'id,donvi_id,class_id,class_session_id,type,status' ,
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
			select     : 'id,donvi_id,class_id,class_session_id,type,status' ,
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
