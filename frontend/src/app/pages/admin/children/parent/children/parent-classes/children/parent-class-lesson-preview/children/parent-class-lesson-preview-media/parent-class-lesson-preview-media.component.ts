import { Component , computed , input , InputSignal , Signal } from '@angular/core';
import { ParentClassLessonChildComponent } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/model/parent-class-lesson-child-component';
import { PublicClassLessonPlanContentItem } from '@pages/admin/children/parent/children/parent-classes/children/parent-class-lesson-preview/model/public-class-lesson-plan-content-item';
import { CourseLessonStructureMedia } from '@pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/course-lesson-structure-media';
import { isString } from 'lodash-es';
import { Helper } from '@utilities/helper';
import { EditCourseLessonStructureMediaAudioComponent } from '@pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/components/edit-course-lesson-structure-media-audio/edit-course-lesson-structure-media-audio.component';
import { EditCourseLessonStructureMediaDocumentComponent } from '@pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/components/edit-course-lesson-structure-media-document/edit-course-lesson-structure-media-document.component';
import { EditCourseLessonStructureMediaPictureComponent } from '@pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/components/edit-course-lesson-structure-media-picture/edit-course-lesson-structure-media-picture.component';
import { EditCourseLessonStructureMediaVideoComponent } from '@pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/components/edit-course-lesson-structure-media-video/edit-course-lesson-structure-media-video.component';

@Component( {
	selector    : 'parent-class-lesson-preview-media' ,
	imports     : [
		EditCourseLessonStructureMediaAudioComponent ,
		EditCourseLessonStructureMediaDocumentComponent ,
		EditCourseLessonStructureMediaPictureComponent ,
		EditCourseLessonStructureMediaVideoComponent
	] ,
	templateUrl : './parent-class-lesson-preview-media.component.html' ,
	styleUrl    : './parent-class-lesson-preview-media.component.css'
} )
export class ParentClassLessonPreviewMediaComponent implements ParentClassLessonChildComponent {

	classLessonPlanContentItem : InputSignal<PublicClassLessonPlanContentItem> = input.required();

	protected medias : Signal<CourseLessonStructureMedia[]> = computed( () : CourseLessonStructureMedia[] => {
		const content : string = this.classLessonPlanContentItem()?.content || '';
		if ( isString( content ) && Helper.isBase64( content ) ) {
			const decodedText : string = Helper.decodeBase64( content );
			if ( Helper.maybeJSON( decodedText ) ) {
				return Helper.tryParseJSON( decodedText , [] );
			} else {
				return [];
			}
		} else {
			return [];
		}
	} );
}
