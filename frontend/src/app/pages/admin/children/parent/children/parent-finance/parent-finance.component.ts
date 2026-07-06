import { Component } from '@angular/core';
import { ComingSoonComponent } from '@components/coming-soon/coming-soon.component';
import { NgScrollbar } from 'ngx-scrollbar';

@Component( {
	selector    : 'app-parent-finance' ,
	imports     : [ NgScrollbar ] ,
	templateUrl : './parent-finance.component.html' ,
	styleUrl    : './parent-finance.component.css'
} )
export default class ParentFinanceComponent {

}
