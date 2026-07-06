import { Pipe , PipeTransform } from '@angular/core';
import { CLASS_TIME_SLOT_DAY_TRANSLATOR , ClassTimeSlotDay } from '@models/class';
import { AppLanguage } from '@environmentModel';

@Pipe( {
	name       : 'classTimeSlotDay2Text' ,
	standalone : true
} )
export class ClassTimeSlotDay2TextPipe implements PipeTransform {

	transform( day : ClassTimeSlotDay , lang : AppLanguage = 'vn' ) : string {
		return CLASS_TIME_SLOT_DAY_TRANSLATOR[ lang ][ day ] ?? 'unknown';
	}
}
