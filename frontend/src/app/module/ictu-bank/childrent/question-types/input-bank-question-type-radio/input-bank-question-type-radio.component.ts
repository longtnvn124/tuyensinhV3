import { Component , input , InputSignal , OnDestroy , OnInit , signal , WritableSignal } from '@angular/core';
import { QuestionForm , QuestionFormFields } from "@module/ictu-bank/childrent/bank-questions/bank-questions.component";
import { debounceTime , distinctUntilChanged , merge , of , Subject , takeUntil } from "rxjs";
import { createNewAnswerOption , InputBankQuestion } from "@module/ictu-bank/childrent/question-types/input-bank-question";
import { takeUntilDestroyed , toObservable } from "@angular/core/rxjs-interop";
import { FormControl } from "@angular/forms";
import { Is } from "@utilities/is";
import { QuestionAnswerOption } from "@models/question";

@Component( {
	selector    : 'input-bank-question-type-radio' ,
	standalone  : false ,
	templateUrl : './input-bank-question-type-radio.component.html' ,
	styleUrl    : './input-bank-question-type-radio.component.css'
} )
export class InputBankQuestionTypeRadioComponent implements OnInit , OnDestroy , InputBankQuestion {

	formGroup : InputSignal<QuestionForm> = input.required<QuestionForm>( { alias : 'formObject' } );

	private destroyed$ : Subject<void> = new Subject<void>();

	private registerFunctionsObserver : Subject<void> = new Subject<void>();

	private addNewAnswerObserver : Subject<void> = new Subject<void>();

	private changeCorrectAnswerObserver : Subject<string> = new Subject<string>();

	private removeAnswerObserver : Subject<string> = new Subject<string>();

	protected readonly columns : WritableSignal<number> = signal( 4 );

	protected readonly btnAddNewLoading : WritableSignal<boolean> = signal( false );

	constructor () {
		toObservable( this.formGroup ).pipe(
			takeUntilDestroyed()
		).subscribe( ( formObject : QuestionForm ) : void => {
			this.registerFunctions( formObject );
		} );

		this.addNewAnswerObserver.pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 )
		).subscribe( () : void => {
			if ( Is.array( this.getControl( 'answer_options' ).value ) ) {
				const _newValue : QuestionAnswerOption[] = [ ... this.getControl( 'answer_options' ).value , createNewAnswerOption( this.getControl( 'answer_options' ).value ) ];
				this.getControl( 'answer_options' ).setValue( _newValue );
			}
			else {
				this.getControl( 'answer_options' ).setValue( [ {
					label : '' ,
					value : '1'
				} ] );
			}
			this.btnAddNewLoading.set( false );
		} );

		this.changeCorrectAnswerObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			debounceTime( 300 )
		).subscribe( ( value : string ) : void => {
			this.getControl( 'correct_answer' ).setValue( value );
			this.formGroup().markAsTouched();
		} );

		this.removeAnswerObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 )
		).subscribe( ( value : string ) : void => {
			if ( this.getControl( 'correct_answer' ).value === value ) {
				this.getControl( 'correct_answer' ).setValue( '' );
			}
			const answerOptions : QuestionAnswerOption[] = [ ... this.getControl( 'answer_options' ).value ];
			this.getControl( 'answer_options' ).setValue( answerOptions.filter( ( option : QuestionAnswerOption ) : boolean => option.value !== value ) );
			this.formGroup().markAsTouched();
		} );
	}

	ngOnInit () : void {

	}

	protected getControl<K extends keyof QuestionFormFields> ( key : K ) : FormControl<QuestionFormFields[K]> {
		return this.formGroup()?.get( key as string ) as FormControl<QuestionFormFields[K]>;
	}

	private registerFunctions ( formObject : QuestionForm ) : void {
		this.registerFunctionsObserver.next();
		merge(
			of( this.getControl( 'columns' ).value ) ,
			this.getControl( 'columns' ).valueChanges
		).pipe(
			takeUntil(
				merge( this.destroyed$ , this.registerFunctionsObserver.asObservable() )
			) ,
			distinctUntilChanged()
		).subscribe( ( columns : number ) : void => {
			this.columns.set( columns );
		} )
	}

	protected btnAddNewAnswer () : void {
		this.btnAddNewLoading.set( true );
		this.addNewAnswerObserver.next();
	}

	protected btnToggleCorrectAnswer ( value : string ) : void {
		this.changeCorrectAnswerObserver.next( value );
	}

	protected btnRemoveAnswer ( value : string ) : void {
		this.removeAnswerObserver.next( value );
	}

	protected triggerTouched () : void {
		this.formGroup().markAsTouched();
	}

	ngOnDestroy () : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
