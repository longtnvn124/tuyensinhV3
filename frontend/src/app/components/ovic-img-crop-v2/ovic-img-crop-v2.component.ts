import {
    booleanAttribute,
    Component,
    DestroyRef,
    inject,
    input,
    OnInit,
    output,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { NgClass } from '@angular/common';
import { map } from 'rxjs';

import { RippleModule } from 'primeng/ripple';
import { ImageModule } from 'primeng/image';
import { GalleriaModule } from 'primeng/galleria';

import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { NotificationService } from '@app/services/notification.service';
import { IctuFileService } from '@app/services/ictu-file.service';
import {
    IctuImageResizeComponent,
    ImageResizerConfig,
    ImageResizerDto,
} from '@components/ictu-image-resize/ictu-image-resize.component';
import { Helper } from '@utilities/helper';
import { _10MB } from '@utilities/syscats';

export const TYPE_FILE_IMAGE: string[] = ['image/png', 'image/gif', 'image/jpeg', 'image/bmp', 'image/x-icon'];

export type CropFormat = 'png' | 'jpeg' | 'webp';
export type UploadMode = 'crop' | 'direct';
export type FootageMode = 'horizontal' | 'vertical';

@Component({
    selector: 'ovic-img-crop-v2',
    templateUrl: './ovic-img-crop-v2.component.html',
    styleUrls: ['./ovic-img-crop-v2.component.css'],
    standalone: true,
    imports: [RippleModule, NgClass, ImageModule, GalleriaModule],
})
export class OvicImgCropV2Component implements OnInit {
    // — Form binding
    formField = input.required<AbstractControl>();

    // — Behaviour
    disabled = input(false, { transform: booleanAttribute });
    keyUpload = input<UploadMode>('crop');
    rotateShow = input(false, { transform: booleanAttribute });
    accept = input('');

    // — Crop config
    aspectRatio = input<number>(3 / 2);
    resizeToWidth = input(300);
    format = input<CropFormat>('png');
    imageQuality = input(100);
    maintainAspectRatio = input(true, { transform: booleanAttribute });
    cropperMinWidth = input(10);
    cropperMinHeight = input(10);

    // — Display
    height = input('260px');
    footage = input<FootageMode>('horizontal');
    textView = input('Upload file');
    fileName = input<string>();

    // — Limits
    fileSize = input(_10MB);

    // — Events
    onUploadSuccess = output<string>();
    onUploadError = output<string>();

    // — State
    previewUrl = signal('');
    displayBasic = signal(false);

    private destroyRef = inject(DestroyRef);
    private fileService = inject(IctuFileService);
    private notificationService = inject(NotificationService);
    private dialog = inject(MatDialog);

    responsiveOptions: any[] = [
        { breakpoint: '1024px', numVisible: 5 },
        { breakpoint: '960px', numVisible: 4 },
        { breakpoint: '768px', numVisible: 3 },
        { breakpoint: '560px', numVisible: 1 },
    ];

    ngOnInit(): void {
        const field = this.formField();
        if (field) {
            field.valueChanges
                .pipe(
                    takeUntilDestroyed(this.destroyRef),
                    map((text: string) =>
                        text ? this.fileService.getPreviewLinkLocalFile(text) : '',
                    ),
                )
                .subscribe((url) => this.previewUrl.set(url));

            if (field.value) {
                this.previewUrl.set(
                    this.fileService.getPreviewLinkLocalFile(field.value),
                );
            }
        }
    }

    // ─────────────────────── Public ───────────────────────

    async onFileSelected(_event: Event, fileChooser: HTMLInputElement): Promise<void> {
        const files = fileChooser.files;
        if (!files || !files.length) return;

        const file = files[0];

        if (!TYPE_FILE_IMAGE.includes(file.type)) {
            this.notificationService.toastWarning('Định dạng file không phù hợp');
            fileChooser.value = '';
            return;
        }

        if (file.size >= this.fileSize()) {
            this.notificationService.toastError(
                'Dung lượng file không được vượt quá ' + Math.round(this.fileSize() / 1048576) + 'MB',
            );
            fileChooser.value = '';
            return;
        }

        try {
            const uploadFile =
                this.keyUpload() === 'crop'
                    ? await this.openCropDialog(file)
                    : file;

            if (!uploadFile) return;

            this.notificationService.isProcessing(true);

            this.fileService.uploadFile_tuyensinh(uploadFile).subscribe({
                next: (res: any) => {
                    const fileName = res.name;
                    this.formField().setValue(fileName);
                    this.previewUrl.set(
                        this.fileService.getPreviewLinkLocalFile(fileName),
                    );
                    this.onUploadSuccess.emit(fileName);
                    this.notificationService.toastSuccess('Upload thành công');
                    this.notificationService.isProcessing(false);
                },
                error: () => {
                    this.onUploadError.emit('Upload file không thành công');
                    this.notificationService.toastError(
                        'Upload file không thành công',
                    );
                    this.notificationService.isProcessing(false);
                },
            });
        } catch (_err) {
            this.notificationService.isProcessing(false);
            fileChooser.value = '';
        }
    }

    btnViewImage(): void {
        this.displayBasic.set(true);
    }

    // ─────────────────────── Private ───────────────────────

    private openCropDialog(file: File): Promise<File | null> {
        const config: Partial<ImageResizerConfig> = {
            resizeToWidth: this.resizeToWidth(),
            aspectRatio: this.aspectRatio(),
            format: this.format(),
            imageQuality: this.imageQuality(),
            maintainAspectRatio: this.maintainAspectRatio(),
            cropperMinWidth: this.cropperMinWidth(),
            cropperMinHeight: this.cropperMinHeight(),
            dataUrl: URL.createObjectURL(file),
        };

        const dialogRef: MatDialogRef<IctuImageResizeComponent, ImageResizerDto> =
            this.dialog.open(IctuImageResizeComponent, {
                data: config,
                disableClose: true,
                panelClass: 'image-resizer-panel',
            });

        return new Promise((resolve) => {
            dialogRef.afterClosed().subscribe((result) => {
                if (result?.error || !result?.data?.blob) {
                    resolve(null);
                    return;
                }
                const name =
                    this.fileName() ||
                    `img-${Date.now()}.${this.format()}`;
                const fileOut = Helper.blobToFile(result.data.blob, name);
                resolve(fileOut);
            });
        });
    }
}
