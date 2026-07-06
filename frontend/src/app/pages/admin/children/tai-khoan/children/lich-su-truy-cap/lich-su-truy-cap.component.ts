import { Component } from '@angular/core';
import { ComingSoonComponent } from "@components/coming-soon/coming-soon.component";

@Component( {
	selector    : 'app-lich-su-truy-cap' ,
	standalone  : true ,
	templateUrl : './lich-su-truy-cap.component.html' ,
	imports     : [
		ComingSoonComponent
	] ,
	styleUrl    : './lich-su-truy-cap.component.css'
} )
export default class LichSuTruyCapComponent {

}
