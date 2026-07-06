import { Component , computed , input , InputSignal , Signal } from '@angular/core';
import { EmployeePhotoPipe } from '@pipes/employee-photo.pipe';
import { FormsModule } from '@angular/forms';
import { NgClass , NgOptimizedImage } from '@angular/common';
import { ParentClassSessionExtended , ParentClassSessionExtendedActivity } from '@pages/admin/children/parent/children/parent-classes/children/parent-classes-lessons/parent-classes-lessons.component';
import { StaffRole } from '@pages/admin/children/content-reviewer/children/content-reviewer-activity/content-reviewer-activity.component';

@Component( {
	selector    : 'parent-classes-lessons-activities-preview' ,
	imports     : [ EmployeePhotoPipe , FormsModule , NgOptimizedImage , NgClass ] ,
	templateUrl : './parent-classes-lessons-activities-preview.component.html' ,
	styleUrls   : [ '../../../../../content-reviewer/css/timeline.css' , './parent-classes-lessons-activities-preview.component.css' ]
} )
export class ParentClassesLessonsActivitiesPreviewComponent {

	activity : InputSignal<ParentClassSessionExtendedActivity> = input.required<ParentClassSessionExtendedActivity>();

	classSession : InputSignal<ParentClassSessionExtended> = input.required<ParentClassSessionExtended>();

	protected readonly staffRole : Signal<StaffRole> = computed( () : StaffRole => this.activity()?.employee?.user_id === this.classSession()?.teacher_id ? 'TEACHER' : 'ASSISTANT' );

	protected readonly staffName : Signal<string> = computed( () : string => this.activity()?.employee?.full_name || 'staff name' );
}
