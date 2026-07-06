import { Pipe , PipeTransform } from '@angular/core';
import { IctuCloudFile } from '@utilities/helper';
import { IctuBasicFile } from '@models/file';

@Pipe( {
	name : 'ictuBasicFile2ictuCloudFile'
} )
export class IctuBasicFile2ictuCloudFilePipe implements PipeTransform {

	transform( media : IctuBasicFile ) : IctuCloudFile {
		return { ... media , mineType : media.type };
	}

}
