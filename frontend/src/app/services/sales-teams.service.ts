import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from "@models/ictu-base-service.class";
import { SalesTeam } from "@models/sales-team";

@Injectable( {
	providedIn : 'any'
} )
export class SalesTeamsService extends IctuBaseServiceClass<SalesTeam> {

	constructor () {
		super( 'sales-teams' );
	}
}
