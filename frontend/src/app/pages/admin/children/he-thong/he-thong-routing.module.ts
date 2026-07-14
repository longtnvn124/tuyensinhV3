import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [

  {
    path: 'quan-ly-tai-khoan',
    loadComponent: (): Promise<any> => import('../he-thong/taikhoan-cbgv/taikhoan-cbgv.component')
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HeThongRoutingModule { }
