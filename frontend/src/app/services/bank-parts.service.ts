import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from "@models/ictu-base-service.class";
import { BankPart } from "@models/bank-part";

@Injectable( {
	providedIn : 'any'
} )
export class BankPartsService extends IctuBaseServiceClass<BankPart> {

	constructor () {
		super( 'bank-parts' );
	}
}
