import { inject , Pipe , PipeTransform } from '@angular/core';
import { DomSanitizer , SafeUrl } from '@angular/platform-browser';
import { HocSinh , studentAvatar } from '@models/hoc-sinh';

@Pipe( {
	name       : 'studentAvatar' ,
	standalone : true
} )
export class StudentAvatarPipe implements PipeTransform {

	private sanitizer : DomSanitizer = inject( DomSanitizer );

	transform( student : Pick<HocSinh , 'avatar' | 'gender'> , imgSrcFallback? : string ) : SafeUrl {
		return this.sanitizer.bypassSecurityTrustUrl( studentAvatar( student , imgSrcFallback ) );
	}
}
