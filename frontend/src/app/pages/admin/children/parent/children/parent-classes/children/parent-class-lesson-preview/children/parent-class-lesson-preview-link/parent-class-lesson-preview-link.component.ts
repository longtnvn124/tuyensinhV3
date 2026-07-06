import { Component , computed , input , InputSignal , Signal } from '@angular/core';
import { SafeUrlPipe } from '@pipes/safe-url.pipe';
import { SafeHtmlPipe } from '@pipes/safe-html.pipe';
import { ParentClassLessonChildComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/model/parent-class-lesson-child-component';
import { PublicClassLessonPlanContentItem } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/model/public-class-lesson-plan-content-item';

@Component( {
	selector    : 'parent-class-lesson-preview-link' ,
	imports     : [ SafeUrlPipe , SafeHtmlPipe ] ,
	templateUrl : './parent-class-lesson-preview-link.component.html' ,
	styleUrl    : './parent-class-lesson-preview-link.component.css'
} )
export class ParentClassLessonPreviewLinkComponent implements ParentClassLessonChildComponent {
	classLessonPlanContentItem : InputSignal<PublicClassLessonPlanContentItem> = input.required();
	protected readonly link : Signal<string>                                   = computed( () : string => this.classLessonPlanContentItem().content || '' );
}
