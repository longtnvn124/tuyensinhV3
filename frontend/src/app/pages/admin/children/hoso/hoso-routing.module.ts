import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path: '',
        redirectTo: 'hoso-xettuyen',
        pathMatch: 'prefix'
    },

    {
        path: 'hoso-xettuyen',
        loadComponent: (): Promise<any> => import('@app/pages/admin/children/hoso/hoso-xettuyen/hoso-xettuyen.component').then((m): any => m.HosoXettuyenComponent),
    },
    {
        path: 'hoso-trungtuyen',
        loadComponent: (): Promise<any> => import('@app/pages/admin/children/hoso/hoso-trungtuyen/hoso-trungtuyen.component').then((m): any => m.HosoTrungtuyenComponent),
    },
    {
        path: 'hoso-khongtrungtuyen',
        loadComponent: (): Promise<any> => import('@app/pages/admin/children/hoso/hoso-khongtrungtuyen/hoso-khongtrungtuyen.component').then((m): any => m.HosoKhongtrungtuyenComponent),
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class HosoRoutingModule { }
