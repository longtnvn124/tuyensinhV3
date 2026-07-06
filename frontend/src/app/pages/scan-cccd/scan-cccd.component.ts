import { CommonModule } from '@angular/common';
import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { NotificationService } from '@app/services/notification.service';
import jsQR from 'jsqr';

@Component({
    selector: 'app-scan-cccd',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './scan-cccd.component.html',
    styleUrls: ['./scan-cccd.component.css'],
})
export default class ScanCccdLiveComponent implements AfterViewInit {
    @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
    public output: string = '';
    public capturedResults: string[] = [];

    constructor(private notification: NotificationService) {}

    ngAfterViewInit(): void {
        this.startCamera();
    }

    startCamera() {
        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: 'environment' } })
            .then((stream) => {
                this.videoRef.nativeElement.srcObject = stream;
                this.videoRef.nativeElement.play();
            })
            .catch((err) => {
                console.error('Lỗi camera:', err);
                alert('Không bật được camera: ' + err);
            });
    }

    captureAndRead() {
        const videoEl = this.videoRef.nativeElement;
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth || 200;
        canvas.height = videoEl.videoHeight || 200;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
            this.output = code.data;
            this.capturedResults.push(code.data);
            this.notification.toastSuccess(code.data, 'Chụp & đọc QR code');
        } else {
            this.notification.toastSuccess('Không tìm thấy QR code', 'Kết quả');
        }
    }

    toggleCamera() {
        const videoEl = this.videoRef.nativeElement;
        if (videoEl.srcObject) {
            // Tắt camera
            const stream = videoEl.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            videoEl.srcObject = null;
        } else {
            // Bật lại camera
            this.startCamera();
        }
    }
}
