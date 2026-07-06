import { Component , computed , input , InputSignal , output , OutputEmitterRef , Signal , signal , WritableSignal } from '@angular/core';
import { ContentReviewerData , ContentReviewerMedia } from '@pages/admin/children/content-reviewer/models/content-reviewer-data';
import { AppState } from '@models/app-state';
import { ContentReviewerComponent } from '@pages/admin/children/content-reviewer/models/content-reviewer-component';
import { MediaType , Source } from 'plyr';
import { FileHelper , FileTypeHelperSupportedType } from '@utilities/helper';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged , filter } from 'rxjs/operators';
import { debounceTime , Subject } from 'rxjs';
import { PlyrComponent } from '@module/ngx-plyr/lib/plyr/plyr.component';
import { SafeUrlPipe } from '@pipes/safe-url.pipe';
import { IctuBasicFile } from '@models/file';
import { ClassMedia , ClassMediaCriteriaScores , ClassMediaType } from '@models/class-media';
import { isArray } from 'lodash-es';
import { Str2MediaFileTypePipe } from '@pipes/str2-media-file-type.pipe';
import { IctuBasicFile2ictuCloudFilePipe } from '@pipes/ictu-basic-file2ictu-cloud-file.pipe';
import { IctuCloudFile2PlyrSourcesPipe } from '@pipes/ictu-cloud-file2-plyr-sources.pipe';
import { IctuCloudFile2StreamLinkPipe } from '@pipes/ictu-cloud-file2-stream-link.pipe';
import { FormsModule } from '@angular/forms';
import { Textarea } from 'primeng/textarea';
import { StaffRole } from '@pages/admin/children/content-reviewer/children/content-reviewer-activity/content-reviewer-activity.component';
import { NgClass } from '@angular/common';
import { ContentReviewerCriteriaScoreColorPipe } from '@pages/admin/children/content-reviewer/pipes/content-reviewer-criteria-score-color.pipe';
import { MatTooltip } from '@angular/material/tooltip';

export type RewriteMediaCommentDto = Pick<ClassMedia , 'id' | 'content' | 'origin_content'>

@Component( {
	selector    : 'app-content-reviewer-media' ,
	imports     : [ PlyrComponent , SafeUrlPipe , Str2MediaFileTypePipe , IctuBasicFile2ictuCloudFilePipe , IctuCloudFile2PlyrSourcesPipe , IctuCloudFile2StreamLinkPipe , FormsModule , Textarea , NgClass , ContentReviewerCriteriaScoreColorPipe , MatTooltip ] ,
	templateUrl : './content-reviewer-media.component.html' ,
	styleUrls   : [ '../../css/timeline.css' , './content-reviewer-media.component.css' ]
} )
export class ContentReviewerMediaComponent implements ContentReviewerComponent {

	data : InputSignal<ContentReviewerData> = input.required<ContentReviewerData>();

	disableRewrite : InputSignal<boolean> = input<boolean>( false );

	onRewriteSpeakingTestComment : OutputEmitterRef<RewriteMediaCommentDto> = output<RewriteMediaCommentDto>();

	protected readonly staffRole : Signal<StaffRole> = computed( () : StaffRole => this.data()?.employee?.user_id === this.data()?.class_session?.teacher_id ? 'TEACHER' : 'ASSISTANT' );

	protected readonly staffName : Signal<string> = computed( () : string => this.data()?.employee?.full_name || 'staff name' );

	protected readonly state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	protected readonly type : WritableSignal<FileTypeHelperSupportedType | 'unknown'> = signal( 'unknown' );

	protected readonly sources : WritableSignal<Source[]> = signal( [] );

	protected readonly mediaType : WritableSignal<MediaType> = signal( 'video' );

	protected readonly imgSrc : WritableSignal<string> = signal( '' );

	protected readonly caption : WritableSignal<string> = signal( '' );

	protected readonly rewrite : WritableSignal<boolean> = signal( false );

	protected readonly isSpeakingTest : Signal<boolean> = computed( () : boolean => {
		if ( this.data() ) {
			const _mediaData : ContentReviewerMedia = this.data() as ContentReviewerMedia;
			return _mediaData.type === 'SPEAKING_TEST';
		}
		return false;
	} );

	private changeObserver : Subject<RewriteMediaCommentDto> = new Subject<RewriteMediaCommentDto>();

	protected readonly classMediaType : Signal<ClassMediaType> = computed( () : ClassMediaType => {
		if ( !this.data() ) {
			return 'ACTIVITY';
		}
		const _classMedia : ContentReviewerMedia = this.data() as ContentReviewerMedia;
		return _classMedia.type;
	} );

	protected readonly speakingTestVideos : Signal<IctuBasicFile[]> = computed( () : IctuBasicFile[] => {
		if ( this.data() ) {
			const post : ContentReviewerMedia = this.data() as ContentReviewerMedia;
			if ( isArray( post.speaking_test ) && post.speaking_test.length ) {
				return [ ... post.speaking_test ];
			}
		}
		return [];
	} );

	protected readonly criteriaScores : Signal<ClassMediaCriteriaScores[]> = computed( () : ClassMediaCriteriaScores[] => {
		if ( !this.speakingTestVideos() ) {
			return [];
		}
		const post : ContentReviewerMedia = this.data() as ContentReviewerMedia;
		return isArray( post.criteria_scores ) ? post.criteria_scores : [];
	} );

	constructor() {
		toObservable( this.data ).pipe(
			takeUntilDestroyed() ,
			filter( Boolean ) ,
			distinctUntilChanged( ( previous : ContentReviewerData , current : ContentReviewerData ) : boolean => previous?.id === current.id ) ,
			debounceTime( 100 )
		).subscribe( ( post : ContentReviewerMedia ) : void => {
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

		this.changeObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 )
		).subscribe( ( info : RewriteMediaCommentDto ) : void => {
			this.onRewriteSpeakingTestComment.emit( info );
		} );
	}

	protected openRewriteFeedback() : void {
		this.rewrite.set( true );
		if ( !this.data()[ 'origin_content' ] ) {
			this.data()[ 'origin_content' ] = this.data()[ 'content' ];
		}
	}

	protected triggerChanged() : void {
		this.changeObserver.next( {
			id             : this.data().id ,
			content        : this.data()[ 'content' ] ,
			origin_content : this.data()[ 'origin_content' ]
		} );
	}
}
