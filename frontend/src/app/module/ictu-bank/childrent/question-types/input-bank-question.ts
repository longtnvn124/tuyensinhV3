import { InputSignal } from "@angular/core";
import { QuestionForm } from "@module/ictu-bank/childrent/bank-questions/bank-questions.component";
import { QuestionAnswerOption } from "@models/question";
import { Is } from "@utilities/is";

export interface InputBankQuestion {
	formGroup : InputSignal<QuestionForm>
}

export const createNewAnswerOption : ( options : QuestionAnswerOption[] ) => QuestionAnswerOption = ( options : QuestionAnswerOption[] ) : QuestionAnswerOption => {
	if ( ! Is.array( options ) || ! options.length ) {
		return {
			label : '' ,
			value : '0'
		}
	}
	return {
		label : '' ,
		value : ( 1 + options.reduce( ( reducer : number , { value } : QuestionAnswerOption ) : number => {
			return Math.max( reducer , parseInt( value , 10 ) );
		} , 0 ) ).toString( 10 )
	}
}