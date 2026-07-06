import { Component } from '@angular/core';
import { ComingSoonComponent } from "@components/coming-soon/coming-soon.component";

@Component( {
	selector    : 'app-gm-dashboard' ,
	imports     : [ ComingSoonComponent ] ,
	templateUrl : './gm-dashboard.component.html' ,
	styleUrl    : './gm-dashboard.component.css'
} )
export default class GmDashboardComponent {

}
