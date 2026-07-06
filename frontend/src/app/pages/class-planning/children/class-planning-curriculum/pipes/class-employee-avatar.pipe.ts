import { inject , Pipe , PipeTransform } from '@angular/core';
import { ClassExtend } from "@models/class";
import { DomSanitizer , SafeUrl } from "@angular/platform-browser";
import { Employee } from "@models/employee";

@Pipe( {
	name : 'classEmployeeAvatar'
} )
export class ClassEmployeeAvatarPipe implements PipeTransform {

	private sanitizer : DomSanitizer = inject( DomSanitizer );

	transform ( classObject : ClassExtend , userId : number , placeholder : string = 'images/user/avatar-3.jpg' ) : string | SafeUrl {
		if ( userId && classObject ) {
			// switch ( userId ) {
			// 	case classObject.user_id_teacher:
			// 		return classObject.teacher?.photo ? this.sanitizer.bypassSecurityTrustUrl( classObject.teacher?.photo ) : placeholder;
			// 	case classObject.user_id_foreign_teacher:
			// 		return classObject.foreign_teacher?.photo ? this.sanitizer.bypassSecurityTrustUrl( classObject.foreign_teacher?.photo ) : placeholder;
			// 	default:
			// 		const _employee : Employee = classObject.assistants.find( ( o : Employee ) : boolean => o.user_id === userId );
			// 		return _employee?.photo ? this.sanitizer.bypassSecurityTrustUrl( _employee?.photo ) : placeholder;
			// }

			return [ ... classObject.assistants , ... classObject.teachers ].reduce( ( reducer : string | SafeUrl , employee : Employee ) : string | SafeUrl => {
				if ( employee.user_id === userId && employee.photo ) {
					reducer = this.sanitizer.bypassSecurityTrustUrl( employee.photo );
				}
				return reducer;
			} , placeholder );
		}
		else {
			return placeholder;
		}
	}
}
