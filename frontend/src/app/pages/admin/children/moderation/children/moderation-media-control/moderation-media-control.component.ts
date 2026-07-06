import { Component , computed , model , ModelSignal , output , OutputEmitterRef , signal , Signal , WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClassMediaModerationMedia } from '@pages/admin/children/moderation/children/moderation-media/moderation-media.component';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { FileHelper , FileTypeHelperSupportedType } from '@utilities/helper';
import { PlyrComponent } from '@module/ngx-plyr/lib/plyr/plyr.component';
import { Source } from 'plyr';
import { NgClass , NgOptimizedImage , NgTemplateOutlet } from '@angular/common';
import { SafeUrlPipe } from '@pipes/safe-url.pipe';
import { EmployeePhotoPipe } from '@pipes/employee-photo.pipe';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenu , MatMenuContent , MatMenuTrigger } from '@angular/material/menu';
import { HocSinh } from '@models/hoc-sinh';
import { StudentAvatarPipe } from '@pipes/student-avatar.pipe';
import { PreviewDirective , PreviewFile } from '@module/ngx-file-preview';
import { MatButton } from '@angular/material/button';
import { debounceTime } from 'rxjs';
import { distinctUntilChanged , filter } from 'rxjs/operators';
import { ClassMedia } from '@models/class-media';

type MemberInfo = Pick<HocSinh , 'id' | 'full_name' | 'english_name' | 'dob' | 'gender' | 'avatar' | 'address' | 'phuhuynh_id' | 'code'>

interface Members {
	info : MemberInfo;
	label? : string;
}

@Component( {
	selector    : 'app-moderation-media-control' ,
	imports     : [ FormsModule , PlyrComponent , NgClass , NgOptimizedImage , SafeUrlPipe , NgTemplateOutlet , EmployeePhotoPipe , MatTooltip , MatMenu , MatMenuContent , MatMenuTrigger , StudentAvatarPipe , PreviewDirective , MatButton ] ,
	templateUrl : './moderation-media-control.component.html' ,
	styleUrl    : './moderation-media-control.component.css'
} )
export class ModerationMediaControlComponent {

	/******** Declare inputs ********/
	media : ModelSignal<ClassMediaModerationMedia> = model.required<ClassMediaModerationMedia>();
	/******** End ********/

	/******** Declare outputs ********/
	onApproveStatusChanges : OutputEmitterRef<ClassMedia['status']>                   = output<ClassMedia['status']>();
	/******** End ********/

	protected readonly type : WritableSignal<FileTypeHelperSupportedType | 'unknown'> = signal( 'unknown' );

	protected readonly sources : WritableSignal<Source[]> = signal( [] );

	protected readonly imgSrc : WritableSignal<string> = signal( '' );

	protected readonly members : WritableSignal<Members[]> = signal( [] );

	readonly previewFile : Signal<PreviewFile> = computed( () : PreviewFile => {
		if ( this.type() === 'image' ) {
			return {
				url      : this.imgSrc() ,
				name     : this.media().media.title ,
				type     : 'image' ,
				coverUrl : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAhFBMVEX////v7+//dVr/nJT39/fu9PX/cVT/mZH6o5X/lYz6u7b/bU//pJzv8fH/+Pju9fb/akv3urDz1M/8kX7y29f1yMH/dlvw7Ovw5+X7mIf1w7v9hW70zMX4rqH9iXTy3dn7lYP+emH/9PP7tK79qKD2vLP3tKj+fmX5q577no30ysP+gmtW5aBxAAAFAUlEQVR4nO3d63baOBSG4YpEDhllj80pOARomE7S0N7//Q0GEvBJFsXS3sp878+urNX1RJJtydB++4YQQgghhBBCCCGEEEII/b+77bF/uDH1blWv3fzNDarUs0+p+wdZROobqO7vRBF79+2EN5KI/Y9gIRRE7H0NHoVyiD6Ae6EUopchPAiFEH2swg+hDKIX4IdQBNGvUALRs1AA0beQn+hdyE70L+QmBhAyE0MIeYlBhKzEMEJOYiAhIzGUkI8YTMhGDCfkIgYUMhFDCnmIQYUsxLBCDmJgIQMxtDA8MbgwODG8MDSRQRiYyCEMS2QRBiXyCEMSmYQBiVzCcEQ2YTCiFyA9OAhDEb0I9Y87OUQvQlo6CcMQvQiVcgKGIfoB6pnbIIYg+hEq+lcM0ZdwfiOF6EmoKH8QQvQl3I3ij3sRV1RvQkV6urpzyu8nGf0JC2M+fv3LpUWkwp2RSLtE0QqdgxBCCPmDEEII+YMQQgj5gxBCCPmDEEII+YNQspBIp6nWHd9zjFio1Ww4mTy9TVOrMVoh6dfEJEXZeqq/oJDUixkcS8zCQoxVmE6SwSkzaydGKtRvZnCeyVvXYpxCygflkmHrIMYp1CNTJc7bBjFOYfqSVIRm+cWEm0FV+No2TSMVVoGDZPTFhD/jHUPqfM4s0k/VdZiNI1mHNF+MrM9gR+Giei19jORaSvnGmGyUdv7c/LGyDN8juR/q/bOYmXZOVL3IykOo4nimOU6+ZN09T9Pt+Tw1ratQlpDmx+uHab30n9Lvn6OYDMaR7C1OV8jke/cFVS+fTbFBNMkwj2R/qJenHd+k82Kz/3Tb6H24muX2+4scYen6aN3TnhmLj3VFc06jh+d38cf2Dd+FiRHSuHT9T54c5mlUQlK/Kw+av1zmaUTCdFV9Dtu038RjFNL3rAK0HUxEKVxXNwv2B5XohPVzl6KfXTeCeISU10ewGMRVH/NUhLB8vHtGdHh4i0JY3QqdLjbPPQyiACHlj83Axk0G7f7E5aBDkjCtHbqcEasPb6S2xmwvuVXyC/WyZY7u5+mkMoi6eOVkXi6YvexCmtdOd0uDWN5kpKPsMHvdn1rZhem2fY7uR/F8nurx8b5pbLt6WUIaN93rz4Xbk4XU53hbjp5kCYlqp9fVsuUnUZ9eyCTOS5FZqGtbinqbj8Pe0rOdy2mVACFN7YvwMFzD9PjDpd+Gw6mqAKF+dhAe30nUzrnbD/LlCJu3FPV+F5eV2tuY5MlpnnIKW7YU9cwq3d0Ja78Nt7sip1C3bCkaiFM9bXjyyVyWIqOw/oqstWStGp98Ng5LkU/oPEf3xOZHO5e7Ip+w/h73D3K4K7IJ9S/nOWoldr4x5hKSat32Xtam6/ifS1h+S3FFyUvHLYNJWHlLcU1dS5FHWHtLcRXRfnLMI3TZUrhnvyuyCBveUlyT/a7II2x4S3FN1gdUDqHrluICouXYhkFIed9A61JkELpvKdyzLMXwQrKdAP9xmaDPCOu3/odwN4hvcj5fSjMvYziTM4ZKrQ/f5ukzs2792xiEpEbDvhvJ+vSl2z/SdVlxfPrSTxBCCCF/EEIIIX8QQgghfxBCCCF/EEIIIX8QQgghfxBeUV9fVb4un/+Dxy03bt+tR6GMaeoTKGIQvQ6hhJXocxXu4wb6naP7eEfR+wgWca5Fz2uQ3RjKd0CGLyQPIYQQQgghhBBCCCGEEBLYf2l8l7JRECYoAAAAAElFTkSuQmCC'
			};
		} else {
			return null;
		}
	} );

	readonly enableImagePreview : WritableSignal<boolean> = signal( false );

	readonly submitting : WritableSignal<boolean> = signal( true );

	constructor() {
		toObservable( this.media ).pipe(
			takeUntilDestroyed() ,
			debounceTime( 100 )
		).subscribe( () : void => {
			this.submitting.set( false );
		} );

		toObservable( this.media ).pipe(
			takeUntilDestroyed() ,
			filter( Boolean ) ,
			debounceTime( 100 ) ,
			distinctUntilChanged( ( previous : ClassMediaModerationMedia , current : ClassMediaModerationMedia ) : boolean => previous.id === current.id )
		).subscribe( ( post : ClassMediaModerationMedia ) : void => {
			const type : FileTypeHelperSupportedType | 'unknown' = post.media?.type ? FileHelper.getFileType( post.media?.type ) : 'unknown';
			switch ( type ) {
				case 'video':
				case 'audio':
					this.sources.set( FileHelper.getPlyrSources( { ... post.media , mineType : post.media.type } ) );
					break;
				case 'image':
					this.imgSrc.set( FileHelper.getStreamLink( { ... post.media , mineType : post.media.type } ) );
					break;
				default:
					break;
			}
			let members : Members[] = [];
			if ( post.students.length ) {
				if ( post.students.length > 5 ) {
					members = [ 0 , 1 , 2 , 3 , 4 ].map( ( _ : number , index : number ) : Members => ( { info : post.students[ index ] } ) );
					members.push( {
						info  : null ,
						label : `${ post.students.length - 5 }+`
					} );
				} else {
					members = post.students.map( ( s : HocSinh ) : Members => ( { info : s } ) );
				}
			}
			this.members.set( members );
			this.type.set( type );
		} );
	}

	protected avoidCloseMenuByClicking( event : MouseEvent | KeyboardEvent ) : void {
		event.preventDefault();
		event.stopPropagation();
	}

	protected btnOpenPreview() : void {
		this.enableImagePreview.set( true );
	}

	protected onClosePreview() : void {
		this.enableImagePreview.set( false );
	}

	protected previewVisible( isVisible : boolean ) : void {
		// this.loadingAnimation.set( ! isVisible );
	}

	protected btnChangeApproveStatus( status : ClassMediaModerationMedia['status'] ) : void {
		if ( status !== this.media().status ) {
			this.submitting.set( true );
			this.onApproveStatusChanges.emit( status );
		}
	}
}
