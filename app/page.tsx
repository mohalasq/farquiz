"use client";
import { useState, useEffect, useCallback } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { 
  ConnectWallet, 
  Wallet, 
  WalletDropdown, 
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
} from '@coinbase/onchainkit/identity';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { parseEther } from 'viem';
import Image from 'next/image';
import styles from "./page.module.css";

const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

// Check if testnet is enabled
const IS_TESTNET = process.env.NEXT_PUBLIC_ENABLE_TESTNET === 'true';
const TRANSACTION_AMOUNT = IS_TESTNET ? '0.00002' : '0.00003';
const RECIPIENT_ADDRESS = '0x539872975Fbc8e5521350bEcCBFdF213EfE06d54';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  transactionHash?: string;
}

// API functions
const saveScoreToDB = async (score: number, playerName: string, transactionHash?: string) => {
  try {
    const response = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: playerName,
        score: score,
        transactionHash: transactionHash,
        network: IS_TESTNET ? 'base-sepolia' : 'base',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save score');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving score:', error);
    throw error;
  }
};

const getLeaderboardFromDB = async (): Promise<LeaderboardEntry[]> => {
  try {
    const response = await fetch('/api/leaderboard');
    
    if (!response.ok) {
      throw new Error('Failed to fetch leaderboard');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
};

export default function Home() {
  const { isFrameReady, setFrameReady } = useMiniKit();
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  
  const { 
    writeContract, 
    data: hash,
    isPending: isWriting,
  } = useWriteContract();

  const { 
    isLoading: _isConfirming, 
    isSuccess: isConfirmed 
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Store the pending save data for auto-retry after network switch
  const [pendingSave, setPendingSave] = useState<{score: number, playerName: string} | null>(null);

  // Initialize the miniapp
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Quiz states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [nameError, setNameError] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [_isSaving, setIsSaving] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [currentGameScore, setCurrentGameScore] = useState<number | null>(null);
  const [saveStep, setSaveStep] = useState<'ready' | 'transaction' | 'confirming' | 'saving' | 'complete' | 'error'>('ready');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  // Sample quiz data
  const quizQuestions: QuizQuestion[] = [
    {
      id: 1,
      question: "What country does this flag belong to?",
      options: ["USA", "France", "Belgium", "Japan"],
      correctAnswer: 1
    },
    {
      id: 2,
      question: "What country does this flag belong to?",
      options: ["Mali", "Uruguay", "Malaysia", "Kazakhstan"],
      correctAnswer: 0
    },
    {
      id: 3,
      question: "What country does this flag belong to?",
      options: ["South Africa", "Netherlands", "USA", "Japan"],
      correctAnswer: 0
    },
    {
      id: 4,
      question: "What country does this flag belong to?",
      options: ["Belgium", "Uruguay", "Netherlands", "Kazakhstan"],
      correctAnswer: 2
    },
    {
      id: 5,
      question: "What country does this flag belong to?",
      options: ["Malaysia", "USA", "France", "Japan"],
      correctAnswer: 3
    },
    {
      id: 6,
      question: "What country does this flag belong to?",
      options: ["Kazakhstan", "Uruguay", "Belgium", "South Africa"],
      correctAnswer: 1
    },
    {
      id: 7,
      question: "What country does this flag belong to?",
      options: ["Malaysia", "Mali", "Netherlands", "USA"],
      correctAnswer: 0
    },
    {
      id: 8,
      question: "What country does this flag belong to?",
      options: ["Belgium", "Kazakhstan", "South Africa", "France"],
      correctAnswer: 1
    },
    {
      id: 9,
      question: "What country does this flag belong to?",
      options: ["USA", "Japan", "Uruguay", "Mali"],
      correctAnswer: 0
    },
    {
      id: 10,
      question: "What country does this flag belong to?",
      options: ["Netherlands", "Belgium", "Malaysia", "South Africa"],
      correctAnswer: 1
    }
  ];

  // Load leaderboard on component mount and when game state changes
  useEffect(() => {
    const loadLeaderboard = async () => {
      setIsLoading(true);
      try {
        const data = await getLeaderboardFromDB();
        setLeaderboard(data);
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLeaderboard();
  }, [showScore, scoreSaved]);

  // Get the target chain for current mode
  const getTargetChain = useCallback(() => {
    return IS_TESTNET ? baseSepolia : base;
  }, []);

  // Get the target chain display name for messages
  const getTargetChainName = useCallback(() => {
    return IS_TESTNET ? 'Base Sepolia' : 'Base';
  }, []);

  // Check if user is on correct network
  const isOnCorrectNetwork = useCallback(() => {
    const targetChain = getTargetChain();
    return chain && chain.id === targetChain.id;
  }, [chain, getTargetChain]);

  // Save score to database after transaction
  const handleSaveScoreToDB = useCallback(async (txHash: string) => {
    setIsSaving(true);
    try {
      await saveScoreToDB(currentGameScore!, playerName, txHash);
      setScoreSaved(true);
      setSaveStep('complete');
      
      // Refresh leaderboard after saving new score
      const updatedLeaderboard = await getLeaderboardFromDB();
      setLeaderboard(updatedLeaderboard);
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      setSaveStep('error');
    } finally {
      setIsSaving(false);
    }
  }, [currentGameScore, playerName]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash && currentGameScore !== null) {
      console.log('Transaction confirmed with hash:', hash);
      setTransactionHash(hash);
      setSaveStep('saving');
      // Transaction confirmed, now save to database
      handleSaveScoreToDB(hash);
    }
  }, [isConfirmed, hash, currentGameScore, handleSaveScoreToDB]);

  // Separate function for saving after network switch
  const handleSaveScoreAfterSwitch = useCallback(async (playerName: string, score: number) => {
    try {
      setSaveStep('transaction');
      
      writeContract({
        address: RECIPIENT_ADDRESS as `0x${string}`,
        abi: [{
          name: 'saveScore',
          type: 'function',
          stateMutability: 'payable',
          inputs: [
            { name: 'name', type: 'string' }, 
            { name: 'score', type: 'uint256' }
          ],
          outputs: []
        }],
        functionName: 'saveScore',
        args: [playerName, BigInt(score)],
        value: parseEther(TRANSACTION_AMOUNT),
      });
    } catch (error) {
      console.error('Failed to save score after network switch:', error);
      setSaveStep('error');
    }
  }, [writeContract]);

  // Auto-retry saving after network switch
  useEffect(() => {
    if (pendingSave && isOnCorrectNetwork()) {
      // We switched to correct network, now execute the save
      const { score, playerName } = pendingSave;
      handleSaveScoreAfterSwitch(playerName, score);
      setPendingSave(null);
    }
  }, [chain, pendingSave, isOnCorrectNetwork, handleSaveScoreAfterSwitch]);

  // Main save function with auto-network switch
  const handleSaveScore = useCallback(async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first!');
      return;
    }

    const targetChain = getTargetChain();
    const targetChainName = getTargetChainName();
    
    // Check if user is on wrong chain
    if (chain && chain.id !== targetChain.id) {
      // Store the save data and trigger network switch
      setPendingSave({ playerName, score });
      
      try {
        await switchChain({ chainId: targetChain.id });
        // The save will continue automatically after network switch via the useEffect
      } catch (switchError) {
        console.error('Failed to switch network:', switchError);
        setPendingSave(null);
        alert(`Please approve the network switch to ${targetChainName} in your wallet!\n\nYou're currently on ${chain.name}.`);
      }
      return;
    }

    // If already on correct network, save immediately
    handleSaveScoreAfterSwitch(playerName, score);
  }, [isConnected, address, chain, switchChain, handleSaveScoreAfterSwitch, getTargetChain, getTargetChainName, playerName, score]);

  // Handle answer click
  const handleAnswerClick = (selectedAnswer: number) => {
    const isCorrect = selectedAnswer === quizQuestions[currentQuestion].correctAnswer;
    const pointsEarned = isCorrect ? timeLeft : 0;
    const newScore = score + pointsEarned;
    
    setScore(newScore);
    setCurrentGameScore(newScore);

    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < quizQuestions.length) {
      setTimeout(() => {
        setCurrentQuestion(nextQuestion);
        setTimeLeft(10);
      }, 1000);
    } else {
      setTimeout(() => {
        setShowScore(true);
        setCurrentGameScore(newScore);
      }, 1000);
    }
  };

  // Handle starting the quiz
  const handleStartQuiz = () => {
    if (!playerName.trim()) {
      setNameError("Please enter your name to start the quiz");
      return;
    }
    setNameError("");
    setGameStarted(true);
    setScoreSaved(false);
    setCurrentGameScore(null);
    setSaveStep('ready');
    setTransactionHash(null);
    setPendingSave(null);
  };

  // Timer logic
  useEffect(() => {
    if (!gameStarted || showScore || timeLeft === 0) return;

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameStarted, showScore, timeLeft]);

  // Handle timeout when time runs out
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
          setCurrentGameScore(score);
        }, 1000);
      }
    }
  }, [timeLeft, gameStarted, showScore, currentQuestion, score, quizQuestions.length]);

  // Reset game function
  const resetGame = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowScore(false);
    setTimeLeft(10);
    setScoreSaved(false);
    setCurrentGameScore(null);
    setSaveStep('ready');
    setTransactionHash(null);
    setPendingSave(null);
  };

  // Get save button text based on current step
  const getSaveButtonText = () => {
    if (!isConnected) {
      return "🔒 CONNECT WALLET TO SAVE";
    }

    if (pendingSave) {
      return "🔄 SWITCHING NETWORK...";
    }

    switch (saveStep) {
      case 'transaction':
        return isWriting ? "⏳ SIGNING TRANSACTION..." : "CONFIRM TRANSACTION";
      case 'confirming':
        return "⏳ CONFIRMING TRANSACTION...";
      case 'saving':
        return "💾 SAVING SCORE...";
      case 'complete':
        return "✅ SCORE SAVED!";
      case 'error':
        return "❌ TRANSACTION FAILED - TRY AGAIN";
      default:
        return `💾 SAVE TO LEADERBOARD - ${TRANSACTION_AMOUNT} ETH`;
    }
  };

  // Get save description text
  const getSaveDescription = () => {
    if (!isConnected) {
      return "Connect your wallet above to save your score to the leaderboard";
    }

    if (pendingSave) {
      return `🔄 Switching to ${getTargetChainName()}... Please approve in your wallet.`;
    }
    
    switch (saveStep) {
      case 'transaction':
        return isWriting 
          ? "⏳ Please sign the transaction in your wallet..."
          : `Click to send ${TRANSACTION_AMOUNT} ETH transaction`;
      case 'confirming':
        return `⏳ Waiting for blockchain confirmation... ${
          hash ? `(Hash: ${formatTransactionHash(hash)})` : ''
        }`;
      case 'saving':
        return "✅ Transaction confirmed! Saving your score...";
      case 'complete':
        return `🎉 Score saved on ${IS_TESTNET ? 'Base Sepolia' : 'Base Mainnet'}!`;
      case 'error':
        return "❌ Transaction failed. Please check your wallet and try again.";
      default:
        return `Save your score with a ${TRANSACTION_AMOUNT} ETH transaction on ${IS_TESTNET ? 'Base Sepolia Testnet' : 'Base Mainnet'}`;
    }
  };

  // Format transaction hash for display
  const formatTransactionHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  // Retry save after error
  const handleRetrySave = () => {
    setSaveStep('ready');
  };

  // Check if save button should be disabled
  const isSaveButtonDisabled = () => {
    if (!isConnected) return true;
    if (pendingSave) return true;
    if (saveStep === 'error') return false; // Allow retry
    return saveStep !== 'ready';
  };

  // Check if action buttons should be disabled
  const isActionButtonDisabled = () => {
    return !!pendingSave || saveStep === 'transaction' || saveStep === 'confirming' || saveStep === 'saving';
  };

  // Network Switch Component
  const NetworkSwitchButton = () => {
    if (!isConnected || !chain) return null;
    
    const targetChain = getTargetChain();
    const isWrongNetwork = chain.id !== targetChain.id;
    
    if (!isWrongNetwork) return null;
      
    return (
      <button 
        onClick={() => switchChain({ chainId: targetChain.id })}
        className={styles.networkSwitchButton}
      >
        {IS_TESTNET 
          ? `🔄 Switch to Base Sepolia Testnet` 
          : `🔄 Switch to Base Mainnet`}
        <br />
        <span className={styles.networkSubtext}>(Currently on {chain.name})</span>
      </button>
    );
  };

  return (
    <div className={styles.container}>
      <button className={styles.closeButton} type="button">
        ✕
      </button>
      
      {/* Wallet Connection Section */}
      <div className={styles.walletSection}>
        <div className={styles.networkBadge}>
          {IS_TESTNET ? '🧪 Base Sepolia' : '🔷 Base Mainnet'}
        </div>
        <Wallet>
          <ConnectWallet
            className={styles.connectWalletButton}
          >
            <Avatar className={styles.walletAvatar} />
            <Name />
          </ConnectWallet>
          <WalletDropdown>
            <Identity className={styles.walletIdentity} hasCopyAddressOnClick>
              <Avatar />
              <Name />
              <Address />
            </Identity>
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>
      </div>
      
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
            
            {/* Network Info */}
            <div className={styles.networkInfo}>
              <p>
                <strong>Network:</strong> {IS_TESTNET ? 'Base Sepolia Testnet' : 'Base Mainnet'}<br />
                <strong>Save Cost:</strong> {TRANSACTION_AMOUNT} ETH<br />
                <strong>Recipient:</strong> {RECIPIENT_ADDRESS.slice(0, 8)}...{RECIPIENT_ADDRESS.slice(-6)}
              </p>
            </div>

            {/* Network Switch Button */}
            <NetworkSwitchButton />
            
            {/* Wallet Connection Status */}
            <div className={styles.walletStatus}>
              {isConnected ? (
                <div className={styles.walletConnected}>
                  ✅ Wallet Connected to {IS_TESTNET ? 'Base Sepolia' : 'Base'}
                  {chain && <div>Chain ID: {chain.id}</div>}
                </div>
              ) : (
                <p className={styles.walletDisconnected}>🔌 Connect your wallet to save scores</p>
              )}
            </div>
            
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
              disabled={isLoading}
            >
              {isLoading ? "LOADING..." : "START QUIZ"}
            </button>
            
            {/* Leaderboard Table */}
            <div className={styles.leaderboardSection}>
              <h3 className={styles.leaderboardTitle}>Leaderboard</h3>
              {isLoading ? (
                <p>Loading leaderboard...</p>
              ) : (
                <div className={styles.leaderboardTable}>
                  <div className={styles.leaderboardHeader}>
                    <span>Rank</span>
                    <span>Player</span>
                    <span>Score</span>
                  </div>
                  {leaderboard.length > 0 ? (
                    leaderboard.map((entry, index) => (
                      <div key={entry.id} className={styles.leaderboardRow}>
                        <span className={styles.rank}>#{index + 1}</span>
                        <span className={styles.playerName}>{entry.name}</span>
                        <span className={styles.score}>{entry.score} pts</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.leaderboardRow}>
                      <span style={{textAlign: 'center', width: '100%'}}>No scores yet. Be the first!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : showScore ? (
          // Score Screen with Leaderboard and Save Button
          <div className={styles.quizContainer}>
            <h1 className={styles.title}>Quiz Completed!</h1>
            <p className={styles.subtitle}>
              You scored {score} points!<br />
              ({(score / 10).toFixed(1)} out of {quizQuestions.length} correct on average)
            </p>

            {/* Network Switch Button */}
            <NetworkSwitchButton />

            {/* Save Score Button - Conditionally disabled based on wallet connection */}
            {!scoreSaved ? (
              <div className={styles.saveScoreSection}>
                <button 
                  onClick={saveStep === 'error' ? handleRetrySave : handleSaveScore}
                  className={`${styles.saveButton} ${
                    isSaveButtonDisabled() && saveStep !== 'error'
                      ? styles.saveButtonDisabled 
                      : saveStep === 'error' ? styles.saveButtonError : ''
                  }`}
                  disabled={isSaveButtonDisabled() && saveStep !== 'error'}
                >
                  {getSaveButtonText()}
                </button>
                <p className={styles.saveDescription}>
                  {getSaveDescription()}
                </p>
              </div>
            ) : (
              <div className={styles.scoreSavedSection}>
                <p className={styles.scoreSavedText}>✅ Score saved to leaderboard!</p>
                {transactionHash && (
                  <p className={styles.transactionHash}>
                    Transaction: {formatTransactionHash(transactionHash)}
                  </p>
                )}
              </div>
            )}
            
            {/* Leaderboard Table - Only shows saved scores */}
            <div className={styles.leaderboardSection}>
              <h3 className={styles.leaderboardTitle}>Leaderboard</h3>
              {isLoading ? (
                <p>Loading leaderboard...</p>
              ) : (
                <div className={styles.leaderboardTable}>
                  <div className={styles.leaderboardHeader}>
                    <span>Rank</span>
                    <span>Player</span>
                    <span>Score</span>
                  </div>
                  {leaderboard.length > 0 ? (
                    leaderboard.map((entry, index) => (
                      <div key={entry.id} className={`
                        ${styles.leaderboardRow} 
                        ${entry.name === playerName && entry.score === currentGameScore && scoreSaved ? styles.currentUser : ''}
                      `}>
                        <span className={styles.rank}>#{index + 1}</span>
                        <span className={styles.playerName}>{entry.name}</span>
                        <span className={styles.score}>{entry.score} pts</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.leaderboardRow}>
                      <span style={{textAlign: 'center', width: '100%'}}>No scores yet. Be the first!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className={styles.buttonGroup}>
              <button 
                onClick={() => {
                  resetGame();
                  setGameStarted(true);
                }}
                className={styles.optionButton}
                disabled={isActionButtonDisabled()}
              >
                Play Again
              </button>
              
              <button 
                onClick={() => {
                  resetGame();
                  setGameStarted(false);
                }}
                className={styles.secondaryButton}
                disabled={isActionButtonDisabled()}
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
                  priority={currentQuestion === 0}
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