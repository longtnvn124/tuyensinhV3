import { Component , input , InputSignal } from '@angular/core';
import { ParentClassLessonPreviewTextComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/children/parent-class-lesson-preview-text/parent-class-lesson-preview-text.component';
import { ParentClassLessonPreviewExampleSentencesComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/children/parent-class-lesson-preview-example-sentences/parent-class-lesson-preview-example-sentences.component';
import { ParentClassLessonPreviewLinkComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/children/parent-class-lesson-preview-link/parent-class-lesson-preview-link.component';
import { ParentClassLessonPreviewEfdComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/children/parent-class-lesson-preview-efd/parent-class-lesson-preview-efd.component';
import { PublicClassLessonPlanContentItem } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/model/public-class-lesson-plan-content-item';
import { ParentClassLessonPreviewVocabularyComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/children/parent-class-lesson-preview-vocabulary/parent-class-lesson-preview-vocabulary.component';
import { ParentClassLessonPreviewMediaComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/children/parent-class-lesson-preview-media/parent-class-lesson-preview-media.component';

@Component( {
	selector    : 'parent-class-lesson-preview' ,
	imports : [ ParentClassLessonPreviewTextComponent , ParentClassLessonPreviewExampleSentencesComponent , ParentClassLessonPreviewLinkComponent , ParentClassLessonPreviewEfdComponent , ParentClassLessonPreviewVocabularyComponent , ParentClassLessonPreviewMediaComponent ] ,
	templateUrl : './parent-class-lesson-preview.component.html' ,
	styleUrl    : './parent-class-lesson-preview.component.css'
} )
export class ParentClassLessonPreviewComponent {
	courseLectureFormat : InputSignal<PublicClassLessonPlanContentItem> = input.required();
}
