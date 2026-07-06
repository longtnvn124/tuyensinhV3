import { Component } from '@angular/core';
import { ComingSoonComponent } from "@components/coming-soon/coming-soon.component";

@Component( {
	selector    : 'app-sales-members' ,
	imports     : [
		ComingSoonComponent
	] ,
	templateUrl : './sales-members.component.html' ,
	styleUrl    : './sales-members.component.css'
} )
export default class SalesMembersComponent {

}
