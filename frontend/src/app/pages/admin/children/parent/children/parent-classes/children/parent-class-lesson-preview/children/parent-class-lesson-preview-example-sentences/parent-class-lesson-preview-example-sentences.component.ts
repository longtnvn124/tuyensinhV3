import { Component , computed , input , InputSignal , Signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ParentClassLessonChildComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/model/parent-class-lesson-child-component';
import { PublicClassLessonPlanContentItem , PublicClassLessonPlanContentItemGrammar } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/model/public-class-lesson-plan-content-item';

@Component( {
	selector    : 'parent-class-lesson-preview-example-sentences' ,
	imports     : [ ReactiveFormsModule ] ,
	templateUrl : './parent-class-lesson-preview-example-sentences.component.html' ,
	styleUrl    : './parent-class-lesson-preview-example-sentences.component.css'
} )
export class ParentClassLessonPreviewExampleSentencesComponent implements ParentClassLessonChildComponent {

	classLessonPlanContentItem : InputSignal<PublicClassLessonPlanContentItem> = input.required();

	protected readonly sentences : Signal<PublicClassLessonPlanContentItemGrammar[]> = computed( () : PublicClassLessonPlanContentItemGrammar[] => this.classLessonPlanContentItem().grammars || [] );
}
