import { Component } from '@angular/core';
import { CalendarComponent } from "@app/components/calendar-component/calendar-component";
@Component({
    selector: 'app-ta-calendar',
    imports: [CalendarComponent],
    templateUrl: './ta-calendar.component.html',
    styleUrl: './ta-calendar.component.css',
})
export default class TaCalendarComponent {}
