import { Component , computed , inject , input , InputSignal , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { catchError , concatMap , debounceTime , delay , filter , map , merge , Observable , of , Subject , takeUntil , tap } from 'rxjs';
import { AppState } from '@models/app-state';
import { IctuPaginatorControl } from '@theme/components/ictu-paginator/ictu-paginator-control';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { NgScrollbar } from 'ngx-scrollbar';
import { FindInArrayPipe } from '@pipes/find-in-array.pipe';
import { MatMenu , MatMenuItem , MatMenuTrigger } from '@angular/material/menu';
import { BranchOption , CoSoDaoTaoService , selectDefaultBranch } from '@services/co-so-dao-tao.service';
import { ClassActivity } from '@models/class-activities';
import { CoSoDaoTao } from '@models/co-so-dao-tao';
import { AuthenticationService } from '@services/authentication.service';
import { ClassMediaService } from '@services/class-media.service';
import { ClassActivitiesService } from '@services/class-activities.service';
import { distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { getMonthBoundaryDates , isSameRange } from '@utilities/helper';
import dayjs from '@setup/dayjs';
import { DatePicker } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { ClassMedia } from '@models/class-media';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { Select } from 'primeng/select';
import { IctuDropdownOptionElement } from '@models/ictu-dropdown-option';
import { ContentReviewerComment , ContentReviewerData , ContentReviewerDataState , ContentReviewerMedia , ContentReviewerType } from '../../models/content-reviewer-data';
import { ContentReviewerActivityComponent , RewriteFeedbackDto } from '@pages/admin/children/content-reviewer/children/content-reviewer-activity/content-reviewer-activity.component';
import { ContentReviewerMediaComponent , RewriteMediaCommentDto } from '@pages/admin/children/content-reviewer/children/content-reviewer-media/content-reviewer-media.component';
import { DatePipe , NgClass , NgOptimizedImage } from '@angular/common';
import { ContentReviewerInfoPipe } from '@pages/admin/children/content-reviewer/pipes/content-reviewer-info.pipe';
import { assign , filter as _filter } from 'lodash-es';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';
import { IctuDataTablePaginatorInfo } from '@models/datatable';
import { ContentReviewerForPipe } from '@pages/admin/children/content-reviewer/pipes/content-reviewer-for.pipe';
import { StudentAvatarPipe } from '@pipes/student-avatar.pipe';
import { ContentReviewerGetMembersPipe } from '@pages/admin/children/content-reviewer/pipes/content-reviewer-get-members.pipe';
import { ContentReviewerHasStudentsPipe } from '@pages/admin/children/content-reviewer/pipes/content-reviewer-has-students.pipe';
import { Textarea } from 'primeng/textarea';

export type ContentReviewerListType = 'pending' | 'rejected' | 'approved';

const titleTranslator : Record<ContentReviewerListType , string> = {
	approved : 'Danh sách nội dung đã duyệt' ,
	pending  : 'Danh sách nội dung chờ duyệt' ,
	rejected : 'Danh sách nội dung không đạt'
};

interface TriggerDirtySession {
	session : number;
	postID : number;
}

@Component( {
	selector    : 'app-content-reviewer-list' ,
	imports     : [ IctuPaginatorComponent , LoadingProgressComponent , NgScrollbar , FindInArrayPipe , MatMenuTrigger , MatMenu , MatMenuItem , DatePicker , FormsModule , Select , ContentReviewerActivityComponent , ContentReviewerMediaComponent , NgClass , DatePipe , ContentReviewerInfoPipe , MatTooltip , MatButton , ContentReviewerForPipe , NgOptimizedImage , StudentAvatarPipe , ContentReviewerGetMembersPipe , ContentReviewerHasStudentsPipe , Textarea ] ,
	templateUrl : './content-reviewer-list.component.html' ,
	styleUrls   : [ '../../css/timeline.css' , './content-reviewer-list.component.css' ]
} )
export class ContentReviewerListComponent implements OnDestroy {

	type : InputSignal<ContentReviewerListType> = input.required<ContentReviewerListType>();

	protected readonly title : Signal<string> = computed( () : string => titleTranslator[ this.type() ] );

	protected contentType : WritableSignal<ContentReviewerType> = signal( 'ClassMedia' );

	protected readonly contentTypeOptions : WritableSignal<IctuDropdownOptionElement<ContentReviewerType>[]> = signal( [
		{ value : 'ClassMedia' , label : 'Media' } ,
		{ value : 'ClassActivity' , label : 'Nhận xét' }
	] );

	protected readonly contentTypeLabel : Signal<string> = computed( () : string => this.contentTypeOptions().find( ( _opt : IctuDropdownOptionElement<ContentReviewerType> ) : boolean => _opt.value === this.contentType() )?.label ?? '' );

	private auth : AuthenticationService = inject( AuthenticationService );

	private classMediaService : ClassMediaService = inject( ClassMediaService );

	private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );

	private classActivitiesService : ClassActivitiesService = inject( ClassActivitiesService );

	private destroyed$ : Subject<void> = new Subject<void>();

	private triggerDirtyObserver : Subject<TriggerDirtySession> = new Subject<TriggerDirtySession>();

	private filterChangedObserver : Subject<number> = new Subject<number>();

	private reloadDataObserver : Subject<number> = new Subject<number>();

	protected readonly state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	protected readonly paginator : IctuPaginatorControl = new IctuPaginatorControl( { pageLinkSize : 3 , rows : 20 , showFirstLastIcon : false } );

	readonly branches : WritableSignal<BranchOption[]> = signal<BranchOption[]>( [] );

	readonly branchID : WritableSignal<number> = signal<number>( 0 );

	private section : WritableSignal<number> = signal( 1 );

	protected rangeDates : WritableSignal<Date[]> = signal( getMonthBoundaryDates( new Date() ) );

	private readonly dateStart : Signal<string> = computed( () : string => {
		return this.rangeDates()[ 0 ] ? [ dayjs( this.rangeDates()[ 0 ] ).format( 'YYYY-MM-DD' ) , '00:00:00' ].join( ' ' ) : '';
	} );

	private readonly dateEnd : Signal<string> = computed( () : string => {
		return this.rangeDates()[ 1 ] ? [ dayjs( this.rangeDates()[ 1 ] ).format( 'YYYY-MM-DD' ) , '23:23:00' ].join( ' ' ) : '';
	} );

	private _temp : IctuDataTablePaginatorInfo = { paged : 1 , resetPaginator : true };

	protected posts : WritableSignal<ContentReviewerData[]> = signal( [] );

	protected readonly dirty : Signal<boolean> = computed( () : boolean => this.posts().some( ( post : ContentReviewerData ) : boolean => post.dirty ) );

	get donViID() : number {
		return this.auth.user.donvi_id;
	}

	private updatePostsObserver : Subject<number> = new Subject<number>();

	protected readonly enableProgressbar : WritableSignal<boolean> = signal( false );

	protected readonly syncProgress : WritableSignal<number> = signal( 0 );

	constructor() {
		merge(
			toObservable( this.branchID ).pipe( distinctUntilChanged() ) ,
			toObservable( this.rangeDates ).pipe(
				filter( ( rangeDates : Date[] ) : boolean => rangeDates.every( Boolean ) ) ,
				distinctUntilChanged( ( previous : Date[] , current : Date[] ) : boolean => previous ? isSameRange( previous , current ) : false )
			) ,
			toObservable( this.contentType ).pipe( distinctUntilChanged() )
		).pipe(
			takeUntilDestroyed()
		).subscribe( () : void => {
			this.resetFilter();
		} );

		merge<[ IctuDataTablePaginatorInfo , IctuDataTablePaginatorInfo ]>(
			this.filterChangedObserver.asObservable().pipe(
				distinctUntilChanged() ,
				map( () : IctuDataTablePaginatorInfo => ( { paged : 1 , resetPaginator : true } ) )
			) ,
			this.reloadDataObserver.asObservable().pipe(
				distinctUntilChanged() ,
				map( () : IctuDataTablePaginatorInfo => this._temp )
			)
		).pipe(
			takeUntilDestroyed()
		).subscribe( ( { paged , resetPaginator } : IctuDataTablePaginatorInfo ) : void => {
			this._loadData( paged , resetPaginator );
		} );

		this.updatePostsObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged() ,
			debounceTime( 500 )
		).subscribe( () : void => {
			this._updatePosts();
		} );

		this.triggerDirtyObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged( ( previous : TriggerDirtySession , current : TriggerDirtySession ) : boolean => previous?.session === current.session && previous.postID === current.postID ) ,
			debounceTime( 500 )
		).subscribe( ( response : TriggerDirtySession ) : void => {
			this.markPostDirty( response );
		} );
	}

	private resetFilter() : void {
		this.filterChangedObserver.next( this.section() );
	}

	private _loadData( paged : number = 1 , resetPaginator : boolean = true ) : void {
		this._temp = { paged , resetPaginator };
		this.state.set( 'loading' );
		this.enableProgressbar.set( false );
		if ( this.branchID() ) {
			this.state.set( 'success' );
			const request$ : Observable<DtoObject<ContentReviewerData[]>> = this.contentType() === 'ClassMedia' ? this._classMediaLoader( paged ) : this._classCommentsLoader( paged );
			request$.pipe(
				takeUntil( this.destroyed$ ) ,
				map( ( response : DtoObject<ContentReviewerData[]> ) : ContentReviewerData[] => {
					if ( resetPaginator ) {
						return this.paginator.setupPaginator( response );
					} else {
						this.paginator.changePage( paged );
						return response.data;
					}
				} )
			).subscribe( {
				next  : ( response : ContentReviewerData[] ) : void => {
					this.increateSectionID();
					this.posts.set( response );
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

	private _classMediaLoader( paged : number = 1 ) : Observable<DtoObject<ContentReviewerMedia[]>> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'donvi_id' , condition : IctuQueryCondition.equal , value : this.donViID.toString() } ,
			{ conditionName : 'created_at' , condition : IctuQueryCondition.greaterThanToEqualsTo , value : this.dateStart() , orWhere : 'and' } ,
			{ conditionName : 'created_at' , condition : IctuQueryCondition.lessThanOrEqualsTo , value : this.dateEnd() , orWhere : 'and' }
		];
		switch ( this.type() ) {
			case 'approved':
				conditions.push( { conditionName : 'status' , condition : IctuQueryCondition.equal , value : 'APPROVED' , orWhere : 'and' } );
				break;
			case 'pending':
				conditions.push( { conditionName : 'status' , condition : IctuQueryCondition.equal , value : 'PENDING_REVIEW' , orWhere : 'and' } );
				break;
			case 'rejected':
				conditions.push( { conditionName : 'status' , condition : IctuQueryCondition.equal , value : 'REJECTED' , orWhere : 'and' } );
				break;
			default:
				break;
		}
		const queryParams : IctuQueryParams = {
			limit : this.paginator.rows() ,
			paged : paged ,
			with  : 'employee,objects,class_session,activity_class'
		};
		return this.classMediaService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassMedia[]> ) : DtoObject<ContentReviewerMedia[]> => {
				return {
					... response , data : response.data.map( ( row : ClassMedia ) : ContentReviewerMedia => {
						return {
							origin_content : '' ,
							... row ,
							dataType       : 'ClassMedia' ,
							employee       : row[ 'employee' ] ,
							objects        : row[ 'objects' ] ,
							activity_class : row[ 'activity_class' ] ,
							class_session  : row[ 'class_session' ] ,
							dirty          : false
						};
					} )
				};
			} )
		);
	}

	private _classCommentsLoader( paged : number = 1 ) : Observable<DtoObject<ContentReviewerComment[]>> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'type' , condition : IctuQueryCondition.equal , value : 'HOAT_DONG' } ,
			{ conditionName : 'created_at' , condition : IctuQueryCondition.greaterThanToEqualsTo , value : this.dateStart() , orWhere : 'and' } ,
			{ conditionName : 'created_at' , condition : IctuQueryCondition.lessThanOrEqualsTo , value : this.dateEnd() , orWhere : 'and' }
		];
		switch ( this.type() ) {
			case 'approved':
				conditions.push( { conditionName : 'status' , condition : IctuQueryCondition.equal , value : 'APPROVED' , orWhere : 'and' } );
				break;
			case 'pending':
				conditions.push( { conditionName : 'status' , condition : IctuQueryCondition.equal , value : 'PENDING_REVIEW' , orWhere : 'and' } );
				break;
			case 'rejected':
				conditions.push( { conditionName : 'status' , condition : IctuQueryCondition.equal , value : 'REJECTED' , orWhere : 'and' } );
				break;
			default:
				break;
		}
		const queryParams : IctuQueryParams = {
			limit      : this.paginator.rows() ,
			paged      : paged ,
			include    : this.donViID.toString() ,
			include_by : 'donvi_id' ,
			with       : 'employee,objects,class_session,activity_class'
		};
		return this.classActivitiesService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<ClassActivity[]> ) : DtoObject<ContentReviewerComment[]> => {
				return {
					... response , data : response.data.map( ( row : ClassActivity ) : ContentReviewerComment => {
						return {
							... row ,
							dataType       : 'ClassActivity' ,
							employee       : row[ 'employee' ] ,
							objects        : row[ 'objects' ] ,
							activity_class : row[ 'activity_class' ] ,
							class_session  : row[ 'class_session' ] ,
							dirty          : false
						};
					} )
				};
			} )
		);
	}

	protected onChangePage( paged : number ) : void {
		this._loadData( paged , false );
	}

	protected reload( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.reloadDataObserver.next( this.section() );
	}

	private increateSectionID() : void {
		this.section.update( ( _num : number ) : number => _num + 1 );
	}

	protected btnChangeAgent( agentID : number ) : void {
		if ( this.branchID() !== agentID ) {
			this.branchID.set( agentID );
		}
	}

	protected btnChangeContentReviewerDataState( post : ContentReviewerData , status : ContentReviewerDataState ) : void {
		let info : Pick<ContentReviewerData , 'status' | 'featured' | 'dirty' | 'reviewed_by'>;
		switch ( status ) {
			case 'approved':
				info = { status : 'APPROVED' , featured : 0 , dirty : true , reviewed_by : this.auth.user.id };
				break;
			case 'featured':
				info = { status : 'APPROVED' , featured : 1 , dirty : true , reviewed_by : this.auth.user.id };
				break;
			case 'rejected':
				info = { status : 'REJECTED' , featured : 0 , dirty : true , reviewed_by : this.auth.user.id };
				break;
		}

		if ( info.status !== post.status || info.featured !== post.featured ) {
			post = assign( post , info );
			this.posts.update( ( _posts : ContentReviewerData[] ) : ContentReviewerData[] => _posts.map( ( _post : ContentReviewerData ) : ContentReviewerData => {
				if ( _post.id !== post.id ) {
					return _post;
				} else {
					return assign( _post , info );
				}
			} ) );
		}
	}

	protected triggerDirtyPost( post : ContentReviewerData ) : void {
		this.triggerDirtyObserver.next( {
			session : this.section() ,
			postID  : post.id
		} );
	}

	private markPostDirty( { postID } : TriggerDirtySession ) : void {
		this.posts.update( ( _posts : ContentReviewerData[] ) : ContentReviewerData[] => _posts.map( ( _post : ContentReviewerData ) : ContentReviewerData => {
			if ( _post.id !== postID ) {
				return _post;
			} else {
				return { ... _post , dirty : true };
			}
		} ) );
	}

	protected btnUpdatePosts() : void {
		this.state.set( 'loading' );
		this.updatePostsObserver.next( this.section() );
		this.syncProgress.set( 0 );
	}

	private _updatePosts() : void {
		this.enableProgressbar.set( true );
		this._updatePostsSequentially().pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : () : void => {
				this.increateSectionID();
				this.filterChangedObserver.next( this.section() );
			} ,
			error : () : void => {
				this.increateSectionID();
				this.state.set( 'success' );
				this.enableProgressbar.set( false );
			}
		} );
	}

	private _updatePostsSequentially() : Observable<boolean> {
		const waitingList : ContentReviewerData[] = _filter( this.posts() , { dirty : true } );
		const totalRequests : number              = waitingList.length;
		return waitingList.reduce( ( reducer : Observable<number> , post : ContentReviewerData ) : Observable<number> => {
			return reducer.pipe(
				concatMap( ( complete : number ) : Observable<number> => {
					return this.updateContentReviewerData( post ).pipe(
						map( () : number => ( 1 + complete ) ) ,
						catchError( () : Observable<number> => of( complete ) ) ,  // Nếu có lỗi, vẫn tiếp tục
						tap( ( totalComplete : number ) : void => {
							this.syncProgress.set( Math.floor( ( totalComplete / totalRequests ) * 100 ) );
						} ) ,
						delay( 100 )
					);
				} )
			);
		} , of( 0 ) ).pipe(
			map( ( totalCompleted : number ) : boolean => ( totalRequests === totalCompleted ) )
		);
	}

	private updateContentReviewerData( info : ContentReviewerData ) : Observable<any> {
		const { dataType , id , status , featured } = info;
		return dataType === 'ClassMedia' ? this.classMediaService.update( id , { status , featured , origin_content : info.origin_content , content : info.content , reviewed_by : info.reviewed_by , rejection_reason : info.rejection_reason } ) : this.classActivitiesService.update( id , { status , featured , comment : info.comment , comment_origin : info.comment_origin , reviewed_by : info.reviewed_by , rejection_reason : info.rejection_reason } );
	}

	protected onRewriteFeedback( { id , comment , comment_origin } : RewriteFeedbackDto ) : void {
		this.posts.update( ( _list : ContentReviewerData[] ) : ContentReviewerData[] => {
			return _list.map( ( post : ContentReviewerData ) : ContentReviewerData => {
				return post.id === id ? assign( post , { comment , comment_origin , dirty : true } ) : post;
			} );
		} );
	}

	protected onRewriteSpeakingTestComment( { id , content , origin_content } : RewriteMediaCommentDto ) : void {
		this.posts.update( ( _list : ContentReviewerData[] ) : ContentReviewerData[] => {
			return _list.map( ( post : ContentReviewerData ) : ContentReviewerData => {
				return post.id === id ? assign( post , { content , origin_content , dirty : true } ) : post;
			} );
		} );
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
