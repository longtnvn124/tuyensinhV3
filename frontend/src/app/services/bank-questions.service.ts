import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from "@models/ictu-base-service.class";
import { Question } from "@models/question";

@Injectable( {
	providedIn : 'any'
} )
export class BankQuestionsService extends IctuBaseServiceClass<Question> {

	constructor () {
		super( 'bank-questions' );
	}
}
