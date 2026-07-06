import { Component } from '@angular/core';
import { Students } from '@app/components/students/students';
@Component( {
	selector    : 'app-ceo-students' ,
	imports     : [Students] ,
	templateUrl : './ceo-students.component.html' ,
	styleUrl    : './ceo-students.component.css'
} )
export default class CeoStudentsComponent {

}
