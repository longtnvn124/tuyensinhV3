import { Component, computed, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Select } from 'primeng/select';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { SummaryService } from '@app/services/tuyensinh/summary.service';
import { ExternalApiResponse } from '@models/external-api';

interface KpiSummary {
    hoso: number | null;
    nganh: number | null;
    hoso_daduyet: number | null;
    hoso_huy: number | null;
}

interface YearOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-dashboad',
    imports: [CommonModule, FormsModule, Select, LoadingProgressComponent],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css',
    standalone: true,
})
export class DashboardComponent implements OnInit {
    private readonly summaryService: SummaryService = inject(SummaryService);

    readonly currentYear: number = new Date().getFullYear();
    readonly selectedYear: WritableSignal<number> = signal<number>(this.currentYear);
    readonly state: WritableSignal<'loading' | 'success' | 'error'> = signal<'loading' | 'success' | 'error'>('loading');

    readonly years: ReturnType<typeof computed<YearOption[]>> = computed<YearOption[]>(() => {
        const y = this.currentYear;
        return [
            { label: String(y), value: y },
            { label: String(y - 1), value: y - 1 },
        ];
    });

    summary: KpiSummary = {
        hoso: null,
        nganh: null,
        hoso_daduyet: null,
        hoso_huy: null,
    };

    constructor() {}

    ngOnInit(): void {

        this.selectedYear.set(this.years()[0].value);
        this.loadDashboard(this.selectedYear());
    }

    loadDashboard(year: number): void {
        this.state.set('loading');
        this.summaryService.getDashboard(year).subscribe({
            next: (res: ExternalApiResponse<any>): void => {
                console.log('full res:', res);

                const d = res ?? {};
                this.summary = {
                    hoso: d['hoso'] ?? null,
                    nganh: d['nganh'] ?? null,
                    hoso_daduyet: d['hoso_daduyet'] ?? null,
                    hoso_huy: d['hoso_huy'] ?? null,
                };
                this.state.set('success');
            },
            error: (): void => {
                this.state.set('error');
            },
        });
    }

    onYearChange(year: number | null): void {
        const target = year ?? this.currentYear;
        if (target === this.selectedYear()) {
            return;
        }
        this.selectedYear.set(target);
        this.loadDashboard(target);
    }

    reload(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.loadDashboard(this.selectedYear());
    }
}
