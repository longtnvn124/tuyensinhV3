import { Component , computed , input , InputSignal , Signal , signal , WritableSignal } from '@angular/core';
import { ClassCurriculumLectureMediaComponent , ClassCurriculumLectureMediaComponentState } from '@components/class-curriculums/class-curriculum-lecture-media-component';
import { CourseLessonStructureMedia } from '@pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/course-lesson-structure-media';
import { IctuTokenFile , ictuTokenFile2Link , matchIctuFileString , str2IctuTokenFile } from '@pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/components/edit-course-lesson-structure-media-upload/edit-course-lesson-structure-media-model';
import { tokenGetter } from '@app/app.config';
import { NgOptimizedImage } from '@angular/common';
import { SafeUrlPipe } from '@pipes/safe-url.pipe';
import { PreviewDirective , PreviewFile } from '@module/ngx-file-preview';
import { formatBytes } from '@utilities/helper';

@Component( {
    selector    : 'app-class-curriculum-lecture-media-picture' ,
    standalone  : true ,
    imports     : [ NgOptimizedImage , SafeUrlPipe , PreviewDirective ] ,
    templateUrl : './class-curriculum-lecture-media-picture.component.html' ,
    styleUrl    : './class-curriculum-lecture-media-picture.component.css'
} )
export class ClassCurriculumLectureMediaPictureComponent implements ClassCurriculumLectureMediaComponent {

    media : InputSignal<CourseLessonStructureMedia> = input.required<CourseLessonStructureMedia>();

    readonly placeholder : Signal<string> = signal( 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAhFBMVEX////v7+//dVr/nJT39/fu9PX/cVT/mZH6o5X/lYz6u7b/bU//pJzv8fH/+Pju9fb/akv3urDz1M/8kX7y29f1yMH/dlvw7Ovw5+X7mIf1w7v9hW70zMX4rqH9iXTy3dn7lYP+emH/9PP7tK79qKD2vLP3tKj+fmX5q577no30ysP+gmtW5aBxAAAFAUlEQVR4nO3d63baOBSG4YpEDhllj80pOARomE7S0N7//Q0GEvBJFsXS3sp878+urNX1RJJtydB++4YQQgghhBBCCCGEEEII/b+77bF/uDH1blWv3fzNDarUs0+p+wdZROobqO7vRBF79+2EN5KI/Y9gIRRE7H0NHoVyiD6Ae6EUopchPAiFEH2swg+hDKIX4IdQBNGvUALRs1AA0beQn+hdyE70L+QmBhAyE0MIeYlBhKzEMEJOYiAhIzGUkI8YTMhGDCfkIgYUMhFDCnmIQYUsxLBCDmJgIQMxtDA8MbgwODG8MDSRQRiYyCEMS2QRBiXyCEMSmYQBiVzCcEQ2YTCiFyA9OAhDEb0I9Y87OUQvQlo6CcMQvQiVcgKGIfoB6pnbIIYg+hEq+lcM0ZdwfiOF6EmoKH8QQvQl3I3ij3sRV1RvQkV6urpzyu8nGf0JC2M+fv3LpUWkwp2RSLtE0QqdgxBCCPmDEEII+YMQQgj5gxBCCPmDEEII+YNQspBIp6nWHd9zjFio1Ww4mTy9TVOrMVoh6dfEJEXZeqq/oJDUixkcS8zCQoxVmE6SwSkzaydGKtRvZnCeyVvXYpxCygflkmHrIMYp1CNTJc7bBjFOYfqSVIRm+cWEm0FV+No2TSMVVoGDZPTFhD/jHUPqfM4s0k/VdZiNI1mHNF+MrM9gR+Giei19jORaSvnGmGyUdv7c/LGyDN8juR/q/bOYmXZOVL3IykOo4nimOU6+ZN09T9Pt+Tw1ratQlpDmx+uHab30n9Lvn6OYDMaR7C1OV8jke/cFVS+fTbFBNMkwj2R/qJenHd+k82Kz/3Tb6H24muX2+4scYen6aN3TnhmLj3VFc06jh+d38cf2Dd+FiRHSuHT9T54c5mlUQlK/Kw+av1zmaUTCdFV9Dtu038RjFNL3rAK0HUxEKVxXNwv2B5XohPVzl6KfXTeCeISU10ewGMRVH/NUhLB8vHtGdHh4i0JY3QqdLjbPPQyiACHlj83Axk0G7f7E5aBDkjCtHbqcEasPb6S2xmwvuVXyC/WyZY7u5+mkMoi6eOVkXi6YvexCmtdOd0uDWN5kpKPsMHvdn1rZhem2fY7uR/F8nurx8b5pbLt6WUIaN93rz4Xbk4XU53hbjp5kCYlqp9fVsuUnUZ9eyCTOS5FZqGtbinqbj8Pe0rOdy2mVACFN7YvwMFzD9PjDpd+Gw6mqAKF+dhAe30nUzrnbD/LlCJu3FPV+F5eV2tuY5MlpnnIKW7YU9cwq3d0Ja78Nt7sip1C3bCkaiFM9bXjyyVyWIqOw/oqstWStGp98Ng5LkU/oPEf3xOZHO5e7Ip+w/h73D3K4K7IJ9S/nOWoldr4x5hKSat32Xtam6/ifS1h+S3FFyUvHLYNJWHlLcU1dS5FHWHtLcRXRfnLMI3TZUrhnvyuyCBveUlyT/a7II2x4S3FN1gdUDqHrluICouXYhkFIed9A61JkELpvKdyzLMXwQrKdAP9xmaDPCOu3/odwN4hvcj5fSjMvYziTM4ZKrQ/f5ukzs2792xiEpEbDvhvJ+vSl2z/SdVlxfPrSTxBCCCF/EEIIIX8QQgghfxBCCCF/EEIIIX8QQgghfxBeUV9fVb4un/+Dxy03bt+tR6GMaeoTKGIQvQ6hhJXocxXu4wb6naP7eEfR+wgWca5Fz2uQ3RjKd0CGLyQPIYQQQgghhBBCCCGEEBLYf2l8l7JRECYoAAAAAElFTkSuQmCC' );

    readonly fileInfo : Signal<IctuTokenFile> = computed( () : IctuTokenFile => this.media()?.content && this.validate( this.media() ) ? str2IctuTokenFile( this.media().content ) : null );

    readonly src : Signal<string> = computed( () : string => {
        if ( this.fileInfo() && tokenGetter() ) {
            const url : URL = new URL( ictuTokenFile2Link( this.fileInfo() ) );
            url.searchParams.set( 'token' , tokenGetter() );
            return url.toString();
        }
        else {
            return '';
        }
    } );

    readonly previewFile : Signal<PreviewFile> = computed( () : PreviewFile => {
        if ( this.src().length ) {
            return {
                url      : this.src() ,
                name     : this.fileInfo().title ,
                type     : 'image' ,
                coverUrl : this.placeholder()
            }
        }
        else {
            return null;
        }
    } );

    readonly enablePreview : WritableSignal<boolean> = signal( false );

    readonly fileSize : Signal<string> = computed( () : string => this.fileInfo() ? formatBytes( this.fileInfo().size ?? 0 , 2 ).replace( ' ' , '' ) : '' );

    validate ( media : CourseLessonStructureMedia ) : boolean {
        if ( media?.content ) {
            switch ( media.provider ) {
                case 'upload':
                    return matchIctuFileString( media.content );
                default:
                    return false;
            }
        }
        else {
            return false;
        }
    }

    protected btnOpenPreview () : void {
        if ( this.fileInfo() ) {
            this.enablePreview.set( true );
        }
    }

    protected onClosePreview () : void {
        this.enablePreview.set( false );
    }

    protected previewVisible ( isVisible : boolean ) : void {
        // this.loadingAnimation.set( ! isVisible );
    }
}
