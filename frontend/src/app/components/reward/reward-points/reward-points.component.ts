import { Component } from '@angular/core';
import { ComingSoonComponent } from '@components/coming-soon/coming-soon.component';

@Component( {
    selector    : 'app-reward-points' ,
    imports     : [ ComingSoonComponent ] ,
    templateUrl : './reward-points.component.html' ,
    styleUrl    : './reward-points.component.css'
} )
export default class RewardPointsComponent {

}
