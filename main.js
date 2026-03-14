document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const elements = {
        themeToggle: document.getElementById('themeToggle'),
        analyzeBtn: document.getElementById('analyzeBtn'),
        resultDiv: document.getElementById('result'),
        ageInput: document.getElementById('age'),
        palmImages: document.getElementById('palmImages'),
        dropZone: document.getElementById('dropZone'),
        canvasLeft: document.getElementById('canvasLeft'),
        canvasRight: document.getElementById('canvasRight'),
        previewLeft: document.getElementById('previewLeft'),
        previewRight: document.getElementById('previewRight')
    };

    let processedHands = { left: null, right: null };

    // --- MediaPipe Hands Setup ---
    const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    // --- Theme Management ---
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        elements.themeToggle.textContent = '☀️';
    }

    elements.themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        elements.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    });

    // --- File Handling & Processing ---
    elements.palmImages.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        elements.analyzeBtn.disabled = true;
        elements.analyzeBtn.textContent = "AI가 손을 분석하고 있습니다...";
        
        // Clear previous
        processedHands = { left: null, right: null };
        clearCanvas(elements.canvasLeft);
        clearCanvas(elements.canvasRight);
        elements.previewLeft.textContent = "분석 중...";
        elements.previewRight.textContent = "분석 중...";

        for (const file of files.slice(0, 2)) {
            await processImage(file);
        }

        updateAnalysisUI();
    });

    elements.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.dropZone.classList.add('drag-over');
    });
    elements.dropZone.addEventListener('dragleave', () => elements.dropZone.classList.remove('drag-over'));
    elements.dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        elements.dropZone.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        elements.analyzeBtn.disabled = true;
        elements.analyzeBtn.textContent = "AI가 손을 분석하고 있습니다...";
        processedHands = { left: null, right: null };
        
        for (const file of files.slice(0, 2)) {
            await processImage(file);
        }
        updateAnalysisUI();
    });

    async function processImage(file) {
        if (!file.type.startsWith('image/')) return;

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const img = new Image();
                img.onload = async () => {
                    // Send to MediaPipe
                    hands.onResults((results) => {
                        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                            const landmarks = results.multiHandLandmarks[0];
                            const label = results.multiHandedness[0].label; // "Left" or "Right"
                            
                            // FIXED: Swapped handedness logic. 
                            // MediaPipe "Left" label usually corresponds to physical Right hand in photos.
                            const handedness = label === 'Left' ? 'right' : 'left';
                            
                            processedHands[handedness] = {
                                img: img,
                                landmarks: landmarks
                            };
                        }
                        resolve();
                    });
                    await hands.send({ image: img });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function updateAnalysisUI() {
        if (processedHands.left) {
            drawHandSkeletonAndLines(elements.canvasLeft, processedHands.left);
            elements.previewLeft.textContent = "";
        } else {
            elements.previewLeft.textContent = "왼손 인식 대기";
        }

        if (processedHands.right) {
            drawHandSkeletonAndLines(elements.canvasRight, processedHands.right);
            elements.previewRight.textContent = "";
        } else {
            elements.previewRight.textContent = "오른손 인식 대기";
        }

        if (processedHands.left && processedHands.right) {
            elements.analyzeBtn.disabled = false;
            elements.analyzeBtn.textContent = "양손 종합 분석 결과 보기";
        } else {
            elements.analyzeBtn.disabled = true;
            elements.analyzeBtn.textContent = "양손 사진이 모두 필요합니다 (현재 " + (Object.values(processedHands).filter(v => v).length) + "개 인식됨)";
        }
    }

    function clearCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function drawHandSkeletonAndLines(canvas, data) {
        const ctx = canvas.getContext('2d');
        const img = data.img;
        const landmarks = data.landmarks;

        canvas.width = img.width;
        canvas.height = img.height;

        // Draw Image
        ctx.drawImage(img, 0, 0);

        // Draw Skeleton using MediaPipe Drawing Utils
        if (window.drawConnectors && window.drawLandmarks) {
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {color: '#ffffff', lineWidth: 2});
            drawLandmarks(ctx, landmarks, {color: '#ffffff', lineWidth: 1, radius: 3});
        }

        // --- Draw Labeled Palm Lines ---
        const drawPalmLine = (points, color, label) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            
            ctx.moveTo(points[0].x * canvas.width, points[0].y * canvas.height);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x * canvas.width, points[i].y * canvas.height);
            }
            ctx.stroke();
            ctx.shadowBlur = 0; // Reset shadow

            // Label Background
            const text = label;
            ctx.font = "bold 34px Pretendard";
            const textWidth = ctx.measureText(text).width;
            const x = points[0].x * canvas.width;
            const y = points[0].y * canvas.height - 15;
            
            ctx.fillStyle = color;
            ctx.fillRect(x - 5, y - 30, textWidth + 10, 40);
            
            ctx.fillStyle = "#ffffff";
            ctx.fillText(text, x, y);
        };

        // Line Coordinates
        // 1. 생명선 (Life Line): 엄지 밑 근육 (5-2-1-0)
        drawPalmLine([landmarks[5], landmarks[2], landmarks[1], landmarks[0]], '#ff4757', '생명선');

        // 2. 두뇌선 (Head Line): 손바닥 가로 지름 (5-9-13-17)
        drawPalmLine([landmarks[5], landmarks[9], landmarks[13], landmarks[17]], '#2ed573', '두뇌선');

        // 3. 감정선 (Heart Line): 손가락 밑 가로 (17-13-9-5 약간 상단)
        const heartPoints = [landmarks[17], landmarks[13], landmarks[9], landmarks[5]].map(p => ({x: p.x, y: p.y * 0.96}));
        drawPalmLine(heartPoints, '#ffa502', '감정선');

        // 4. 운명선 (Fate Line): 손바닥 중앙 세로 (0-9-12 사이)
        drawPalmLine([landmarks[0], landmarks[9], landmarks[12]], '#1e90ff', '운명선');
    }

    // --- Final Analysis & Result Display ---
    const palmReadings = {
        life: {
            name: "생명선 (Life Line)",
            color: "#ff4757",
            pri: ["활력이 넘치고 건강한 체질", "강인한 생존 본능과 열정", "차분하고 안정적인 에너지"],
            sec: ["꾸준한 관리로 유지되는 건강", "현재 에너지가 매우 집중된 상태", "규칙적인 생활로 다져진 활력"]
        },
        head: {
            name: "두뇌선 (Head Line)",
            color: "#2ed573",
            pri: ["논리적이고 명확한 사고방식", "직관적이고 예술적인 감각", "신중하고 분석적인 기질"],
            sec: ["현실적인 문제 해결 능력", "학습을 통한 전문적 지식 확보", "유연한 사고와 빠른 판단력"]
        },
        heart: {
            name: "감정선 (Heart Line)",
            color: "#ffa502",
            pri: ["따뜻하고 배려심 깊은 성품", "독립적이고 주관이 뚜렷한 애정관", "섬세하고 감수성이 풍부한 기질"],
            sec: ["성숙하고 안정적인 대인관계", "자신을 사랑할 줄 아는 건강한 자아", "포용력 있는 리더십의 발현"]
        },
        fate: {
            name: "운명선 (Fate Line)",
            color: "#1e90ff",
            pri: ["뚜렷한 목표 의식과 개척 정신", "안정적인 환경에서의 성취욕", "자유롭고 창의적인 길을 추구함"],
            sec: ["성실함으로 일궈낸 사회적 신뢰", "새로운 도약을 준비하는 강력한 에너지", "목표를 향한 끊임없는 정진"]
        }
    };

    elements.analyzeBtn.addEventListener('click', () => {
        const gender = document.querySelector('input[name="gender"]:checked').value;
        const age = parseInt(elements.ageInput.value);
        
        elements.analyzeBtn.disabled = true;
        elements.resultDiv.innerHTML = `
            <div style="text-align: center; padding: 4rem;">
                <div class="loader"></div>
                <p style="font-size: 1.1rem; font-weight: 500;">양손의 손금 곡선과 깊이를 정밀하게 비교 분석하고 있습니다...</p>
            </div>
        `;

        setTimeout(() => {
            const role = gender === 'male' ? { pri: "왼손(선천)", sec: "오른손(후천)" } : { pri: "오른손(선천)", sec: "왼손(후천)" };
            
            let html = `<h2>AI 종합 분석 리포트</h2>`;
            html += `
                <div class="summary-card">
                    <p style="margin-bottom: 0.5rem;"><strong>사용자 정보:</strong> ${gender === 'male' ? '남성' : '여성'} / 만 ${age}세</p>
                    <p><strong>핵심 분석:</strong> 사용자님은 <strong>${role.pri}</strong>의 선천적 재능을 바탕으로, <strong>${role.sec}</strong>의 후천적 노력을 통해 자신만의 독창적인 운명을 개척하고 계십니다.</p>
                </div>
                <div class="reading-grid">
            `;

            // Unique random index per line to avoid duplicate results
            const keys = Object.keys(palmReadings);
            keys.forEach(key => {
                const line = palmReadings[key];
                const priIdx = Math.floor(Math.random() * line.pri.length);
                const secIdx = Math.floor(Math.random() * line.sec.length);
                
                html += `
                <div class="reading-card">
                    <h3 style="color: ${line.color}; border-left: 5px solid ${line.color}; padding-left: 10px; border-bottom: none;">${line.name}</h3>
                    <div style="margin-top: 1rem;">
                        <p><span class="line-label" style="background: ${line.color}22; padding: 2px 6px; border-radius: 4px; color: ${line.color};">${role.pri}</span> ${line.pri[priIdx]}의 성향</p>
                        <p><span class="line-label" style="background: ${line.color}22; padding: 2px 6px; border-radius: 4px; color: ${line.color};">${role.sec}</span> 현재 ${line.sec[secIdx]} 모습</p>
                    </div>
                    <p style="font-size: 0.85rem; opacity: 0.8; margin-top: 1.2rem; line-height: 1.5;">분석된 선의 깊이와 선명도로 볼 때, 현재 매우 긍정적인 운의 흐름을 타고 있습니다. 특히 ${key === 'fate' ? '직업적 성취' : key === 'head' ? '지적인 활동' : key === 'life' ? '건강 관리' : '대인 관계'}에 집중하신다면 더욱 좋은 결과가 예상됩니다.</p>
                </div>`;
            });

            html += `</div>`;
            html += `
                <div class="advice-section">
                    <h3 style="margin-bottom: 1rem;">🔮 AI 총평 및 운명 조언</h3>
                    <p style="font-size: 1.1rem; line-height: 1.7;">사용자님의 양손을 종합해볼 때, ${age >= 30 ? '후천적인 노력이 빛을 발하여 안정기에 접어드는 과정' : '잠재된 재능을 실현하기 위한 에너지가 폭발하는 시기'}에 와 있습니다.</p>
                    <p style="margin-top: 1rem; opacity: 0.9;">특히 두뇌선과 운명선의 조화가 뛰어나 전략적인 계획을 세우고 이를 끈기 있게 밀어붙이는 힘이 강합니다. 스스로를 믿고 나아가세요.</p>
                </div>
                <p style="font-size: 0.85rem; opacity: 0.6; text-align: center; margin-top: 3rem; font-style: italic;">* 본 분석은 AI 이미지 패턴 분석 결과이며, 참고용입니다. 당신의 운명은 당신의 손끝에서 매 순간 새롭게 창조됩니다.</p>
            `;

            elements.resultDiv.innerHTML = html;
            elements.analyzeBtn.disabled = false;
            elements.resultDiv.scrollIntoView({ behavior: 'smooth' });
        }, 3000);
    });
});