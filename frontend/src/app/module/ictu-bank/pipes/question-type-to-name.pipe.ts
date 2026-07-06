import { Pipe , PipeTransform } from '@angular/core';
import { QuestionType } from "@models/question";

const QuestionName : Record<QuestionType , string> = {
	radio              : 'Chọn 1 đáp án đúng.' ,
	check_box          : 'Chọn nhiều đáp án đúng.' ,
	drag_drop          : 'Kéo thả đáp án.' ,
	input_box          : 'Nhập đáp án từ bàn phím.' ,
	matching           : 'Nối ghép hợp.' ,
	group_input        : 'Nhóm câu hỏi nhập từ bàn phím.' ,
	group_logical      : 'Nhóm câu hỏi đúng - sai.' ,
	reorder_words      : 'Sắp xếp lại câu theo đúng thứ tự.' ,
	paragraph_ordering : 'Sắp xếp đoạn văn theo thứ tự đúng.' ,
	textarea           : 'Viết luận.' ,
	fill_in_blank      : 'Điền khuyết.'
} as const;

@Pipe( {
	name       : 'questionTypeToName' ,
	standalone : false
} )
export class QuestionTypeToNamePipe implements PipeTransform {

	transform ( type : QuestionType , _default : string = 'UNKNOW' ) : string {
		return type in QuestionName ? QuestionName[ type ] : _default;
	}

}
