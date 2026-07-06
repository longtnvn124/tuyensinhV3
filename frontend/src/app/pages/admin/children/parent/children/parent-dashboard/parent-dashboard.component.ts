import { Component , inject , OnDestroy , Signal , signal , WritableSignal } from '@angular/core';
import { map , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { NgScrollbar } from 'ngx-scrollbar';
import { AmsParent , AuthenticationService } from '@services/authentication.service';
import { AppState } from '@models/app-state';
import { distinctUntilChanged } from 'rxjs/operators';
import { filter as _filter , map as _map , sortBy } from 'lodash-es';
import { IctuDropdownOptionElement } from '@models/ictu-dropdown-option';
import { NgClass } from '@angular/common';
import { FindInArrayPipe } from '@pipes/find-in-array.pipe';
import { MatProgressBar } from '@angular/material/progress-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HocSinh } from '@models/hoc-sinh';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { HocSinhLopHocService } from '@services/hoc-sinh-lop-hoc.service';
import { HocSinhLopHoc } from '@models/hoc-sinh-lop-hoc';
import { ParentDashboardClassProgressComponent , ParentDashboardClassProgressInput } from '@pages/admin/children/parent/children/parent-dashboard/children/parent-dashboard-class-progress/parent-dashboard-class-progress.component';
import { Class } from '@models/class';
import { joinSources } from '@utilities/join-sources';
import { ClassesService } from '@services/classes.service';

type ReminderPriority = 'low' | 'medium' | 'high';

interface Reminders {
	title : string;
	desc : string;
	priority : ReminderPriority;
}

const reminderOrderingLib : Record<ReminderPriority , number> = {
	high   : 10 ,
	medium : 20 ,
	low    : 30
};

const reminderOrdering : ( reminder : Reminders ) => number = ( reminder : Reminders ) : number => {
	return reminderOrderingLib[ reminder.priority ];
};

export interface ChildrenClasses {
	classStudents : HocSinhLopHoc[],
	classes : Class[],
}

@Component( {
	selector    : 'app-parent-dashboard' ,
	imports     : [ NgScrollbar , NgClass , FindInArrayPipe , MatProgressBar , ParentDashboardClassProgressComponent ] ,
	templateUrl : './parent-dashboard.component.html' ,
	styleUrl    : './parent-dashboard.component.css'
} )
export default class ParentDashboardComponent implements OnDestroy {

	private auth : AuthenticationService = inject( AuthenticationService );

	private destroyed$ : Subject<void> = new Subject();

	protected state : WritableSignal<AppState> = signal( 'loading' );

	private students : WritableSignal<HocSinh[]> = signal( [] );

	protected readonly activeStudents : WritableSignal<string> = signal( 'loading...' );

	protected readonly totalClasses : WritableSignal<string> = signal( 'loading...' );

	protected readonly unreadNotifications : WritableSignal<string> = signal( 'loading...' );

	protected readonly tuitionReminders : WritableSignal<string> = signal( 'loading...' );

	protected readonly reminders : WritableSignal<Reminders[]> = signal<Reminders[]>( sortBy( [] , reminderOrdering ) );

	protected readonly reminderCssClassOptions : Signal<IctuDropdownOptionElement<ReminderPriority>[]> = signal<IctuDropdownOptionElement<ReminderPriority>[]>( [ { label : 'priority-low' , value : 'low' } , { label : 'priority-medium' , value : 'medium' } , { label : 'priority-high' , value : 'high' } ] );

	private loadDataObserver : Subject<number> = new Subject<number>();

	private readonly session : WritableSignal<number> = signal( 0 );

	private readonly hocSinhLopHocService : HocSinhLopHocService = inject( HocSinhLopHocService );

	protected readonly data : WritableSignal<ParentDashboardClassProgressInput[]> = signal( [] );

	private readonly classesService : ClassesService = inject( ClassesService );

	constructor() {
		this.loadDataObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this.loadData();
		} );

		this.auth.onParentSetup.pipe(
			takeUntilDestroyed()
		).subscribe( ( p : AmsParent ) : void => {
			this.students.set( p?.hocsinhs || [] );
			this.loadDataObserver.next( this.session() );
		} );
	}

	private loadData() : void {
		if ( this.students().length ) {
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
					this.data.set( this.students().reduce( ( reducer : ParentDashboardClassProgressInput[] , student : HocSinh ) : ParentDashboardClassProgressInput[] => {
						const _childClassIds : number[] = _map( _filter( classStudents , { hocsinh_id : student.id } ) , 'class_id' );
						const _childClass : Class[]     = _filter( classes , ( c : Class ) : boolean => _childClassIds.includes( c.id ) );
						reducer.push( ... _map( _childClass , ( classObject : Class ) : ParentDashboardClassProgressInput => ( { student , classObject } ) ) );
						return reducer;
					} , new Array<ParentDashboardClassProgressInput>() ) );
					this.activeStudents.set( this.students().length.toString( 10 ) );
					this.totalClasses.set( this.data().length.toString( 10 ) );
					this.unreadNotifications.set( '0' );
					this.tuitionReminders.set( '0' );
					this.increaseSession();
					this.state.set( 'success' );
				} ,
				error : () : void => {
					this.increaseSession();
					this.state.set( 'error' );
				}
			} );
		} else {
			this.activeStudents.set( '0' );
			this.totalClasses.set( '0' );
			this.unreadNotifications.set( '0' );
			this.tuitionReminders.set( '0' );
			this.state.set( 'success' );
		}
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
			select     : 'id,name,time_slots,status,course_id' ,
			limit      : classIDs.length ,
			paged      : 1 ,
			order      : 'ASC' ,
			orderby    : 'name'
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

	protected reload( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadDataObserver.next( this.session() );
	}

	private increaseSession() : void {
		this.session.update( ( value : number ) : number => 1 + value );
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
