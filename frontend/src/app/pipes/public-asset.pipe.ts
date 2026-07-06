import { Pipe , PipeTransform } from '@angular/core';
import { getClientResource } from '@utilities/helper';

@Pipe( {
	name : 'publicAsset'
} )
export class PublicAssetPipe implements PipeTransform {

	transform( path : string ) : string {
		return getClientResource( path );
	}
}
