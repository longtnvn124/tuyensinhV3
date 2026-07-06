import { Component , computed , input , InputSignal , Signal , signal } from '@angular/core';
import { ParentClassLessonChildComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/model/parent-class-lesson-child-component';
import { PublicClassLessonPlanContentItem } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/model/public-class-lesson-plan-content-item';
import { FlashcardComponent , PickWord } from '@components/flashcard/flashcard.component';

@Component( {
	selector    : 'parent-class-lesson-preview-vocabulary' ,
	imports     : [ FlashcardComponent ] ,
	templateUrl : './parent-class-lesson-preview-vocabulary.component.html' ,
	styleUrl    : './parent-class-lesson-preview-vocabulary.component.css'
} )
export class ParentClassLessonPreviewVocabularyComponent implements ParentClassLessonChildComponent {

	classLessonPlanContentItem : InputSignal<PublicClassLessonPlanContentItem> = input.required();

	protected readonly words : Signal<PickWord[]> = computed( () : PickWord[] => this.classLessonPlanContentItem()?.words || [] );

}
