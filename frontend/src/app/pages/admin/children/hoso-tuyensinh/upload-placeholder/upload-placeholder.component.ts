import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-upload-placeholder',
    standalone: true,
    templateUrl: './upload-placeholder.component.html',
    styleUrl: './upload-placeholder.component.css',
})
export class UploadPlaceholderComponent {
    @Input() label: string = 'Upload ảnh';
    @Input() maxCount: number = 1;
    @Input() accept: string = 'image/*';

    @Output() filesChanged: EventEmitter<File[]> = new EventEmitter<File[]>();

    constructor() {
        setTimeout((): void => this.filesChanged.emit([]), 0);
    }

    get hintText(): string {
        if (!this.maxCount || this.maxCount <= 1) {
            return 'Chọn 1 ảnh';
        }
        return `Tối đa ${this.maxCount} ảnh`;
    }
}
