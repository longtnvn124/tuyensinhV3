import { InputSignal } from '@angular/core';
import { PublicClassLessonPlanContentItem } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/model/public-class-lesson-plan-content-item';

export interface ParentClassLessonChildComponent {
	classLessonPlanContentItem : InputSignal<PublicClassLessonPlanContentItem>;
}
