import { Component } from '@angular/core';
import ScheduleRemedialSessionComponent from '@components/schedule-remedial-session/schedule-remedial-session.component';

@Component( {
    selector   : 'app-teacher-schedule-remedial-session' ,
    standalone : true ,
    imports    : [ ScheduleRemedialSessionComponent ] ,
    template   : '<app-schedule-remedial-session></app-schedule-remedial-session>'
} )
export default class TeacherScheduleRemedialSessionComponent {

}
