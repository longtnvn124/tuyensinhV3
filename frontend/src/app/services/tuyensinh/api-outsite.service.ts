import { inject, Injectable } from '@angular/core';
import { HttpBackend, HttpClient, HttpParams } from '@angular/common/http';
import { ENVIRONMENT } from '@env';
import { Observable } from 'rxjs';
import { CtdtItem, ExternalApiResponse, NganhItem } from '@models/external-api';

@Injectable( {
	providedIn : 'root'
} )
export class ApiOutsiteService {

	private readonly http : HttpClient;

	private readonly externalApi : string;

	constructor () {
		this.http        = new HttpClient( inject( HttpBackend ) );
		this.externalApi = ENVIRONMENT.deployment.externalApi;
	}

	getCtdtList ( ) : Observable<ExternalApiResponse<CtdtItem[]>> {
		return this.http.get<ExternalApiResponse<CtdtItem[]>>( this.externalApi + 'ctdt/list' );
	}

	getNganhList () : Observable<ExternalApiResponse<NganhItem[]>> {
		return this.http.get<ExternalApiResponse<NganhItem[]>>( this.externalApi + 'ctdt/nganh' );
	}

	getCtdtListByIdNganh ( id ? : number ) : Observable<ExternalApiResponse<CtdtItem[]>> {
		let params = new HttpParams();

		if ( id ) {
			params = params.set( 'nganh_id' , id );
		}

		return this.http.get<ExternalApiResponse<CtdtItem[]>>( this.externalApi + 'ctdt/list' , { params } );
	}

}
