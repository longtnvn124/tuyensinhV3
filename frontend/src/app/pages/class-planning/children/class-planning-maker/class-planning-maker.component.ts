import { Component , inject , input , InputSignal , OnDestroy , OnInit , Signal , signal , TemplateRef , viewChild , WritableSignal } from '@angular/core';
import { AppState } from '@models/app-state';
import { DividerModule } from 'primeng/divider';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { IctuDataTable } from '@models/datatable';
import { IctuQueryCondition } from '@models/dto';
import { filter , forkJoin , map , Observable , Subject , switchMap } from 'rxjs';
import { AuthenticationService } from '@services/authentication.service';
import { ActivatedRoute } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '@services/notification.service';
import { Editor , Toolbar } from 'ngx-editor';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import { ClassPlanningChild , ClassPlanningRole } from '../../class-planning.component';
import { ClassSessionContent } from '@models/class-session-content';
import { ClassSessionContentService } from '@services/class-session-content.service';
import { Course , CourseLectureFormat } from '@app/models/course';
import { ClassSessionService } from '@app/services/class-session.service';
import { ClassSession } from '@app/models/class-session';
import { TabsModule } from 'primeng/tabs';
import { LopHoc } from '@app/models/lop-hoc';
import { LopHocService } from '@app/services/lop-hoc.service';
import { LoadingProgressComponent } from '@app/theme/components/loading-progress/loading-progress.component';
import { DomSanitizer } from '@angular/platform-browser';
import { SplitterModule } from 'primeng/splitter';
import { CourseLessonPlan , CourseLessonPlanContentItem } from '@app/models/course-lesson-plan';
import { CourseLesson } from '@app/models/course-lesson';
import { ClassActivitiesService } from '@app/services/class-activities.service';
import { ClassActivity , ContentComment } from '@app/models/class-activities';

interface lesson {
	idClassSession : number;
	indexLesson : number;
	indexContentLesson : number;
	classSession : ClassSession;
	activities : ClassActivity;
	oderingLesson : number;
	slugStructureSelected : string;
	structureLesson : CourseLessonPlanContentItem[];
	structureLessonSelect : CourseLessonPlanContentItem;
	structureLessonUpdate : CourseLessonPlanContentItem[];
	activitiesCommentSelect : ContentComment;
}

@Component( {
	selector    : 'class-planning-maker' ,
	imports     : [
		DividerModule ,
		IctuPaginatorComponent ,
		MatTooltipModule ,
		DialogModule ,
		FormsModule ,
		MatMenuModule ,
		CommonModule ,
		MatCheckboxModule ,
		TabsModule ,
		LoadingProgressComponent ,
		SplitterModule
	] ,
	templateUrl : './class-planning-maker.component.html' ,
	styleUrl    : './class-planning-maker.component.css'
} )
export class ClassPlanningMakerComponent implements OnInit , OnDestroy , ClassPlanningChild {

	class_id : InputSignal<number> = input.required<number>();

	role : InputSignal<ClassPlanningRole> = input.required<ClassPlanningRole>();

	private destroy$ : Subject<void> = new Subject<void>();

	state : WritableSignal<AppState | 'unauthorized'> = signal<AppState | 'unauthorized'>( 'loading' );

	private auth : AuthenticationService = inject( AuthenticationService );

	private activatedRoute : ActivatedRoute = inject( ActivatedRoute );

	private notification : NotificationService = inject( NotificationService );

	importDialogDirty : WritableSignal<boolean> = signal<boolean>( false );

	readonly importTemplate : Signal<TemplateRef<any>> = viewChild<TemplateRef<any>>( 'importTemplate' );

	originalValueLesson! : Partial<lesson>;

	listClassSessionContent : ClassSessionContent[] = [];

	get donviId () : number {
		return this.auth.user.donvi_id;
	}

	html                                      = '';
	editor : Editor;
	course : Course;
	listCourseLesson : CourseLesson[]         = [];
	listCourseLessonUnset : CourseLesson[]    = [];
	listCourseLessonPlan : CourseLessonPlan[] = [];
	listActivities : ClassActivity[];
	headingLoad : string                      = 'Loading...';
	toolbar                                   = [
		[ 'bold' , 'italic' , 'underline' ] ,
		[ 'heading' , 'blockquote' , 'code' , 'ordered_list' , 'bullet_list' ] ,
		[ 'link' ] ,
		[ 'text_color' , 'background_color' ] ,
		[ 'align_left' , 'align_center' , 'align_right' , 'align_justify' ]
	] as Toolbar;

	maxOrdering : number = 0;

	thoiluongLesson : number = 0;

	structureLesson : CourseLessonPlanContentItem[] = [];

	soluongAddLesson : number;

	private getDefaultLesson () : lesson {
		return {
			indexLesson             : -1 ,
			idClassSession          : -1 ,
			indexContentLesson      : -1 ,
			classSession            : null ,
			activities              : null ,
			slugStructureSelected   : '' ,
			oderingLesson           : null ,
			structureLesson         : [] ,
			structureLessonSelect   : null ,
			structureLessonUpdate   : [] ,
			activitiesCommentSelect : null
		};
	}

	valueLesson : lesson = this.getDefaultLesson();

	valueEditor : string = '';

	visibleDialogAddLesson : boolean = false;

	dataTableBaiGiang : IctuDataTable<ClassSession> =
		new IctuDataTable<ClassSession>();

	private lophocservice : LopHocService = inject( LopHocService );

	private classSessionservice : ClassSessionService =
		        inject( ClassSessionService );

	private classSessionContentservice : ClassSessionContentService = inject(
		ClassSessionContentService
	);

	private activitiesService : ClassActivitiesService = inject(
		ClassActivitiesService
	);

	course_id : WritableSignal<number> = signal<number>( 0 );

	private _temp : { paged : number; resetPaginator : boolean } = {
		paged          : 1 ,
		resetPaginator : true
	};

	private onDestroy$ : Subject<string> = new Subject<string>();

	constructor ( private sanitizer : DomSanitizer ) {
	}

	private _doReload () : void {
		this.loadData( this._temp.paged , this._temp.resetPaginator );
	}

	ngOnInit () : void {
		this.state.set( 'loading' );
		this.editor = new Editor();
		if ( ! this.auth.userHasRole( [ 'ceo' , 'training_management' ] ) ) {
			this.state.set( 'unauthorized' );
		}
		else {
			const dataID : number =
				      this.activatedRoute.snapshot.queryParamMap.has( 'id' )
				      ? parseInt(
					      this.activatedRoute.snapshot.queryParamMap.get( 'id' ) ,
					      10
				      )
				      : NaN;
			this.course_id.set( dataID );
		}
		this.preload().subscribe( {
			next  : () => {
				this.loadData( 1 , true );
			} ,
			error : () => {
				this.state.set( 'error' );
			}
		} );
	}

	preload () : Observable<LopHoc> {
		this.headingLoad = 'Loading...';
		this.state.set( 'loading' );
		return this.lophocservice.query(
			[
				{
					conditionName : 'id' ,
					value         : this.class_id().toString() ,
					condition     : IctuQueryCondition.equal
				}
			] ,
			{
				with : 'course,lessons,lesson_plan'
			}
		).pipe(
			map( ( res ) => {
				this.course = res.data[ 0 ].course ?? null;
				if ( res.data[ 0 ] ) {
					this.listCourseLesson     = res.data[ 0 ].lessons;
					this.listCourseLessonPlan = res.data[ 0 ].lesson_plan;
				}
				return res[ 0 ];
			} )
		);
	}

	loadData ( paged : number , resetPaginator : boolean = true ) {
		this.headingLoad = 'Loading...';
		this.state.set( 'loading' );
		this._temp = { paged , resetPaginator };
		forkJoin( {
			classSessionsContent : this.classSessionContentservice.load( this.donviId , this.class_id() , {
				limit : 1000 ,
				paged : 1
			} ).pipe(
				map( ( res ) => {
					return res.data;
				} )
			) ,
			classSessions        : this.classSessionservice.query(
				[
					{
						conditionName : 'class_id' ,
						value         : this.class_id().toString() ,
						condition     : IctuQueryCondition.equal
					}
				] ,
				{
					limit : this.dataTableBaiGiang.paginator.rows() ,
					paged ,
					with  : 'course_lesson'
				}
			).pipe(
				map( ( res ) : ClassSession[] => {
					this.thoiluongLesson = res.recordsFiltered;
					if ( resetPaginator ) {
						return this.dataTableBaiGiang.paginator.setupPaginator(
							res
						);
					}
					else {
						this.dataTableBaiGiang.paginator.changePage( paged );
						return res.data;
					}
				} )
			) ,
			classActivities      : this.activitiesService.query(
				[
					{
						conditionName : 'class_id' ,
						condition     : IctuQueryCondition.equal ,
						value         : this.class_id().toString() ,
						orWhere       : 'and'
					} ,
					{
						conditionName : 'type' ,
						condition     : IctuQueryCondition.equal ,
						value         : 'NHAN_XET' ,
						orWhere       : 'and'
					}
				] ,
				{
					limit      : -1 ,
					paged      : 1 ,
					include    : this.donviId ,
					include_by : 'donvi_id'
				}
			)
		} ).subscribe( {
			next  : ( {
				classSessions ,
				classSessionsContent ,
				classActivities
			} ) => {
				this.dataTableBaiGiang.fillData( classSessions );
				this.listClassSessionContent = classSessionsContent;
				this.listActivities          = classActivities.data;
				this.sortListClassLesson();
				this.state.set( 'success' );
			} ,
			error : () => {
				this.state.set( 'error' );
			}
		} );
	}

	sortListClassLesson () : void {
		this.listCourseLesson      = this.listCourseLesson.filter( ( item ) => item.parent_id !== 0 ).sort( ( a , b ) => a.ordering - b.ordering );
		const compareValues        = this.dataTableBaiGiang.data().map( ( item ) => item.course_lesson_id );
		this.listCourseLessonUnset = this.listCourseLesson.filter(
			( item ) => ! compareValues.includes( item.id )
		);
		const tam                  = this.dataTableBaiGiang.data();
		for ( let i = 0 ; i < tam.length ; i++ ) {
			if ( tam[ i ].course_lesson_id == 0 ) {
				tam[ i ].course_lesson_id = this.listCourseLessonUnset[ 0 ].id;
				break;
			}
		}
		this.dataTableBaiGiang.fillData( tam );
	}

	selectLesson (
		index : number ,
		lesson : CourseLessonPlan ,
		idClassSession : number ,
		classSession : ClassSession
	) {
		this.valueLesson.classSession = classSession;
		if ( index != this.valueLesson.indexLesson ) {
			this.valueLesson.idClassSession     = idClassSession;
			this.valueLesson.indexLesson        = index;
			this.valueLesson.oderingLesson      = lesson.ordering;
			this.valueLesson.indexContentLesson = 0;
			if ( ! lesson.content ) {
				this.valueLesson.structureLesson = this.course.lecture_format.map( ( item ) => ( { ... item , content : '' } ) );
			}
			else {
				let noidungTam : CourseLessonPlanContentItem[] = lesson.content;
				for ( let item of this.course.lecture_format ) {
					if ( ! noidungTam.find( ( itemz ) : boolean => itemz.slug === item.slug ) ) {
						noidungTam.push( {
							order      : item.order ,
							title      : item.title ,
							slug       : item.slug ,
							fileID     : item.fileID ?? 0 ,
							totalPages : item.totalPages ?? 0 ,
							content    : ''
						} );
					}
				}
				this.valueLesson.structureLesson       = lesson.content;
				this.valueLesson.structureLessonSelect = this.valueLesson.structureLesson.find( ( item ) => item.slug == this.course.lecture_format[ 0 ].slug );
				this.valueLesson.slugStructureSelected = this.course.lecture_format[ 0 ].slug;
			}
			const activities = this.listActivities.find( ( item ) => item.class_session_id == this.valueLesson.idClassSession );
			if ( activities ) {
				this.valueLesson.activities = activities;
			}
			else {
				this.valueLesson.activities = {
					id      : 0 ,
					type    : 'NHAN_XET' ,
					content : this.generateCommentList( this.course.lecture_format )
				} as ClassActivity;
			}
			this.valueLesson.activitiesCommentSelect = this.valueLesson.activities.content.find( ( item ) => item.slug == this.course.lecture_format[ 0 ].slug );
			const tam : ClassSessionContent          = this.listClassSessionContent.find( ( item ) => item.course_lesson_id == this.valueLesson.classSession.course_lesson_id );
			if ( tam ) {
				this.valueLesson.structureLessonUpdate = tam.content;
			}
			else {
				this.valueLesson.structureLessonUpdate =
					this.valueLesson.structureLesson.map(
						( { title , slug , order , fileID , totalPages } ) => ( {
							title ,
							slug ,
							order ,
							fileID     : fileID ?? 0 ,
							totalPages : totalPages ?? 0 ,
							content    : ''
						} )
					);
			}
		}
		else {
			this.valueLesson = this.getDefaultLesson();
		}
	}

	selectStructureLesson ( index : number , slug : string ) {
		this.valueLesson.indexContentLesson      = index;
		this.valueLesson.structureLessonSelect   = this.valueLesson.structureLesson.find( ( item ) => item.slug == slug );
		this.valueLesson.slugStructureSelected   = slug;
		this.valueLesson.activitiesCommentSelect = this.valueLesson.activities.content.find( ( item ) => item.slug == slug );
	}

	idUpdateClassSession ( id : number ) : boolean {
		const tam = this.listClassSessionContent.find( ( item ) => item.class_session_id == id );
		return tam ? true : false;
	}

	getSafeHtmlContent ( str : string ) {
		const raw   = str;
		const fixed = raw.replace( /\\"/g , '"' );
		return this.sanitizer.bypassSecurityTrustHtml( fixed );
	}

	getContentViewValueEditor ( isUpdate : boolean ) {
		let result = '';
		if ( isUpdate ) {
			let tam = '';
			try {
				tam = this.valueLesson.structureLessonUpdate.find( ( item ) => item.slug == this.valueLesson.slugStructureSelected ).content;
			}
			catch ( e ) {
				tam = '';
			}
			result = tam;
		}
		else {
			result = this.valueLesson.structureLessonSelect.content;
		}
		return this.getSafeHtmlContent( result );
	}

	generateCommentList ( data : CourseLectureFormat[] ) : ContentComment[] {
		return data.map( ( item ) => ( {
			title   : item.title ,
			slug    : item.slug ,
			comment : ''
		} ) );
	}

	reload ( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.preload().subscribe( {
			next  : () => {
				this.loadData( this._temp.paged , this._temp.resetPaginator );
			} ,
			error : () => {
				this.state.set( 'error' );
			}
		} );
	}

	isContentEqual ( a : CourseLessonPlanContentItem[] , b : CourseLessonPlanContentItem[] ) : boolean {
		if ( a.length !== b.length ) return false;

		for ( let i = 0 ; i < a.length ; i++ ) {
			if ( a[ i ].content !== b[ i ].content ) {
				return false;
			}
		}

		return true;
	}

	onChangePage ( paged : number ) : void {
		this.valueLesson = this.getDefaultLesson();
		this.loadData( paged , false );
	}

	deleteRow ( id : number ) : void {
		this.requestDeletingData( [ id ] );
	}

	private requestDeletingData ( ids : number[] ) : void {
		this.notification.confirmDelete( ids.length ).pipe(
			filter( ( confirm : boolean ) : boolean => confirm ) ,
			map(
				() : IctuDeletingAnimationControl<ClassSession> =>
					new IctuDeletingAnimationControl(
						ids ,
						this.classSessionservice
					)
			) ,
			switchMap(
				(
					deleteController : IctuDeletingAnimationControl<ClassSession>
				) : Observable<boolean> => {
					deleteController.run();
					return this.notification.startDeleting(
						deleteController.progress
					);
				}
			)
		).subscribe( {
			next  : ( success : boolean ) : void => {
				if ( success ) {
					this.notification.toastSuccess( 'Xóa thành công' );
					this.maxOrdering--;
				}
				this.loadData( this._temp.paged , false );
			} ,
			error : () : void => {
				this.notification.toastError( 'Xóa thất bại' );
			}
		} );
	}

	getTitleClassSession ( course_lesson_id : number ) : string {
		const result = this.listCourseLesson.find(
			( item ) => item.id == course_lesson_id
		);
		return result ? result.title : '';
	}

	getCourseLessonPlan ( course_lesson_id : number ) : CourseLessonPlan {
		const result = this.listCourseLessonPlan.find(
			( item ) => item.course_lessons_id == course_lesson_id
		);
		return result;
	}

	ngOnDestroy () : void {
		this.editor.destroy();
		this.destroy$.next();
		this.destroy$.complete();
	}
}
