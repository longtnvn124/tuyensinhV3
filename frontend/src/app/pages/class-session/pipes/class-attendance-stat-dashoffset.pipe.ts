import { Pipe , PipeTransform } from '@angular/core';
import { circumference , ClassAttendanceReportItem } from '../children/class-session-attendance/class-session-attendance.component';

@Pipe( {
	standalone : true ,
	name       : 'classAttendanceStatDashoffset'
} )
export class ClassAttendanceStatDashoffsetPipe implements PipeTransform {

	getPercentage( item : ClassAttendanceReportItem<any> ) : number {
		if ( item.total === 0 ) return 0;
		if ( item.key === 'total' ) return 100;
		return Math.round( ( item.value / item.total ) * 100 );
	}

	getCircleDashoffset( percentage : number ) : number {
		return circumference - ( percentage / 100 ) * circumference;
	}

	transform( item : ClassAttendanceReportItem<any> ) : number {
		return this.getCircleDashoffset( this.getPercentage( item ) );
	}

}
