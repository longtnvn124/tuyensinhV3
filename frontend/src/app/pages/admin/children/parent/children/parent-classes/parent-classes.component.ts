import { Component , computed , inject , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { NgScrollbar } from 'ngx-scrollbar';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { IctuPaginatorControl } from '@theme/components/ictu-paginator/ictu-paginator-control';
import { AmsParent , AuthenticationService } from '@services/authentication.service';
import { map , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { AppState } from '@models/app-state';
import { Class } from '@models/class';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { HocSinhLopHoc } from '@models/hoc-sinh-lop-hoc';
import { HocSinhLopHocService } from '@services/hoc-sinh-lop-hoc.service';
import { ClassesService } from '@services/classes.service';
import { IctuDataTablePaginatorInfo } from '@models/datatable';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { HocSinh } from '@models/hoc-sinh';
import { filter as _filter , map as _map } from 'lodash-es';
import { ChildrenClasses } from '@pages/admin/children/parent/children/parent-dashboard/parent-dashboard.component';
import { joinSources } from '@utilities/join-sources';
import { Course } from '@models/course';
import { Employee } from '@models/employee';
import { EmployeePhotoPipe } from '@pipes/employee-photo.pipe';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu , MatMenuContent , MatMenuTrigger } from '@angular/material/menu';
import { StudentAvatarPipe } from '@pipes/student-avatar.pipe';
import { PublicAssetPipe } from '@pipes/public-asset.pipe';
import { Drawer } from 'primeng/drawer';
import { FormsModule , ReactiveFormsModule } from '@angular/forms';
import { ParentClassesAttendanceComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-classes-attendance/parent-classes-attendance.component';
import { ParentClassesLessonsComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-classes-lessons/parent-classes-lessons.component';
import { ParentClassesProgressComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-classes-progress/parent-classes-progress.component';

export interface ParentClassesData extends Pick<Class , 'id' | 'name' | 'course_id' | 'started_date' | 'donvi_id' | 'csdt_id' | 'code' | 'teacher_ids' | 'assistant_ids' | 'status' | 'total_student'> {
	student : HocSinh;
	course : Pick<Course , 'id' | 'title' | 'lecture_format' | 'type'>;
	teachers : Pick<Employee , 'id' | 'full_name' | 'email' | 'phone' | 'gender' | 'photo'>[];
	assistants : Pick<Employee , 'id' | 'full_name' | 'email' | 'phone' | 'gender' | 'photo'>[];
}

interface LoadDataEvent {
	section : number,
	type? : 'load' | 'reload'
}

type ButtonEventType = 'SHOW_CLASS_LESSONS' | 'SHOW_STUDENT_ATTENDANCE';

interface ButtonEvent {
	section : number,
	type : ButtonEventType,
	classObject : ParentClassesData
}

@Component( {
	selector    : 'app-parent-classes' ,
	standalone  : true ,
	imports     : [ NgScrollbar , IctuPaginatorComponent , EmployeePhotoPipe , MatTooltip , MatMenuTrigger , MatMenu , MatMenuContent , StudentAvatarPipe , PublicAssetPipe , Drawer , FormsModule , ReactiveFormsModule , ParentClassesAttendanceComponent , ParentClassesLessonsComponent , ParentClassesProgressComponent ] ,
	templateUrl : './parent-classes.component.html' ,
	styleUrl    : './parent-classes.component.css'
} )
export default class ParentClassesComponent implements OnDestroy {

	private auth : AuthenticationService = inject( AuthenticationService );

	private destroyed$ : Subject<void> = new Subject();

	protected state : WritableSignal<AppState> = signal( 'loading' );

	protected readonly paginator : IctuPaginatorControl = new IctuPaginatorControl( { pageLinkSize : 3 , rows : 20 , showFirstLastIcon : false } );

	private readonly loadDataObserver : Subject<LoadDataEvent> = new Subject<LoadDataEvent>();

	private readonly session : WritableSignal<number> = signal( 0 );

	private readonly hocSinhLopHocService : HocSinhLopHocService = inject( HocSinhLopHocService );

	private readonly classesService : ClassesService = inject( ClassesService );

	private _temp : IctuDataTablePaginatorInfo = { paged : 1 , resetPaginator : true };

	private students : WritableSignal<HocSinh[]> = signal( [] );

	protected readonly data : WritableSignal<ParentClassesData[]> = signal( [] );

	private readonly buttonEventObserver : Subject<ButtonEvent> = new Subject<ButtonEvent>();

	protected visibleDrawer : boolean = false;

	protected readonly popupEvent : WritableSignal<ButtonEvent> = signal<ButtonEvent>( null );

	protected readonly drawerHeader : Signal<string> = computed( () : string => this.popupEvent()?.type === 'SHOW_CLASS_LESSONS' ? `Chương trình học lớp ${ this.popupEvent()?.classObject.name }` : `Danh sách điểm danh học sinh : ${ this.popupEvent()?.classObject.student?.full_name || '' }` );

	constructor() {
		this.loadDataObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged( ( previous : LoadDataEvent , current : LoadDataEvent ) : boolean => previous?.section === current.section ) ,
			map( ( info : LoadDataEvent ) : IctuDataTablePaginatorInfo => {
				return info.type === 'reload' ? this._temp : { paged : 1 , resetPaginator : true };
			} )
		).subscribe( ( event : IctuDataTablePaginatorInfo ) : void => {
			this._loadData( event );
		} );

		this.auth.onParentSetup.pipe(
			takeUntilDestroyed()
		).subscribe( ( p : AmsParent ) : void => {
			this.students.set( p?.hocsinhs || [] );
			this.loadDataObserver.next( { section : this.session() } );
		} );

		this.buttonEventObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged( ( previous : ButtonEvent , current : ButtonEvent ) : boolean => previous?.section === current.section )
		).subscribe( ( event : ButtonEvent ) : void => {
			this.popupEvent.set( event );
			this.visibleDrawer = true;
		} );
	}

	protected onChangePage( paged : number ) : void {
		this._loadData( { paged , resetPaginator : false } );
	}

	private loadClasses( classIDs : number[] ) : Observable<Class[]> {
		if ( !classIDs.length ) {
			return of( [] );
		}
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'status' , condition : IctuQueryCondition.equal , value : '1' , orWhere : 'and' }
		];
		const queryParams : IctuQueryParams     = {
			include    : classIDs.join( ',' ) ,
			include_by : 'id' ,
			select     : 'id,name,course_id,started_date,donvi_id,csdt_id,code,teacher_ids,assistant_ids,status,total_student' ,
			limit      : classIDs.length ,
			paged      : 1 ,
			order      : 'ASC' ,
			orderby    : 'name' ,
			with       : 'course,teachers,assistants'
		};
		return this.classesService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<Class[]> ) : Class[] => response.data )
		);
	}

	private loadClassStudentFromStudentIDs( studentIDs : number[] ) : Observable<HocSinhLopHoc[]> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'status' , condition : IctuQueryCondition.equal , value : '1' }
		];
		const queryParams : IctuQueryParams     = {
			include    : studentIDs.join( ',' ) ,
			include_by : 'hocsinh_id' ,
			select     : 'id,class_id,status,hocsinh_id'
		};
		return this.hocSinhLopHocService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<HocSinhLopHoc[]> ) : HocSinhLopHoc[] => response.data )
		);
	}

	private _loadData( event : IctuDataTablePaginatorInfo ) : void {
		if ( this.students().length ) {
			this._temp = event;
			this.state.set( 'loading' );
			this.loadClassStudentFromStudentIDs( _map( this.students() , 'id' ) ).pipe(
				takeUntil( this.destroyed$ ) ,
				switchMap( ( classStudents : HocSinhLopHoc[] ) : Observable<ChildrenClasses> => {
					const classIDs : number[] = classStudents.length ? [ ... new Set( _map( classStudents , 'class_id' ) ) ] : [];
					return joinSources<ChildrenClasses>( {
						classes       : this.loadClasses( classIDs ) ,
						classStudents : of( classStudents )
					} );
				} )
			).subscribe( {
				next  : ( { classes , classStudents } : ChildrenClasses ) : void => {
					this.data.set( this.students().reduce( ( reducer : ParentClassesData[] , student : HocSinh ) : ParentClassesData[] => {
						const _childClassIds : number[] = _map( _filter( classStudents , { hocsinh_id : student.id } ) , 'class_id' );
						const _childClass : Class[]     = _filter( classes , ( c : Class ) : boolean => _childClassIds.includes( c.id ) );
						reducer.push( ... _map( _childClass , ( classObject : Class ) : ParentClassesData => {
							return {
								... classObject ,
								student ,
								course     : classObject[ 'course' ] ,
								teachers   : classObject[ 'teachers' ] ,
								assistants : classObject[ 'assistants' ]
							};
						} ) );
						return reducer;
					} , new Array<ParentClassesData>() ) );
					this.increaseSession();
					this.state.set( 'success' );
				} ,
				error : () : void => {
					this.increaseSession();
					this.state.set( 'error' );
				}
			} );
		} else {
			this.state.set( 'success' );
		}
	}

	private increaseSession() : void {
		this.session.update( ( value : number ) : number => 1 + value );
	}

	protected reload( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadDataObserver.next( { section : this.session() , type : 'reload' } );
	}

	protected avoidCloseMenuByClicking( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
	}

	protected btnGetClassLesson( classObject : ParentClassesData ) : void {
		this.buttonEventObserver.next( { section : this.session() , type : 'SHOW_CLASS_LESSONS' , classObject } );
	}

	protected btnGetClassCheckin( classObject : ParentClassesData ) : void {
		this.buttonEventObserver.next( { section : this.session() , type : 'SHOW_STUDENT_ATTENDANCE' , classObject } );
	}

	protected onDrawerHide() : void {
		this.increaseSession();
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
