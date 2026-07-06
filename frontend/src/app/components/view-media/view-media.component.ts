import { Component, inject, input, InputSignal, OnDestroy, OnInit, output, signal, WritableSignal } from '@angular/core';
import { ClassMedia } from '@app/models/class-media';
import { CommonImageExtension, CommonVideoExtension, IctuBasicFile, IMAGE_EXTENSIONS_SET, VIDEO_EXTENSIONS_SET } from '@app/models/file';
import { CourseLessonStructureMedia } from '@app/pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/course-lesson-structure-media';
import { AuthenticationService } from '@app/services/authentication.service';
import { ClassCurriculumLectureMediaPictureComponent } from "../class-curriculums/class-curriculum-lecture-media-picture/class-curriculum-lecture-media-picture.component";

import { CourseAttachment } from '@app/models/course';
import { tokenGetter } from '@app/app.config';
import { IctuFileService } from '@app/services/ictu-file.service';
import { Dialog } from "primeng/dialog";
import { MatMenuModule } from "@angular/material/menu";
import { MatButton } from '@angular/material/button';
import { ViewDocument } from "@components/view-document/view-document";
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { ClassMediaService } from '@app/services/class-media.service';
import { IctuQueryCondition } from '@app/models/dto';
import { concatMap, forkJoin, from, switchMap } from 'rxjs';
import { HelperClass } from '@app/utilities/helper';

@Component({
  selector: 'app-view-media',
  imports: [ClassCurriculumLectureMediaPictureComponent, Dialog, MatMenuModule, MatButton, ViewDocument, CheckboxModule, FormsModule],
  templateUrl: './view-media.component.html',
  styleUrl: './view-media.component.css',
})
export class ViewMediaComponent implements OnInit, OnDestroy {
  class_media: InputSignal<ClassMedia[]> = input.required<ClassMedia[]>();

  class_media_changed = output<ClassMedia[]>();

  private auth: AuthenticationService = inject(AuthenticationService);

  private fileService: IctuFileService = inject<IctuFileService>(IctuFileService);

  visibleDialogClassStudent: boolean = false;

  classMediaSelect = signal<ClassMedia | null>(null);

  ngOnInit(): void {
    this.update_class_media(this.class_media());
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

  checkTypeFile(
    file?: IctuBasicFile | null
  ): 'image' | 'video' | 'undefine' {

    if (!file?.ext) {
      return 'undefine';
    }

    const ext = file.ext as string;

    if (IMAGE_EXTENSIONS_SET.has(ext as CommonImageExtension)) {
      return 'image';
    }

    if (VIDEO_EXTENSIONS_SET.has(ext as CommonVideoExtension)) {
      return 'video';
    }

    return 'undefine';
  }


  update_class_media(class_media: ClassMedia[]) {
    this.class_media_changed.emit(class_media);
  }

  onApprovedChange() {
    this.update_class_media(this.class_media());
  }


  setValueClassMediaSelect(media: ClassMedia): void {
    this.classMediaSelect.set(media);
    this.visibleDialogClassStudent = true;
  }

  private classMediaService: ClassMediaService = inject(
    ClassMediaService
  );


  private helper = new HelperClass();

  updateClassMediaList(): void {
    // this.classMediaService.query([
    //   // {
    //   //   conditionName: 'updated_at',
    //   //   condition: IctuQueryCondition.lessThan,
    //   //   value: this.helper.formatSQLDateTime(new Date('2026-02-09'))
    //   // },
    //   {
    //     conditionName: 'type',
    //     condition: IctuQueryCondition.equal,
    //     value: 'SPEAKING_TEST',
    //     orWhere: 'and'
    //   }
    // ], { limit: -1 }).pipe(
    //   switchMap(res => {
    //     const requests = (res.data ?? []).map(item => {
    //       const media = item.speaking_test?.map(test => ({
    //         ...test.file
    //       }));


    //       return this.classMediaService.update(item.id, {
    //         speaking_test: media
    //       });
    //     });

    //     return forkJoin(requests);
    //   })
    // ).subscribe({
    //   next: (res) => {
    //     console.log('updated all:', res);
    //   },
    //   error: (err) => console.error(err)
    // });


  }

  ngOnDestroy(): void {
  }
}
