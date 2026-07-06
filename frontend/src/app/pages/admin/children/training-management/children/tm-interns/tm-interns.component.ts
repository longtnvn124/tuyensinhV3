import { Component } from '@angular/core';
import { ComingSoonComponent } from '@components/coming-soon/coming-soon.component';

@Component( {
    selector    : 'app-tm-interns' ,
    imports     : [ ComingSoonComponent ] ,
    templateUrl : './tm-interns.component.html' ,
    styleUrl    : './tm-interns.component.css'
} )
export default class TmInternsComponent {}
