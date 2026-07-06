import { Component , inject , input , InputSignal , OnDestroy , signal , WritableSignal } from '@angular/core';
import { filter , map , Observable , Subject , takeUntil } from 'rxjs';
import { AppState } from '@models/app-state';
import { Class } from '@models/class';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { ClassSession } from '@models/class-session';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { ClassSessionService } from '@services/class-session.service';
import { filter as _filter } from 'lodash-es';
import { ClassProgressCalculatorComponent } from '@components/class-progress-calculator/class-progress-calculator.component';

type ParentClassesProgressInputType = Pick<Class , 'id' | 'course_id'>

@Component( {
	selector    : 'parent-classes-progress' ,
	imports     : [ ClassProgressCalculatorComponent ] ,
	templateUrl : './parent-classes-progress.component.html' ,
	styleUrl    : './parent-classes-progress.component.css'
} )
export class ParentClassesProgressComponent implements OnDestroy {

	classObject : InputSignal<ParentClassesProgressInputType> = input.required<ParentClassesProgressInputType>();

	private destroyed$ : Subject<void> = new Subject();

	protected state : WritableSignal<AppState> = signal( 'loading' );

	private readonly loadDataObserver : Subject<number> = new Subject<number>();

	private readonly session : WritableSignal<number> = signal( 0 );

	protected readonly completionRate : WritableSignal<number> = signal( 0 );

	private readonly classSessionService : ClassSessionService = inject( ClassSessionService );

	constructor() {
		this.loadDataObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged()
		).subscribe( () : void => {
			this._load();
		} );

		toObservable( this.classObject ).pipe(
			takeUntilDestroyed() ,
			filter( Boolean ) ,
			distinctUntilChanged( ( previous : ParentClassesProgressInputType , current : ParentClassesProgressInputType ) : boolean => previous?.id === current.id )
		).subscribe( () : void => {
			this.loadData();
		} );
	}

	private increaseSession() : void {
		this.session.update( ( value : number ) : number => 1 + value );
	}

	protected reload( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData();
	}

	private loadData() : void {
		this.loadDataObserver.next( this.session() );
	}

	private _load() : void {
		this.state.set( 'loading' );
		this.loadClassSession().pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( completionRate : number ) : void => {
				this.completionRate.set( completionRate );
				this.state.set( 'success' );
				this.increaseSession();
			} ,
			error : () : void => {
				this.state.set( 'error' );
				this.increaseSession();
			}
		} );
	}

	private loadClassSession() : Observable<number> {
		const conditions : IctuConditionParam[] = [
			{ conditionName : 'class_id' , value : this.classObject().id.toString() , condition : IctuQueryCondition.equal } ,
			{ conditionName : 'course_id' , value : this.classObject().course_id.toString() , condition : IctuQueryCondition.equal , orWhere : 'and' }
		];
		const queryParams : IctuQueryParams     = {
			limit  : -1 ,
			paged  : 1 ,
			select : 'id,class_id,course_id,status'
		};
		return this.classSessionService.query( conditions , queryParams ).pipe(
			map( ( { data } : DtoObject<ClassSession[]> ) : number => {
				return data.length ? Math.floor( ( _filter( data , { status : 2 } ).length / data.length ) * 100 ) : 0;
			} )
		);
	}

	ngOnDestroy() : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
