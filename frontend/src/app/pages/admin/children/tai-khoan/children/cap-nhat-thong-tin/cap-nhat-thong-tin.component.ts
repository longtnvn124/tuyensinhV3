import { Component } from '@angular/core';
import { ComingSoonComponent } from "@components/coming-soon/coming-soon.component";

@Component( {
	selector    : 'app-cap-nhat-thong-tin' ,
	standalone  : true ,
	templateUrl : './cap-nhat-thong-tin.component.html' ,
	imports     : [
		ComingSoonComponent
	] ,
	styleUrl    : './cap-nhat-thong-tin.component.css'
} )
export default class CapNhatThongTinComponent {

}
