import { Component , inject , input , InputSignal , model , ModelSignal , OnDestroy , OnInit , Signal , signal , WritableSignal } from '@angular/core';
import { Bank } from "@models/bank";
import { takeUntilDestroyed , toObservable } from "@angular/core/rxjs-interop";
import { AppState } from "@models/app-state";
import { debounceTime , map , Observable , Subject , switchMap , takeUntil } from "rxjs";
import { IctuDropdownOption } from "@models/ictu-dropdown-option";
import { AuthenticationService } from "@services/authentication.service";
import { Course , CourseSubject } from "@models/course";
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from "@models/dto";
import { BanksService } from "@services/banks.service";
import { BankChildComponent , BankFormCourseOption } from "@module/ictu-bank/childrent/bank/bank.component";
import { FormGroupType } from "@models/common";
import { FormControl , FormGroup , Validators } from "@angular/forms";

type AppBankFormState = AppState | 'submitting';

type PickCourse = Pick<Course , 'id' | 'donvi_id' | 'params' | 'title' | 'subject'>

type BankBaseFields = Pick<Bank , 'name' | 'code' | 'course_id' | 'donvi_id' | 'desc' | 'status' | 'subject'>;

type BankFormGroup = FormGroupType<BankBaseFields>;

@Component( {
	selector    : 'bank-form' ,
	standalone  : false ,
	templateUrl : './bank-form.component.html' ,
	styleUrl    : './bank-form.component.css'
} )
export class BankFormComponent implements OnInit , OnDestroy , BankChildComponent {

	private auth : AuthenticationService = inject( AuthenticationService );

	private banksService : BanksService = inject( BanksService );

	bank : ModelSignal<Bank> = model.required<Bank>();

	courseOptions : InputSignal<BankFormCourseOption[]> = input.required<BankFormCourseOption[]>();

	dirty : ModelSignal<boolean> = model.required<boolean>();

	private destroyed$ : Subject<void> = new Subject<void>();

	readonly statusOptions : Signal<IctuDropdownOption<number>[]> = signal<IctuDropdownOption<number>[]>( [
		{ value : 0 , label : 'Dừng hoạt động' } ,
		{ value : 1 , label : 'Đang hoạt động' }
	] );

	get donViID () : number {
		return this.auth.user.donvi_id;
	}

	readonly state : WritableSignal<AppBankFormState> = signal( 'loading' );

	protected readonly Validators : typeof Validators = Validators;

	readonly formGroup : BankFormGroup = new FormGroup( {
		name      : new FormControl<string>( '' , [ Validators.required , Validators.minLength( 1 ) , Validators.maxLength( 255 ) ] ) ,
		code      : new FormControl<string>( '' , [ Validators.required , Validators.minLength( 1 ) , Validators.maxLength( 255 ) ] ) ,
		desc      : new FormControl<string>( '' , [ Validators.maxLength( 255 ) ] ) ,
		donvi_id  : new FormControl<number>( this.donViID , [ Validators.required ] ) ,
		course_id : new FormControl<number>( 0 , [ Validators.required , Validators.min( 1 ) ] ) ,
		status    : new FormControl<number>( 0 , [ Validators.required ] ) ,
		subject   : new FormControl<CourseSubject>( 'normal' )
	} );

	private btnSubmitFormObserver : Subject<void> = new Subject<void>();

	readonly isSubmitting : WritableSignal<boolean> = signal<boolean>( false );

	constructor () {
		toObservable( this.bank ).pipe(
			debounceTime( 100 ) ,
			takeUntilDestroyed()
		).subscribe( ( bank : Bank ) : void => {
			this.fillForm( bank )
		} );

		this.getControl( 'course_id' ).valueChanges.pipe(
			takeUntilDestroyed()
		).subscribe( ( courseID : number ) : void => {
			this.getControl( 'subject' ).setValue( this.courseOptions().reduce( ( reducer : CourseSubject , option : BankFormCourseOption ) : CourseSubject => {
				return option.value === courseID ? option.raw.subject : reducer;
			} , 'normal' ) );
		} );

		this.btnSubmitFormObserver.asObservable().pipe(
			debounceTime( 100 ) ,
			takeUntilDestroyed()
		).subscribe( () : void => {
			this._saveForm();
		} )
	}

	ngOnInit () : void {
	}

	protected getControl<K extends keyof BankBaseFields> ( key : K ) : FormControl<BankBaseFields[K]> {
		return this.formGroup.get( key as string ) as FormControl<BankBaseFields[K]>;
	}

	private fillForm ( bank : Bank ) : void {
		if ( bank ) {
			this.formGroup.reset( {
				name      : bank.name ,
				code      : bank.code ,
				desc      : bank.desc ,
				donvi_id  : bank.donvi_id ,
				course_id : bank.course_id ,
				status    : bank.status ,
				subject   : bank.subject
			} )
		}
		else {
			this.formGroup.reset( {
				name      : '' ,
				code      : '' ,
				desc      : '' ,
				donvi_id  : this.donViID ,
				course_id : 0 ,
				status    : 1 ,
				subject   : 'normal'
			} )
		}
		this.state.set( 'success' );
	}

	private _saveForm () : void {
		let request$ : Observable<Bank>;
		if ( this.bank() ) {
			request$ = this.banksService.update( this.bank().id , { ... this.formGroup.value } ).pipe(
				map( () : Bank => ( { ... this.bank() , ... this.formGroup.value } ) )
			)
		}
		else {
			request$ = this.banksService.create( { ... this.formGroup.value } ).pipe(
				switchMap( ( bankID : number ) : Observable<Bank> => this.loadBank( bankID ) )
			);
		}
		request$.pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( bank : Bank ) : void => {
				this.dirty.set( true );
				this.bank.set( bank );
				this.isSubmitting.set( false );
			} ,
			error : () : void => {
				this.isSubmitting.set( false );
			}
		} )
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

	protected reload ( event : MouseEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
	}

	protected btnSubmitForm () : void {
		this.isSubmitting.set( true );
		this.btnSubmitFormObserver.next();
	}

	ngOnDestroy () : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
