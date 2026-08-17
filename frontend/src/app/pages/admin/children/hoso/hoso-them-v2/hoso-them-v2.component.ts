import { Component, ViewChild } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { FormThongtinDangkyComponent } from '../form-thongtin-dangky/form-thongtin-dangky.component';

@Component({
    selector: 'app-hoso-them-v2',
    standalone: true,
    imports: [MatButton, FormThongtinDangkyComponent],
    templateUrl: './hoso-them-v2.component.html',
    styleUrl: './hoso-them-v2.component.css',
})
export class HosoThemV2Component {
    @ViewChild(FormThongtinDangkyComponent)
    private formComponent?: FormThongtinDangkyComponent;

    onReset(): void {
        this.formComponent?.resetForm();
    }
}
