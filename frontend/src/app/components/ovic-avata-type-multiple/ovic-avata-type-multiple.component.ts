import {
    booleanAttribute,
    Component,
    DestroyRef,
    inject,
    input,
    InputSignal,
    OnInit,
    output,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgStyle } from '@angular/common';
import { AbstractControl } from '@angular/forms';
import { from, concatMap, map, EMPTY, catchError, reduce, finalize } from 'rxjs';

import { RippleModule } from 'primeng/ripple';
import { ButtonModule } from 'primeng/button';
import { GalleriaModule } from 'primeng/galleria';
import { ImageModule } from 'primeng/image';

import { NotificationService } from '@app/services/notification.service';
import { IctuFileService } from '@app/services/ictu-file.service';

const TYPE_FILE_IMAGE: string[] = [
    'image/png',
    'image/gif',
    'image/jpeg',
    'image/bmp',
    'image/x-icon',
];

export type UploadMode = 'crop' | 'direct';

interface ArrFile {
    fileName: string;
    url: string;
}

@Component({
    selector: 'ovic-avata-type-multiple',
    templateUrl: './ovic-avata-type-multiple.component.html',
    styleUrls: ['./ovic-avata-type-multiple.component.css'],
    standalone: true,
    imports: [
        NgStyle,
        RippleModule,
        ButtonModule,
        GalleriaModule,
        ImageModule,
    ],
})
export class OvicAvataTypeMultipleComponent implements OnInit {
    // — Form binding
    formField: InputSignal<AbstractControl> = input.required<AbstractControl>();

    // — Behaviour
    disabled = input(false, { transform: booleanAttribute });
    multiple = input(true, { transform: booleanAttribute });
    keyUpload = input<UploadMode>('crop');
    accept = input('');

    // — Crop config
    aspectRatio = input<number>();
    resizeToWidth = input(300);
    format = input<'png' | 'jpeg' | 'webp'>('png');
    imageQuality = input(100);
    maintainAspectRatio = input(true, { transform: booleanAttribute });
    cropperMinWidth = input(10);
    cropperMinHeight = input(10);

    // — Display
    height = input('260px');
    textView = input('Upload file');
    fileName = input<string>();

    // — Events
    onUploadSuccess = output<string[]>();
    onUploadError = output<string>();

    // — State
    listFile = signal<ArrFile[]>([]);
    activeIndex = signal(0);
    displayBasic = signal(false);

    private isUploading = false;

    responsiveOptions: any[] = [
        { breakpoint: '1024px', numVisible: 5 },
        { breakpoint: '960px', numVisible: 4 },
        { breakpoint: '768px', numVisible: 3 },
        { breakpoint: '560px', numVisible: 1 },
    ];
    private destroyRef = inject(DestroyRef);
    private fileService = inject(IctuFileService);
    private notificationService = inject(NotificationService);

    triggerFilePicker(): void {
        if (this.disabled()) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = this.multiple();
        input.accept = this.accept() || 'image/png,image/gif,image/jpeg,image/bmp,image/x-icon';
        input.onchange = () => {
            this.onInputAvatar(input.files);
            input.remove();
        };
        input.oncancel = () => { /* no-op */ };
        input.click();
    }

    ngOnInit(): void {
        const field = this.formField();
        if (field) {
            field.valueChanges
                .pipe(
                    takeUntilDestroyed(this.destroyRef),
                    map((t) => (t && Array.isArray(t) ? t : [])),
                )
                .subscribe((files: string[]) => {
                    this.listFile.set(
                        files.length > 0
                            ? files.filter(Boolean).map((file) => ({
                                  fileName: file,
                                  url: this.fileService.getPreviewLinkLocalFile(file),
                              }))
                            : [],
                    );
                });

            if (field.value && Array.isArray(field.value)) {
                this.listFile.set(
                    field.value.filter(Boolean).map((file: string) => ({
                        fileName: file,
                        url: this.fileService.getPreviewLinkLocalFile(file),
                    })),
                );
            }
        }
    }

    onInputAvatar(files: FileList | null): void {
        const selectedFile = files;
        if (!selectedFile || selectedFile.length === 0) return;

        if (this.isUploading) return;
        this.isUploading = true;

        this.notificationService.isProcessing(true);

        const processedFile = Object.values(selectedFile);
        const validFiles = processedFile.filter((f) => TYPE_FILE_IMAGE.includes(f.type));
        const invalidFiles = processedFile.filter((f) => !TYPE_FILE_IMAGE.includes(f.type));

        invalidFiles.forEach((f) =>
            this.notificationService.toastWarning(`File "${f.name}" không đúng định dạng ảnh`),
        );

        if (validFiles.length === 0) {
            this.isUploading = false;
            this.notificationService.isProcessing(false);
            return;
        }

        from(validFiles).pipe(
            concatMap((file, index) => {
                this.notificationService.loadingAnimationV2({
                    process: { percent: Math.round(((index + 1) / validFiles.length) * 100) },
                });
                return this.fileService.uploadFile_tuyensinh(file).pipe(
                    map((result) => ({ name: String(result.id) }) as { name: string }),
                    catchError(() => {
                        this.notificationService.toastWarning(`Upload file "${file.name}" thất bại`);
                        return EMPTY;
                    }),
                );
            }),
            reduce((acc, curr) => [...acc, curr], [] as { name: string }[]),
            finalize(() => {
                this.isUploading = false;
                this.notificationService.isProcessing(false);
                this.notificationService.disableLoadingAnimationV2();
            }),
        ).subscribe((uploaded) => {
            if (uploaded.length > 0) {
                const dataOld: string[] = this.formField().value
                    ? [...this.formField().value]
                    : [];
                const dataNew = uploaded.map((m) => m.name);
                this.formField().setValue([...dataOld, ...dataNew]);
                this.notificationService.toastSuccess(`Upload ${uploaded.length} file thành công`);
                try {
                    this.onUploadSuccess.emit(uploaded.map((m) => m.name));
                } catch {
                    /* parent handler error — không ảnh hưởng đến upload */
                }
            }
        });
    }

    replaceFile(index: number, _event: Event): void {
        const currentFile = this.listFile()[index];
        if (!currentFile) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = this.accept() || 'image/*';
        input.click();

        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;

            if (!TYPE_FILE_IMAGE.includes(file.type)) {
                this.notificationService.toastWarning('Định dạng file không phù hợp');
                return;
            }

            this.notificationService.isProcessing(true);

            this.fileService
                .uploadFile_tuyensinh(file)
                .pipe(finalize(() => this.notificationService.isProcessing(false)))
                .subscribe({
                    next: (result) => {
                        if (result) {
                            const list = this.formField().value
                                ? [...this.formField().value]
                                : [];
                            const newId = String(result.id);
                            if (list[index] !== undefined) {
                                list[index] = newId;
                            } else {
                                list.push(newId);
                            }
                            this.formField().setValue(list);
                            this.notificationService.toastSuccess('Thay thế file thành công');
                        }
                    },
                    error: () => this.notificationService.toastError('Thay thế file không thành công'),
                });
        };
    }

    btnViewImage(item: ArrFile): void {
        this.displayBasic.set(true);
        this.activeIndex.set(
            this.listFile().findIndex((f) => f.fileName === item.fileName),
        );
    }

    btnDeleteFile(item: ArrFile): void {
        const arr = this.listFile().filter((f) => f.fileName !== item.fileName);
        this.formField().setValue(arr.map((m) => m.fileName));
    }

    trackByFile(_index: number, item: ArrFile): string {
        return item.fileName;
    }
}
