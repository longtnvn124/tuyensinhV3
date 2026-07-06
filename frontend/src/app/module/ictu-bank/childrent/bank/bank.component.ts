import { Component , inject , input , InputSignal , ModelSignal , OnDestroy , output , OutputEmitterRef , signal , WritableSignal } from '@angular/core';
import { Bank } from "@models/bank";
import { IctuDropdownOption2 } from "@models/ictu-dropdown-option";
import { AppState } from "@models/app-state";
import { Course } from "@models/course";
import { debounceTime , forkJoin , map , merge , Observable , Subject , takeUntil } from "rxjs";
import { AuthenticationService } from "@services/authentication.service";
import { CoursesService } from "@services/course.service";
import { BanksService } from "@services/banks.service";
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from "@models/dto";
import { takeUntilDestroyed , toObservable } from "@angular/core/rxjs-interop";

export type PickCourse = Pick<Course , 'id' | 'donvi_id' | 'params' | 'title' | 'subject'>

export type BankFormCourseOption = IctuDropdownOption2<PickCourse , number>;

type BankFormTab = 'info' | 'questions';

export interface BankChildComponent {
	bank : ModelSignal<Bank>;
	dirty : ModelSignal<boolean>;
}

@Component( {
	selector    : 'app-bank' ,
	standalone  : false ,
	templateUrl : './bank.component.html' ,
	styleUrl    : './bank.component.css'
} )
export class BankComponent implements OnDestroy {

	private auth : AuthenticationService = inject( AuthenticationService );

	private coursesService : CoursesService = inject( CoursesService );

	private banksService : BanksService = inject( BanksService );

	// input fields
	bankID : InputSignal<number> = input.required<number>();

	enableClose : InputSignal<boolean> = input<boolean>( false );

	readonly bank : WritableSignal<Bank> = signal<Bank>( null );

	readonly courseOptions : WritableSignal<IctuDropdownOption2<PickCourse , number>[]> = signal<IctuDropdownOption2<PickCourse , number>[]>( [] );

	onClose : OutputEmitterRef<boolean> = output<boolean>();

	readonly tabActive : WritableSignal<BankFormTab> = signal( 'info' );

	readonly state : WritableSignal<AppState> = signal( 'loading' );

	private destroyed$ : Subject<void> = new Subject<void>();

	private loadFormObserver : Subject<void> = new Subject<void>();

	readonly dirty : WritableSignal<boolean> = signal( false );

	get donViID () : number {
		return this.auth.user.donvi_id;
	}

	constructor () {
		toObservable( this.bankID ).pipe(
			debounceTime( 100 ) ,
			takeUntilDestroyed()
		).subscribe( () : void => {
			this.loadData();
		} );
	}

	private loadData () : void {
		this.state.set( 'loading' );
		forkJoin<{
			courseOptions : Observable<BankFormCourseOption[]>,
			bank : Observable<Bank>
		}>( {
			courseOptions : this.loadCourseOptions() ,
			bank          : this.loadBank( this.bankID() )
		} ).pipe(
			takeUntil( merge( this.loadFormObserver , this.destroyed$ ) )
		).subscribe( {
			next  : ( { bank , courseOptions } : { bank : Bank, courseOptions : BankFormCourseOption[] } ) : void => {
				console.log( bank );
				this.courseOptions.set( courseOptions );
				this.bank.set( bank );
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.state.set( 'error' );
			}
		} );
	}

	private loadBank ( bankID : number ) : Observable<Bank> {
		const conditions : IctuConditionParam[] = [ {
			conditionName : 'id' ,
			condition     : IctuQueryCondition.equal ,
			value         : bankID.toString()
		} ];
		const queryParams : IctuQueryParams     = {
			limit : 1 ,
			paged : 1
		};
		return this.banksService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<Bank[]> ) : Bank => response.data.length ? response.data.shift() : null )
		)
	}

	private loadCourseOptions () : Observable<BankFormCourseOption[]> {
		const conditions : IctuConditionParam[] = [ {
			conditionName : 'donvi_id' ,
			condition     : IctuQueryCondition.equal ,
			value         : this.donViID.toString( 10 )
		} ];
		const queryParams : IctuQueryParams     = {
			limit   : -1 ,
			paged   : 1 ,
			select  : 'id,donvi_id,params,title,subject' ,
			order   : 'ASC' ,
			orderby : 'title'
		};
		return this.coursesService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<Course[]> ) : BankFormCourseOption[] => {
				return response.data.map( ( _course : Course ) : IctuDropdownOption2<PickCourse , number> => ( {
					label : _course.title ,
					value : _course.id ,
					raw   : _course
				} ) );
			} ) ,
			takeUntil( this.destroyed$ )
		)
	}

	protected reload ( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
		this.loadData();
	}

	protected closeForm () : void {
		this.onClose.emit( this.dirty() );
	}

	protected btnChangeTabActive ( tab : BankFormTab ) : void {
		if ( tab !== "info" && ! this.bank() ) {
			return;
		}
		this.tabActive.set( tab );
	}

	ngOnDestroy () : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
