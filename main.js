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
            pri: [
                "강인한 생명력과 에너지가 넘치는 체질을 타고났습니다.",
                "안정적이고 차분한 신체적 기초를 가지고 있습니다.",
                "섬세한 감각과 높은 환경 적응력을 바탕으로 한 생명력을 지녔습니다.",
                "타고난 회복탄력성이 좋아 어떤 상황에서도 활기를 잃지 않는 기질입니다."
            ],
            sec: [
                "꾸준한 자기 관리와 건강한 생활 습관으로 활력이 더욱 강화되고 있습니다.",
                "현재 에너지가 매우 조화로운 상태이며, 삶에 대한 의지가 매우 높습니다.",
                "규칙적인 루틴을 통해 신체적 안정감이 최고조에 달해 있는 상태입니다.",
                "긍정적인 마음가짐이 신체 에너지에 좋은 영향을 주어 활기찬 상태를 유지하고 있습니다."
            ]
        },
        head: {
            name: "두뇌선 (Head Line)",
            color: "#2ed573",
            pri: [
                "논리적이고 명확한 사고방식을 바탕으로 지적인 잠재력이 매우 높습니다.",
                "창의적이고 직관적인 감각을 타고나 예술적 재능이 돋보입니다.",
                "신중하고 분석적인 기질로 학문적 탐구심이 강한 지성인입니다.",
                "집중력이 뛰어나며 하나를 배우면 열을 아는 영특함을 지녔습니다."
            ],
            sec: [
                "현실적인 문제 해결 능력이 탁월해져 사회적으로 지혜로운 판단을 내리고 있습니다.",
                "학습과 경험을 통해 축적된 전문성이 현재 빛을 발하고 있는 시기입니다.",
                "유연한 사고와 빠른 판단력으로 복잡한 상황도 명쾌하게 정리하고 계십니다.",
                "다각도의 시각을 견지하며 창의적 대안을 제시하는 능력이 돋보이는 시점입니다."
            ]
        },
        heart: {
            name: "감정선 (Heart Line)",
            color: "#ffa502",
            pri: [
                "따뜻하고 배려심 깊은 성품으로 타인에게 긍정적인 영향을 줍니다.",
                "독립적이고 주관이 뚜렷해 자신만의 확고한 가치관과 애정관을 지녔습니다.",
                "섬세하고 감수성이 풍부하여 타인의 감정에 깊이 공감할 줄 아는 따뜻한 분입니다.",
                "순수하고 정열적인 마음을 타고나 주변을 항상 밝게 만드는 기질입니다."
            ],
            sec: [
                "성숙하고 안정적인 대인관계 능력을 갖추어 신뢰받는 사람이 되고 있습니다.",
                "자신을 아끼고 사랑할 줄 아는 건강한 자아가 현재 관계를 더욱 빛나게 합니다.",
                "포용력 있는 리더십과 깊은 이해심으로 조화로운 인간관계를 이끌어가고 계십니다.",
                "정서적인 안정감이 현재 최고조에 달해 주변 사람들에게 편안함을 선사하고 있습니다."
            ]
        },
        fate: {
            name: "운명선 (Fate Line)",
            color: "#1e90ff",
            pri: [
                "뚜렷한 목표 의식과 개척 정신으로 성공을 향한 의지가 강합니다.",
                "안정적인 환경에서 자신의 재능을 꾸준히 발휘하며 성장할 운을 지녔습니다.",
                "자유롭고 창의적인 길을 추구하여 자신만의 독보적인 영역을 개척할 기질입니다.",
                "책임감이 강하고 성실하여 어떤 분야에서도 인정받을 잠재력이 충분합니다."
            ],
            sec: [
                "성실함과 노력이 겹쳐져 사회적 신뢰와 명망이 두터워지고 있는 시기입니다.",
                "새로운 도약을 위한 강력한 운의 흐름이 시작되어 미래가 매우 기대됩니다.",
                "목표를 향한 정진이 결실을 맺어가는 과정에 있으며 성취감이 높은 상태입니다.",
                "적극적인 태도가 새로운 기회를 창출하여 운명의 지평을 넓혀가고 계십니다."
            ]
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
            
            let html = `<h2>Palm Reader 종합 분석 리포트</h2>`;
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