import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { map , Observable } from 'rxjs';
import { Locations } from '@models/location';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { HttpParams } from "@angular/common/http";
import { paramsConditionBuilder } from "@utilities/helper";
import { ENVIRONMENT } from "@env";

@Injectable( {
	providedIn : 'any'
} )
export class LocationService extends IctuBaseServiceClass<Locations> {
	constructor () {
		super( 'cities' );
	}

	// regions - provinces

	public queryLocation ( conditions : IctuConditionParam[] , queryParams? : IctuQueryParams , table? : string ) : Observable<DtoObject<Locations[]>> {
		const params : HttpParams = paramsConditionBuilder( conditions , new HttpParams( { fromObject : queryParams || {} } ) );
		return this.http.get<DtoObject<Locations[]>>( ''.concat( ENVIRONMENT.deployment.api , table.replace( /\//g , '' ).trim() , '/' ) , { params } );
	}
}
