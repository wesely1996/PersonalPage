// ... other imports
import { CommonModule } from '@angular/common';
import {
  ViewChild,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Component,
} from '@angular/core';

@Component({
  selector: 'app-dino-game',
  imports: [CommonModule],
  templateUrl: './dino-game.component.html',
  styleUrls: ['./dino-game.component.scss'],
})
export class DinoGameComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private animationFrameId = 0;

  dinoY = 0;
  velocityY = 0;
  gravity = 0.6;
  jumping = false;
  jumpCount = 0;

  jumpPressed = false;
  jumpHoldTime = 0;
  maxJumpHoldTime = 15;

  obstacleX = 500;
  obstacleHeight = 20;
  flyingObstacleX = 800;
  flyingObstacleY = 100;

  score = 0;
  highScore = 0;
  scoreInterval: any;
  gameRunning = false;

  dinoImg = new Image();

  groundLevel: number = 210;

  baseColor = '#00ff00';
  backgorundColor = 'rgba(0,0,0,0.6)';

  constructor(private el: ElementRef) {}

  ngOnInit() {
    document.addEventListener('click', this.handleDocumentClick);
    this.dinoImg.src = 'images/dino-player.png';
  }

  ngAfterViewInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.resetGame();
    this.startGame();
  }

  resetGame() {
    this.dinoY = 0;
    this.velocityY = 0;
    this.jumping = false;
    this.jumpHoldTime = 0;
    this.jumpCount = 0;
    this.obstacleX = 500;
    this.obstacleHeight = 20;
    this.flyingObstacleX = 800;
    this.score = 0;
    clearInterval(this.scoreInterval);
  }

  startGame() {
    this.gameRunning = true;
    this.loop();
    this.scoreInterval = setInterval(() => this.score++, 100);
  }

  stopGame() {
    this.gameRunning = false;
    cancelAnimationFrame(this.animationFrameId);
    clearInterval(this.scoreInterval);
    this.saveScore();
  }

  loop = () => {
    if (!this.gameRunning) return;
    this.update();
    this.draw();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  update() {
    if (
      this.jumpPressed &&
      this.jumpHoldTime < this.maxJumpHoldTime &&
      this.jumpCount < 2
    ) {
      this.velocityY = -8;
      this.jumpHoldTime++;
    } else {
      this.velocityY += this.gravity;
    }

    this.dinoY += this.velocityY;
    this.dinoY = Math.min(this.dinoY, this.groundLevel - 20); // Floor
    if (this.dinoY === this.groundLevel - 20) this.jumpCount = 0;
    this.dinoY = Math.max(this.dinoY, 0); // Ceiling

    // Move ground obstacle
    this.obstacleX -= 5;
    if (this.obstacleX < -20) {
      this.obstacleX = 520 + Math.random() * 200;
      this.obstacleHeight = 20 + Math.random() * 30;
    }

    // Move flying obstacle
    this.flyingObstacleX -= 6;
    if (this.flyingObstacleX < -20) {
      this.flyingObstacleX = 520 + Math.random() * 300;
      this.flyingObstacleY = 60 + Math.random() * 80;
    }

    // Collisions
    const dinoBottom = this.dinoY + 20;
    const dinoTop = this.dinoY;

    if (
      this.obstacleX < 40 &&
      this.obstacleX > 0 &&
      dinoBottom > this.groundLevel - 20
    ) {
      this.stopGame();
    }

    if (
      this.flyingObstacleX < 40 &&
      this.flyingObstacleX > 0 &&
      dinoTop < this.flyingObstacleY + 20 &&
      dinoBottom > this.flyingObstacleY
    ) {
      this.stopGame();
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 500, 250);

    // Background
    ctx.fillStyle = this.backgorundColor;
    ctx.fillRect(0, 0, 500, 250);

    // Dino sprite
    ctx.drawImage(this.dinoImg, 20, this.dinoY, 20, 20);

    this.drawGroundObstacle(ctx);

    this.drawFlyingObstacle(ctx);

    // Ground Line
    ctx.fillRect(0, this.groundLevel, 500, 2);

    // Score
    ctx.font = '14px monospace';
    ctx.fillText(`Score: ${this.score}`, 10, 20);
    ctx.fillText(`High: ${this.highScore}`, 420, 20);
  }

  drawGroundObstacle(ctx: CanvasRenderingContext2D) {
    // Ground Obstacle
    ctx.fillStyle = this.baseColor;
    ctx.fillRect(
      this.obstacleX,
      this.groundLevel - this.obstacleHeight,
      20,
      this.obstacleHeight
    );
  }

  drawFlyingObstacle(ctx: CanvasRenderingContext2D) {
    const flyingObstacleWidth = 20;
    const flyingObstacleHeight = 20;
    // Flying Obstacle
    ctx.fillStyle = this.baseColor;
    ctx.fillRect(
      this.flyingObstacleX,
      this.flyingObstacleY,
      flyingObstacleWidth,
      flyingObstacleHeight
    );
  }

  @HostListener('mousedown')
  onMouseDown() {
    if (!this.gameRunning) {
      this.resetGame();
      this.startGame();
    } else {
      this.jumpPressed = true;
      if (this.jumpCount === 0) this.jumpHoldTime = 0;
    }
  }

  @HostListener('mouseup')
  onMouseUp() {
    this.jumpPressed = false;
    this.jumpCount++;
  }

  handleDocumentClick = (event: MouseEvent) => {
    const clickedInside = this.el.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.stopGame();
    }
  };

  saveScore() {
    const prev = localStorage.getItem('dinoHighScore');
    if (!prev || this.score > +prev) {
      localStorage.setItem('dinoHighScore', this.score.toString());
      this.highScore = this.score;
    } else {
      this.highScore = +prev;
    }
  }

  ngOnDestroy() {
    this.stopGame();
    document.removeEventListener('click', this.handleDocumentClick);
  }
}
