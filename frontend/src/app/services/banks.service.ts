import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from "@models/ictu-base-service.class";
import { Bank } from "@models/bank";

@Injectable( {
	providedIn : 'any'
} )
export class BanksService extends IctuBaseServiceClass<Bank> {

	constructor () {
		super( 'banks' );
	}
}
