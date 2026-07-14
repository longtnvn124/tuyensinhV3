import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface KpiSummary {
  totalRegistrations: number | null;
  totalRevenue: number | null;
  totalAdmitted: number | null;
  pendingRegistrations: number | null;
  pendingCouncil: number | null;
}

interface TableItem {
  name: string;
  count?: number | null;
  pct?: string | null;
  barWidth?: number;
  barClass?: string;
}

interface StatusItem {
  label: string;
  count?: number | null;
  color: string;
}

interface PeriodItem {
  name: string;
  count?: number | null;
  admitted?: number | null;
  rate?: string | null;
}

interface RevenueItem {
  code: string;
  partner: string;
  amount: string;
  status: string;
}

interface CouncilItem {
  name: string;
  admitted?: number | null;
  rejected?: number | null;
  total?: number | null;
}

interface ConsultationItem {
  time: string;
  registration: string;
  consultant: string;
  method: string;
  result: string;
  followUp: string;
}

interface SystemOverview {
  majors: number | null;
  programs: number | null;
  employees: number | null;
  consultants: number | null;
}

@Component({
  selector: 'app-dashboad',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  standalone: true,
})
export class DashboardComponent implements OnInit {
  lastUpdate: string = '';
  selectedPeriod: number = 30;

  summary: KpiSummary = {
    totalRegistrations: null,
    totalRevenue: null,
    totalAdmitted: null,
    pendingRegistrations: null,
    pendingCouncil: null,
  };

  byMajor: TableItem[] = [];
  byStatus: StatusItem[] = [];
  byPeriod: PeriodItem[] = [];
  bySource: TableItem[] = [];
  councilResults: CouncilItem[] = [];
  recentRevenue: RevenueItem[] = [];
  recentConsultations: ConsultationItem[] = [];
  systemOverview: SystemOverview = {
    majors: null,
    programs: null,
    employees: null,
    consultants: null,
  };

  constructor() {}

  ngOnInit(): void {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    this.lastUpdate = `${dd}/${mm}/${yyyy}`;
  }

  onPeriodChange(): void {
    // TODO: Gọi API với selectedPeriod
  }

  refresh(): void {
    // TODO: Gọi lại tất cả API dashboard
  }
}
