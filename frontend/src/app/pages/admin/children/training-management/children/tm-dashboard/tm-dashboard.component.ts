import { Component } from '@angular/core';
import { SampleDashboardComponent } from "@components/sample-dashboard/sample-dashboard.component";

@Component( {
	selector : 'app-tm-dashboard' ,
	imports  : [ SampleDashboardComponent ] ,
	template : '<app-sample-dashboard></app-sample-dashboard>'
} )
export default class TmDashboardComponent {

}
