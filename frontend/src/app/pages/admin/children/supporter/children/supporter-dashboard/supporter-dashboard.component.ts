import { Component } from '@angular/core';
import { ComingSoonComponent } from "@components/coming-soon/coming-soon.component";

@Component( {
	selector    : 'app-supporter-dashboard' ,
	imports     : [ ComingSoonComponent ] ,
	templateUrl : './supporter-dashboard.component.html' ,
	styleUrl    : './supporter-dashboard.component.css'
} )
export default class SupporterDashboardComponent {

}
