import { Component , inject , signal , Signal } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { AppPreviewHeading } from '@pages/preview/preview.component';
import { CollapsePanelComponent } from '@theme/components/collapse-panel.component';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { IctuPaginatorControl } from '@theme/components/ictu-paginator/ictu-paginator-control';
import { FormBuilder , FormGroup } from '@angular/forms';
import { IctuEditorComponent } from '@theme/components/ictu-editor/ictu-editor.component';
import { FlipBookComponent } from '@theme/components/flip-book.component';
import { LearningPortfolioEntry , PortfolioTimelineComponent } from '@pages/preview/children/portfolio-timeline/portfolio-timeline.component';
import { getPublicResource } from '@utilities/helper';

@Component( {
	selector    : 'app-sample-page' ,
	imports     : [ SharedModule , CollapsePanelComponent , IctuPaginatorComponent , IctuEditorComponent , FlipBookComponent , PortfolioTimelineComponent ] ,
	templateUrl : './sample-page.component.html' ,
	styleUrls   : [ './sample-page.component.scss' ]
} )
export default class SamplePageComponent {

	paginatorControl : Signal<IctuPaginatorControl> = signal<IctuPaginatorControl>( new IctuPaginatorControl( {
		pageLinkSize      : 5 ,
		rows              : 20 ,
		showFirstLastIcon : true
	} ) );

	readonly formGroup : FormGroup = this.fb.group( {
		user_id : [ 0 ]
	} );

	public get donviId() : number {
		return 1;
	}

	readonly images : string[];

	protected readonly MOCK_PORTFOLIO_ENTRIES : LearningPortfolioEntry[] = [
		{
			id          : '1' ,
			studentId   : 'std_001' ,
			classId     : 'class_a1' ,
			className   : 'English for Beginners - A1.1' ,
			courseId    : 'crs_01' ,
			lessonTitle : 'Unit 1: Greetings & Introductions' ,
			date        : '2024-05-10T08:30:00Z' ,
			type        : 'DAILY_ACTIVITY' ,
			media       : [
				{
					type    : 'IMAGE' ,
					url     : getPublicResource( 'images/timeline-mocks/photo-1681567012694-dc7378e52260.jpg' ) ,
					caption : 'Học sinh đang thực hành hội thoại theo nhóm'
				} ,
				{
					type    : 'IMAGE' ,
					url     : getPublicResource( 'images/timeline-mocks/photo-1503676260728-1c00da094a0b.jpg' ) ,
					caption : 'Hoạt động vẽ tranh từ vựng mới'
				}
			] ,
			feedbacks   : [
				{
					staffId   : 'ta_01' ,
					staffRole : 'TA' ,
					staffName : 'Ms. Linh' ,
					content   : 'Con rất hăng hái tham gia trò chơi khởi động. Tương tác tốt với các bạn xung quanh.'
				}
			] ,
			tags        : [ 'Confidence' , 'Teamwork' ]
		} ,
		{
			id          : '2' ,
			studentId   : 'std_001' ,
			classId     : 'class_a1' ,
			className   : 'English for Beginners - A1.1' ,
			courseId    : 'crs_01' ,
			lessonTitle : 'Mid-term Speaking Test' ,
			date        : '2024-05-15T10:00:00Z' ,
			type        : 'SPEAKING_TEST' ,
			media       : [
				{
					type      : 'VIDEO' ,
					url       : getPublicResource( 'images/timeline-mocks/mov_bbb.mp4' ) ,
					thumbnail : getPublicResource( 'images/timeline-mocks/video-capture-t0000.00seg-1101.png' ) ,
					caption   : 'Bài kiểm tra nói giữa kỳ của học sinh'
				}
			] ,
			feedbacks   : [
				{
					staffId        : 'teacher_01' ,
					staffRole      : 'TEACHER' ,
					staffName      : 'Mr. John Smith' ,
					content        : 'Phát âm của con khá rõ ràng. Cần chú ý thêm về âm cuối (ending sounds). Từ vựng sử dụng đa dạng hơn kỳ trước.' ,
					criteriaScores : [
						{ criteria : 'Pronunciation' , score : 8 } ,
						{ criteria : 'Fluency' , score : 7 } ,
						{ criteria : 'Vocabulary' , score : 7.5 }
					]
				}
			] ,
			tags        : [ 'Speaking' , 'Midterm' ]
		} ,
		{
			id          : '3' ,
			studentId   : 'std_001' ,
			classId     : 'class_a1' ,
			className   : 'English for Beginners - A1.1' ,
			courseId    : 'crs_01' ,
			lessonTitle : 'Final Presentation Project' ,
			date        : '2024-05-20T09:00:00Z' ,
			type        : 'PROJECT' ,
			media       : [
				{
					type    : 'IMAGE' ,
					url     : getPublicResource( 'images/timeline-mocks/photo-1522202176988-66273c2fd55f.jpg' ) ,
					caption : 'Nhóm trình bày về chủ đề My Family'
				}
			] ,
			feedbacks   : [
				{
					staffId   : 'teacher_01' ,
					staffRole : 'TEACHER' ,
					staffName : 'Mr. John Smith' ,
					content   : 'Slide chuẩn bị rất đẹp. Con thuyết trình tự tin, trả lời được các câu hỏi phản biện của thầy.'
				} ,
				{
					staffId   : 'ta_01' ,
					staffRole : 'TA' ,
					staffName : 'Ms. Linh' ,
					content   : 'Hỗ trợ các bạn trong nhóm rất tốt.'
				}
			] ,
			tags        : [ 'Presentation' , 'FamilyTopic' ]
		} ,
		{
			id        : '4' ,
			studentId : 'std_001' ,
			classId   : 'class_a1' ,
			className : 'English for Beginners - A1.1' ,
			courseId  : 'crs_01' ,
			date      : '2024-05-25T15:00:00Z' ,
			type      : 'MILESTONE' ,
			media     : [] ,
			feedbacks : [
				{
					staffId   : 'system' ,
					staffRole : 'TEACHER' ,
					staffName : 'Trung tâm AMS' ,
					content   : 'Chúc mừng con đã hoàn thành xuất sắc khóa học English for Beginners A1.1!'
				}
			] ,
			tags      : [ 'Completed' , 'LevelUp' ]
		}
	];

	constructor(
		private fb : FormBuilder
	) {
		inject( AppPreviewHeading ).set( {
			heading : 'Sample Page'
		} );

		setTimeout( () : void => {
			// this.paginatorControl().setupPaginator( { totalRecords : 147 , rows : 20 , data : [] } )
		} , 1000 );

		const url : URL = new URL( location.origin );
		this.images     = [ 1 , 2 , 3 , 4 , 5 , 6 ].map( ( num : number ) : string => {
			url.pathname = `images/flip-book/${ num }.png`;
			return url.toString();
		} );
	}
}
