import { Component } from '@angular/core';
import { ComingSoonComponent } from "@components/coming-soon/coming-soon.component";

@Component( {
	selector    : 'app-ta-dashboard' ,
	imports     : [
		ComingSoonComponent
	] ,
	templateUrl : './ta-dashboard.component.html' ,
	styleUrl    : './ta-dashboard.component.css'
} )
export default class TaDashboardComponent {

}
