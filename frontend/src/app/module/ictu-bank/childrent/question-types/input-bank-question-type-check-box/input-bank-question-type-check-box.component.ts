import { Component , model , ModelSignal } from '@angular/core';
import { QuestionForm } from "@module/ictu-bank/childrent/bank-questions/bank-questions.component";

@Component( {
	selector    : 'app-input-bank-question-type-check-box' ,
	standalone  : false ,
	templateUrl : './input-bank-question-type-check-box.component.html' ,
	styleUrl    : './input-bank-question-type-check-box.component.css'
} )
export class InputBankQuestionTypeCheckBoxComponent {
	formGroup : ModelSignal<QuestionForm> = model.required<QuestionForm>();
}
