import { Component } from '@angular/core';
import { ComingSoonComponent } from '@components/coming-soon/coming-soon.component';

@Component( {
	selector    : 'app-tb-thong-ke' ,
	standalone  : true ,
	imports     : [ ComingSoonComponent ] ,
	templateUrl : './tb-thong-ke.component.html' ,
	styleUrl    : './tb-thong-ke.component.css'
} )
export default class TbThongKeComponent {

}
