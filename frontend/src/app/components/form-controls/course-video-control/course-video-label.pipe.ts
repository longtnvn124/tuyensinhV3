import { Pipe , PipeTransform } from '@angular/core';
import { CourseFileLocation } from "@models/course";

@Pipe( {
	standalone : true ,
	name       : 'courseVideoLabel'
} )
export class CourseVideoLabelPipe implements PipeTransform {

	transform ( location : CourseFileLocation , type : 'label' | 'placeholder' = 'label' , _default : string = 'Youtube' ) : string {
		if ( type === 'label' ) {
			return location ? location === 'online' ? 'Youtube' : 'File' : _default;
		}
		else {
			return location ? location === 'online' ? '...' : 'Vui lòng load file.' : _default;
		}
	}

}
