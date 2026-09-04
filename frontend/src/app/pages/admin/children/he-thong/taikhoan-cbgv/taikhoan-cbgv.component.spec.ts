import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SysRoleName } from '@models/role';
import { User } from '@models/user';
import { AuthenticationService } from '@services/authentication.service';
import { DonviService } from '@services/donvi.service';
import { NotificationService } from '@services/notification.service';
import { RoleService } from '@services/role.service';
import { UserService } from '@services/user.service';
import TaikhoanCbgvComponent from './taikhoan-cbgv.component';

describe('TaikhoanCbgvComponent unit handling', () => {
    const emptyResponse = {
        data: [],
        draw: 1,
        recordsTotal: 0,
        recordsFiltered: 0,
    };

    const userService = jasmine.createSpyObj<UserService>('UserService', ['query', 'create', 'update']);
    const roleService = jasmine.createSpyObj<RoleService>('RoleService', ['load']);
    const donviService = jasmine.createSpyObj<DonviService>('DonviService', ['query']);
    const notification = jasmine.createSpyObj<NotificationService>('NotificationService', [
        'isProcessing',
        'toastSuccess',
        'toastError',
    ]);
    const auth = jasmine.createSpyObj<AuthenticationService>(
        'AuthenticationService',
        ['getUserPermission', 'userHasRole'],
        { user: { id: 7, donvi_id: 11 } as User },
    );
    let currentRole: SysRoleName;

    beforeEach(() => {
        currentRole = 'admin';
        userService.query.calls.reset();
        userService.create.calls.reset();
        userService.update.calls.reset();
        donviService.query.calls.reset();
        userService.query.and.returnValue(of(emptyResponse));
        userService.create.and.returnValue(of(1));
        userService.update.and.returnValue(of(1));
        roleService.load.and.returnValue(of([]));
        donviService.query.and.returnValue(of(emptyResponse));
        auth.getUserPermission.and.returnValue({ view: true, create: true, update: true, delete: true });
        auth.userHasRole.and.callFake((roles: SysRoleName[]): boolean => roles.includes(currentRole));

        TestBed.configureTestingModule({
            providers: [
                FormBuilder,
                { provide: UserService, useValue: userService },
                { provide: RoleService, useValue: roleService },
                { provide: DonviService, useValue: donviService },
                { provide: AuthenticationService, useValue: auth },
                { provide: NotificationService, useValue: notification },
            ],
        });
    });

    function createComponent(): TaikhoanCbgvComponent {
        return TestBed.runInInjectionContext(() => new TaikhoanCbgvComponent());
    }

    it('filters admin users by the selected unit and maps its title', () => {
        const component = createComponent();
        component.listDonvi = [{ id: 21, title: 'Khoa CNTT', parent_id: 11, description: '', status: 1 }];
        component.searchInfo.donvi_id = 21;

        component.loadData(1);

        expect(userService.query).toHaveBeenCalledWith(
            jasmine.arrayContaining([jasmine.objectContaining({ conditionName: 'donvi_id', value: '21' })]),
            jasmine.any(Object),
        );
        expect(component.getDonviTitle(21)).toBe('Khoa CNTT');
        expect(component.getDonviTitle(999)).toBe('—');
    });

    it('submits the unit selected by admin', () => {
        const component = createComponent();
        component.addItem();
        component.formControl.formGroup.patchValue({
            username: 'admin.staff',
            display_name: 'Nhân viên quản trị',
            email: 'admin.staff@example.com',
            phone: '0987654321',
            password: 'password123',
            role_ids: [2],
            donvi_id: 21,
        });
        component.formControl.formGroup.markAllAsTouched();
        spyOn(component.formControl, 'closeForm');

        component.submitForm();

        expect(userService.create).toHaveBeenCalledWith(jasmine.objectContaining({ donvi_id: 21 }));
    });

    it('keeps partner ownership filtering and forces the current unit on create', () => {
        currentRole = 'doi-tac';
        const component = createComponent();
        component.dataRoles = [{ id: 9, name: 'doi-tac-cv', title: 'Đối tác chuyên viên' }] as never;

        component.ngOnInit();
        component.addItem();
        component.formControl.formGroup.patchValue({
            username: 'partner.staff',
            display_name: 'Nhân viên đối tác',
            email: 'staff@example.com',
            phone: '0987654321',
            password: 'password123',
        });
        component.formControl.formGroup.markAllAsTouched();
        spyOn(component.formControl, 'closeForm');
        component.submitForm();

        expect(userService.query).toHaveBeenCalledWith(
            jasmine.arrayContaining([jasmine.objectContaining({ conditionName: 'created_by', value: '7' })]),
            jasmine.any(Object),
        );
        expect(donviService.query).not.toHaveBeenCalled();
        expect(userService.create).toHaveBeenCalledWith(jasmine.objectContaining({ donvi_id: 11 }));
    });

    it('forces the current partner unit on update', () => {
        currentRole = 'doi-tac-cv';
        const component = createComponent();
        const user = {
            id: 15,
            username: 'partner.staff',
            display_name: 'Nhân viên đối tác',
            email: 'staff@example.com',
            phone: '0987654321',
            role_ids: ['9'],
            donvi_id: 99,
        } as User;

        component.editItem(user);
        component.formControl.formGroup.markAllAsTouched();
        spyOn(component.formControl, 'closeForm');
        component.submitForm();

        expect(userService.update).toHaveBeenCalledWith(15, jasmine.objectContaining({ donvi_id: 11 }));
    });
});
