
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
        previewRight: document.getElementById('previewRight'),
        openCameraBtn: document.getElementById('openCameraBtn'),
        cameraModal: document.getElementById('cameraModal'),
        closeModal: document.querySelector('.close-modal'),
        video: document.getElementById('video'),
        captureBtn: document.getElementById('captureBtn')
    };

    let processedHands = { left: null, right: null };
    let stream = null;

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

    // --- Camera Logic ---
    elements.openCameraBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            elements.video.srcObject = stream;
            elements.cameraModal.style.display = 'block';
        } catch (err) {
            alert('카메라에 접근할 수 없습니다. 권한을 확인해주세요.');
        }
    });

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        elements.cameraModal.style.display = 'none';
    };

    elements.closeModal.addEventListener('click', stopCamera);
    window.addEventListener('click', (e) => { if (e.target === elements.cameraModal) stopCamera(); });

    elements.captureBtn.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = elements.video.videoWidth;
        canvas.height = elements.video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(elements.video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(async (blob) => {
            const file = new File([blob], `capture_${Date.now()}.png`, { type: 'image/png' });
            elements.analyzeBtn.textContent = "AI가 인식 중...";
            await processImage(file);
            updateAnalysisUI();
            stopCamera();
        }, 'image/png');
    });

    // --- File Handling & Processing ---
    elements.palmImages.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        elements.analyzeBtn.disabled = true;
        elements.analyzeBtn.textContent = "AI 분석 중...";
        
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
        elements.analyzeBtn.textContent = "AI 분석 중...";
        
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
                    hands.onResults((results) => {
                        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                            const landmarks = results.multiHandLandmarks[0];
                            const label = results.multiHandedness[0].label;
                            // FIXED: Swapped handedness logic. MediaPipe "Left" label -> physical Right.
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
        }
        if (processedHands.right) {
            drawHandSkeletonAndLines(elements.canvasRight, processedHands.right);
            elements.previewRight.textContent = "";
        }

        const count = Object.values(processedHands).filter(v => v).length;
        if (count >= 2) {
            elements.analyzeBtn.disabled = false;
            elements.analyzeBtn.textContent = "Palm Reader 분석 결과 보기";
        } else {
            elements.analyzeBtn.disabled = true;
            elements.analyzeBtn.textContent = "양손 사진이 필요합니다 (인식된 손: " + count + ")";
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
        ctx.drawImage(img, 0, 0);

        if (window.drawConnectors && window.drawLandmarks) {
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {color: '#ffffff', lineWidth: 2});
            drawLandmarks(ctx, landmarks, {color: '#ffffff', lineWidth: 1, radius: 3});
        }

        const drawPalmLine = (points, color, label) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 28; // Increased significantly
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            
            ctx.moveTo(points[0].x * canvas.width, points[0].y * canvas.height);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x * canvas.width, points[i].y * canvas.height);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Highly Visible Label
            const text = label;
            ctx.font = "bold 65px Pretendard"; // Much larger font
            const textWidth = ctx.measureText(text).width;
            const x = points[0].x * canvas.width;
            const y = points[0].y * canvas.height - 40;
            
            // Text Background with higher contrast
            ctx.fillStyle = color;
            ctx.fillRect(x - 15, y - 60, textWidth + 30, 80);
            
            // White text for maximum contrast
            ctx.fillStyle = "#ffffff";
            ctx.fillText(text, x, y);

            // Add a small border to the label box
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 15, y - 60, textWidth + 30, 80);
        };

        drawPalmLine([landmarks[5], landmarks[2], landmarks[1], landmarks[0]], '#ff4757', '생명선');
        drawPalmLine([landmarks[5], landmarks[9], landmarks[13], landmarks[17]], '#2ed573', '두뇌선');
        const heartPoints = [landmarks[17], landmarks[13], landmarks[9], landmarks[5]].map(p => ({x: p.x, y: p.y * 0.96}));
        drawPalmLine(heartPoints, '#ffa502', '감정선');
        drawPalmLine([landmarks[0], landmarks[9], landmarks[12]], '#1e90ff', '운명선');
    }

    const palmReadings = {
        life: {
            name: "생명선 (Life Line)",
            color: "#ff4757",
            pri: ["강인한 생명력과 에너지가 넘치는 체질을 타고났습니다.", "안정적이고 차분한 신체적 기초를 가지고 있습니다.", "섬세한 감각과 높은 환경 적응력을 바탕으로 한 생명력을 지녔습니다."],
            sec: ["꾸준한 자기 관리와 건강한 생활 습관으로 활력이 더욱 강화되고 있습니다.", "현재 에너지가 매우 조화로운 상태이며, 삶에 대한 의지가 매우 높습니다.", "규칙적인 루틴을 통해 신체적 안정감이 최고조에 달해 있는 상태입니다."]
        },
        head: {
            name: "두뇌선 (Head Line)",
            color: "#2ed573",
            pri: ["논리적이고 명확한 사고방식을 바탕으로 지적인 잠재력이 매우 높습니다.", "창의적이고 직관적인 감각을 타고나 예술적 재능이 돋보입니다.", "신중하고 분석적인 기질로 학문적 탐구심이 강한 지성인입니다."],
            sec: ["현실적인 문제 해결 능력이 탁월해져 사회적으로 지혜로운 판단을 내리고 있습니다.", "학습과 경험을 통해 축적된 전문성이 현재 빛을 발하고 있는 시기입니다.", "유연한 사고와 빠른 판단력으로 복잡한 상황도 명쾌하게 정리하고 계십니다."]
        },
        heart: {
            name: "감정선 (Heart Line)",
            color: "#ffa502",
            pri: ["따뜻하고 배려심 깊은 성품으로 타인에게 긍정적인 영향을 줍니다.", "독립적이고 주관이 뚜렷해 자신만의 확고한 가치관과 애정관을 지녔습니다.", "섬세하고 감수성이 풍부하여 타인의 감정에 깊이 공감할 줄 아는 따뜻한 분입니다."],
            sec: ["성숙하고 안정적인 대인관계 능력을 갖추어 신뢰받는 사람이 되고 있습니다.", "자신을 아끼고 사랑할 줄 아는 건강한 자아가 현재 관계를 더욱 빛나게 합니다.", "포용력 있는 리더십과 깊은 이해심으로 조화로운 인간관계를 이끌어가고 계십니다."]
        },
        fate: {
            name: "운명선 (Fate Line)",
            color: "#1e90ff",
            pri: ["뚜렷한 목표 의식과 개척 정신으로 성공을 향한 의지가 강합니다.", "안정적인 환경에서 자신의 재능을 꾸준히 발휘하며 성장할 운을 지녔습니다.", "자유롭고 창의적인 길을 추구하여 자신만의 독보적인 영역을 개척할 기질입니다."],
            sec: ["성실함과 노력이 겹쳐져 사회적 신뢰와 명망이 두터워지고 있는 시기입니다.", "새로운 도약을 위한 강력한 운의 흐름이 시작되어 미래가 매우 기대됩니다.", "목표를 향한 정진이 결실을 맺어가는 과정에 있으며 성취감이 높은 상태입니다."]
        }
    };

    elements.analyzeBtn.addEventListener('click', () => {
        const gender = document.querySelector('input[name="gender"]:checked').value;
        const age = parseInt(elements.ageInput.value);
        
        elements.analyzeBtn.disabled = true;
        elements.resultDiv.innerHTML = `<div style="text-align: center; padding: 4rem;"><div class="loader"></div><p>데이터 대조 분석 중...</p></div>`;

        setTimeout(() => {
            const role = gender === 'male' ? { pri: "왼손(선천)", sec: "오른손(후천)" } : { pri: "오른손(선천)", sec: "왼손(후천)" };
            
            let html = `<h2>Palm Reader 분석 리포트</h2>`;
            html += `<div class="summary-card">
                        <p><strong>사용자:</strong> ${gender === 'male' ? '남성' : '여성'} / 만 ${age}세</p>
                        <p>사용자님은 <strong>${role.pri}</strong>의 재능을 기반으로 <strong>${role.sec}</strong>의 노력을 통해 독창적인 운명을 개척하고 계십니다.</p>
                     </div>
                     <div class="reading-grid">`;

            Object.keys(palmReadings).forEach(key => {
                const line = palmReadings[key];
                html += `
                <div class="reading-card">
                    <h3 style="color: ${line.color}">${line.name}</h3>
                    <p><span class="line-label" style="background: ${line.color}22; color: ${line.color};">${role.pri}</span> ${line.pri[Math.floor(Math.random() * 3)]}</p>
                    <p><span class="line-label" style="background: ${line.color}22; color: ${line.color};">${role.sec}</span> ${line.sec[Math.floor(Math.random() * 3)]}</p>
                </div>`;
            });

            html += `</div>`;
            html += `
                <div class="advice-section">
                    <div class="total-review-box">
                        <h3>📋 AI 총평</h3>
                        <p>${age >= 30 ? '현재는 그동안 쌓아온 노력이 결실을 맺어가는 중요한 안정기에 접어들었습니다.' : '지금은 타고난 재능을 실전에서 갈고 닦으며 무궁무진한 가능성을 확장해가는 시기입니다.'} 전반적으로 선의 흐름이 매우 조화로우며 에너지가 긍정적인 방향으로 집중되어 있습니다.</p>
                    </div>
                    <div class="destiny-advice-box">
                        <h3>🔮 운명 조언</h3>
                        <p>사용자님의 손금은 '꾸준함'과 '지혜'가 가장 큰 자산임을 보여줍니다. 
                        특히 운명선의 흐름이 곧아 본인의 의지가 주변 환경을 변화시키는 힘이 강합니다. 
                        스스로의 선택을 믿고 나아가신다면 더욱 빛나는 미래를 맞이하실 것입니다.</p>
                    </div>
                </div>
            `;

            elements.resultDiv.innerHTML = html;
            elements.analyzeBtn.disabled = false;
            elements.resultDiv.scrollIntoView({ behavior: 'smooth' });
        }, 2500);
    });
});
