import { Component } from '@angular/core';
import { Students } from '@app/components/students/students';

@Component({
    selector: 'app-tm-students',
    imports: [Students],
    templateUrl: './tm-students.component.html',
    styleUrl: './tm-students.component.css',
})
export default class TmStudentsComponent {}
