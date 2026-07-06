import { InputSignal } from '@angular/core';
import { ContentReviewerData } from '@pages/admin/children/content-reviewer/models/content-reviewer-data';
import { HocSinh } from '@models/hoc-sinh';

export interface ContentReviewerComponent {
	data : InputSignal<ContentReviewerData>;
}

export interface Members {
	info : Pick<HocSinh , 'id' | 'full_name' | 'code' | 'english_name' | 'avatar' | 'gender' | 'dob'>;
	label? : string;
}
