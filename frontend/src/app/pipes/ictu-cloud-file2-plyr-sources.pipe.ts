import { Pipe , PipeTransform } from '@angular/core';
import { FileHelper , IctuCloudFile } from '@utilities/helper';
import { Source } from 'plyr';

@Pipe( {
	name : 'ictuCloudFile2PlyrSources'
} )
export class IctuCloudFile2PlyrSourcesPipe implements PipeTransform {

	transform( file : IctuCloudFile ) : Source[] {
		return [ {
			provider : 'html5' ,
			src      : FileHelper.getStreamLink( file ) ,
			type     : file.mineType
		} ];
	}

}
