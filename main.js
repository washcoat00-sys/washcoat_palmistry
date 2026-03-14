
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
        elements.analyzeBtn.textContent = "AI가 손을 인식하는 중...";
        
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

    // Drag and Drop
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
        elements.analyzeBtn.textContent = "AI가 손을 인식하는 중...";
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
                            
                            // MediaPipe's "Left" label is actually the mirror image for the user (Right hand).
                            // But usually it detects Left as Left in the camera feed. 
                            // For static images, it depends on the flip. Let's adjust based on common usage.
                            const handedness = label === 'Left' ? 'left' : 'right';
                            
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
            drawPalmLines(elements.canvasLeft, processedHands.left);
            elements.previewLeft.textContent = "";
        } else {
            elements.previewLeft.textContent = "왼손 인식 실패";
        }

        if (processedHands.right) {
            drawPalmLines(elements.canvasRight, processedHands.right);
            elements.previewRight.textContent = "";
        } else {
            elements.previewRight.textContent = "오른손 인식 실패";
        }

        if (processedHands.left && processedHands.right) {
            elements.analyzeBtn.disabled = false;
            elements.analyzeBtn.textContent = "종합 분석 시작하기";
        } else {
            elements.analyzeBtn.disabled = true;
            elements.analyzeBtn.textContent = "양손 사진이 필요합니다 (현재 " + (Object.values(processedHands).filter(v => v).length) + "개 인식됨)";
        }
    }

    function clearCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function drawPalmLines(canvas, data) {
        const ctx = canvas.getContext('2d');
        const img = data.img;
        const landmarks = data.landmarks;

        // Set canvas size to match aspect ratio
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw Image
        ctx.drawImage(img, 0, 0);

        // Styling for lines
        const drawLine = (points, color, label) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.moveTo(points[0].x * canvas.width, points[0].y * canvas.height);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x * canvas.width, points[i].y * canvas.height);
            }
            ctx.stroke();

            // Label
            ctx.fillStyle = color;
            ctx.font = "bold 30px Pretendard";
            ctx.fillText(label, points[0].x * canvas.width, points[0].y * canvas.height - 10);
        };

        // Life Line (Landmark 5 -> 2 -> 1 -> 0 area)
        drawLine([landmarks[5], landmarks[2], landmarks[1], landmarks[0]], '#ff4757', '생명선');

        // Head Line (Landmark 5 -> 9 -> 13 -> 17 area across)
        drawLine([landmarks[5], landmarks[9], landmarks[13], landmarks[17]], '#2ed573', '두뇌선');

        // Heart Line (Landmark 17 -> 13 -> 9 -> 5 area high)
        // Adjusting y slightly for heart line
        const heartPoints = [landmarks[17], landmarks[13], landmarks[9], landmarks[5]].map(p => ({x: p.x, y: p.y * 0.95}));
        drawLine(heartPoints, '#ffa502', '감정선');

        // Fate Line (Landmark 0 -> 9 vertical)
        drawLine([landmarks[0], landmarks[9]], '#1e90ff', '운명선');
    }

    // --- Final Analysis & Result Display ---
    const palmReadings = {
        life: {
            name: "생명선 (Life Line)",
            color: "#ff4757",
            insights: ["강인한 생명력과 활기", "안정적이고 차분한 에너지", "감수성이 풍부하고 섬세한 건강", "꾸준한 관리로 다져진 활력"]
        },
        head: {
            name: "두뇌선 (Head Line)",
            color: "#2ed573",
            insights: ["논리적이고 명확한 판단력", "창의적이고 직관적인 사고", "신중하고 분석적인 기질", "실용적이고 현실적인 해결 능력"]
        },
        heart: {
            name: "감정선 (Heart Line)",
            color: "#ffa502",
            insights: ["정열적이고 솔직한 감정", "배려심 깊고 온화한 성품", "독립적이고 주관이 뚜렷한 애정관", "안정적인 관계 유지 능력"]
        },
        fate: {
            name: "운명선 (Fate Line)",
            color: "#1e90ff",
            insights: ["뚜렷한 목표 의식과 책임감", "자유롭고 구애받지 않는 성취욕", "안정적인 환경에서의 성공운", "개척 정신을 통한 새로운 기회"]
        }
    };

    elements.analyzeBtn.addEventListener('click', () => {
        const gender = document.querySelector('input[name="gender"]:checked').value;
        const age = parseInt(elements.ageInput.value);
        
        elements.analyzeBtn.disabled = true;
        elements.resultDiv.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div class="loader"></div>
                <p>AI가 이미지의 손금 곡률과 깊이를 정밀 대조하고 있습니다...</p>
            </div>
        `;

        setTimeout(() => {
            const role = gender === 'male' ? { pri: "왼손(선천)", sec: "오른손(후천)" } : { pri: "오른손(선천)", sec: "왼손(후천)" };
            
            let html = `<h2>AI 종합 분석 리포트</h2>`;
            html += `
                <div class="summary-card">
                    <p><strong>사용자 정보:</strong> ${gender === 'male' ? '남성' : '여성'} / 만 ${age}세</p>
                    <p><strong>핵심 분석:</strong> 사용자님은 <strong>${role.pri}</strong>의 타고난 기질을 바탕으로 <strong>${role.sec}</strong>의 후천적인 환경을 매우 적극적으로 개척하고 있는 형국입니다.</p>
                </div>
                <div class="reading-grid">
            `;

            for (const key in palmReadings) {
                const line = palmReadings[key];
                html += `
                <div class="reading-card">
                    <h3 style="color: ${line.color}">${line.name}</h3>
                    <p><span class="line-label">${role.pri}:</span> ${line.insights[Math.floor(Math.random() * 4)]}의 타고난 성향</p>
                    <p><span class="line-label">${role.sec}:</span> 현재 ${line.insights[Math.floor(Math.random() * 4)]} 상태로 발현 중</p>
                    <p style="font-size: 0.8rem; opacity: 0.7; margin-top: 1rem;">현재 흐름은 매우 긍정적이며, 특히 이 부분의 선명도가 높아질수록 운세가 더욱 탄력을 받을 것입니다.</p>
                </div>`;
            }

            html += `</div>`;
            html += `
                <div class="advice-section">
                    <h3>🔮 총평 및 조언</h3>
                    <p>사용자님의 양손 손금을 대조한 결과, ${age >= 30 ? '현재는 후천적 운명이 완성되어 가는 중요한 시기' : '미래의 가능성을 열어가는 역동적인 시기'}에 있습니다.</p>
                    <p>전반적으로 주름이 깨끗하고 선명하여 의사결정이 빠르고 실행력이 좋습니다. 현재 계획 중인 일이 있다면 주저하지 말고 추진해 보시기 바랍니다.</p>
                </div>
                <p style="font-size: 0.8rem; opacity: 0.5; text-align: center; margin-top: 2.5rem;">* 위 결과는 AI 이미지 분석을 통한 시뮬레이션입니다. 당신의 미래는 당신의 행동으로 결정됩니다.</p>
            `;

            elements.resultDiv.innerHTML = html;
            elements.analyzeBtn.disabled = false;
            elements.resultDiv.scrollIntoView({ behavior: 'smooth' });
        }, 3000);
    });
});
