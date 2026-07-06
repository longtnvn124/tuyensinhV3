import { Component } from '@angular/core';
import { ComingSoonComponent } from "@components/coming-soon/coming-soon.component";

@Component( {
	selector    : 'app-accountant-dashboard' ,
	imports     : [ ComingSoonComponent ] ,
	templateUrl : './accountant-dashboard.component.html' ,
	styleUrl    : './accountant-dashboard.component.css'
} )
export default class AccountantDashboardComponent {

}
