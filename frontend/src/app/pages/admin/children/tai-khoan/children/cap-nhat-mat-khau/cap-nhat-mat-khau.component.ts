import { Component } from '@angular/core';
import { ComingSoonComponent } from "@components/coming-soon/coming-soon.component";

@Component( {
	selector    : 'app-cap-nhat-mat-khau' ,
	standalone  : true ,
	templateUrl : './cap-nhat-mat-khau.component.html' ,
	imports     : [
		ComingSoonComponent
	] ,
	styleUrl    : './cap-nhat-mat-khau.component.css'
} )
export default class CapNhatMatKhauComponent {

}
