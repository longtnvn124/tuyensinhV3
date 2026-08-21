import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { publicHttpContext } from '@app/interceptor/public-http-request';

import { Locations } from '@models/location';
import { HosoThisinh } from '@models/tuyensinh/hoso-thisinh';
import { Nganhhoc } from '@models/tuyensinh/nganhhoc';
import { LocationService } from '@services/location.service';
import { NotificationService } from '@services/notification.service';
import { HosoThisinhService } from '@services/tuyensinh/hoso-thisinh.service';
import { NganhhocService } from '@services/tuyensinh/nganhhoc.service';

type RegistrationLoadState = 'loading' | 'success' | 'error';
type RegistrationSubmitState = 'idle' | 'submitting' | 'success' | 'error';

interface EducationOption {
    label: string;
    value: string;
}

const trimmedEmail = (
    control: AbstractControl<string>
): ValidationErrors | null => {
    const value = control.value.trim();
    return !value || /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)
        ? null
        : { email: true };
};

const nonBlank = (
    control: AbstractControl<string>
): ValidationErrors | null =>
    control.value.trim() ? null : { required: true };

@Component({
    selector: 'app-dang-ky-xet-tuyen',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        CheckboxModule,
        InputTextModule,
        ProgressSpinnerModule,
    ],
    templateUrl: './dang-ky-xet-tuyen.component.html',
    styleUrl: './dang-ky-xet-tuyen.component.css',
})
export class DangKyXetTuyenComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly formBuilder = inject(FormBuilder);
    private readonly hosoService = inject(HosoThisinhService);
    private readonly nganhHocService = inject(NganhhocService);
    private readonly locationService = inject(LocationService);
    private readonly notification = inject(NotificationService);
    private readonly router = inject(Router);

    readonly loadState = signal<RegistrationLoadState>('loading');
    readonly submitState = signal<RegistrationSubmitState>('idle');
    readonly majors = signal<Nganhhoc[]>([]);
    readonly regions = signal<Locations[]>([]);
    readonly educationOptions: readonly EducationOption[] = [
        { label: 'THPT', value: 'THPT' },
        { label: 'Trung cấp', value: 'tc' },
        { label: 'Cao đẳng', value: 'cd' },
        { label: 'Đại học', value: 'dh' },
      
    ];

    readonly registrationForm = this.formBuilder.group({
        nganh_id: this.formBuilder.control<number | null>(null, Validators.required),
        doituong: this.formBuilder.nonNullable.control('', Validators.required),
        ho_va_ten: this.formBuilder.nonNullable.control('', [
            Validators.required,
            nonBlank,
            Validators.maxLength(120),
        ]),
        dia_chi_tinh: this.formBuilder.control<number | null>(null, Validators.required),
        dien_thoai: this.formBuilder.nonNullable.control('', [
            Validators.required,
            Validators.pattern(/^0\d{9}$/),
        ]),
        email: this.formBuilder.nonNullable.control('', [
            Validators.required,
            nonBlank,
            trimmedEmail,
            Validators.maxLength(160),
        ]),
        cam_ket: this.formBuilder.nonNullable.control(false, Validators.requiredTrue),
    });

    ngOnInit(): void {
        this.loadLookups();
    }

    loadLookups(): void {
        this.loadState.set('loading');

        forkJoin({
            majors: this.nganhHocService.load(
                { search: '' },
                { limit: -1 },
                publicHttpContext()
            ),
            regions: this.locationService.queryLocation(
                [],
                { limit: -1, paged: 1 },
                'regions',
                publicHttpContext()
            ),
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: ({ majors, regions }): void => {
                    this.majors.set(majors.data.filter(major => major.is_active));
                    this.regions.set(regions.data);
                    this.loadState.set('success');
                },
                error: (): void => {
                    this.loadState.set('error');
                    this.notification.toastError(
                        'Không tải được dữ liệu đăng ký. Vui lòng thử lại.'
                    );
                },
            });
    }

    submit(): void {
        if (this.submitState() === 'submitting') {
            return;
        }

        if (this.registrationForm.invalid) {
            this.registrationForm.markAllAsTouched();
            return;
        }

        const values = this.registrationForm.getRawValue();
        const email = values.email.trim();
        const payload: Partial<any> = {
            nganh_id: values.nganh_id as number,
            doituong: values.doituong,
            ho_va_ten: values.ho_va_ten.trim(),
            dia_chi_tinh: values.dia_chi_tinh as number,
            dien_thoai: values.dien_thoai.trim(),
            email,
            submit_from: 'public-registration',
        };

        this.submitState.set('submitting');
        this.hosoService
            .create(payload)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (): void => {
                    this.registrationForm.reset({
                        nganh_id: null,
                        doituong: '',
                        ho_va_ten: '',
                        dia_chi_tinh: null,
                        dien_thoai: '',
                        email: '',
                        cam_ket: false,
                    });
                    this.submitState.set('success');
                    this.notification.toastSuccess(
                        'Đăng ký thành công. Nhà trường sẽ sớm liên hệ với bạn.'
                    );
                },
                error: (e): void => {
                
                    this.submitState.set('error');
            
                },
            });
    }

    openLogin(): void {
        void this.router.navigate(['/auth/login']);
    }
}
