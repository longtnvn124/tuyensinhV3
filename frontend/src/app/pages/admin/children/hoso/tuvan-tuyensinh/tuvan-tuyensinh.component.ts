
import { Component, inject, Input, OnDestroy, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DtoObject, IctuConditionParam, IctuQueryCondition } from '@models/dto';
import { HosoThisinh } from '@models/tuyensinh/hoso-thisinh';
import { LichsuTuvan } from '@models/tuyensinh/lichsu-tuvan';
import { Date2textPipe } from '@pipes/date2text.pipe';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { LichsuTuvanService } from '@services/tuyensinh/lichsu-tuvan.service';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { filter, finalize, Subscription, switchMap, tap } from 'rxjs';

import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { DatePicker } from 'primeng/datepicker';

type ConsultationView = 'history' | 'form';
type ConsultationLoadState = 'idle' | 'loading' | 'success' | 'error';

interface ConsultationMethod {
    label: string;
    value: string;
}

@Component({
    selector: 'app-tuvan-tuyensinh',
    imports: [LoadingProgressComponent, ReactiveFormsModule, Select, Textarea, DatePicker, Date2textPipe, ButtonDirective, Ripple],
    templateUrl: './tuvan-tuyensinh.component.html',
    styleUrl: './tuvan-tuyensinh.component.css',
})
export class TuvanTuyensinhComponent implements OnDestroy {
    private readonly formBuilder = inject(FormBuilder);
    private readonly authenticationService = inject(AuthenticationService);
    private readonly notification = inject(NotificationService);
    private readonly lichsuTuvanService = inject(LichsuTuvanService);

    private loadSubscription?: Subscription;
    private submitSubscription?: Subscription;
    private deleteSubscription?: Subscription;

    readonly currentHoso = signal<HosoThisinh | null>(null);
    readonly viewState = signal<ConsultationView>('history');
    readonly loadState = signal<ConsultationLoadState>('idle');
    readonly histories = signal<LichsuTuvan[]>([]);
    readonly submitting = signal(false);
    readonly deletingHistoryId = signal<number | null>(null);
    readonly canDeleteHistory = this.authenticationService.userHasRole(['admin', 'manager', 'direction']);

    readonly consultationMethods: ConsultationMethod[] = [
        { value: 'goi_dien', label: 'Gọi điện' },
        { value: 'tin_nhan', label: 'Tin nhắn' },
        { value: 'truc_tiep', label: 'Trực tiếp' },
        { value: 'online', label: 'Online' },
    ];

    readonly consultationForm = this.formBuilder.group({
        hinhthuc_tuvan: ['', Validators.required],
        thoigian_tuvan: ['', Validators.required],
        content: ['', [Validators.required, Validators.maxLength(5000)]],
        ketqua_tuvan: ['', Validators.maxLength(5000)],
        next_follow_up: [''],
    });

    private isReadOnly = false;

    @Input()
    set readOnly(value: boolean) {
        this.isReadOnly = value;
        if (!value) {
            return;
        }

        this.submitSubscription?.unsubscribe();
        this.deleteSubscription?.unsubscribe();
        this.submitting.set(false);
        this.deletingHistoryId.set(null);
        this.consultationForm.reset();
        this.viewState.set('history');
    }

    get readOnly(): boolean {
        return this.isReadOnly;
    }

    @Input() set hoso(value: HosoThisinh | null) {
        this.loadSubscription?.unsubscribe();
        this.submitSubscription?.unsubscribe();
        this.deleteSubscription?.unsubscribe();
        this.currentHoso.set(value ? { ...value } : null);
        this.resetView();

        if (value) {
            this.loadHistories();
        }
    }

    ngOnDestroy(): void {
        this.loadSubscription?.unsubscribe();
        this.submitSubscription?.unsubscribe();
        this.deleteSubscription?.unsubscribe();
    }

    showForm(): void {
        if (this.readOnly) {
            return;
        }

        this.consultationForm.reset({
            hinhthuc_tuvan: '',
            thoigian_tuvan: '',
            content: '',
            ketqua_tuvan: '',
            next_follow_up: '',
        });
        this.viewState.set('form');
    }

    showHistory(): void {
        this.consultationForm.reset();
        this.viewState.set('history');
    }

    retry(): void {
        this.loadHistories();
    }

    submit(): void {
        if (this.readOnly) {
            return;
        }

        const hoso = this.currentHoso();
        const currentUser = this.authenticationService.user;
        const rawValue = this.consultationForm.getRawValue();
        const content = rawValue.content?.trim() ?? '';

        if (!hoso || !currentUser || this.submitting()) {
            return;
        }

        if (this.consultationForm.invalid || !content) {
            this.consultationForm.markAllAsTouched();
            return;
        }

        const result = rawValue.ketqua_tuvan?.trim() ?? '';
        const payload: Partial<LichsuTuvan> = {
            hoso_id: hoso.id,
            user_id: currentUser.id,
            hinhthuc_tuvan: rawValue.hinhthuc_tuvan ?? '',
            thoigian_tuvan: rawValue.thoigian_tuvan ?? '',
            content,
            ketqua_tuvan: result,
            next_follow_up: rawValue.next_follow_up ?? '',
        };

        this.submitting.set(true);
        this.submitSubscription = this.lichsuTuvanService.create(payload).subscribe({
            next: (): void => {
                this.submitting.set(false);
                this.notification.toastSuccess('Thêm lịch sử tư vấn thành công');
                this.showHistory();
                this.loadHistories();
            },
            error: (): void => {
                this.submitting.set(false);
                this.notification.toastError('Thêm lịch sử tư vấn thất bại');
            },
        });
    }

    methodLabel(value: string): string {
        return this.consultationMethods.find((method: ConsultationMethod): boolean => method.value === value)?.label ?? value;
    }

    deleteHistory(history: LichsuTuvan): void {
        if (this.readOnly || !this.canDeleteHistory || this.deletingHistoryId() !== null) {
            return;
        }

        this.deleteSubscription?.unsubscribe();
        this.deleteSubscription = this.notification.confirmDelete(1).pipe(
            filter((confirmed: boolean): boolean => confirmed),
            tap((): void => this.deletingHistoryId.set(history.id)),
            switchMap(() => this.lichsuTuvanService.delete(history.id)),
            finalize((): void => this.deletingHistoryId.set(null)),
        ).subscribe({
            next: (): void => {
                this.histories.update((histories: LichsuTuvan[]): LichsuTuvan[] =>
                    histories.filter((item: LichsuTuvan): boolean => item.id !== history.id),
                );
                this.notification.toastSuccess('Xóa lịch sử tư vấn thành công');
            },
            error: (): void => {
                this.notification.toastError('Xóa lịch sử tư vấn thất bại');
            },
        });
    }

    private resetView(): void {
        this.histories.set([]);
        this.loadState.set('idle');
        this.viewState.set('history');
        this.submitting.set(false);
        this.consultationForm.reset({
            hinhthuc_tuvan: '',
            thoigian_tuvan: '',
            content: '',
            ketqua_tuvan: '',
            next_follow_up: '',
        });
    }

    private loadHistories(): void {
        const hoso = this.currentHoso();
        const currentUser = this.authenticationService.user;

        if (!hoso) {
            this.loadState.set('idle');
            return;
        }

        const conditions: IctuConditionParam[] = [
            {
                conditionName: 'hoso_id',
                value: `${hoso.id}`,
                condition: IctuQueryCondition.equal,
            },
        ];

        if (!this.authenticationService.userHasRole(['admin'])) {
            if (!currentUser) {
                this.loadState.set('error');
                return;
            }
            conditions.push({
                conditionName: 'user_id',
                value: `${currentUser.id}`,
                condition: IctuQueryCondition.equal,
            });
        }

        this.loadSubscription?.unsubscribe();
        this.loadState.set('loading');
        this.loadSubscription = this.lichsuTuvanService.query(
            conditions,
            { limit: -1, order: 'DESC', orderby: 'thoigian_tuvan' },
        ).subscribe({
            next: (response: DtoObject<LichsuTuvan[]>): void => {
                const currentHoso = this.currentHoso();
                if (!currentHoso || currentHoso.id !== hoso.id) {
                    return;
                }
                this.histories.set([...(response.data ?? [])]);
                this.loadState.set('success');
            },
            error: (): void => {
                const currentHoso = this.currentHoso();
                if (!currentHoso || currentHoso.id !== hoso.id) {
                    return;
                }
                this.histories.set([]);
                this.loadState.set('error');
                this.notification.toastError('Tải lịch sử tư vấn thất bại');
            },
        });
    }
}
