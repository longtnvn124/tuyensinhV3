export type CourseLessonMediaProvider = 'upload' | 'googleDrive' | 'html5' | 'youtube' | 'vimeo';

export interface CourseLessonStructureMedia {
    content: string;
    provider: CourseLessonMediaProvider;
    type?: string;
    mediaType?: string;
}
