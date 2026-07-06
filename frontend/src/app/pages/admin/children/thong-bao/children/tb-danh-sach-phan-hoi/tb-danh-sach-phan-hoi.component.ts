import { Component } from '@angular/core';
import { ComingSoonComponent } from '@components/coming-soon/coming-soon.component';

@Component( {
	selector    : 'app-tb-danh-sach-phan-hoi' ,
	standalone  : true ,
	imports     : [ ComingSoonComponent ] ,
	templateUrl : './tb-danh-sach-phan-hoi.component.html' ,
	styleUrl    : './tb-danh-sach-phan-hoi.component.css'
} )
export default class TbDanhSachPhanHoiComponent {

}
