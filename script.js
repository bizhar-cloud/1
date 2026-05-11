// --- ئیفێکتێن دەنگی (Web Audio API) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone(freq, type, duration, vol=0.1) {
    try {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

function playClickSound() { playTone(600, 'sine', 0.1, 0.05); }
function playWinSound() { 
    playTone(523.25, 'triangle', 0.1); 
    setTimeout(() => playTone(659.25, 'triangle', 0.2), 100); 
}
function playLoseSound() { 
    playTone(300, 'sawtooth', 0.2); 
    setTimeout(() => playTone(250, 'sawtooth', 0.4), 200); 
}
function playGrandWinSound() { 
    playWinSound(); 
    setTimeout(playWinSound, 300); 
    setTimeout(playWinSound, 600); 
}

// --- ئیمۆجیێن گروپان ---
const animalEmojis = ['🦁', '🦅', '🐺', '🦊', '🐯', '🐻', '🐉', '🦖', '🦈', '🐍', '🐙', '🦋', '🦉', '🦇'];
let emojiIdx1 = 0;
let emojiIdx2 = 1;

function cycleEmoji(teamId) {
    initAudio(); 
    playClickSound();
    if (teamId === 1) {
        emojiIdx1 = (emojiIdx1 + 1) % animalEmojis.length;
        document.getElementById('emoji1').textContent = animalEmojis[emojiIdx1];
    } else {
        emojiIdx2 = (emojiIdx2 + 1) % animalEmojis.length;
        document.getElementById('emoji2').textContent = animalEmojis[emojiIdx2];
    }
    saveData();
}

// --- خەزنکرنا داتایان (Local Storage) ---
function saveData() {
    const data = {
        s1: score1, 
        s2: score2, 
        hTeam: hidingTeamId,
        n1: document.getElementById('name1').value, 
        n2: document.getElementById('name2').value,
        e1: emojiIdx1, 
        e2: emojiIdx2
    };
    localStorage.setItem('ringGameSave', JSON.stringify(data));
}

function loadData() {
    const saved = localStorage.getItem('ringGameSave');
    if (saved) {
        const data = JSON.parse(saved);
        score1 = data.s1 || 0; 
        score2 = data.s2 || 0; 
        hidingTeamId = data.hTeam || 1;
        document.getElementById('name1').value = data.n1 || "گروپێ ١";
        document.getElementById('name2').value = data.n2 || "گروپێ ٢";
        emojiIdx1 = data.e1 || 0; 
        emojiIdx2 = data.e2 || 1;
        document.getElementById('emoji1').textContent = animalEmojis[emojiIdx1];
        document.getElementById('emoji2').textContent = animalEmojis[emojiIdx2];
        return (score1 > 0 || score2 > 0); 
    }
    return false;
}

function hardReset() {
    if(confirm("تۆ یێ پشتڕاستی تە دڤێت یاریێ ب تەمامی ژێببەی و ژ سفرێ دەستپێبکەی؟")) {
        localStorage.removeItem('ringGameSave');
        location.reload();
    }
}

// --- تۆمارا یاریێ (Game Log) ---
const historyLog = document.getElementById('history-log');
function addLog(text, type = "info-log") {
    const p = document.createElement('p');
    p.className = type;
    const time = new Date().toLocaleTimeString('ku-IQ', { hour: '2-digit', minute: '2-digit' });
    p.innerHTML = `<strong>[${time}]</strong> ${text}`;
    historyLog.insertBefore(p, historyLog.firstChild); 
}

// --- کۆدێ سەرەکی یێ یاریێ ---
let totalHands = 10;
let ringPosition = -1;
let currentMode = 'pichke'; 
let isGameOver = false;
let gamePhase = 'toss'; 
let flippedEmptyHands = 0; 
let score1 = 0; 
let score2 = 0; 
let hidingTeamId = 1; 

const handsContainer = document.getElementById('hands-container');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart-btn');
const btnPichke = document.getElementById('btn-pichke');
const btnBine = document.getElementById('btn-bine');
const board = document.getElementById('board');
const team1Card = document.getElementById('team1-card');
const team2Card = document.getElementById('team2-card');
const setupBar = document.getElementById('setup-bar');
const gameControls = document.getElementById('game-controls');

function getTeamName(id) { 
    const emoji = id === 1 ? animalEmojis[emojiIdx1] : animalEmojis[emojiIdx2];
    const name = document.getElementById(`name${id}`).value || `گروپێ ${id}`; 
    return `${emoji} ${name}`;
}

function showMessage(mainMsg, subMsg, msgClass) {
    if (subMsg) {
        messageEl.innerHTML = `${mainMsg}<div class='sub-msg'>${subMsg}</div>`;
    } else {
        messageEl.innerHTML = mainMsg;
    }
    messageEl.className = msgClass;
}

function updateScoreUI() {
    document.getElementById('score1').textContent = score1;
    document.getElementById('score2').textContent = score2;

    if(hidingTeamId === 1) { 
        team1Card.classList.add('hiding'); 
        team2Card.classList.remove('hiding'); 
    } else { 
        team2Card.classList.add('hiding'); 
        team1Card.classList.remove('hiding'); 
    }

    if (score1 >= 23 && !isGameOver) {
        declareMatchWinner(1);
    } else if (score2 >= 23 && !isGameOver) {
        declareMatchWinner(2);
    }
}

function initApp() {
    const hasSavedGame = loadData();
    updateScoreUI();
    if (hasSavedGame) {
        addLog("یاری ژ خەزنکرنێ هاتە ڤەگەڕاندن.", "info-log");
        initGame();
    } else {
        addLog("یارییەکا نوی دەستپێکر.", "info-log");
        initToss();
    }
}

function initToss() {
    gamePhase = 'toss';
    handsContainer.classList.add('toss-phase');
    ringPosition = Math.floor(Math.random() * 2); 
    handsContainer.innerHTML = '';
    setupBar.style.display = 'none'; 
    gameControls.style.display = 'none';

    showMessage(`قورعەیا دەستپێکێ 🎲`, `${getTeamName(1)}، دەستەکی هەلبژێرە دا بزانین کێ دێ یاریێ دەستپێکەت!`, "hiding-msg");

    let pairDiv = document.createElement('div');
    pairDiv.classList.add('pair-container');

    for (let i = 0; i < 2; i++) {
        const cardContainer = document.createElement('div');
        cardContainer.classList.add('card-container');
        cardContainer.innerHTML = `
            <div class="card-inner">
                <div class="card-front"><span class="emoji">👊</span></div>
                <div class="card-back"><span class="emoji back-emoji"></span></div>
            </div>
        `;
        cardContainer.onclick = () => { 
            initAudio(); 
            playClickSound(); 
            handleTossClick(i, cardContainer); 
        };
        pairDiv.appendChild(cardContainer);
    }
    handsContainer.appendChild(pairDiv);
}

function handleTossClick(index, cardContainer) {
    if (gamePhase !== 'toss' || cardContainer.classList.contains('flipped')) return;
    gamePhase = 'toss_revealed'; 
    
    const hasRing = (index === ringPosition);
    const allCards = handsContainer.querySelectorAll('.card-container');
    
    for (let i = 0; i < 2; i++) {
        const card = allCards[i];
        const emoji = card.querySelector('.back-emoji');
        if (i === ringPosition) { 
            emoji.textContent = '💍'; 
            if(i === index) card.classList.add('flipped', 'winner'); 
            else card.classList.add('flipped'); 
        } else { 
            emoji.textContent = '🖐️'; 
            if(i === index) card.classList.add('flipped', 'loser'); 
            else card.classList.add('flipped'); 
        }
    }

    if (hasRing) {
        hidingTeamId = 1; 
        playWinSound();
        showMessage(`پیرۆزە! گوستیلک دەرکەفت 💍`, `${getTeamName(1)} دێ یاریێ دەستپێکەت!`, "winner-msg");
        addLog(`${getTeamName(1)} قورعە برەوە و دێ دەستپێکەت.`, "win-log");
    } else {
        hidingTeamId = 2; 
        playLoseSound();
        showMessage(`ڤالا بوو! 🖐️`, `نۆرە چوو بۆ ${getTeamName(2)} دا یاریێ دەستپێبکەت!`, "loser-msg");
        addLog(`${getTeamName(1)} د قورعەیێ دا خەلەت بوو، نۆرە چوو بۆ ${getTeamName(2)}.`, "info-log");
    }

    saveData(); 
    updateScoreUI();
    
    setTimeout(() => { 
        initGame(); 
    }, 3000);
}

function changeHandCount() { 
    initAudio(); 
    playClickSound(); 
    totalHands = parseInt(document.getElementById('hand-count-select').value); 
    initGame(); 
}

function initGame() {
    if(score1 >= 23 || score2 >= 23) return; 
    
    handsContainer.classList.remove('toss-phase');
    handsContainer.innerHTML = '';
    isGameOver = false; 
    gamePhase = 'setup'; 
    ringPosition = -1; 
    flippedEmptyHands = 0; 
    
    restartBtn.style.display = 'none'; 
    board.classList.remove('shake-effect');
    gameControls.style.display = 'none'; 
    setupBar.style.display = 'flex'; 
    
    updateScoreUI();

    showMessage("هژمارا دەستان هەلبژێرە و دەستپێبکە...", "", "");

    let currentPairDiv = null;
    for (let i = 0; i < totalHands; i++) {
        if (i % 2 === 0) {
            currentPairDiv = document.createElement('div');
            currentPairDiv.classList.add('pair-container');
            handsContainer.appendChild(currentPairDiv);
        }
        const cardContainer = document.createElement('div');
        cardContainer.classList.add('card-container', 'locked'); 
        cardContainer.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <span class="hand-number">${i + 1}</span>
                    <span class="emoji">👊</span>
                </div>
                <div class="card-back">
                    <span class="hand-number">${i + 1}</span>
                    <span class="emoji back-emoji"></span>
                </div>
            </div>
        `;
        cardContainer.onclick = () => { 
            initAudio(); 
            playClickSound(); 
            handleHandClick(i, cardContainer); 
        };
        currentPairDiv.appendChild(cardContainer);
    }
}

function beginRound() {
    initAudio(); 
    playClickSound();
    gamePhase = 'hiding'; 
    setupBar.style.display = 'none'; 
    
    handsContainer.querySelectorAll('.card-container').forEach(card => card.classList.remove('locked'));
    
    showMessage(`🤫 ${getTeamName(hidingTeamId)}، گوستیلکێ ڤەشێرە...`, "", "hiding-msg");
}

function setMode(mode) {
    if (isGameOver || (mode === 'pichke' && btnPichke.disabled)) return;
    initAudio(); 
    playClickSound();
    
    currentMode = mode;
    if (mode === 'pichke') { 
        btnPichke.classList.add('active'); 
        btnBine.classList.remove('active'); 
    } else { 
        btnBine.classList.add('active'); 
        btnPichke.classList.remove('active'); 
    }
}

function autoAddPoint(teamId) {
    let scoreElement;
    if (teamId === 1) { 
        score1 = Math.min(23, score1 + 1); 
        scoreElement = document.getElementById('score1'); 
    } else { 
        score2 = Math.min(23, score2 + 1); 
        scoreElement = document.getElementById('score2'); 
    }
    
    saveData(); 
    updateScoreUI();
    
    scoreElement.classList.add('point-added');
    setTimeout(() => { 
        scoreElement.classList.remove('point-added'); 
    }, 600);
    
    return (score1 >= 23 || score2 >= 23); 
}

function declareMatchWinner(teamId) {
    isGameOver = true; 
    gamePhase = 'ended'; 
    setupBar.style.display = 'none'; 
    gameControls.style.display = 'none';
    playGrandWinSound();
    
    if (typeof confetti === 'function') {
        var duration = 3 * 1000; 
        var end = Date.now() + duration;
        (function frame() {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#F9C013', '#2E8B57', '#E30A17'] });
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#F9C013', '#2E8B57', '#E30A17'] });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    }
    
    showMessage(`🏆 پیرۆزە! ${getTeamName(teamId)} یاری برەوە! 🏆`, `ب ${teamId===1?score1:score2} خاڵان`, "grand-winner-msg");
    addLog(`🎉 ${getTeamName(teamId)} یاری ب تەمامی برەوە!`, "win-log");
    
    restartBtn.textContent = "یارییەکا نوی ژ سفرێ 🔄"; 
    restartBtn.style.display = 'inline-block';
    restartBtn.onclick = function() { hardReset(); };
    
    revealRing();
}

function handleHandClick(index, cardContainer) {
    if (isGameOver || cardContainer.classList.contains('flipped') || gamePhase === 'setup' || gamePhase === 'toss') return;
    
    let searcherTeamId = hidingTeamId === 1 ? 2 : 1;

    if (gamePhase === 'hiding') {
        ringPosition = index; 
        gamePhase = 'searching';
        
        document.activeElement.blur(); 
        cardContainer.blur(); 
        gameControls.style.display = 'flex'; 
        
        addLog(`🤫 ${getTeamName(hidingTeamId)} گوستیلک ڤەشارت.`, "info-log");
        
        let hidingScore = hidingTeamId === 1 ? score1 : score2;
        if (hidingScore >= 20 && hidingScore < 23) {
            setMode('bine'); 
            btnPichke.disabled = true;
            let nivaDastan = Math.floor(totalHands / 2);
            showMessage(`🌸 دەستە گول! ${getTeamName(searcherTeamId)} مافێ هەیە بێژیت ${nivaDastan} دەستا بدەمن 🌸`, "", "dasta-gul-msg");
        } else {
            setMode('pichke'); 
            btnPichke.disabled = false;
            showMessage(`نۆڕەیا ${getTeamName(searcherTeamId)} یە بگەڕیت...`, "", "");
        }
        return; 
    }

    const hasRing = (index === ringPosition);
    const backEmoji = cardContainer.querySelector('.back-emoji');

    if (currentMode === 'pichke') {
        if (hasRing) {
            playLoseSound(); 
            backEmoji.textContent = '💍'; 
            cardContainer.classList.add('flipped', 'loser'); 
            board.classList.add('shake-effect');
            
            let gameEnded = autoAddPoint(hidingTeamId);
            addLog(`❌ ${getTeamName(searcherTeamId)} خەلەت بوو (گۆت پوچکە لێ تێدا بوو). +١ خاڵ بۆ ${getTeamName(hidingTeamId)}`, "lose-log");
            
            if (gameEnded) return; 
            
            endGame(false, `خەلەتە! گوستیلک تێدا بوو 💔`, `(+١ خاڵ بۆ ${getTeamName(hidingTeamId)})`, "loser-msg");
        } else {
            backEmoji.textContent = '🖐️'; 
            cardContainer.classList.add('flipped'); 
            flippedEmptyHands++;
            
            if (flippedEmptyHands === totalHands - 1) {
                isGameOver = true; 
                setTimeout(() => {
                    playWinSound();
                    const allCards = handsContainer.querySelectorAll('.card-container');
                    const ringCard = allCards[ringPosition]; 
                    ringCard.querySelector('.back-emoji').textContent = '💍'; 
                    ringCard.classList.add('flipped', 'winner');
                    
                    let resetMsg = ""; 
                    let hidingScore = hidingTeamId === 1 ? score1 : score2;
                    if (hidingScore >= 20 && hidingScore < 23) {
                        if(hidingTeamId === 1) score1 = 20; else score2 = 20;
                        resetMsg = `(دەستە گول شکەست!)`;
                    }
                    
                    addLog(`✅ ${getTeamName(searcherTeamId)} هەمی دەست ڤالا کرن و گوستیلک دیت! ${resetMsg}`, "win-log");
                    
                    hidingTeamId = searcherTeamId; 
                    saveData(); 
                    updateScoreUI();
                    
                    endGame(true, `شازە! تە هەمی ڤالا کرن! 🎉`, resetMsg, "winner-msg");
                }, 500); 
            } else {
                showMessage(`ڕاستە! بەردەوام بە...`, "", "winner-msg");
            }
        }
    } else if (currentMode === 'bine') {
        if (hasRing) {
            playWinSound(); 
            backEmoji.textContent = '💍'; 
            cardContainer.classList.add('flipped', 'winner');
            
            let resetMsg = ""; 
            let hidingScore = hidingTeamId === 1 ? score1 : score2;
            if (hidingScore >= 20 && hidingScore < 23) {
                if(hidingTeamId === 1) score1 = 20; else score2 = 20;
                resetMsg = `(دەستە گول شکەست و زڤڕیە ٢٠!)`;
            }
            
            addLog(`✅ ${getTeamName(searcherTeamId)} گوستیلک دیت د دەستێ ${index+1} دا. ${resetMsg}`, "win-log");
            
            hidingTeamId = searcherTeamId; 
            saveData(); 
            updateScoreUI();
            
            endGame(true, `پیرۆزە! تە گوستیلک دیت 🎉`, resetMsg, "winner-msg");
        } else {
            let hidingScore = hidingTeamId === 1 ? score1 : score2;
            let isDastaGul = (hidingScore >= 20 && hidingScore < 23);
            let allowedPicks = isDastaGul ? Math.floor(totalHands / 2) : 1;
            
            if (isDastaGul) {
                flippedEmptyHands++; 
                backEmoji.textContent = '🖐️'; 
                cardContainer.classList.add('flipped'); 
                
                if (flippedEmptyHands >= allowedPicks) {
                    playLoseSound(); 
                    cardContainer.classList.add('loser'); 
                    board.classList.add('shake-effect');
                    
                    let gameEnded = autoAddPoint(hidingTeamId);
                    addLog(`❌ ${getTeamName(searcherTeamId)} خەلەت بوو و هەمی ${allowedPicks} مافێن خۆ بکارئینان. +١ خاڵ بۆ ${getTeamName(hidingTeamId)}`, "lose-log");
                    
                    if (gameEnded) return;
                    
                    endGame(false, `خەلەتە! هەمی مافێن تە ب دوماهی هاتن 💔`, `(+١ خاڵ بۆ ${getTeamName(hidingTeamId)})`, "loser-msg");
                } else {
                    playTone(400, 'sine', 0.1); 
                    let mafenMayi = allowedPicks - flippedEmptyHands;
                    showMessage(`ڤالایە! دشێی بێژی ${mafenMayi} دەستێن دی بدەمن 🌸`, "", "dasta-gul-msg");
                }
            } else {
                playLoseSound(); 
                backEmoji.textContent = '🖐️'; 
                cardContainer.classList.add('flipped', 'loser'); 
                board.classList.add('shake-effect');
                
                let gameEnded = autoAddPoint(hidingTeamId);
                addLog(`❌ ${getTeamName(searcherTeamId)} خەلەت بوو (گۆت بینە لێ ڤالا بوو). +١ خاڵ بۆ ${getTeamName(hidingTeamId)}`, "lose-log");
                
                if (gameEnded) return;
                
                endGame(false, `خەلەتە! ڤالا بوو 💔`, `(+١ خاڵ بۆ ${getTeamName(hidingTeamId)})`, "loser-msg");
            }
        }
    }
}

function endGame(playerWon, mainMsg, subMsg, msgClass) {
    isGameOver = true; 
    showMessage(mainMsg, subMsg, msgClass);
    
    restartBtn.style.display = 'inline-block';
    restartBtn.textContent = "دەستەکێ نوی 🔄";
    restartBtn.onclick = function() { continueGame(); };
    
    revealRing();
}

function continueGame() { 
    initAudio(); 
    playClickSound(); 
    initGame(); 
}

function revealRing() {
    const allCards = handsContainer.querySelectorAll('.card-container');
    for (let i = 0; i < totalHands; i++) {
        const card = allCards[i];
        if (!card.classList.contains('flipped')) {
            const backEmoji = card.querySelector('.back-emoji');
            if (i === ringPosition) {
                backEmoji.textContent = '💍';
                if(!card.classList.contains('winner') && !card.classList.contains('loser')){
                    card.querySelector('.card-back').style.background = "linear-gradient(135deg, #fef08a, #facc15)";
                    card.querySelector('.card-back').style.border = "2px solid #eab308";
                }
            } else { 
                backEmoji.textContent = '🖐️'; 
            }
            setTimeout(() => { card.classList.add('flipped'); }, i * 80); 
        }
    }
}

window.onload = initApp;