import { CourseLectureFormat } from '@models/course';
import { CourseLessonPlanContentPageItem } from '@models/course-lesson-plan';
import { Grammar } from '@models/grammar';
import { PickWord } from '@components/flashcard/flashcard.component';

export type PublicClassLessonPlanContentItemGrammar = Pick<Grammar , 'id' | 'donvi_id' | 'prompt' | 'response' | 'translation' | 'public'>

export interface PublicClassLessonPlanContentItem extends CourseLectureFormat {
	content? : string;
	page? : CourseLessonPlanContentPageItem;
	words? : PickWord[];
	grammars? : PublicClassLessonPlanContentItemGrammar[];
}
