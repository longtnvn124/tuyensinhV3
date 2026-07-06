import { Component , computed , input , InputSignal , signal , Signal , WritableSignal } from '@angular/core';
import { ParentClassSessionExtended , ParentClassSessionExtendedMedia } from '@pages/admin/children/parent/children/parent-classes/children/parent-classes-lessons/parent-classes-lessons.component';
import { StaffRole } from '@pages/admin/children/content-reviewer/children/content-reviewer-activity/content-reviewer-activity.component';
import { ContentReviewerCriteriaScoreColorPipe } from '@pages/admin/children/content-reviewer/pipes/content-reviewer-criteria-score-color.pipe';
import { FormsModule } from '@angular/forms';
import { IctuBasicFile2ictuCloudFilePipe } from '@pipes/ictu-basic-file2ictu-cloud-file.pipe';
import { IctuCloudFile2PlyrSourcesPipe } from '@pipes/ictu-cloud-file2-plyr-sources.pipe';
import { IctuCloudFile2StreamLinkPipe } from '@pipes/ictu-cloud-file2-stream-link.pipe';
import { PlyrComponent } from '@module/ngx-plyr/lib/plyr/plyr.component';
import { SafeUrlPipe } from '@pipes/safe-url.pipe';
import { Str2MediaFileTypePipe } from '@pipes/str2-media-file-type.pipe';
import { ClassMediaCriteriaScores , ClassMediaType } from '@models/class-media';
import { FileHelper , FileTypeHelperSupportedType } from '@utilities/helper';
import { MediaType , Source } from 'plyr';
import { IctuBasicFile } from '@models/file';
import { isArray } from 'lodash-es';
import { NgClass , NgOptimizedImage } from '@angular/common';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged , filter } from 'rxjs/operators';
import { debounceTime } from 'rxjs';
import { EmployeePhotoPipe } from '@pipes/employee-photo.pipe';

@Component( {
	selector    : 'parent-classes-lessons-media-preview' ,
	imports : [ ContentReviewerCriteriaScoreColorPipe , FormsModule , IctuBasicFile2ictuCloudFilePipe , IctuCloudFile2PlyrSourcesPipe , IctuCloudFile2StreamLinkPipe , PlyrComponent , SafeUrlPipe , Str2MediaFileTypePipe , NgClass , EmployeePhotoPipe , NgOptimizedImage ] ,
	templateUrl : './parent-classes-lessons-media-preview.component.html' ,
	styleUrls   : [ '../../../../../content-reviewer/css/timeline.css' , './parent-classes-lessons-media-preview.component.css' ]
} )
export class ParentClassesLessonsMediaPreviewComponent {

	media : InputSignal<ParentClassSessionExtendedMedia> = input.required<ParentClassSessionExtendedMedia>();

	classSession : InputSignal<ParentClassSessionExtended> = input.required<ParentClassSessionExtended>();

	protected readonly staffRole : Signal<StaffRole> = computed( () : StaffRole => this.media()?.employee?.user_id === this.classSession()?.teacher_id ? 'TEACHER' : 'ASSISTANT' );

	protected readonly staffName : Signal<string> = computed( () : string => this.media()?.employee?.full_name || 'staff name' );

	protected readonly classMediaType : Signal<ClassMediaType> = computed( () : ClassMediaType => this.media()?.type || 'ACTIVITY' );

	protected readonly type : WritableSignal<FileTypeHelperSupportedType | 'unknown'> = signal( 'unknown' );

	protected readonly imgSrc : WritableSignal<string> = signal( '' );

	protected readonly caption : WritableSignal<string> = signal( '' );

	protected readonly sources : WritableSignal<Source[]> = signal( [] );

	protected readonly mediaType : WritableSignal<MediaType> = signal( 'video' );

	protected readonly isSpeakingTest : Signal<boolean> = computed( () : boolean => this.media()?.type === 'SPEAKING_TEST' );

	protected readonly speakingTestVideos : Signal<IctuBasicFile[]> = computed( () : IctuBasicFile[] => {
		if ( this.media() ) {
			if ( isArray( this.media().speaking_test ) && this.media().speaking_test.length ) {
				return [ ... this.media().speaking_test ];
			}
		}
		return [];
	} );

	protected readonly criteriaScores : Signal<ClassMediaCriteriaScores[]> = computed( () : ClassMediaCriteriaScores[] => {
		if ( !this.speakingTestVideos() ) {
			return [];
		}
		return isArray( this.media().criteria_scores ) ? this.media().criteria_scores : [];
	} );

	constructor() {
		toObservable( this.media ).pipe(
			takeUntilDestroyed() ,
			filter( Boolean ) ,
			distinctUntilChanged( ( previous : ParentClassSessionExtendedMedia , current : ParentClassSessionExtendedMedia ) : boolean => previous?.id === current.id ) ,
			debounceTime( 100 )
		).subscribe( ( post : ParentClassSessionExtendedMedia ) : void => {
			this.type.set( 'unknown' );
			this.caption.set( '' );
			if ( post.type === 'ACTIVITY' ) {
				const media : IctuBasicFile                          = post.media;
				const type : FileTypeHelperSupportedType | 'unknown' = media?.type ? FileHelper.getFileType( media.type ) : 'unknown';
				switch ( type ) {
					case 'video':
					case 'audio':
						this.sources.set( FileHelper.getPlyrSources( { ... media , mineType : media.type } ) );
						this.mediaType.set( type );
						break;
					case 'image':
						this.imgSrc.set( FileHelper.getStreamLink( { ... media , mineType : media.type } ) );
						break;
					default:
						break;
				}
				this.type.set( type );
				this.caption.set( media?.title || '' );
			}
		} );
	}
}
