import { Pipe , PipeTransform } from '@angular/core';
import { Source } from 'plyr';
import { FileHelper , IctuCloudFile } from '@utilities/helper';

@Pipe( {
	name : 'ictuFile2PlyrSources'
} )
export class IctuFile2PlyrSourcesPipe implements PipeTransform {

	transform( file : IctuCloudFile ) : Source[] {
		return [ {
			provider : 'html5' ,
			src      : FileHelper.getStreamLink( file ) ,
			type     : file.mineType
		} ];
	}
}
