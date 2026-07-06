import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { Report } from '@models/report';

@Injectable( {
    providedIn : 'any'
} )
export class ReportsService extends IctuBaseServiceClass<Report> {
    constructor () {
        super( 'reports' );
    }
}
