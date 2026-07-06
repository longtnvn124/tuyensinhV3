import { Pipe , PipeTransform } from '@angular/core';
import { BranchTimeSlot } from '@models/co-so-dao-tao';

@Pipe( {
	name       : 'branchTimeSlotInfo' ,
	standalone : true
} )
export class BranchTimeSlotInfoPipe implements PipeTransform {

	transform( timeSlot : BranchTimeSlot ) : string {
		return timeSlot ? `${ timeSlot.name } : [ ${ timeSlot.start } - ${ timeSlot.end } ]` : '';
	}

}
