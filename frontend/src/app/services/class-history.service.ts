import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { ClassHistory } from '@models/class-history';

@Injectable( {
    providedIn : 'any'
} )
export class ClassHistoryService extends IctuBaseServiceClass<ClassHistory> {
    constructor () {
        super( 'class-histories' );
    }
}
