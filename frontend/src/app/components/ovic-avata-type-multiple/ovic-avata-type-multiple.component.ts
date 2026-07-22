import {booleanAttribute, Component, DestroyRef, inject, input, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {NgClass, NgStyle} from "@angular/common";
import {AbstractControl} from "@angular/forms";
import {Observable, of, Subject, switchMap} from "rxjs";
import {FileService} from "@core/services/file.service";
import {RippleModule} from "primeng/ripple";
import {ButtonModule} from "primeng/button";
import {map} from "rxjs/operators";
import {GalleriaModule} from "primeng/galleria";
import {ImageModule} from "primeng/image";
import {SharedModule} from "primeng/api";
import { NotificationService } from '@app/services/notification.service';
import { IctuFileService } from '@app/services/ictu-file.service';

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
        NgClass,
        NgStyle,
        RippleModule,
        ButtonModule,
        GalleriaModule,
        ImageModule,
        SharedModule
    ]
})
export class OvicAvataTypeMultipleComponent implements OnInit {

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

    listFile = signal<ArrFile[]>([]);
    activeIndex = signal(0);
    displayBasic = signal(false);

    private processedKeys = new Set<number>();
    private destroyRef = inject(DestroyRef);
    private fileService = inject(IctuFileService);
    private notificationService = inject(NotificationService);

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
            field.valueChanges.pipe(
                takeUntilDestroyed(this.destroyRef),
                map(t => (t && Array.isArray(t)) ? t : [])
            ).subscribe((files: string[]) => {
                this.listFile.set(files?.length > 0 ? files.filter(Boolean).map(file => ({
                    fileName: file,
                    url: this.fileService.getPreviewLinkLocalFile(file)
                })) : []);
            });
            if (field.value && Array.isArray(field.value)) {
                this.listFile.set(field.value.filter(Boolean).map(file => ({
                    fileName: file,
                    url: this.fileService.getPreviewLinkLocalFile(file)
                })));
            }
        }
    }

    async onInputAvatar(_event: Event, fileChooser: HTMLInputElement): Promise<void> {
        const selectedFile = fileChooser.files;
        if (!selectedFile || selectedFile.length === 0) return;

        try {
            const processedFile = Object.values(selectedFile);
            if (!processedFile) {
                throw new Error('Tạo avatar thất bại');
            }

            this.notificationService.isProcessing(true);

            const step: number = 100 / processedFile.length;
            this.notificationService.loadingAnimationV2({process: {percent: 0}});

            this.loopFileIndata(processedFile, step, 0, []).subscribe({
                next: (fileUl) => {
                    const dataOld = this.formField().value ? this.formField().value : [];
                    const dataNew = fileUl.map(m => m.name);

                    this.formField().setValue([...dataOld, ...dataNew]);
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
        const index = data.findIndex((_, i) => !this.processedKeys.has(i));
        if (index !== -1) {
            const item = data[index];
            return this.fileService.uploadFile_tuyensinh(item).pipe(switchMap(m => {
                    const newPercent: number = percent + step;
                    this.processedKeys.add(index);
                    this.notificationService.loadingAnimationV2({process: {percent: newPercent}})
                    redata.push(m);
                    return this.loopFileIndata(data, step, newPercent, redata)
                }),
            )
        } else {
            return of(redata);
        }
    }

    btnviewImage(item: ArrFile) {
        this.displayBasic.set(true);
        this.activeIndex.set(this.listFile().findIndex(f => f.fileName == item.fileName));
    }

    btnDeleteFile(item: ArrFile) {
        const arr = this.listFile().filter(f => f.fileName !== item.fileName);
        this.formField().setValue(arr.map(m => m.fileName));
    }

    trackByFile(_index: number, item: ArrFile): string {
        return item.fileName;
    }
}
