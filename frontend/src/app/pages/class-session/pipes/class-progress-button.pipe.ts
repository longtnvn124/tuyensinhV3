import { Pipe , PipeTransform } from '@angular/core';

type ClassProgressButtonAttr = 'label' | 'background' | 'visibility' | 'icon';

const BUTTON_LABEL_MAP : Map<number , string> = new Map( [
	[ 0 , 'Bắt đầu buổi học' ] ,
	[ 1 , 'Kết thúc buổi học' ] ,
	[ 2 , 'Buổi học đã kết thúc' ]
] );

const BUTTON_BACKGROUND_MAP : Map<number , string> = new Map( [
	[ 0 , 'var(--p-blue-500)' ] ,
	[ 1 , 'var(--p-amber-500)' ] ,
	[ 2 , 'var(--p-lime-600)' ]
] );

const BUTTON_VISIBILITY_MAP : Map<number , string> = new Map( [
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
	name : 'classProgressButton'
} )
export class ClassProgressButtonPipe implements PipeTransform {

	transform( status : number , attr : ClassProgressButtonAttr = 'label' ) : string {
		switch ( attr ) {
			case 'background':
				return BUTTON_BACKGROUND_MAP.has( status ) ? BUTTON_LABEL_MAP.get( status ) : BUTTON_LABEL_MAP.get( 2 );
			case 'label':
				return BUTTON_LABEL_MAP.has( status ) ? BUTTON_LABEL_MAP.get( status ) : 'Unknown';
			case 'visibility':
				return BUTTON_VISIBILITY_MAP.has( status ) ? BUTTON_VISIBILITY_MAP.get( status ) : 'hidden';
			case 'icon':
				return ICON_MAP.has( status ) ? ICON_MAP.get( status ) : ICON_MAP.get( 2 );
			default :
				break;
		}
		return null;
	}

}
