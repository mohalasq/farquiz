"use client";
import { useState, useEffect, useCallback } from "react"; // Add useCallback
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import Image from 'next/image';
import styles from "./page.module.css";

const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');



export default function Home() {
  const { isFrameReady, setFrameReady } = useMiniKit();


  // Initialize the  miniapp
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);
 
  


// Add this interface for quiz questions
interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

// Add this state to your component (after the existing states)
const [currentQuestion, setCurrentQuestion] = useState(0);
const [score, setScore] = useState(0);
const [showScore, setShowScore] = useState(false);

// Sample quiz data - add this inside your component
const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: "What country does this flag belong to?",
    options: ["USA", "France", "Belgium", "Japan"],
    correctAnswer: 1 // France
  },
  {
    id: 2,
    question: "What country does this flag belong to?",
    options: ["Indonesia", "Uruguay", "Malaysia", "Kazakhstan"],
    correctAnswer: 0 // Indonesia
  },
  {
    id: 3,
    question: "What country does this flag belong to?",
    options: ["South Africa", "Netherlands", "USA", "Japan"],
    correctAnswer: 0 // South Africa
  },
  {
    id: 4,
    question: "What country does this flag belong to?",
    options: ["Belgium", "Uruguay", "Netherlands", "Kazakhstan"],
    correctAnswer: 2 // Netherlands
  },
  {
    id: 5,
    question: "What country does this flag belong to?",
    options: ["Malaysia", "USA", "France", "Japan"],
    correctAnswer: 3 // Japan
  },
  {
    id: 6,
    question: "What country does this flag belong to?",
    options: ["Kazakhstan", "Uruguay", "Belgium", "South Africa"],
    correctAnswer: 1 // Uruguay
  },
  {
    id: 7,
    question: "What country does this flag belong to?",
    options: ["Malaysia", "Indonesia", "Netherlands", "USA"],
    correctAnswer: 0 // Malaysia
  },
  {
    id: 8,
    question: "What country does this flag belong to?",
    options: ["Belgium", "Kazakhstan", "South Africa", "France"],
    correctAnswer: 1 // Kazakhstan
  },
  {
    id: 9,
    question: "What country does this flag belong to?",
    options: ["USA", "Japan", "Uruguay", "Indonesia"],
    correctAnswer: 0 // USA
  },
  {
    id: 10,
    question: "What country does this flag belong to?",
    options: ["Netherlands", "Belgium", "Malaysia", "South Africa"],
    correctAnswer: 1 // Belgium
  }
];


// Add this state to your component
const [timeLeft, setTimeLeft] = useState(10);

// Add this state to your component
const [gameStarted, setGameStarted] = useState(false);

// Add this state to your component
const [playerName, setPlayerName] = useState("");
const [nameError, setNameError] = useState("");


// Add these interfaces and state
interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
}

// Add this state to your component
const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
  { id: "1", name: "Alice", score: 20},
  { id: "2", name: "Bob", score: 10},
  { id: "3", name: "Charlie", score: 20}
]);

const updateLeaderboard = useCallback((score: number) => {
  const newEntry: LeaderboardEntry = {
    id: Math.random().toString(36).substring(2, 9), // Random string
    name: playerName,
    score: score,
  };
  
  setLeaderboard(prev => {
    const updated = [...prev, newEntry];
    return updated.sort((a, b) => b.score - a.score).slice(0, 50);
  });
}, [playerName]);

// Simplified handleAnswerClick
// Update the handleAnswerClick function:
// Update the handleAnswerClick function:
const handleAnswerClick = (selectedAnswer: number) => {
  const isCorrect = selectedAnswer === quizQuestions[currentQuestion].correctAnswer;
  const pointsEarned = isCorrect ? timeLeft : 0; // Points equal to time remaining
  const newScore = score + pointsEarned;
  
  setScore(newScore);

  const nextQuestion = currentQuestion + 1;
  if (nextQuestion < quizQuestions.length) {
    setTimeout(() => {
      setCurrentQuestion(nextQuestion);
      setTimeLeft(10);
    }, 1000);
  } else {
    setTimeout(() => {
      setShowScore(true);
      updateLeaderboard(newScore);
    }, 1000);
  }
};

// Replace your handleTimeUp function with this useCallback version:




// Add this function to handle starting the quiz
const handleStartQuiz = () => {
  if (!playerName.trim()) {
    setNameError("Please enter your name to start the quiz");
    return;
  }
  setNameError("");
  setGameStarted(true);
};

// Simple timer without complex dependencies
// Alternative simpler timer
// Simple timer that just counts down
useEffect(() => {
  if (!gameStarted || showScore || timeLeft === 0) return;

  const timer = setTimeout(() => {
    setTimeLeft(timeLeft - 1);
  }, 1000);

  return () => clearTimeout(timer);
}, [gameStarted, showScore, timeLeft]);

// Update the timer effect to handle score properly when time runs out:
useEffect(() => {
  if (timeLeft === 0 && gameStarted && !showScore) {
    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < quizQuestions.length) {
      setTimeout(() => {
        setCurrentQuestion(nextQuestion);
        setTimeLeft(10);
      }, 1000);
    } else {
      setTimeout(() => {
        setShowScore(true);
        updateLeaderboard(score); // Use current score (no points for timeouts)
      }, 1000);
    }
  }
}, [timeLeft, gameStarted, showScore, currentQuestion, score, quizQuestions.length, updateLeaderboard]);

// Update your return JSX to include leaderboard
return (
  <div className={styles.container}>
    <button className={styles.closeButton} type="button">
      ✕
    </button>
    
    <div className={styles.content}>
      {!gameStarted ? (
        // Play Button Screen with Leaderboard
        <div className={styles.quizContainer}>
          <h1 className={styles.title}>Flag Quiz Challenge</h1>
          <p className={styles.subtitle}>
            Test your knowledge with {quizQuestions.length} flag questions!<br />
            You have 10 seconds per question.<br />
            <strong>Score = Time Remaining (faster answers = more points!)</strong>
          </p>
          
          {/* Name Input Field */}
          <div className={styles.nameInputContainer}>
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                if (nameError) setNameError("");
              }}
              className={`${styles.nameInput} ${nameError ? styles.inputError : ''}`}
              maxLength={20}
            />
            {nameError && <p className={styles.nameError}>{nameError}</p>}
          </div>
          
          <button 
            onClick={handleStartQuiz}
            className={styles.playButton}
          >
            START QUIZ
          </button>
          
          {/* Leaderboard Table */}
          <div className={styles.leaderboardSection}>
            <h3 className={styles.leaderboardTitle}>Leaderboard</h3>
            <div className={styles.leaderboardTable}>
              <div className={styles.leaderboardHeader}>
                <span>Rank</span>
                <span>Player</span>
                <span>Score</span>
              </div>
              {leaderboard.slice(0, 50).map((entry, index) => (
                <div key={entry.id} className={styles.leaderboardRow}>
                  <span className={styles.rank}>#{index + 1}</span>
                  <span className={styles.playerName}>{entry.name}</span>
                  <span className={styles.score}>{entry.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : showScore ? (
        // Score Screen with Leaderboard
        <div className={styles.quizContainer}>
          <h1 className={styles.title}>Quiz Completed!</h1>
          <p className={styles.subtitle}>
            You scored {score} points!<br />
            ({(score / 10).toFixed(1)} out of {quizQuestions.length} correct on average)
          </p>
          
          {/* Leaderboard Table */}
          <div className={styles.leaderboardSection}>
            <h3 className={styles.leaderboardTitle}>Leaderboard</h3>
            <div className={styles.leaderboardTable}>
              <div className={styles.leaderboardHeader}>
                <span>Rank</span>
                <span>Player</span>
                <span>Score</span>
              </div>
              {leaderboard.slice(0, 50).map((entry, index) => (
                <div key={entry.id} className={`
                  ${styles.leaderboardRow} 
                  ${entry.name === playerName ? styles.currentUser : ''}
                `}>
                  <span className={styles.rank}>#{index + 1}</span>
                  <span className={styles.playerName}>{entry.name}</span>
                  <span className={styles.score}>{entry.score} pts</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.buttonGroup}>
            <button 
              onClick={() => {
                setCurrentQuestion(0);
                setScore(0);
                setShowScore(false);
                setTimeLeft(10);
              }}
              className={styles.optionButton}
            >
              Play Again
            </button>
            
            <button 
              onClick={() => {
                setGameStarted(false);
                setCurrentQuestion(0);
                setScore(0);
                setShowScore(false);
                setTimeLeft(10);
              }}
              className={styles.secondaryButton}
            >
              Main Menu
            </button>
          </div>
        </div>
      ) : (
        // Quiz Game Screen
        <div className={styles.quizContainer}>
          <h1 className={styles.title}>Flag Quiz</h1>
          
          {/* Progress Bar Timer */}
          <div className={styles.timerContainer}>
            <div className={styles.timerBar}>
              <div 
                className={styles.timerProgress}
                style={{ 
                  width: `${(timeLeft / 10) * 100}%`,
                  backgroundColor: timeLeft <= 3 ? '#dc3545' : '#28a745'
                }}
              ></div>
            </div>
            <div className={styles.timerText}>
              {timeLeft}s - {timeLeft} points available
            </div>
          </div>
          
          <div className={styles.questionSection}>
            <h2>Question {currentQuestion + 1}</h2>
            
            {/* Flag Image */}
            <div className={styles.flagContainer}>
              <Image 
                src={`${ROOT_URL}/${quizQuestions[currentQuestion].options[quizQuestions[currentQuestion].correctAnswer].toLowerCase()}.jpg`}
                alt="Country flag"
                className={styles.flagImage}
                width={200}
                height={120}
                priority={currentQuestion === 0} // Optional: prioritize first image load
              />
            </div>
            
            <p className={styles.questionText}>
              {quizQuestions[currentQuestion].question}
            </p>
          </div>

          <div className={styles.optionsSection}>
            {quizQuestions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerClick(index)}
                className={styles.optionButton}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);
}
