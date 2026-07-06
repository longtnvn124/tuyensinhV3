import { Component } from '@angular/core';
import { ComingSoonComponent } from "@components/coming-soon/coming-soon.component";

@Component( {
	selector    : 'app-marketing-dashboard' ,
	imports     : [ ComingSoonComponent ] ,
	templateUrl : './marketing-dashboard.component.html' ,
	styleUrl    : './marketing-dashboard.component.css'
} )
export default class MarketingDashboardComponent {

}
