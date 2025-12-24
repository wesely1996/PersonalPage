import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  HostListener,
} from '@angular/core';

@Component({
  selector: 'app-matrix-background',
  standalone: true,
  templateUrl: './matrix-background.component.html',
  styleUrls: ['./matrix-background.component.scss'],
})
export class MatrixBackgroundComponent implements OnInit {
  @ViewChild('matrixCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890@#$%^&*()*&^%';
  private columns!: number;
  private drops: number[] = [];
  private fontSize = 16;
  private speed = 50; // Lower = Faster

  ngOnInit(): void {
    this.initCanvas();
    this.startAnimation();
  }

  @HostListener('window:resize')
  onResize() {
    this.initCanvas(); // Resize canvas dynamically
  }

  private initCanvas() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.columns = Math.floor(canvas.width / this.fontSize);
    this.drops = Array(this.columns).fill(1);
  }

  private startAnimation() {
    const draw = () => {
      const canvas = this.canvasRef.nativeElement;
      const ctx = this.ctx;
      const { fontSize, columns, drops, letters } = this;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // Trail effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(0, 255, 0, 0.8)'; // Matrix green
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < columns; i++) {
        const text = letters.charAt(Math.floor(Math.random() * letters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }

      setTimeout(() => requestAnimationFrame(draw), this.speed);
    };

    draw();
  }
}
