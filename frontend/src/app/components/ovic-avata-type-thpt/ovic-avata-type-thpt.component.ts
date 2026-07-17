import {Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';
import {AbstractControl} from "@angular/forms";
import {FileService} from "@core/services/file.service";
import {NotificationService} from "@core/services/notification.service";
import {AvatarMakerSetting, MediaService} from "@shared/services/media.service";
import {TYPE_FILE_IMAGE} from "@shared/utils/syscat";
import {RippleModule} from "primeng/ripple";
import {NgClass, NgIf} from "@angular/common";
import { Subject, takeUntil} from "rxjs";
import {ImageModule} from "primeng/image";
import {GalleriaModule} from "primeng/galleria";


@Component({
    selector: 'ovic-avata-type-thpt',
    templateUrl: './ovic-avata-type-thpt.component.html',
    styleUrls: ['./ovic-avata-type-thpt.component.css'],
    standalone: true,
    imports: [
        RippleModule,
        NgIf,
        NgClass,
        ImageModule,
        GalleriaModule
    ]
})
export class OvicAvataTypeThptComponent implements OnInit,OnChanges,OnDestroy {

    @Input() site       : boolean = false;
    @Input() disabled   : boolean = false;
    @Input() formField  !: AbstractControl;           // dùng ! nếu bắt buộc
    @Input() multiple   :boolean = true;
    @Input() accept     : string ='';
    @Input() aspectRatio?: number;                  // ví dụ: 2/3 hoặc 3/2
    @Input() textView   : string = 'Upload file';
    @Input() height     ?: string = '260px';                       // ví dụ: '300px'
    @Input() file_size  : number | null = null;       // KB
    @Input() file_name  ?: string;
    @Input() footage    : string = 'horizontal';
    @Input() rotateShow : boolean = false;
    @Input() key_upload : string = 'crop'; //normal

    characterAvatar     : string = '';

    private destroy$ = new Subject<void>();

    typeFileAdd = TYPE_FILE_IMAGE;


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

    constructor(
        private fileService: FileService,
        private notificationService: NotificationService,
        private mediaService: MediaService,

    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (this.formField){
            this.characterAvatar = this.formField.value ? this.fileService.getPreviewLinkLocalFile(this.formField.value) : '';
        }

    }

    ngOnInit(): void {
        if (this.formField) {
            // Chỉ subscribe 1 lần ở đây
            this.formField.valueChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe((text: string) => {
                    this.characterAvatar = text ? this.fileService.getPreviewLinkLocalFile(text) : '';

                });

            // Cập nhật giá trị ban đầu (nếu có)
            if (this.formField.value) {
                this.characterAvatar =this.fileService.getPreviewLinkLocalFile(this.formField.value);
            }
        }



    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ====================== TẠO AVATAR (CROP + RESIZE) ======================
    async makeCharacterAvatar(file: File): Promise<File | null> {
        try {
            const options: AvatarMakerSetting = {
                aspectRatio: this.aspectRatio ?? 2 / 3,
                resizeToWidth: 300,
                format: 'jpeg',
                cropperMinWidth: 10,
                dirRectImage: {
                    enable: true,
                    dataUrl: URL.createObjectURL(file)
                },
                rotateShow: this.rotateShow
            };

            const avatar = await this.mediaService.callAvatarMakerV2(options);

            if (avatar && !avatar.error && avatar.data?.base64) {
                const fileName = this.file_name || file.name;
                return this.fileService.base64ToFile(avatar.data.base64, fileName);
            }

            return null;
        } catch (e) {
            console.error('Lỗi tạo avatar:', e);
            this.notificationService.toastError('Tạo avatar thất bại');
            return null;
        }
    }


    // ====================== XỬ LÝ KHI CHỌN FILE ======================
    async onInputAvatar(event: Event, fileChooser: HTMLInputElement): Promise<void> {
        const files = fileChooser.files;
        if (!files || files.length === 0) return;

        const selectedFile = files[0];

        // Kiểm tra định dạng
        if (!this.typeFileAdd.includes(selectedFile.type)) {
            this.notificationService.toastWarning('Định dạng file không phù hợp');
            fileChooser.value = ''; // reset input
            return;
        }
        // Kiểm tra kích thước tối đa (ví dụ: 20MB)
        try {
            // 1. Tạo avatar (crop + resize)
            let processedFile = this.key_upload == 'crop' ? await this.makeCharacterAvatar(selectedFile) : selectedFile;
            console.log(processedFile);
            if(!processedFile){
                return ;
            }
            this.notificationService.isProcessing(true);
            this.fileService.uploadFile_tuyensinh(processedFile).subscribe({
                next: (fileUl: any) => {
                    console.log(fileUl)
                    this.formField.setValue(fileUl.name);
                    this.characterAvatar =  this.fileService.getPreviewLinkLocalFile(fileUl.name);

                    this.notificationService.toastSuccess('Upload thành công');
                    this.notificationService.isProcessing(false);
                },
                error: () => {
                    this.notificationService.toastError('Upload file không thành công');
                    this.notificationService.isProcessing(false);

                },
            });

        } catch (err) {
            // console.error(err);
            this.notificationService.toastError('Có lỗi xảy ra khi xử lý file');
            this.notificationService.isProcessing(false);
            fileChooser.value = '';
        }
    }


    //---------------------------------------------------------
    displayBasic: boolean = false;
    btnviewImage(){
        this.displayBasic = true;
    }
}
