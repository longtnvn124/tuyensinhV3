import { Component, inject, model, OnDestroy, OnInit } from '@angular/core';
import { ReportPartContent } from '@app/models/report';
import { A11yModule } from "@angular/cdk/a11y";
import {
    Editor,
    NgxEditorComponent,
    NgxEditorMenuComponent,
    Toolbar,
} from 'ngx-editor';
import { FormsModule } from '@angular/forms';
import { ClassCurriculumLectureMediaPictureComponent } from "../class-curriculums/class-curriculum-lecture-media-picture/class-curriculum-lecture-media-picture.component";
import { CommonImageExtension, CommonVideoExtension, IctuBasicFile, IMAGE_EXTENSIONS_SET, VIDEO_EXTENSIONS_SET } from '@app/models/file';
import { CourseLessonStructureMedia } from '@app/pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/course-lesson-structure-media';
import { AuthenticationService } from '@app/services/authentication.service';
import { ViewDocument } from "../view-document/view-document";
import { ClassCurriculumLectureMediaVideoComponent } from "../class-curriculums/class-curriculum-lecture-media-video/class-curriculum-lecture-media-video.component";
import { tokenGetter } from '@app/app.config';
import { IctuFileService } from '@app/services/ictu-file.service';
@Component({
    selector: 'app-report-editor',
    imports: [A11yModule, NgxEditorComponent, NgxEditorMenuComponent, FormsModule, ClassCurriculumLectureMediaPictureComponent, ViewDocument],
    templateUrl: './report-editor.component.html',
    styleUrl: './report-editor.component.css'
})
export class ReportEditorComponent implements OnInit, OnDestroy {
    reportPartContent = model<ReportPartContent[]>();

    private auth: AuthenticationService = inject(AuthenticationService);

    public editor: Editor;

    public toolbar = [
        ['bold', 'italic', 'underline'],
        ['heading', 'blockquote', 'code', 'ordered_list', 'bullet_list'],
        ['link'],
        ['text_color', 'background_color'],
        ['align_left', 'align_center', 'align_right', 'align_justify'],
    ] as Toolbar;

    private fileService: IctuFileService = inject<IctuFileService>(IctuFileService);

    ngOnInit(): void {
        this.editor = new Editor();
        console.log(this.reportPartContent());
    }

    setMediaContentClassMedia(file: IctuBasicFile, type: 'picture' | 'video'): CourseLessonStructureMedia {
        return {
            mediaType: type,
            provider: 'upload',
            content: [
                file.location,
                file.id,
                file.name,
                file.title,
                file.ext,
                file.type,
                file.size,
                this.auth.user.id,
            ].join('|'),
        };
    }

    checkTypeFile(file: IctuBasicFile): string {
        if (IMAGE_EXTENSIONS_SET.has(file.ext as CommonImageExtension)) {
            return 'image';
        } else if (VIDEO_EXTENSIONS_SET.has(file.ext as CommonVideoExtension)) {
            return 'video';
        } else {
            return 'undefine';
        }
    }

    setSrcMedia(file: IctuBasicFile): string {
        const result = !file
            ? ''
            : this.fileService.fileHostingServiceApi +
            'file/' +
            file.name +
            '?token=' +
            tokenGetter();
        return result;
    }


    ngOnDestroy(): void {
    }
}
