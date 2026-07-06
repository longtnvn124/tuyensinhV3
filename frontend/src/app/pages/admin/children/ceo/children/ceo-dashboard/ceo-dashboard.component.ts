import { Component } from '@angular/core';
import { SampleDashboardComponent } from "@components/sample-dashboard/sample-dashboard.component";

@Component( {
	selector    : 'app-ceo-dashboard' ,
	imports     : [
		SampleDashboardComponent
	] ,
	templateUrl : './ceo-dashboard.component.html' ,
	styleUrl    : './ceo-dashboard.component.css'
} )
export default class CeoDashboardComponent {

}
