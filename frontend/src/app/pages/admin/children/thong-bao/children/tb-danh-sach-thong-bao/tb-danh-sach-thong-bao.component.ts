import { Component } from '@angular/core';
import { ComingSoonComponent } from '@components/coming-soon/coming-soon.component';

@Component( {
	selector    : 'app-tb-danh-sach-thong-bao' ,
	standalone  : true ,
	imports     : [ ComingSoonComponent ] ,
	templateUrl : './tb-danh-sach-thong-bao.component.html' ,
	styleUrl    : './tb-danh-sach-thong-bao.component.css'
} )
export default class TbDanhSachThongBaoComponent {

}
