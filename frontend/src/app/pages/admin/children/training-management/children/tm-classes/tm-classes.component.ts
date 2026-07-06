import { Component } from '@angular/core';
import { Classes } from '@app/components/classes/classes';

@Component( {
    selector   : 'app-tm-classes' ,
    imports    : [ Classes ] ,
    standalone : true ,
    template   : '<app-classes></app-classes>'
} )
export default class TmClassesComponent {

}
