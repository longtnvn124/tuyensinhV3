import { Pipe , PipeTransform } from '@angular/core';
import { FileHelper , IctuCloudFile } from '@utilities/helper';

@Pipe( {
	name : 'ictuCloudFile2StreamLink'
} )
export class IctuCloudFile2StreamLinkPipe implements PipeTransform {
	transform( file : IctuCloudFile ) : string {
		return FileHelper.getStreamLink( file );
	}
}
