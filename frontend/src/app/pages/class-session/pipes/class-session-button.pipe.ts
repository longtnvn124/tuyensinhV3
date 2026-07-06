import { Pipe , PipeTransform } from '@angular/core';
import { ClassSession } from '@models/class-session';

type ClassSessionButtonPipeField = 'state' | 'label' | 'background' | 'color' | 'visibility' | 'icon';

const STATE_MAP : Map<number , string> = new Map( [
	[ 0 , 'Buổi học chưa bắt đầu' ] ,
	[ 1 , 'Buổi học đang điễn ra' ] ,
	[ 2 , 'Buổi học đã kết thúc' ]
] );

const LABEL_MAP : Map<number , string> = new Map( [
	[ 0 , 'Bắt đầu buổi học' ] ,
	[ 1 , 'Kết thúc buổi học' ] ,
	[ 2 , 'Buổi học đã kết thúc' ]
] );

const BACKGROUND_MAP : Map<number , string> = new Map( [
	[ 0 , '#0162e8' ] ,
	[ 1 , '#dc2626' ] ,
	[ 2 , '#198754' ]
] );

const VISIBILITY_MAP : Map<number , string> = new Map( [
	[ 0 , 'visible' ] ,
	[ 1 , 'visible' ] ,
	[ 2 , 'hidden' ]
] );

const ICON_MAP : Map<number , string> = new Map( [
	[ 0 , 'fa-classic fa-solid fa-play' ] ,
	[ 1 , 'fa-classic fa-solid fa-stop' ] ,
	[ 2 , 'fa-classic fa-solid fa-flag-checkered' ]
] );

@Pipe( {
	name : 'classSessionButton'
} )
export class ClassSessionButtonPipe implements PipeTransform {

	transform( { status } : ClassSession , field : ClassSessionButtonPipeField = 'label' ) : string {
		switch ( field ) {
			case 'background':
				return BACKGROUND_MAP.has( status ) ? BACKGROUND_MAP.get( status ) : BACKGROUND_MAP.get( 2 );
			case 'label':
				return LABEL_MAP.has( status ) ? LABEL_MAP.get( status ) : 'Unknown';
			case 'visibility':
				return VISIBILITY_MAP.has( status ) ? VISIBILITY_MAP.get( status ) : 'hidden';
			case 'icon':
				return ICON_MAP.has( status ) ? ICON_MAP.get( status ) : ICON_MAP.get( 2 );
			case 'state':
				return STATE_MAP.has( status ) ? STATE_MAP.get( status ) : 'Unknown';
			default :
				break;
		}
		return null;
	}
}
