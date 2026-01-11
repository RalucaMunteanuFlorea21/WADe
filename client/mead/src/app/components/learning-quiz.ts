import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

@Component({
  selector: 'app-learning-quiz',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="quiz-container">
      <h4>📚 Learning Challenge</h4>
      
      <div *ngIf="!started" class="quiz-intro">
        <p>Test your knowledge about <strong>{{ conditionName }}</strong></p>
        <button type="button" (click)="startQuiz()" class="btn-primary">
          Start Quiz
        </button>
      </div>

      <div *ngIf="started && !completed" class="quiz-active">
        <div class="quiz-progress">
          <span class="progress-text">Question {{ currentQuestion + 1 }} of {{ questions.length }}</span>
          <div class="progress-bar">
            <div class="progress-fill" [style.width]="(currentQuestion / questions.length * 100) + '%'"></div>
          </div>
        </div>

        <div class="quiz-question" *ngIf="questions[currentQuestion]">
          <h5>{{ questions[currentQuestion].question }}</h5>
          
          <div class="options">
            <button 
              type="button"
              *ngFor="let option of questions[currentQuestion].options; let i = index"
              [class.selected]="selectedAnswer === i"
              [class.correct]="showAnswer && i === questions[currentQuestion].correct"
              [class.incorrect]="showAnswer && selectedAnswer === i && i !== questions[currentQuestion].correct"
              (click)="selectOption(i)"
              [disabled]="showAnswer"
              class="option-btn"
            >
              <span class="option-letter">{{ String.fromCharCode(65 + i) }}</span>
              <span class="option-text">{{ option }}</span>
              <span class="option-icon" *ngIf="showAnswer && i === questions[currentQuestion].correct">✓</span>
              <span class="option-icon incorrect-icon" *ngIf="showAnswer && selectedAnswer === i && i !== questions[currentQuestion].correct">✗</span>
            </button>
          </div>

          <div *ngIf="showAnswer" class="explanation">
            <p><strong>💡 Explanation:</strong> {{ questions[currentQuestion].explanation }}</p>
          </div>

          <div class="quiz-actions" *ngIf="showAnswer">
            <button 
              type="button" 
              (click)="nextQuestion()"
              class="btn-primary"
              *ngIf="currentQuestion < questions.length - 1"
            >
              Next Question →
            </button>
            <button 
              type="button" 
              (click)="completeQuiz()"
              class="btn-primary"
              *ngIf="currentQuestion === questions.length - 1"
            >
              See Results
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="completed" class="quiz-results">
        <div class="results-card">
          <h5>Quiz Complete! 🎉</h5>
          <div class="score-display">
            <div class="score-number">{{ score }}/{{ questions.length }}</div>
            <div class="score-percent">{{ scorePercent }}%</div>
          </div>

          <div class="score-feedback">
            <p *ngIf="scorePercent >= 80" class="feedback-excellent">
              🌟 Excellent! You have a strong understanding of {{ conditionName }}.
            </p>
            <p *ngIf="scorePercent >= 60 && scorePercent < 80" class="feedback-good">
              👍 Good job! You understand the key concepts about {{ conditionName }}.
            </p>
            <p *ngIf="scorePercent < 60" class="feedback-try">
              📖 Keep learning! Review the condition details and try again.
            </p>
          </div>

          <div class="results-breakdown">
            <h6>Your Answers</h6>
            <div class="answer-review" *ngFor="let q of questions; let i = index">
              <div class="answer-item">
                <span class="question-num">Q{{ i + 1 }}</span>
                <span 
                  class="answer-status" 
                  [class.correct]="answers[i] === q.correct"
                  [class.incorrect]="answers[i] !== q.correct"
                >
                  {{ answers[i] === q.correct ? '✓' : '✗' }}
                </span>
              </div>
            </div>
          </div>

          <button type="button" (click)="resetQuiz()" class="btn-secondary">
            ← Try Again
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .quiz-container {
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
      padding: 24px;
      border-radius: 8px;
      border-left: 4px solid var(--primary);
      margin: 24px 0;
    }

    h4, h5, h6 {
      color: var(--text-dark);
      margin-bottom: 16px;
    }

    .quiz-intro {
      text-align: center;
      padding: 24px;
    }

    .quiz-intro p {
      font-size: 16px;
      margin-bottom: 16px;
      color: var(--text-muted);
    }

    .btn-primary, .btn-secondary {
      padding: 10px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .btn-secondary {
      background: white;
      color: var(--primary);
      border: 2px solid var(--primary);
    }

    .btn-secondary:hover {
      background: var(--primary);
      color: white;
    }

    .quiz-progress {
      margin-bottom: 24px;
    }

    .progress-text {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .progress-bar {
      height: 8px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%);
      transition: width 0.3s ease;
    }

    .quiz-question {
      background: white;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 16px;
      /* entry animation */
      animation: fadeInAnimation 0.35s ease-out both;
    }

    .quiz-question h5 {
      margin-bottom: 20px;
      font-size: 16px;
    }

    .options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .option-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: white;
      border: 2px solid var(--border-light);
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: left;
    }

    .option-btn:hover:not(:disabled) {
      border-color: var(--primary);
      background: rgba(37, 99, 235, 0.05);
    }

    .option-btn.selected {
      border-color: var(--primary);
      background: rgba(37, 99, 235, 0.1);
    }

    .option-btn.correct {
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.1);
    }

    .option-btn.incorrect {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .option-letter {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: var(--primary);
      color: white;
      border-radius: 4px;
      font-weight: 600;
      font-size: 12px;
      flex-shrink: 0;
    }

    .option-text {
      flex: 1;
      color: black;
    }

    .option-icon {
      font-size: 16px;
      font-weight: bold;
    }

    .option-icon.incorrect-icon {
      color: #ef4444;
    }

    .explanation {
      background: rgba(59, 130, 246, 0.1);
      padding: 16px;
      border-left: 3px solid var(--primary);
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 14px;
      line-height: 1.6;
      animation: fadeInAnimation 0.3s ease-out both;
    }

    .quiz-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .quiz-results {
      background: white;
      padding: 32px;
      border-radius: 8px;
      text-align: center;
    }

    .results-card {
      animation: slideInAnimation 0.4s ease-out;
    }

    .score-display {
      display: flex;
      gap: 24px;
      justify-content: center;
      margin: 24px 0;
      padding: 24px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      border-radius: 8px;
      color: white;
    }

    .score-number {
      font-size: 48px;
      font-weight: 700;
    }

    .score-percent {
      font-size: 36px;
      font-weight: 700;
    }

    .score-feedback {
      margin: 24px 0;
      font-size: 16px;
    }

    .feedback-excellent, .feedback-good, .feedback-try {
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 12px;
    }

    .feedback-excellent {
      background: rgba(16, 185, 129, 0.1);
      color: #065f46;
    }

    .feedback-good {
      background: rgba(59, 130, 246, 0.1);
      color: #1e40af;
    }

    .feedback-try {
      background: rgba(245, 158, 11, 0.1);
      color: #92400e;
    }

    .results-breakdown {
      margin-top: 24px;
      text-align: left;
    }

    .results-breakdown h6 {
      margin-bottom: 12px;
    }

    .answer-review {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
      gap: 8px;
      margin-bottom: 20px;
    }

    .answer-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      background: var(--bg-light);
      border-radius: 4px;
      text-align: center;
      font-size: 12px;
    }

    .question-num {
      font-weight: 600;
      color: var(--text-muted);
    }

    .answer-status {
      font-size: 18px;
      font-weight: bold;
    }

    .answer-status.correct {
      color: #10b981;
    }

    .answer-status.incorrect {
      color: #ef4444;
    }

    @keyframes fadeInAnimation {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideInAnimation {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 640px) {
      .quiz-container {
        padding: 16px;
      }

      .quiz-results {
        padding: 16px;
      }

      .score-display {
        flex-direction: column;
        gap: 16px;
      }
    }
  `]
})
export class LearningQuizComponent implements OnInit {
  @Input() conditionName = 'this condition';

  questions: QuizQuestion[] = [];
  currentQuestion = 0;
  selectedAnswer: number | null = null;
  showAnswer = false;
  started = false;
  completed = false;
  answers: number[] = [];
  score = 0;
  scorePercent = 0;

  String = String;

  ngOnInit() {
    this.initializeQuestions();
  }

  initializeQuestions() {
    this.questions = [
      {
        id: 1,
        question: `What type of condition is ${this.conditionName}?`,
        options: [
          'An acute infectious disease',
          'A chronic condition affecting multiple body systems',
          'A genetic disorder passed through families',
          'An environmental allergy'
        ],
        correct: 1,
        explanation: `${this.conditionName} is characterized as a chronic condition that affects multiple body systems and requires ongoing management and monitoring.`
      },
      {
        id: 2,
        question: `Which body system is primarily affected by ${this.conditionName}?`,
        options: [
          'The cardiovascular system',
          'The respiratory system',
          'The digestive system',
          'The nervous system'
        ],
        correct: 1,
        explanation: 'The respiratory system shows the primary impact, though other systems may also be affected depending on the condition.'
      },
      {
        id: 3,
        question: `What is a common symptom of ${this.conditionName}?`,
        options: [
          'Sudden loss of hearing',
          'Difficulty breathing or shortness of breath',
          'Loss of taste and smell only',
          'Extreme sensitivity to light'
        ],
        correct: 1,
        explanation: 'Difficulty breathing and shortness of breath are characteristic symptoms that warrant medical attention and proper treatment.'
      },
      {
        id: 4,
        question: `Which of the following is a risk factor for ${this.conditionName}?`,
        options: [
          'Eating too many vegetables',
          'Environmental triggers and pollution',
          'Drinking water',
          'Getting enough sleep'
        ],
        correct: 1,
        explanation: 'Environmental factors, including air quality and pollution exposure, are significant risk factors in condition development.'
      },
      {
        id: 5,
        question: `What is the best approach to managing ${this.conditionName}?`,
        options: [
          'Complete bed rest indefinitely',
          'Ignoring all symptoms',
          'Regular monitoring and following medical advice',
          'Self-medicating with random remedies'
        ],
        correct: 2,
        explanation: 'Proper management involves regular medical monitoring, adherence to treatment plans, and following healthcare professional guidance.'
      }
    ];
  }

  startQuiz() {
    this.started = true;
    this.currentQuestion = 0;
    this.selectedAnswer = null;
    this.showAnswer = false;
    this.answers = [];
    this.score = 0;
  }

  selectOption(index: number) {
    this.selectedAnswer = index;
    this.answers[this.currentQuestion] = index;
    this.showAnswer = true;

    if (index === this.questions[this.currentQuestion].correct) {
      this.score++;
    }
  }

  nextQuestion() {
    this.currentQuestion++;
    this.selectedAnswer = null;
    this.showAnswer = false;
  }

  completeQuiz() {
    this.completed = true;
    this.scorePercent = Math.round((this.score / this.questions.length) * 100);
  }

  resetQuiz() {
    this.started = false;
    this.completed = false;
    this.currentQuestion = 0;
    this.selectedAnswer = null;
    this.showAnswer = false;
    this.answers = [];
    this.score = 0;
    this.scorePercent = 0;
  }
}
