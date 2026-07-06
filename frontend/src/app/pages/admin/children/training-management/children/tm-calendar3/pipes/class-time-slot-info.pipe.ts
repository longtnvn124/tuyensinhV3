import { Pipe , PipeTransform } from '@angular/core';
import { ClassSession } from '@models/class-session';
import { BranchTimeSlot , CoSoDaoTao } from '@models/co-so-dao-tao';
import dayjs , { Dayjs } from 'dayjs';
import { find as _find } from 'lodash-es';

type ClassTimeSlotInfoMode = 'full' | 'short';

export function getClassTimeSlotInfo( info : Pick<ClassSession , 'time_slot_order' | 'time_start' | 'time_end'> , timeSlots : CoSoDaoTao['time_slots'] , mode : ClassTimeSlotInfoMode = 'full' ) : string {
	const _timeSlot : BranchTimeSlot = info.time_slot_order ? _find( timeSlots , { order : info.time_slot_order } ) : null;
	if ( _timeSlot ) {
		return mode === 'full' ? `${ _timeSlot.name } [ ${ _timeSlot.start } - ${ _timeSlot.end } ]` : _timeSlot.start;
	} else {
		const _timeStart : Dayjs = dayjs( info.time_start );
		const _timeEnd : Dayjs   = dayjs( info.time_end );
		return mode === 'full' ? `${ _timeStart.format( 'HH:mm' ) } - ${ _timeEnd.format( 'HH:mm' ) }` : _timeStart.format( 'HH:mm' );
	}
}

@Pipe( {
	name : 'classTimeSlotInfo'
} )
export class ClassTimeSlotInfoPipe implements PipeTransform {
	transform( info : Pick<ClassSession , 'time_slot_order' | 'time_start' | 'time_end'> , timeSlots : CoSoDaoTao['time_slots'] , mode : ClassTimeSlotInfoMode = 'full' ) : string {
		return getClassTimeSlotInfo( info , timeSlots , mode );
	}
}
