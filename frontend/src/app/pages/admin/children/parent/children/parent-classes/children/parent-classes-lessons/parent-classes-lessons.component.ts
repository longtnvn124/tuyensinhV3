import { Component , computed , inject , input , InputSignal , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { ParentClassesChild } from '@pages/admin/children/parent/children/parent-classes/model/parent-classes-child';
import { filter , map , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { ParentClassesData } from '@pages/admin/children/parent/children/parent-classes/parent-classes.component';
import { AppState } from '@models/app-state';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { ClassSession } from '@models/class-session';
import { ClassSessionService } from '@services/class-session.service';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { NgScrollbar } from 'ngx-scrollbar';
import { IctuDataTablePaginatorInfo } from '@models/datatable';
import { IctuPaginatorControl } from '@theme/components/ictu-paginator/ictu-paginator-control';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { DatePipe , NgClass , NgOptimizedImage } from '@angular/common';
import { BranchTimeSlot , CoSoDaoTao } from '@models/co-so-dao-tao';
import { PhongHoc } from '@models/phong-hoc';
import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';
import { joinSources } from '@utilities/join-sources';
import { find , isArray , map as _map , filter as _filter } from 'lodash-es';
import { ClassActivitiesService } from '@services/class-activities.service';
import { ClassMediaService } from '@services/class-media.service';
import { ClassActivity } from '@models/class-activities';
import { ClassMedia } from '@models/class-media';
import { Dialog } from 'primeng/dialog';
import { ParentClassLessonPreviewComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/parent-class-lesson-preview.component';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { StudentAvatarPipe } from '@pipes/student-avatar.pipe';
import { ParentClassesLessonsActivitiesPreviewComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-classes-lessons-activities-preview/parent-classes-lessons-activities-preview.component';
import { ParentClassesLessonsMediaPreviewComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-classes-lessons-media-preview/parent-classes-lessons-media-preview.component';

export type ParentClassSessionExtendedActivity = Pick<ClassActivity , 'id' | 'donvi_id' | 'class_id' | 'class_session_id' | 'type' | 'content' | 'comment' | 'student_ids' | 'params' | 'media' | 'featured' | 'employee'>

export type ParentClassSessionExtendedMedia = Pick<ClassMedia , 'id' | 'donvi_id' | 'class_id' | 'class_session_id' | 'type' | 'content' | 'student_ids' | 'speaking_test' | 'media' | 'featured' | 'employee' | 'criteria_scores'>

export interface ParentClassSessionExtended extends Pick<ClassSession , 'id' | 'topic' | 'title' | 'type' | 'class_id' | 'learning_mode' | 'course_id' | 'course_lesson_id' | 'teacher_id' | 'assistant_id' | 'linhvuc_id' | 'started_at' | 'ended_at' | 'time_start' | 'time_end' | 'time_slot_order' | 'csdt_id' | 'room_id' | 'status' | 'ordering' | 'lesson_content'> {
	shift : string;
	room : Pick<PhongHoc , 'id' | 'name'>;
	media : ParentClassSessionExtendedMedia[];
	activities : ParentClassSessionExtendedActivity[];
}

type LoadDataEventType = 'load' | 'reload';

interface LoadDataEvent {
	section : number,
	type? : LoadDataEventType
}

type BranchTimeSlots = CoSoDaoTao['time_slots'];

interface LoadDataDto {
	sessions : ClassSession[];
	timeSlots : BranchTimeSlots;
	activities : ClassActivity[],
	media : ClassMedia[]
}

type DialogContentType = 'PUBLIC_LESSON_CONTENT' | 'COMMENTS' | 'MEDIA';

interface ShowPublicLessonContentEvt {
	session : number,
	data : ParentClassSessionExtended,
	type : DialogContentType
}

@Component( {
	selector    : 'parent-classes-lessons' ,
	standalone  : true ,
	imports     : [ NgScrollbar , IctuPaginatorComponent , DatePipe , Dialog , ParentClassLessonPreviewComponent , MatButton , MatTooltip , NgOptimizedImage , StudentAvatarPipe , ParentClassesLessonsActivitiesPreviewComponent , ParentClassesLessonsMediaPreviewComponent , NgClass ] ,
	templateUrl : './parent-classes-lessons.component.html' ,
	styleUrls   : [ '../../../../../content-reviewer/css/timeline.css' , './parent-classes-lessons.component.css' ]
} )
export class ParentClassesLessonsComponent implements OnDestroy , ParentClassesChild {

	classObject : InputSignal<ParentClassesData> = input.required<ParentClassesData>();

	private destroyed$ : Subject<void> = new Subject();

	protected state : WritableSignal<AppState> = signal( 'loading' );

	private readonly loadDataObserver : Subject<LoadDataEvent> = new Subject<LoadDataEvent>();

	private readonly showPublicLessonContentObserver : Subject<ShowPublicLessonContentEvt> = new Subject<ShowPublicLessonContentEvt>();

	private readonly session : WritableSignal<number> = signal( 0 );

	private readonly classSessionService : ClassSessionService = inject( ClassSessionService );

	private readonly coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

	private classActivitiesService : ClassActivitiesService = inject( ClassActivitiesService );

	private classMediaService : ClassMediaService = inject( ClassMediaService );

	protected readonly sessions : WritableSignal<ParentClassSessionExtended[]> = signal( [] );

	private _temp : IctuDataTablePaginatorInfo = { paged : 1 , resetPaginator : true };

	protected readonly paginator : IctuPaginatorControl = new IctuPaginatorControl( { pageLinkSize : 3 , rows : 20 , showFirstLastIcon : true } );

	private _timeSlots : BranchTimeSlots = null;

	protected dialogVisible : boolean = false;

	protected readonly activatedSession : WritableSignal<ParentClassSessionExtended> = signal( null );

	protected readonly dialogContentType : WritableSignal<DialogContentType> = signal( 'PUBLIC_LESSON_CONTENT' );

	protected readonly dialogHeader : Signal<string> = computed( () : string => {
		switch ( this.dialogContentType() ) {
			case 'COMMENTS':
				return [ 'Nhận xét buổi học' , this.activatedSession()?.title ].join( ' : ' );
			case 'MEDIA':
				return [ 'Media buổi học' , this.activatedSession()?.title ].join( ' : ' );
			default:
				return this.activatedSession()?.title || '';
		}
	} );

	protected readonly publicLessonContents : Signal<ParentClassSessionExtended['lesson_content']> = computed( () : ParentClassSessionExtended['lesson_content'] => {
		return this.activatedSession() && isArray( this.activatedSession().lesson_content ) && this.activatedSession().lesson_content.length ? this.activatedSession().lesson_content : [];
	} );

	protected readonly sessionMedia : Signal<ParentClassSessionExtended['media']> = computed( () : ParentClassSessionExtended['media'] => {
		return this.activatedSession()?.media || [];
	} );

	protected readonly sessionActivities : Signal<ParentClassSessionExtended['activities']> = computed( () : ParentClassSessionExtended['activities'] => {
		return this.activatedSession()?.activities || [];
	} );

	constructor() {
		toObservable( this.classObject ).pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged( ( previous : ParentClassesData , current : ParentClassesData ) : boolean => previous?.id === current.id && previous?.student?.id === current.student?.id )
		).subscribe( () : void => {
			this.loadData( 'load' );
		} );

		this.loadDataObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged( ( previous : LoadDataEvent , current : LoadDataEvent ) : boolean => previous?.section === current.section ) ,
			map( ( info : LoadDataEvent ) : IctuDataTablePaginatorInfo => {
				return info.type === 'reload' ? this._temp : { paged : 1 , resetPaginator : true };
			} )
		).subscribe( ( event : IctuDataTablePaginatorInfo ) : void => {
			this._loadData( event );
		} );

		this.showPublicLessonContentObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged( ( previous : ShowPublicLessonContentEvt , current : ShowPublicLessonContentEvt ) : boolean => previous?.session === current.session )
		).subscribe( ( { data , type } : ShowPublicLessonContentEvt ) : void => {
			this.dialogContentType.set( type );
			this.activatedSession.set( data );
		} );

		toObservable( this.activatedSession ).pipe(
			takeUntilDestroyed() ,
			filter( Boolean )
		).subscribe( () : void => {
			this.dialogVisible = true;
		} );
	}

	private loadData( type : LoadDataEventType ) : void {
		this.loadDataObserver.next( { section : this.session() , type } );
	}

	private increaseSession() : void {
		this.session.update( ( value : number ) : number => 1 + value );
	}

	protected reload( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData( 'reload' );
	}

	private _loadData( info : IctuDataTablePaginatorInfo ) : void {
		this.state.set( 'loading' );
		this._temp = info;
		joinSources<LoadDataDto>( {
			sessions   : this.loadClassSessions( info ) ,
			timeSlots  : this.loadBranchTimeSlots() ,
			activities : of( [] ) ,
			media      : of( [] )
		} ).pipe(
			takeUntil( this.destroyed$ ) ,
			switchMap( ( { sessions , timeSlots } : LoadDataDto ) : Observable<LoadDataDto> => {
				const sessionIds : number[] = _map<ClassSession , 'id'>( sessions , 'id' );
				return joinSources<LoadDataDto>( {
					sessions   : of( sessions ) ,
					timeSlots  : of( timeSlots ) ,
					activities : this.loadClassActivities( sessionIds ) ,
					media      : this.loadClassMedia( sessionIds )
				} );
			} )
		).subscribe( {
			next  : ( { sessions , timeSlots , activities , media } : LoadDataDto ) : void => {
				this.sessions.set( _map( sessions , ( session : ClassSession ) : ParentClassSessionExtended => {
					const _t : BranchTimeSlot = session.time_slot_order ? find( timeSlots , { order : session.time_slot_order } ) : null;
					return {
						... session ,
						shift      : _t ? `${ _t.name } - [ ${ _t.start } - ${ _t.end } ]` : '' ,
						room       : session[ 'room' ] ,
						activities : _filter( activities , { class_session_id : session.id } ) ,
						media      : _filter( media , { class_session_id : session.id } )
					};
				} ) );
				this.state.set( 'success' );
				this.increaseSession();
			} ,
			error : () : void => {
				this.state.set( 'error' );
				this.increaseSession();
			}
		} );
	}

	private loadClassSessions( { paged , resetPaginator } : IctuDataTablePaginatorInfo ) : Observable<ClassSession[]> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'class_id' , value : this.classObject().id.toString( 10 ) , condition : IctuQueryCondition.equal } ,
			{ conditionName : 'course_id' , value : this.classObject().course_id.toString( 10 ) , condition : IctuQueryCondition.equal , orWhere : 'and' }
		];
		const queryParams : IctuQueryParams     = {
			paged ,
			with    : 'room,lesson_content' ,
			limit   : this.paginator.rows() ,
			order   : 'ASC' ,
			orderby : 'ordering' ,
			select  : 'id,topic,title,type,class_id,learning_mode,course_id,course_lesson_id,teacher_id,assistant_id,linhvuc_id,started_at,ended_at,time_start,time_end,time_slot_order,csdt_id,room_id,status,ordering'
		};
		return this.classSessionService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassSession[]> ) : ClassSession[] => {
				if ( resetPaginator ) {
					return this.paginator.setupPaginator( response );
				} else {
					this.paginator.changePage( paged );
					return response.data;
				}
			} )
		);
	}

	private loadBranchTimeSlots() : Observable<BranchTimeSlots> {
		if ( this._timeSlots ) {
			return of( this._timeSlots );
		}
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'id' , value : this.classObject().csdt_id.toString( 10 ) , condition : IctuQueryCondition.equal }
		];
		const queryParams : IctuQueryParams     = {
			limit  : 1 ,
			paged  : 1 ,
			select : 'id,donvi_id,time_slots'
		};
		return this.coSoDaoTaoService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<CoSoDaoTao[]> ) : BranchTimeSlots => {
				this._timeSlots = response.data.length ? ( response.data[ 0 ]?.time_slots || null ) : null;
				return this._timeSlots;
			} )
		);
	}

	private loadClassActivities( sessionIDs : number[] ) : Observable<ClassActivity[]> {
		if ( !isArray( sessionIDs ) || !sessionIDs.length ) {
			return of( [] );
		}
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'class_id' , condition : IctuQueryCondition.equal , value : this.classObject().id.toString( 10 ) } ,
			{ conditionName : 'type' , condition : IctuQueryCondition.equal , value : 'HOAT_DONG' , orWhere : 'and' } ,
			{ conditionName : 'status' , condition : IctuQueryCondition.equal , value : 'APPROVED' , orWhere : 'and' }
		];
		const queryParams : IctuQueryParams     = {
			limit      : -1 ,
			paged      : 1 ,
			include    : sessionIDs.join( ',' ) ,
			include_by : 'class_session_id' ,
			select     : 'id,donvi_id,class_id,class_session_id,type,content,comment,student_ids,params,media,featured,created_by,status' ,
			with       : 'employee'
		};
		queryParams[ 'student_ids' ]            = this.classObject().student.id;
		return this.classActivitiesService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassActivity[]> ) : ClassActivity[] => response.data )
		);
	}

	private loadClassMedia( sessionIDs : number[] ) : Observable<ClassMedia[]> {
		if ( !isArray( sessionIDs ) || !sessionIDs.length ) {
			return of( [] );
		}
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'class_id' , condition : IctuQueryCondition.equal , value : this.classObject().id.toString( 10 ) } ,
			{ conditionName : 'status' , condition : IctuQueryCondition.equal , value : 'APPROVED' , orWhere : 'and' } ,
		];
		const queryParams : IctuQueryParams     = {
			limit      : -1 ,
			paged      : 1 ,
			include    : sessionIDs.join( ',' ) ,
			include_by : 'class_session_id' ,
			select     : 'id,donvi_id,class_id,class_session_id,type,content,student_ids,speaking_test,media,featured,created_by,criteria_scores,status' ,
			with       : 'employee'
		};
		queryParams[ 'student_ids' ]            = this.classObject().student.id;
		return this.classMediaService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassMedia[]> ) : ClassMedia[] => response.data )
		);
	}

	protected onChangePage( paged : number ) : void {
		this._loadData( { paged , resetPaginator : false } );
	}

	protected onDialogHide() : void {
		this.activatedSession.set( null );
		this.increaseSession();
	}

	protected getPublicSessionContent( event : MouseEvent | KeyboardEvent , lesson : ParentClassSessionExtended ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.showPublicLessonContentObserver.next( {
			session : this.session() ,
			data    : lesson ,
			type    : 'PUBLIC_LESSON_CONTENT'
		} );
	}

	protected btnShowComments( session : ParentClassSessionExtended ) : void {
		if ( session.activities.length ) {
			this.showPublicLessonContentObserver.next( {
				session : this.session() ,
				data    : session ,
				type    : 'COMMENTS'
			} );
		}
	}

	protected btnShowMedia( session : ParentClassSessionExtended ) : void {
		if ( session.media.length ) {
			this.showPublicLessonContentObserver.next( {
				session : this.session() ,
				data    : session ,
				type    : 'MEDIA'
			} );
		}
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
