import { Component } from '@angular/core';
import { ComingSoonComponent } from '@components/coming-soon/coming-soon.component';

@Component( {
	selector    : 'app-tb-tao-phan-hoi' ,
	standalone  : true ,
	imports     : [ ComingSoonComponent ] ,
	templateUrl : './tb-tao-phan-hoi.component.html' ,
	styleUrl    : './tb-tao-phan-hoi.component.css'
} )
export default class TbTaoPhanHoiComponent {

}
