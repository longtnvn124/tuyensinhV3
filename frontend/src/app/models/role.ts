import { InjectionToken } from '@angular/core';

export interface Role {
	id: number;
	description: string;
	name: SysRoleName;
	ordering: number;
	title: string;
	realm: string;
	ucase_ids: UseCasePermission[];
	provider: RolePermission[];
	is_default: number;
	status: number;
	created_at?: string;
	updated_at?: string;
}

export type PickRole = Pick<Role, 'id' | 'description' | 'name' | 'ordering' | 'title'>;

export interface UseCasePermission {
	id: string; // UseCase name : 'he-thong/thong-tin-tai-khoan'
	pms: string; // 1.1.1.1 = access.read.update.delete
}

export interface RolePermission {
	id: string; // router : 'users'
	pms: string; // 1.1.1.1 = access.read.update.delete
}

// 8 nhóm quyền có tài khoản đăng nhập theo plan/du-an.md (mục 2.1 + 11)
// 'thi-sinh' không có tài khoản → không nằm trong SysRoleName
export type AdminRole = 'admin';
export type DirectionRole = 'direction';
export type ManagerRole = 'manager';
export type StaffRole = 'staff';
export type TrainingStaffRole = 'training_staff';
export type ReviewerRole = 'reviewer';
export type DoiTacRole = 'doi-tac';
export type DoiTacCvRole = 'doi-tac-cv';

export type SysRoleName =
	| AdminRole
	| DirectionRole
	| ManagerRole
	| StaffRole
	| TrainingStaffRole
	| ReviewerRole
	| DoiTacRole
	| DoiTacCvRole;

export const APP_REDIRECT_LINKS: InjectionToken<Map<SysRoleName, string>> =
	new InjectionToken<Map<SysRoleName, string>>('default redirect for each role');

export const createAppRedirectLinks: () => Map<SysRoleName, string> =
	(): Map<SysRoleName, string> => {
		return new Map<SysRoleName, string>([
			['admin', '/admin/dashboard'],
			['direction', '/admin/dashboard'],
			['manager', '/admin/hoso-tuyensinh'],
			['staff', '/admin/hoso-tuyensinh'],
			['training_staff', '/admin/hoso-tuyensinh'],
			['reviewer', '/admin/dashboard'],
			['doi-tac', '/admin/hoso-tuyensinh'],
			['doi-tac-cv', '/admin/hoso-tuyensinh']
		]);
	};

// Nhân viên nội bộ (không bao gồm đối tác ngoài)
export const ARRAY_EMPLOYEE_ROLES: SysRoleName[] = [
	'admin',
	'direction',
	'manager',
	'staff',
	'training_staff',
	'reviewer'
];
