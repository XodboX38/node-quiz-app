import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY_QUESTIONS = 'quizQuestions';
const STORAGE_KEY_USER = 'quizUser';
const STORAGE_KEY_ANALYTICS = 'quizAnalytics';

const defaultQuestions = {
    "easy": [
        { "id": 1, "question": "What will console.log(typeof NaN) print?", "options": ["undefined", "number", "NaN", "object"], "answer": "number", "explanation": "In JavaScript, NaN stands for 'Not a Number', but it is still a numeric type." },
        { "id": 2, "question": "Which of these is not a Node.js module?", "options": ["http", "fs", "path", "dom"], "answer": "dom", "explanation": "The DOM (Document Object Model) is part of a web browser, not Node.js." },
        { "id": 3, "question": "How do you import a module in Node.js?", "options": ["require()", "import()", "link()", "include()"], "answer": "require()", "explanation": "The CommonJS module system uses require() for imports." },
    ],
    "medium": [
        { "id": 4, "question": "What is a 'stream' in Node.js?", "options": ["A data pipe", "A database connection", "A file system", "A network protocol"], "answer": "A data pipe", "explanation": "Streams are used for handling reading and writing data in a continuous, sequential manner." },
        { "id": 5, "question": "What is the event loop in Node.js?", "options": ["A way to handle asynchronous callbacks", "A timer for functions", "A database query loop", "A memory management system"], "answer": "A way to handle asynchronous callbacks", "explanation": "The event loop is a core mechanism that allows Node.js to perform non-blocking I/O operations." },
        { "id": 6, "question": "Which command is used to install packages?", "options": ["npm get", "npm install", "npm add", "npm new"], "answer": "npm install", "explanation": "The `npm install` command is used to install packages from the npm registry." },
    ],
    "hard": [
        { "id": 7, "question": "What is the purpose of 'middleware' in Express.js?", "options": ["To handle API routes", "To manage database connections", "To access cookies", "To perform tasks before a request reaches the final route handler"], "answer": "To perform tasks before a request reaches the final route handler", "explanation": "Middleware functions can execute code, make changes to the request/response objects, and end the request-response cycle." },
        { "id": 8, "question": "How can you debug a Node.js application?", "options": ["node --debug app.js", "node --inspect app.js", "node --trace app.js", "node --log app.js"], "answer": "node --inspect app.js", "explanation": "The --inspect flag enables the V8 inspector protocol for debugging with tools like Chrome DevTools." },
        { "id": 9, "question": "What is a 'child process' in Node.js?", "options": ["A thread that runs in the background", "A separate OS process spawned by Node.js", "A function that executes asynchronously", "A sub-route within an Express application"], "answer": "A separate OS process spawned by Node.js", "explanation": "Node.js can spawn a new process on the operating system to run a command or script." },
    ]
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function calculateAnalytics(history) {
    const stats = { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } };
    const timeStats = { easy: { totalTime: 0, count: 0 }, medium: { totalTime: 0, count: 0 }, hard: { totalTime: 0, count: 0 } };

    history.forEach(session => {
        const difficulty = session.difficulty;
        stats[difficulty].total += session.totalQuestions;
        stats[difficulty].correct += session.score;
        timeStats[difficulty].totalTime += session.timeTaken;
        timeStats[difficulty].count += 1;
    });

    return {
        accuracy: {
            easy: stats.easy.total > 0 ? (stats.easy.correct / stats.easy.total) * 100 : 0,
            medium: stats.medium.total > 0 ? (stats.medium.correct / stats.medium.total) * 100 : 0,
            hard: stats.hard.total > 0 ? (stats.hard.correct / stats.hard.total) * 100 : 0,
        },
        avgTime: {
            easy: timeStats.easy.count > 0 ? timeStats.easy.totalTime / timeStats.easy.count : 0,
            medium: timeStats.medium.count > 0 ? timeStats.medium.totalTime / timeStats.medium.count : 0,
            hard: timeStats.hard.count > 0 ? timeStats.hard.totalTime / timeStats.hard.count : 0,
        }
    };
}

function AlertModal({ message, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center max-w-sm w-full">
                <p className="text-lg font-semibold mb-4">{message}</p>
                <button
                    onClick={onClose}
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
                >
                    OK
                </button>
            </div>
        </div>
    );
}

function QuestionCard({ question, onAnswer }) {
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isCorrect, setIsCorrect] = useState(null);

    const handleAnswerClick = (option) => {
        if (selectedAnswer !== null) return;
        setSelectedAnswer(option);
        const correct = option === question.answer;
        setIsCorrect(correct);
        setTimeout(() => onAnswer(correct, option), 1000);
    };

    return (
        <div className="flex flex-col h-full">
            <h3 className="text-xl font-semibold mb-6">{question.question}</h3>
            <ul className="grid grid-cols-1 gap-3 mb-6">
                {question.options.map((option) => (
                    <li key={option}>
                        <button
                            onClick={() => handleAnswerClick(option)}
                            disabled={selectedAnswer !== null}
                            className={`
                                w-full text-left py-3 px-4 rounded-xl transition-colors
                                ${
                                    selectedAnswer === option
                                        ? isCorrect
                                            ? 'bg-green-500 text-white'
                                            : 'bg-red-500 text-white'
                                        : selectedAnswer !== null && option === question.answer
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }
                            `}
                        >
                            {option}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Quiz({ difficulty, onQuizComplete }) {
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [startTime, setStartTime] = useState(Date.now());
    const [timeRemaining, setTimeRemaining] = useState(20 * 60);
    const timerRef = useRef(null);

    useEffect(() => {
        // Fetch questions from the data file
        import('../data/questions.json')
            .then(data => {
                const questions = data.default[difficulty] || [];
                if (questions.length === 0) {
                    onQuizComplete(null, null);
                } else {
                    setQuizQuestions(shuffleArray([...questions]));
                }
            })
            .catch(error => {
                console.error("Failed to load questions:", error);
                // Fallback to default in case of error
                const questions = defaultQuestions[difficulty] || [];
                setQuizQuestions(shuffleArray([...questions]));
            });
    }, [difficulty]);

    useEffect(() => {
        if (quizQuestions.length > 0) {
            timerRef.current = setInterval(() => {
                setTimeRemaining(prevTime => {
                    if (prevTime <= 1) {
                        clearInterval(timerRef.current);
                        const finalScore = score;
                        const timeTaken = Math.round((Date.now() - startTime) / 1000);
                        onQuizComplete(finalScore, timeTaken, quizQuestions);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [quizQuestions, score, startTime, onQuizComplete]);

    const handleAnswer = (isCorrect, userAnswer) => {
        const updatedQuestions = [...quizQuestions];
        updatedQuestions[currentIndex].userAnswer = userAnswer;
        setQuizQuestions(updatedQuestions);

        if (isCorrect) {
            setScore(prevScore => prevScore + 1);
        }
        setCurrentIndex(prevIndex => prevIndex + 1);
    };

    useEffect(() => {
        if (currentIndex >= quizQuestions.length && quizQuestions.length > 0) {
            clearInterval(timerRef.current);
            const timeTaken = Math.round((Date.now() - startTime) / 1000);
            onQuizComplete(score, timeTaken, quizQuestions);
        }
    }, [currentIndex, quizQuestions, score, startTime, onQuizComplete]);

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    return (
        <div className="w-full h-full">
            <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Question {currentIndex + 1} / {quizQuestions.length}
                </span>
                <div className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full font-mono text-sm">
                    {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6 dark:bg-gray-700">
                <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${((currentIndex) / quizQuestions.length) * 100}%` }}
                ></div>
            </div>
            {quizQuestions[currentIndex] && (
                <QuestionCard
                    key={quizQuestions[currentIndex].id}
                    question={quizQuestions[currentIndex]}
                    onAnswer={handleAnswer}
                />
            )}
        </div>
    );
}

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if (username.trim()) {
            onLogin(username.trim());
        }
    };
    return (
        <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Welcome to the Node.js Quiz</h2>
            <form onSubmit={handleSubmit} className="flex flex-col items-center">
                <label htmlFor="username" className="mb-2">Enter your username:</label>
                <input
                    type="text"
                    id="username"
                    placeholder="Your name"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full max-w-xs p-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                />
                <button type="submit" className="mt-4 w-full max-w-xs py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-lg">
                    Start
                </button>
            </form>
        </div>
    );
}

function QuizSelection({ onStartQuiz, onLogout, onImport, onExport, analytics }) {
    const fileInputRef = useRef(null);
    return (
        <div className="flex flex-col items-center text-center">
            <div className="w-full flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Hello, {localStorage.getItem(STORAGE_KEY_USER)}!</h2>
                <button onClick={onLogout} className="py-1 px-3 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                    Logout
                </button>
            </div>
            <h3 className="text-xl mb-4">Select a Difficulty</h3>
            <div className="w-full max-w-sm grid grid-cols-1 gap-4">
                <button onClick={() => onStartQuiz('easy')} className="difficulty-btn py-4 px-6 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors shadow-lg">Easy</button>
                <button onClick={() => onStartQuiz('medium')} className="difficulty-btn py-4 px-6 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl transition-colors shadow-lg">Medium</button>
                <button onClick={() => onStartQuiz('hard')} className="difficulty-btn py-4 px-6 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-lg">Hard</button>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 w-full">
                <h3 className="text-xl font-semibold mb-4">Data & Analytics</h3>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <label className="block w-full">
                        <span className="sr-only">Choose a JSON file</span>
                        <input
                            type="file"
                            id="jsonImport"
                            ref={fileInputRef}
                            onChange={(e) => onImport(e)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 dark:file:bg-gray-700 dark:file:text-white dark:hover:file:bg-gray-600"
                        />
                    </label>
                    <button onClick={onExport} className="w-full sm:w-auto py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors shadow-lg">
                        Export Questions
                    </button>
                </div>
                <div id="analytics" className="text-left mt-6">
                    <p className="text-sm font-semibold mb-2">Overall Accuracy:</p>
                    <div className="grid grid-cols-3 text-center gap-2">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Easy</p>
                            <p className="text-xl font-bold text-green-500">{analytics.accuracy.easy.toFixed(0)}%</p>
                        </div>
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Medium</p>
                            <p className="text-xl font-bold text-yellow-500">{analytics.accuracy.medium.toFixed(0)}%</p>
                        </div>
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Hard</p>
                            <p className="text-xl font-bold text-red-500">{analytics.accuracy.hard.toFixed(0)}%</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Results({ score, total, timeTaken, answeredQuestions, onGoHome, onReviewAnswers }) {
    const percentage = Math.round((score / total) * 100);
    return (
        <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Quiz Complete!</h2>
            <p className="text-5xl font-extrabold mb-2">{percentage}%</p>
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-6">Your Score: {score} / {total}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Time Taken: {timeTaken} seconds</p>
            <button
                onClick={onReviewAnswers}
                className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors shadow-lg mr-2"
            >
                Review Answers
            </button>
            <button
                onClick={onGoHome}
                className="py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors shadow-lg"
            >
                Go Home
            </button>
        </div>
    );
}

function ReviewPage({ questions, onGoBack }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Review Answers</h2>
                <button
                    onClick={onGoBack}
                    className="py-1 px-3 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                    Back
                </button>
            </div>
            <div className="space-y-8">
                {questions.map((q, index) => {
                    const isCorrect = q.userAnswer === q.answer;
                    const resultColor = isCorrect ? 'text-green-500' : 'text-red-500';
                    return (
                        <div key={index} className="p-4 rounded-xl bg-gray-100 dark:bg-gray-700">
                            <h3 className="text-lg font-semibold mb-2">Question {index + 1}: {q.question}</h3>
                            <p className="mb-2 text-sm font-medium">Your answer: <span className={`${resultColor} font-bold`}>{q.userAnswer || 'Not answered'}</span></p>
                            <p className="mb-2 text-sm font-medium">Correct answer: <span className="text-green-500 font-bold">{q.answer}</span></p>
                            <p className="text-sm font-medium">Explanation:</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{q.explanation}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function App() {
    const [page, setPage] = useState('login');
    const [difficulty, setDifficulty] = useState(null);
    const [quizData, setQuizData] = useState(defaultQuestions);
    const [analytics, setAnalytics] = useState({ history: [], stats: { accuracy: { easy: 0, medium: 0, hard: 0 }, avgTime: { easy: 0, medium: 0, hard: 0 } } });
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [quizResults, setQuizResults] = useState(null);

    useEffect(() => {
        // Load data from localStorage on initial render
        const storedQuestions = localStorage.getItem(STORAGE_KEY_QUESTIONS);
        if (storedQuestions) {
            try {
                setQuizData(JSON.parse(storedQuestions));
            } catch (e) {
                console.error("Failed to parse stored questions.");
            }
        }
        const storedAnalytics = localStorage.getItem(STORAGE_KEY_ANALYTICS);
        if (storedAnalytics) {
            try {
                const loadedAnalytics = JSON.parse(storedAnalytics);
                setAnalytics({ ...loadedAnalytics, stats: calculateAnalytics(loadedAnalytics.history) });
            } catch (e) {
                console.error("Failed to parse stored analytics.");
            }
        }
        const storedUser = localStorage.getItem(STORAGE_KEY_USER);
        if (storedUser) {
            setPage('selection');
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            document.documentElement.className = localStorage.getItem('theme') || 'light';
        }
    }, []);

    const handleLogin = (username) => {
        localStorage.setItem(STORAGE_KEY_USER, username);
        setPage('selection');
    };

    const handleLogout = () => {
        localStorage.removeItem(STORAGE_KEY_USER);
        setPage('login');
    };

    const handleStartQuiz = (selectedDifficulty) => {
        setDifficulty(selectedDifficulty);
        setPage('quiz');
    };

    const handleQuizComplete = (score, timeTaken, answeredQuestions) => {
        if (score === null) {
            setModalMessage("No questions available for this difficulty.");
            setShowModal(true);
            setPage('selection');
            return;
        }

        const newHistoryEntry = {
            date: new Date().toISOString(),
            difficulty: difficulty,
            score: score,
            totalQuestions: answeredQuestions.length,
            timeTaken: timeTaken,
            answeredQuestions: answeredQuestions
        };

        const newHistory = [...analytics.history, newHistoryEntry];
        const newStats = calculateAnalytics(newHistory);
        const newAnalytics = { history: newHistory, stats: newStats };
        localStorage.setItem(STORAGE_KEY_ANALYTICS, JSON.stringify(newAnalytics));
        setAnalytics(newAnalytics);
        setQuizResults({ score, total: answeredQuestions.length, timeTaken, answeredQuestions });
        setPage('results');
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                const newQuizData = { ...quizData, ...importedData };
                setQuizData(newQuizData);
                localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(newQuizData));
                setModalMessage("Questions imported successfully!");
                setShowModal(true);
            } catch (error) {
                setModalMessage("Failed to import file. Please ensure it's a valid JSON.");
                setShowModal(true);
            }
        };
        reader.readAsText(file);
    };

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(quizData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "questions.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleToggleDarkMode = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    };

    const renderPage = () => {
        switch (page) {
            case 'login':
                return <Login onLogin={handleLogin} />;
            case 'selection':
                return <QuizSelection onStartQuiz={handleStartQuiz} onLogout={handleLogout} onImport={handleImport} onExport={handleExport} analytics={analytics.stats} />;
            case 'quiz':
                return <Quiz difficulty={difficulty} onQuizComplete={handleQuizComplete} />;
            case 'results':
                if (quizResults) {
                    return <Results {...quizResults} onGoHome={() => setPage('selection')} onReviewAnswers={() => setPage('review')} />;
                }
                return null;
            case 'review':
                if (quizResults) {
                    return <ReviewPage questions={quizResults.answeredQuestions} onGoBack={() => setPage('results')} />;
                }
                return null;
            default:
                return null;
        }
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 min-h-screen flex flex-col items-center justify-center p-4">
            <header className="w-full max-w-2xl flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-center w-full">Node.js Quiz App</h1>
                <button onClick={handleToggleDarkMode} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 008.25 15.75c1.554 0 3.036-.37 4.394-1.011z" />
                    </svg>
                </button>
            </header>
            <main className="w-full max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg transition-colors duration-300">
                {renderPage()}
            </main>
            {showModal && <AlertModal message={modalMessage} onClose={() => setShowModal(false)} />}
        </div>
    );
}
