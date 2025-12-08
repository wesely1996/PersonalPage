import { CommonModule } from '@angular/common';
import {
  ViewChild,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Component,
  Inject,
} from '@angular/core';
import {
  HackerRunHighscoreService,
  HighscoreResponse,
  SubmitScorePayload,
} from '../../../services/hacker-run-highscore/hacker-run-highscore.service';

@Component({
  selector: 'app-hacker-run-game',
  imports: [CommonModule],
  templateUrl: './hacker-run-game.component.html',
  styleUrls: ['./hacker-run-game.component.scss'],
})
export class HackerRunGameComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('gameCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private animationFrameId = 0;

  hackerY = 0;
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
  highScoreName = '---';
  currentHighScore = 0;
  isLoadingHighScore = false;
  scoreInterval?: ReturnType<typeof setInterval>;
  gameRunning = false;
  speed = 1;

  dinoImg = new Image();

  groundLevel: number = 210;

  baseColor = '#00ff00';
  backgorundColor = 'rgba(0,0,0,0.6)';

  constructor(
    @Inject(ElementRef) private el: ElementRef,
    private readonly highscoreService: HackerRunHighscoreService
  ) {}

  ngOnInit() {
    document.addEventListener('click', this.handleDocumentClick);
    this.dinoImg.src = 'images/dino-player.png';
    void this.loadHighScoreFromApi();
  }

  ngAfterViewInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.clearGame();
  }

  resetGame() {
    this.hackerY = 0;
    this.velocityY = 0;
    this.jumping = false;
    this.jumpHoldTime = 0;
    this.jumpCount = 0;
    this.obstacleX = 500;
    this.obstacleHeight = 20;
    this.flyingObstacleX = 800;
    this.score = 0;
    this.speed = 1;
    clearInterval(this.scoreInterval);
  }

  startGame() {
    this.gameRunning = true;
    this.score = 0;
    this.speed = 1;
    this.loop();
    this.scoreInterval = setInterval(
      () => (this.score += Math.floor(this.speed)),
      100
    );
  }

  stopGame() {
    if (!this.gameRunning) {
      this.clearGame();
      return;
    }

    this.clearGame();
    void this.handleGameOver();
  }

  clearGame() {
    this.gameRunning = false;
    cancelAnimationFrame(this.animationFrameId);
    clearInterval(this.scoreInterval);
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
      this.velocityY = -8 * this.speed;
      this.jumpHoldTime += this.speed;
    } else {
      this.velocityY += this.gravity * this.speed;
    }

    this.hackerY += this.velocityY * this.speed;
    this.hackerY = Math.min(this.hackerY, this.groundLevel - 20); // Floor
    if (this.hackerY === this.groundLevel - 20) this.jumpCount = 0;
    this.hackerY = Math.max(this.hackerY, 0); // Ceiling

    // Move ground obstacle
    this.obstacleX -= 5 * this.speed;
    if (this.obstacleX < -20) {
      this.obstacleX = 520 + Math.random() * 200;
      this.obstacleHeight = 20 + Math.random() * 30;
    }

    // Move flying obstacle
    this.flyingObstacleX -= 7 * this.speed;
    if (this.flyingObstacleX < -20) {
      this.flyingObstacleX = 520 + Math.random() * 300;
      this.flyingObstacleY = 60 + Math.random() * 80;
    }

    // Collisions
    const dinoBottom = this.hackerY + 20;
    const dinoTop = this.hackerY;

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

    if (this.score % 100 === 0) {
      this.speed += 0.01;
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 500, 250);

    // Background
    ctx.fillStyle = this.backgorundColor;
    ctx.fillRect(0, 0, 500, 250);

    // Dino sprite
    ctx.drawImage(this.dinoImg, 20, this.hackerY, 20, 20);

    this.drawGroundObstacle(ctx);

    this.drawFlyingObstacle(ctx);

    // Ground Line
    ctx.fillRect(0, this.groundLevel, 500, 2);

    // Score
    ctx.font = '14px monospace';
    ctx.fillText(`Score: ${this.score}`, 10, 20);
    const highScoreLabel = `${this.currentHighScore}`;
    ctx.fillText(`High: ${highScoreLabel}`, 330, 20);
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
  @HostListener('touchstart')
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
  @HostListener('touchend')
  @HostListener('touchcancel')
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

  private async handleGameOver() {
    if (this.score <= 0) return;

    if (this.score > this.currentHighScore) {
      this.currentHighScore = this.score;
    }

    if (this.score > this.highScore) {
      const playerName =
        prompt(
          'New High Score! Enter your name to submit:',
          this.highScoreName
        )?.trim() || '';

      if (playerName) {
        await this.submitHighScore({ name: playerName, score: this.score });
      }
    }
  }

  private async submitHighScore(payload: SubmitScorePayload) {
    try {
      const response = await this.highscoreService.submitScore(payload);
      this.updateHighScoreState(response.best);
    } catch (error) {
      console.error('Failed to submit high score', error);
    }
  }

  private async loadHighScoreFromApi() {
    this.isLoadingHighScore = true;
    try {
      const response = await this.highscoreService.fetchHighscore();
      this.updateHighScoreState(response);
    } catch (error) {
      console.error('Failed to load high score', error);
      this.loadHighScoreFromLocal();
    } finally {
      this.isLoadingHighScore = false;
    }
  }

  private loadHighScoreFromLocal() {
    const prevScore = localStorage.getItem('dinoHighScore');
    const prevName = localStorage.getItem('dinoHighScoreName');

    if (prevScore) {
      this.updateHighScoreState({
        name: prevName ?? this.highScoreName,
        highscore: +prevScore,
      });
    }
  }

  private updateHighScoreState(response: HighscoreResponse) {
    this.highScore = response.highscore;
    this.highScoreName = response.name;
    this.persistHighScoreLocally();
  }

  private persistHighScoreLocally() {
    localStorage.setItem('dinoHighScore', this.highScore.toString());
    localStorage.setItem('dinoHighScoreName', this.highScoreName);
  }

  ngOnDestroy() {
    this.stopGame();
    document.removeEventListener('click', this.handleDocumentClick);
  }
}
