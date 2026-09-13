// ==========================================
// 1. FIREBASE CONFIGURATION
// Replace this with your actual Firebase config from your project settings
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyD4rCxulp98-gOvKKDL5806FB25OXLJclo",
  authDomain: "jeeoxygen.firebaseapp.com",
  projectId: "jeeoxygen",
  storageBucket: "jeeoxygen.firebasestorage.app",
  messagingSenderId: "778098212167",
  appId: "1:778098212167:web:5c2a3f6ff48089ac19e062",
  measurementId: "G-5YMQ72WDX8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==========================================
// 2. CBT LOGIC
// ==========================================
let userAnswers = {};
let correctAnswers = [];
let timerInterval;

function startTest() {
    const pdfFile = document.getElementById('pdf-upload').files[0];
    const testName = document.getElementById('test-name').value;
    const numQuestions = parseInt(document.getElementById('num-questions').value);
    const keyInput = document.getElementById('answer-key').value.toUpperCase();

    if (!pdfFile || !testName || !keyInput) {
        alert("Please upload the PDF, enter a test name, and provide the answer key!");
        return;
    }

    // Process Answer Key (convert "A,B,C" into array ["A", "B", "C"])
    correctAnswers = keyInput.split(',').map(s => s.trim());

    if (correctAnswers.length !== numQuestions) {
        alert(`Warning: You requested ${numQuestions} questions, but entered ${correctAnswers.length} answers in the key.`);
    }

    // Load PDF into iframe using a Blob URL
    const fileURL = URL.createObjectURL(pdfFile);
    document.getElementById('pdf-frame').src = fileURL;

    document.getElementById('display-test-name').innerText = testName;

    // Generate OMR Grid (A, B, C, D)
    const omrGrid = document.getElementById('omr-grid');
    omrGrid.innerHTML = '';
    
    for (let i = 1; i <= numQuestions; i++) {
        const row = document.createElement('div');
        row.className = 'omr-row';
        row.innerHTML = `<span class="q-num">Q${i}</span>`;
        
        ['A', 'B', 'C', 'D'].forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = opt;
            btn.onclick = () => selectOption(i, opt, row);
            row.appendChild(btn);
        });
        
        omrGrid.appendChild(row);
    }

    // Switch screens
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('cbt-screen').classList.remove('hidden');

    // Start 1 Hour Timer (3600 seconds)
    startTimer(3600);
}

function selectOption(qNumber, option, rowElement) {
    userAnswers[qNumber - 1] = option; // Store answer (0-indexed array)
    
    // Remove selected class from all buttons in this row
    const btns = rowElement.querySelectorAll('.option-btn');
    btns.forEach(b => b.classList.remove('selected'));
    
    // Add selected class to clicked button
    event.target.classList.add('selected');
}

function startTimer(duration) {
    let timer = duration;
    timerInterval = setInterval(() => {
        let h = Math.floor(timer / 3600).toString().padStart(2, '0');
        let m = Math.floor((timer % 3600) / 60).toString().padStart(2, '0');
        let s = (timer % 60).toString().padStart(2, '0');
        
        document.getElementById('timer').innerText = `${h}:${m}:${s}`;
        
        if (--timer < 0) {
            clearInterval(timerInterval);
            submitTest();
        }
    }, 1000);
}

async function submitTest() {
    clearInterval(timerInterval);
    
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    const totalQuestions = correctAnswers.length;

    // Calculate Score
    for (let i = 0; i < totalQuestions; i++) {
        if (!userAnswers[i]) {
            unattempted++;
        } else if (userAnswers[i] === correctAnswers[i]) {
            correct++;
        } else {
            incorrect++;
        }
    }

    const score = (correct * 4) - (incorrect * 1);
    const maxScore = totalQuestions * 4;

    // Display Score
    document.getElementById('final-score').innerText = score;
    document.getElementById('max-score').innerText = maxScore;
    document.getElementById('correct-count').innerText = correct;
    document.getElementById('incorrect-count').innerText = incorrect;

    // Switch Screens
    document.getElementById('cbt-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');

    // Save to Firebase Firestore
    try {
        const testName = document.getElementById('test-name').value;
        await db.collection("test_results").add({
            testName: testName,
            score: score,
            maxScore: maxScore,
            correct: correct,
            incorrect: incorrect,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('firebase-status').innerText = "✅ Result successfully saved to Firebase database!";
    } catch (error) {
        console.error("Error saving to Firebase: ", error);
        document.getElementById('firebase-status').innerText = "⚠️ Could not save to Firebase. Check console for errors.";
        document.getElementById('firebase-status').style.color = "red";
    }
}
