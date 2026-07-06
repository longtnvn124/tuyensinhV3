import { Component } from '@angular/core';

import { TeacherComponent } from '@app/components/teacher-component/teacher-component';
@Component({
    selector: 'app-tm-teaching-assistants',
    imports: [TeacherComponent],
    templateUrl: './tm-teaching-assistants.component.html',
    styleUrl: './tm-teaching-assistants.component.css',
})
export default class TmTeachingAssistantsComponent {
}
