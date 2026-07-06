import { Component } from '@angular/core';
import { ComingSoonComponent } from "@components/coming-soon/coming-soon.component";

@Component( {
	selector    : 'app-gm-contracts' ,
	imports     : [ ComingSoonComponent ] ,
	templateUrl : './gm-contracts.component.html' ,
	styleUrl    : './gm-contracts.component.css'
} )
export default class GmContractsComponent {

}
