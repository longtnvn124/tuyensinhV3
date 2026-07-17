import {Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';
import {NgClass, NgForOf, NgIf, NgStyle} from "@angular/common";
import {AbstractControl} from "@angular/forms";
import {Observable, of, Subject, switchMap} from "rxjs";
import {FileService} from "@core/services/file.service";
import {NotificationService} from "@core/services/notification.service";
import {RippleModule} from "primeng/ripple";
import {ButtonModule} from "primeng/button";
import {map} from "rxjs/operators";
import {GalleriaModule} from "primeng/galleria";
import {ImageModule} from "primeng/image";
import {SharedModule} from "primeng/api";

interface ArrFile {
    fileName: string,
    url: string
}

@Component({
    selector: 'ovic-avata-type-multiple',
    templateUrl: './ovic-avata-type-multiple.component.html',
    styleUrls: ['./ovic-avata-type-multiple.component.css'],
    standalone: true,

    imports: [
        NgIf,
        NgClass,
        NgStyle,
        RippleModule,
        ButtonModule,
        NgForOf,
        GalleriaModule,
        ImageModule,
        SharedModule
    ]
})
export class OvicAvataTypeMultipleComponent implements OnInit, OnChanges, OnDestroy {


    @Input() site: boolean = false;
    @Input() disabled: boolean = false;
    @Input() formField  !: AbstractControl;           // dùng ! nếu bắt buộc
    @Input() multiple: boolean = true;
    @Input() accept: string = '';
    @Input() aspectRatio?: number;                  // ví dụ: 2/3 hoặc 3/2
    @Input() textView: string = 'Upload file';
    @Input() height     ?: string = '260px';                       // ví dụ: '300px'
    @Input() file_size: number | null = null;       // KB
    @Input() file_name  ?: string;
    @Input() footage: string = 'horizontal';
    @Input() rotateShow: boolean = false;
    @Input() key_upload: string = 'crop'; //normal

    listFile: ArrFile[]

    activeIndex: number = 0;

    private destroy$ = new Subject<void>();

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
    ) {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.formField) {
            this.formField.valueChanges.pipe(map(t => (t && Array.isArray(t)) ? t : [])).subscribe((files: string[]) => {

                this.listFile = files && files.length > 0 ? files.filter(Boolean).map(file => {
                    return {
                        fileName: file,
                        url: this.fileService.getPreviewLinkLocalFile(file)
                    };
                }) : [];
            });
        }

    }

    ngOnInit(): void {

        if (this.formField) {
            this.formField.valueChanges.pipe(map(t => (t && Array.isArray(t)) ? t : [])).subscribe((files: string[]) => {
                this.listFile = files && files.length > 0 ? files.filter(Boolean).map(file => {
                    return {
                        fileName: file,
                        url: this.fileService.getPreviewLinkLocalFile(file)
                    };
                }) : [];
            });
            if (this.formField.value && Array.isArray(this.formField.value)) {
                this.listFile = this.formField.value && this.formField.value.length > 0 ? this.formField.value.filter(Boolean).map(file => {
                    return {
                        fileName: file,
                        url: this.fileService.getPreviewLinkLocalFile(file)
                    };
                }) : [];
            }

        }

    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    async onInputAvatar(event: Event, fileChooser: HTMLInputElement): Promise<void> {
        const selectedFile = fileChooser.files;
        if (!selectedFile || selectedFile.length === 0) return;


        try {
            // 1. Tạo avatar (crop + resize)
            let processedFile = Object.values(selectedFile);
            if (!processedFile) {
                throw new Error('Tạo avatar thất bại');
            }

            this.notificationService.isProcessing(true);


            console.log(processedFile);
            // 3. Upload
            const step: number = 100 / processedFile.length;
            this.notificationService.loadingAnimationV2({process: {percent: 0}});

            this.loopFileIndata(processedFile, step, 0, []).subscribe({
                next: (fileUl) => {
                    const dataOld = this.formField.value ? this.formField.value : [] ;
                    const dataNew = fileUl.map(m => m.name);

                    this.formField.setValue([...dataOld,...dataNew]);
                    this.notificationService.isProcessing(false);

                    this.notificationService.disableLoadingAnimationV2();
                    this.notificationService.toastSuccess('Upload file thành công');
                }, error: () => {
                    this.notificationService.isProcessing(false);

                    this.notificationService.toastError('Upload file không thành công');
                    this.notificationService.disableLoadingAnimationV2();
                }
            })



        } catch (err) {

            this.notificationService.toastError('Có lỗi xảy ra khi xử lý file');
            this.notificationService.isProcessing(false);
            fileChooser.value = '';
        }
    }

    private loopFileIndata(data: File[], step: number, percent: number, redata: any[]): Observable<any> {
        const index = data.findIndex(i => !i['__created']);
        if (index !== -1) {
            const item = data[index];
            return this.fileService.uploadFile_tuyensinh(item).pipe(switchMap(m => {
                    const newPercent: number = percent + step;
                    item['__created'] = true;
                    this.notificationService.loadingAnimationV2({process:{percent:newPercent }})
                    redata.push(m);
                    return this.loopFileIndata(data, step, newPercent, redata)
                }),
            )
        } else {
            return of(redata);
        }
    }


    //---------------------------------------------------------
    displayBasic: boolean = false;

    btnviewImage(item: ArrFile) {
        this.displayBasic = true;
        this.activeIndex = this.listFile.findIndex(f=>f.fileName == item.fileName);
    }

    btnDeleteFile(item:ArrFile) {
        const arr = this.listFile.filter(f => f.fileName !== item.fileName);
        this.formField.setValue(arr.map(m => m.fileName));
    }
}
