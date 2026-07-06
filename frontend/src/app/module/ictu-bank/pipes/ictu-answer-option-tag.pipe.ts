import { Pipe , PipeTransform } from '@angular/core';

const lib : string[] = [ 'A' , 'B' , 'C' , 'D' , 'E' , 'F' , 'G' , 'H' , 'I' , 'J' , 'K' , 'L' , 'M' , 'N' , 'O' , 'P' , 'Q' , 'R' , 'S' , 'T' , 'U' , 'V' , 'W' , 'X' , 'Y' , 'Z' ];

@Pipe( {
	name       : 'ictuAnswerOptionTag' ,
	standalone : true
} )
export class IctuAnswerOptionTagPipe implements PipeTransform {

	transform ( index : number , _default : string = '' ) : string {
		return lib[ index ] ?? _default;
	}
}