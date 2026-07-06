import { Pipe , PipeTransform } from '@angular/core';
import { QuestionType } from "@models/question";

const QuestionLabels : Record<QuestionType , string> = {
	radio              : 'RADIO' ,
	check_box          : 'CHECK BOX' ,
	drag_drop          : 'DRAG DROP' ,
	input_box          : 'INPUT BOX' ,
	matching           : 'MATCHING' ,
	group_input        : 'GROUP INPUT' ,
	group_logical      : 'GROUP LOGICAL' ,
	reorder_words      : 'REORDER WORDS' ,
	paragraph_ordering : 'PARAGRAPH ORDERING' ,
	textarea           : 'TEXTAREA' ,
	fill_in_blank      : 'FILL IN BLANK'
} as const;

@Pipe( {
	name       : 'questionTypeToLabel' ,
	standalone : false
} )
export class QuestionTypeToLabelPipe implements PipeTransform {

	transform ( type : QuestionType , _default : string = 'UNKNOW' ) : string {
		return type in QuestionLabels ? QuestionLabels[ type ] : _default;
	}

}
