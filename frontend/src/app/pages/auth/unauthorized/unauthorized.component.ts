import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component( {
	selector    : 'app-unauthorized' ,
	imports     : [ RouterLink ] ,
	templateUrl : './unauthorized.component.html' ,
	styleUrl    : './unauthorized.component.css',
	standalone  : true
} )
export default class UnauthorizedComponent {

}
