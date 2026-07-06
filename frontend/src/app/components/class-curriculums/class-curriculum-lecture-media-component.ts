import { InputSignal } from '@angular/core';
import { CourseLessonStructureMedia } from '@pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/course-lesson-structure-media';

export type ClassCurriculumLectureMediaComponentState = 'loading' | 'ready' | 'error';

export interface ClassCurriculumLectureMediaComponent {
    media : InputSignal<CourseLessonStructureMedia>;
    validate : ( media : CourseLessonStructureMedia ) => boolean;
}
