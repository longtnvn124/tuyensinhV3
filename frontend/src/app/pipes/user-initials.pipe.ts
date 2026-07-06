import { Pipe , PipeTransform } from '@angular/core';

@Pipe( {
	name       : 'userInitials' ,
	standalone : true
} )
export class UserInitialsPipe implements PipeTransform {

	transform( fullName : string ) : unknown {
		return this.getInitials( fullName );
	}

	getInitials( name : string ) : string {
		const _arr : string[] = name.split( ' ' ).map( ( w : string ) : string => w?.trim() || '' ).filter( Boolean ).map( ( w : string ) : string => w[ 0 ] );
		if ( _arr.length ) {
			const firstLetter : string   = _arr.shift() || 'T';
			const secondsLetter : string = _arr.length ? _arr.pop() : firstLetter;
			return [ firstLetter , secondsLetter ].join( '' ).toUpperCase();
		}
		return 'TT';
	}

}
