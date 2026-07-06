import { Component } from '@angular/core';
import { CalendarComponent } from '@app/components/calendar-component/calendar-component';

@Component( {
	selector    : 'app-teacher-schedule' ,
	imports     : [ CalendarComponent ] ,
	templateUrl : './teacher-schedule.component.html' ,
	styleUrl    : './teacher-schedule.component.css'
} )
export default class TeacherScheduleComponent {
}
