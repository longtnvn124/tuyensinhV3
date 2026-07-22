import {booleanAttribute, Component, DestroyRef, inject, input, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AbstractControl} from "@angular/forms";

import {RippleModule} from "primeng/ripple";
import {NgClass} from "@angular/common";
import {map} from "rxjs";
import {ImageModule} from "primeng/image";
import {GalleriaModule} from "primeng/galleria";
import { NotificationService } from '@app/services/notification.service';
import { IctuFileService,base64ToFile } from '@app/services/ictu-file.service';
import { AvatarMakerSetting, MediaService } from '@app/services/media.service';
export const TYPE_FILE_IMAGE:string[] = ['image/png', 'image/gif','image/jpeg', 'image/bmp',' image/x-icon'];


@Component({
    selector: 'ovic-avata-type-thpt',
    templateUrl: './ovic-avata-type-thpt.component.html',
    styleUrls: ['./ovic-avata-type-thpt.component.css'],
    standalone: true,
    imports: [
        RippleModule,
        NgClass,
        ImageModule,
        GalleriaModule
    ]
})
export class OvicAvataTypeThptComponent implements OnInit {

    site = input(false, {transform: booleanAttribute});
    disabled = input(false, {transform: booleanAttribute});
    formField = input.required<AbstractControl>();
    multiple = input(true, {transform: booleanAttribute});
    accept = input('');
    aspectRatio = input<number>();
    textView = input('Upload file');
    height = input('260px');
    file_size = input<number | null>(null);
    file_name = input<string>();
    footage = input('horizontal');
    rotateShow = input(false, {transform: booleanAttribute});
    key_upload = input('crop');

    characterAvatar = signal('');

    private destroyRef = inject(DestroyRef);
    private fileService = inject(IctuFileService);
    private notificationService = inject(NotificationService);
    private mediaService = inject(MediaService) ;
   

    typeFileAdd = TYPE_FILE_IMAGE;

    displayBasic = signal(false);

    responsiveOptions: any[] = [
        {
            breakpoint: '1024px',
            numVisible: 5
        },
        {
            breakpoint: '960px',
            numVisible: 4
        },
        {
            breakpoint: '768px',
            numVisible: 3
        },
        {
            breakpoint: '560px',
            numVisible: 1
        }
    ];

    ngOnInit(): void {
        const field = this.formField();
        if (field) {
            field.valueChanges
                .pipe(
                    takeUntilDestroyed(this.destroyRef),
                    map((text: string) => text ? this.fileService.getPreviewLinkLocalFile(text) : '')
                )
                .subscribe(url => this.characterAvatar.set(url));

            if (field.value) {
                this.characterAvatar.set(this.fileService.getPreviewLinkLocalFile(field.value));
            }
        }
    }

    async makeCharacterAvatar(file: File): Promise<File | null> {
        try {
            const options: AvatarMakerSetting = {
                aspectRatio: this.aspectRatio() ?? 2 / 3,
                resizeToWidth: 300,
                format: 'jpeg',
                cropperMinWidth: 10,
                dirRectImage: {
                    enable: true,
                    dataUrl: URL.createObjectURL(file)
                },
                rotateShow: this.rotateShow()
            };

        
            const avatar = await this.mediaService.callAvatarMakerV2(options);

            if (avatar && !avatar.error && avatar.data?.base64) {
                const fileName = this.file_name() || file.name;
                // return this.fileService.base64ToFile(avatar.data.base64, fileName);
                return base64ToFile(avatar.data.base64, fileName);
            }

            return null;
        } catch (e) {
            this.notificationService.toastError('Tạo avatar thất bại');
            return null;
        }
    }

    async onInputAvatar(_event: Event, fileChooser: HTMLInputElement): Promise<void> {
        const files = fileChooser.files;
        if (!files || files.length === 0) return;

        const selectedFile = files[0];

        if (!this.typeFileAdd.includes(selectedFile.type)) {
            this.notificationService.toastWarning('Định dạng file không phù hợp');
            fileChooser.value = '';
            return;
        }

        try {
            const processedFile = this.key_upload() == 'crop' ? await this.makeCharacterAvatar(selectedFile) : selectedFile;
            if (!processedFile) {
                return;
            }
            this.notificationService.isProcessing(true);
           
            this.fileService.uploadFile_tuyensinh(processedFile).subscribe({
                next: (fileUl: any) => {
                    this.formField().setValue(fileUl.name);
                    this.characterAvatar.set(this.fileService.getPreviewLinkLocalFile(fileUl.name));

                    this.notificationService.toastSuccess('Upload thành công');
                    this.notificationService.isProcessing(false);
                },
                error: () => {
                    this.notificationService.toastError('Upload file không thành công');
                    this.notificationService.isProcessing(false);
                },
            });

        } catch (err) {
            this.notificationService.toastError('Có lỗi xảy ra khi xử lý file');
            this.notificationService.isProcessing(false);
            fileChooser.value = '';
        }
    }

    btnviewImage() {
        this.displayBasic.set(true);
    }
}
