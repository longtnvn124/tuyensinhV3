import { Pipe , PipeTransform } from '@angular/core';
import { FileHelper , FileTypeHelperSupportedType } from '@utilities/helper';

@Pipe( {
	name : 'str2MediaFileType'
} )
export class Str2MediaFileTypePipe implements PipeTransform {

	transform( value : string ) : FileTypeHelperSupportedType {
		return FileHelper.getFileType( value );
	}
}
