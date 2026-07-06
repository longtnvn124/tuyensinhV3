import { IctuBaseModel } from "@models/ictu-base-model";

export type QuestionType =
	'radio' |
	'check_box' |
	'drag_drop' |
	'input_box' |
	'matching' |
	'group_input' |
	'group_logical' |
	'reorder_words' |
	'paragraph_ordering' |
	'textarea' |
	'fill_in_blank';

export type QuestionDifficultyLevel = 'easy' | 'medium' | 'hard';

export interface QuestionAnswerOption {
	label : string;
	value : string;
}

export interface Question extends IctuBaseModel {
	donvi_id : number; // Mã đơn vị
	bank_id : number; // Mã ngân hàng
	bank_part_id : number; // Mã khối kiến thức
	type : QuestionType; // Loại câu hỏi
	content : string; // Nội dung câu hỏi
	group_id : number; // Mã câu hỏi cha ( dùng cho câu hỏi nhóm )
	difficulty : QuestionDifficultyLevel; // Mức độ khó của câu hỏi
	ordering : number; // Thứ tự hiển thị của câu hỏi ( dùng cho câu hỏi nhóm )
	answer_options : QuestionAnswerOption[]; // Danh sách các phương án trả lời
	shuffle : number; // Cài đặt đảo vị trí các phương án trả lời; 1 => đảo ; 0 => không đảo
	columns : number; // Số lượng phương án trả lời hiển thị trên 1 dòng
	correct_answer : string; // Đáp án của câu hỏi
	temporary : string; // lưu dữ liệu gốc người dùng nhập trong câu reorder_words
	hint : string; // Gợi ý trả lời hoặc phương pháp giải
	explanation : string; // Giải thích đáp án
}