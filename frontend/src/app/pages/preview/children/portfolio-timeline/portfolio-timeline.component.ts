import { Component , computed , input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type PortfolioEntryType = 'DAILY_ACTIVITY' | 'SPEAKING_TEST' | 'MILESTONE' | 'PROJECT';

export interface PortfolioMedia {
	type : 'IMAGE' | 'VIDEO';
	url : string;
	thumbnail? : string;
	caption? : string;
}

export interface PortfolioFeedback {
	staffId : string;
	staffRole : 'TEACHER' | 'TA';
	staffName : string;
	content : string;
	criteriaScores? : { criteria : string, score : number }[];
}

export interface LearningPortfolioEntry {
	id : string;
	studentId : string;
	classId : string;
	className : string;
	courseId : string;
	lessonId? : string;
	lessonTitle? : string;
	date : string | Date;
	type : PortfolioEntryType;
	media : PortfolioMedia[];
	feedbacks : PortfolioFeedback[];
	tags : string[];
}

@Component( {
	selector    : 'app-portfolio-timeline' ,
	standalone  : true ,
	imports     : [ CommonModule ] ,
	templateUrl : './portfolio-timeline.component.html' ,
	styleUrl    : './portfolio-timeline.component.css'
} )
export class PortfolioTimelineComponent {
	entries = input.required<LearningPortfolioEntry[]>();

	sortedEntries = computed( () => {
		return [ ... this.entries() ].sort( ( a , b ) =>
			new Date( a.date ).getTime() - new Date( b.date ).getTime()
		);
	} );

	getTypeName( type : PortfolioEntryType ) : string {
		const names : Record<PortfolioEntryType , string> = {
			'DAILY_ACTIVITY' : 'Hoạt động lớp' ,
			'SPEAKING_TEST'  : 'Bài Nói' ,
			'PROJECT'        : 'Dự án' ,
			'MILESTONE'      : 'Cột mốc'
		};
		return names[ type ];
	}

	getTypeIcon( type : PortfolioEntryType ) : string {
		const icons : Record<PortfolioEntryType , string> = {
			'DAILY_ACTIVITY' : 'fa-camera' ,
			'SPEAKING_TEST'  : 'fa-microphone' ,
			'PROJECT'        : 'fa-lightbulb' ,
			'MILESTONE'      : 'fa-trophy'
		};
		return icons[ type ];
	}

	getDotColorClass( type : PortfolioEntryType ) : string {
		const classes : Record<PortfolioEntryType , string> = {
			'DAILY_ACTIVITY' : 'dot-daily' ,
			'SPEAKING_TEST'  : 'dot-speaking' ,
			'PROJECT'        : 'dot-project' ,
			'MILESTONE'      : 'dot-milestone'
		};
		return classes[ type ];
	}

	getTypeBadgeClass( type : PortfolioEntryType ) : string {
		const classes : Record<PortfolioEntryType , string> = {
			'DAILY_ACTIVITY' : 'badge-daily' ,
			'SPEAKING_TEST'  : 'badge-speaking' ,
			'PROJECT'        : 'badge-project' ,
			'MILESTONE'      : 'badge-milestone'
		};
		return classes[ type ];
	}

	getEntryAccentClass( type : PortfolioEntryType ) : string {
		const classes : Record<PortfolioEntryType , string> = {
			'DAILY_ACTIVITY' : 'card-accent-daily' ,
			'SPEAKING_TEST'  : 'card-accent-speaking' ,
			'PROJECT'        : 'card-accent-project' ,
			'MILESTONE'      : 'card-accent-milestone'
		};
		return classes[ type ];
	}

	getScoreColor( score : number ) : string {
		if ( score >= 8 ) return '#10b981';
		if ( score >= 6 ) return '#f59e0b';
		return '#f43f5e';
	}
}
