document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const elements = {
        themeToggle: document.getElementById('themeToggle'),
        analyzeBtn: document.getElementById('analyzeBtn'),
        resultDiv: document.getElementById('result'),
        ageInput: document.getElementById('age'),
        canvasLeft: document.getElementById('canvasLeft'),
        canvasRight: document.getElementById('canvasRight'),
        previewLeft: document.getElementById('previewLeft'),
        previewRight: document.getElementById('previewRight'),
        resetBtn: document.getElementById('resetBtn'),
        cameraModal: document.getElementById('cameraModal'),
        closeModal: document.querySelector('.close-modal'),
        video: document.getElementById('video'),
        captureBtn: document.getElementById('captureBtn')
    };

    let processedHands = { left: null, right: null };
    let stream = null;

    // --- MediaPipe Hands Setup ---
    let hands = null;
    try {
        if (typeof Hands !== 'undefined') {
            hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            hands.onResults((results) => {
                if (window._pendingImg) {
                    const img = window._pendingImg;
                    let landmarks = null;
                    let detectedHandedness = 'left';

                    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                        landmarks = results.multiHandLandmarks[0];
                        if (results.multiHandedness && results.multiHandedness.length > 0) {
                            const label = results.multiHandedness[0].label;
                            detectedHandedness = label === 'Left' ? 'right' : 'left';
                        }
                    }

                    const finalHandedness = window._targetHand || detectedHandedness;
                    processedHands[finalHandedness] = { img, landmarks };
                    delete window._pendingImg;
                }
                if (window._processResolver) {
                    window._processResolver();
                    delete window._processResolver;
                }
            });
        }
    } catch (e) {
        console.error("MediaPipe Hands failed to initialize:", e);
    }

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

    // --- Reset Logic ---
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', () => {
            if (confirm('모든 분석 자료를 지우고 처음부터 다시 시작하시겠습니까?')) {
                processedHands = { left: null, right: null };
                window._pendingImg = null;
                window._targetHand = null;
                
                clearCanvas(elements.canvasLeft);
                clearCanvas(elements.canvasRight);
                elements.previewLeft.style.display = 'flex';
                elements.previewRight.style.display = 'flex';
                
                elements.ageInput.value = "25";
                const maleRadio = document.querySelector('input[name="gender"][value="male"]');
                if (maleRadio) maleRadio.checked = true;
                
                elements.resultDiv.innerHTML = "";
                updateAnalysisUI();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // --- Camera & Upload Logic ---
    const openCamera = async (targetHand = null) => {
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const constraints = { 
                video: { 
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            };
            
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (e) {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }

            elements.video.srcObject = stream;
            elements.video.onloadedmetadata = () => {
                elements.video.play().catch(err => console.error("Auto-play failed:", err));
            };
            
            if (targetHand) {
                window._targetHand = targetHand;
                elements.captureBtn.textContent = targetHand === 'left' ? "📸 왼손 촬영" : "📸 오른손 촬영";
            }
            elements.cameraModal.style.display = 'flex';
        } catch (err) {
            console.error("Camera access error:", err);
            alert('카메라에 접근할 수 없습니다. 권한을 확인해주시거나 파일을 업로드해주세요.');
        }
    };

    // 사진 박스 클릭 처리
    document.querySelectorAll('.canvas-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', (e) => {
            // 이미지가 이미 처리된 경우 재촬영/재업로드 여부 확인
            const hand = wrapper.dataset.hand;
            
            const choice = confirm(`${hand === 'left' ? '왼손' : '오른손'} 사진을 추가하시겠습니까?\n\n[확인] 카메라 촬영 / [취소] 파일 업로드`);
            
            if (choice) {
                openCamera(hand);
            } else {
                const input = wrapper.querySelector('.hidden-file-input');
                input.click();
            }
        });

        // 파일 입력 변경 처리
        const fileInput = wrapper.querySelector('.hidden-file-input');
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            elements.analyzeBtn.disabled = true;
            elements.analyzeBtn.textContent = "AI 분석 중...";
            
            window._targetHand = wrapper.dataset.hand;
            await processImage(file);
            updateAnalysisUI();
            fileInput.value = ""; // 초기화
        });
    });

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        elements.cameraModal.style.display = 'none';
        window._targetHand = null;
    };

    if (elements.closeModal) {
        elements.closeModal.addEventListener('click', stopCamera);
    }
    window.addEventListener('click', (e) => { if (e.target === elements.cameraModal) stopCamera(); });

    elements.captureBtn.addEventListener('click', () => {
        elements.captureBtn.textContent = "⌛ 저장 중...";
        elements.captureBtn.disabled = true;

        const canvas = document.createElement('canvas');
        canvas.width = elements.video.videoWidth;
        canvas.height = elements.video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(elements.video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(async (blob) => {
            const file = new File([blob], `capture_${Date.now()}.png`, { type: 'image/png' });
            await processImage(file);
            updateAnalysisUI();
            
            elements.captureBtn.textContent = "✅ 저장 완료!";
            setTimeout(() => {
                elements.captureBtn.disabled = false;
                stopCamera();
            }, 1000);
        }, 'image/png');
    });

    async function processImage(file) {
        if (!file.type.startsWith('image/')) return;

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const img = new Image();
                img.onload = async () => {
                    window._pendingImg = img;
                    window._processResolver = resolve;
                    try {
                        if (hands) {
                            await hands.send({ image: img });
                        } else {
                            processedHands[window._targetHand || 'left'] = { img, landmarks: null };
                            resolve();
                        }
                    } catch (error) {
                        console.error("Hands.send failed:", error);
                        resolve();
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function updateAnalysisUI() {
        if (processedHands.left) {
            drawHandSkeletonAndLines(elements.canvasLeft, processedHands.left);
            elements.previewLeft.style.display = 'none';
        } else {
            elements.previewLeft.style.display = 'flex';
        }
        
        if (processedHands.right) {
            drawHandSkeletonAndLines(elements.canvasRight, processedHands.right);
            elements.previewRight.style.display = 'none';
        } else {
            elements.previewRight.style.display = 'flex';
        }

        const count = Object.values(processedHands).filter(v => v).length;
        if (count >= 2) {
            elements.analyzeBtn.disabled = false;
            elements.analyzeBtn.textContent = "Palm Reader 분석 결과 보기";
        } else {
            elements.analyzeBtn.disabled = true;
            elements.analyzeBtn.textContent = "양손 사진을 모두 올려주세요";
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

        const mpDrawing = window;
        const mpHands = window;

        if (landmarks && mpDrawing.drawConnectors && mpDrawing.drawLandmarks && mpHands.HAND_CONNECTIONS) {
            mpDrawing.drawConnectors(ctx, landmarks, mpHands.HAND_CONNECTIONS, {color: '#ffffff', lineWidth: 2});
            mpDrawing.drawLandmarks(ctx, landmarks, {color: '#ffffff', lineWidth: 1, radius: 3});
        }

        const drawPalmLine = (points, color, label) => {
            if (!points || points.length < 2) return;
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowBlur = 6;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            
            ctx.moveTo(points[0].x * canvas.width, points[0].y * canvas.height);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x * canvas.width, points[i].y * canvas.height);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            const text = label;
            ctx.font = "bold 20px Pretendard";
            const textWidth = ctx.measureText(text).width;
            const x = points[0].x * canvas.width;
            const y = points[0].y * canvas.height - 15;
            
            ctx.fillStyle = color;
            ctx.fillRect(x - 5, y - 20, textWidth + 10, 28);
            
            ctx.fillStyle = "#ffffff";
            ctx.fillText(text, x, y);

            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.strokeRect(x - 5, y - 20, textWidth + 10, 28);
        };

        if (landmarks) {
            drawPalmLine([landmarks[5], landmarks[2], landmarks[1], landmarks[0]], '#ff4757', '생명선');
            drawPalmLine([landmarks[5], landmarks[9], landmarks[13], landmarks[17]], '#2ed573', '두뇌선');
            const heartPoints = [landmarks[17], landmarks[13], landmarks[9], landmarks[5]].map(p => ({x: p.x, y: p.y * 0.96}));
            drawPalmLine(heartPoints, '#ffa502', '감정선');
            drawPalmLine([landmarks[0], landmarks[9], landmarks[12]], '#1e90ff', '운명선');
        }
    }

    const palmReadings = {
        life: {
            name: "🌱 생명선 (Life Line)",
            color: "#ff4757",
            pri: [
                "생명선이 길고 뚜렷하여 타고난 생명력이 매우 강하십니다. 지금의 활력을 잘 관리하신다면 장차 큰 일을 도모하실 에너지가 충분합니다.",
                "생명선의 흐름이 아주 유연하네요! 에너지가 너무 넘쳐서 가끔은 주변 사람들이 따라가기 힘들 정도니, 가끔은 느긋한 휴식을 가져보세요.",
                "생명선에서 뻗어나온 지선들이 긍정적인 변화를 암시합니다. 지금의 건강한 습관을 유지하시면 향후 몇 년 이내에 인생의 전성기를 맞이하실 거예요.",
                "생명선이 손목까지 시원하게 뻗어 있어 기본 체력이 탄탄합니다. 지금의 성실성을 유지하면 향후 몇 년 이내 큰 재물운이 들어오는 손금입니다.",
                "강인한 생명력과 에너지가 넘치는 체질을 타고나셨습니다. 에너지가 너무 넘쳐서 가끔은 휴식이 필요할 정도네요!"
            ],
            sec: [
                "꾸준한 자기 관리와 건강한 생활 습관으로 활력이 더욱 강화되고 있습니다. 생명선이 길어서 아주 건강한 흐름을 보이고 계시네요.",
                "현재 에너지가 매우 조화로운 상태이며, 삶에 대한 의지가 매우 높습니다. 이 흐름을 유지하시면 신체적 안정감이 최고조에 달할 것입니다.",
                "규칙적인 루틴을 통해 다져진 내공이 생명선에 잘 나타나 있습니다. 본인의 리듬을 믿고 나아가하시면 장수와 복을 동시에 누리실 겁니다.",
                "생명선의 색택이 좋아 현재 컨디션이 최상임을 나타냅니다. 무리하지 않고 지금처럼만 관리하신다면 무병장수할 기운이 가득합니다.",
                "섬세한 감각과 높은 환경 적응력을 바탕으로 한 생명력을 지녔습니다. 가끔은 자신을 위한 보상의 시간을 갖는 것이 운을 더 높여줄 것입니다."
            ]
        },
        head: {
            name: "🧠 두뇌선 (Head Line)",
            color: "#2ed573",
            pri: [
                "두뇌선이 곧게 뻗어 있어 논리적 판단력이 매우 탁월하시군요. 이 명석함을 잘 활용하시면 조만간 전문 분야에서 큰 성취를 거두실 손금입니다.",
                "두뇌선의 끝이 살짝 올라가 창의성이 돋보입니다. 생각이 너무 많아 가끔은 머리가 복잡할 정도니, 가끔은 명상으로 마음을 비워주는 것도 좋겠네요.",
                "두뇌선과 생명선의 시작점이 조화로워 지혜로운 결단력을 지녔습니다. 본인의 직관을 믿고 정진하시면 기대 이상의 재물운이 따를 것입니다.",
                "명확한 사고방식을 바탕으로 지적인 잠재력이 매우 높습니다. 두뇌선이 선명하여 지혜로운 판단을 내리는 데 최적의 조건을 갖추셨네요.",
                "학문적 탐구심이 강한 지성인의 면모가 두뇌선에 잘 드러납니다. 지금처럼 지적 호기심을 유지하시면 사회적 지위가 크게 상승할 것입니다."
            ],
            sec: [
                "현실적인 문제 해결 능력이 탁월해져 사회적으로 지혜로운 판단을 내리고 있습니다. 두뇌선의 흐름이 아주 영리하게 발달했네요.",
                "학습과 경험을 통해 축적된 전문성이 현재 빛을 발하고 있는 시기입니다. 본인의 지식을 아낌없이 나누면 더 큰 운이 돌아올 것입니다.",
                "유연한 사고와 빠른 판단력으로 복잡한 상황도 명쾌하게 정리하고 계십니다. 두뇌선이 힘 있게 뻗어 있어 미래를 설계하는 능력이 출중합니다.",
                "창의적이고 직관적인 감각이 현재 하시는 일에 큰 도움이 될 것입니다. 가끔은 직관에 몸을 맡겨보는 것도 새로운 기회를 만드는 방법입니다.",
                "분석적인 기질이 강화되어 실수를 줄이고 완벽을 기하고 계시네요. 너무 완벽을 추구하다 보면 피로할 수 있으니 여유를 가져보세요."
            ]
        },
        heart: {
            name: "❤️ 감정선 (Heart Line)",
            color: "#ffa502",
            pri: [
                "감정선이 검지 방향으로 완만하게 곡선을 그리며 따뜻한 인품을 보여줍니다. 지금처럼 진심을 다하신다면 주변에 좋은 사람들이 구름처럼 모여들 거예요.",
                "감정선이 아주 섬세하게 발달하여 공감 능력이 뛰어납니다. 가끔은 타인의 감정에 너무 깊이 몰입할 수 있으니, 자신을 돌보는 시간도 꼭 챙겨주세요!",
                "감정선에서 솟아오른 작은 선들이 행운을 부르고 있네요. 밝은 미소를 유지하신다면 대인관계를 통해 예기치 못한 큰 기회를 잡으실 손금입니다.",
                "독립적이고 주관이 뚜렷해 자신만의 확고한 가치관을 지녔습니다. 감정선이 깔끔하여 복잡한 인간관계 속에서도 본인의 중심을 잘 잡으시네요.",
                "따뜻하고 배려심 깊은 성품으로 타인에게 긍정적인 영향을 줍니다. 감정선이 풍부하여 사랑이 넘치는 삶을 사실 운명입니다."
            ],
            sec: [
                "성숙하고 안정적인 대인관계 능력을 갖추어 신뢰받는 사람이 되고 있습니다. 감정선이 안정적이라 정서적 풍요로움을 만끽하시겠네요.",
                "자신을 아끼고 사랑할 줄 아는 건강한 자아가 현재 관계를 더욱 빛나게 합니다. 지금처럼 본인의 매력을 마음껏 발산해보세요.",
                "포용력 있는 리더십과 깊은 이해심으로 조화로운 인간관계를 이끌어가고 계십니다. 감정선의 끝이 좋아 말년운도 매우 따뜻할 것입니다.",
                "섬세한 감수성이 예술적 영감으로 이어지고 있습니다. 본인의 감정을 창의적으로 표현해본다면 삶의 만족도가 더욱 높아질 것입니다.",
                "타인의 감정을 어루만지는 능력이 탁월하여 주변의 인기를 독차지하고 계시네요. 가끔은 거절하는 용기를 내는 것도 자신을 지키는 길입니다."
            ]
        },
        fate: {
            name: "🚀 운명선 (Fate Line)",
            color: "#1e90ff",
            pri: [
                "운명선이 손바닥 중앙을 관통하며 강한 의지를 보여줍니다. 지금의 성실성을 꾸준히 밀고 나가하시면 향후 몇 년 이내에 큰 재물운과 명예가 들어올 손금입니다.",
                "운명선의 흐름이 독창적이라 자신만의 길을 개척하는 힘이 강하시네요. 추진력이 너무 좋아서 가끔은 속도 조절이 필요할 정도니 천천히 주변을 살피며 나아가보세요.",
                "운명선과 지능선의 만남이 절묘하여 사업적 수완이 엿보입니다. 현재 계획하고 계신 일을 차분히 실행하시면 경제적 자유를 얻으실 가능성이 매우 높습니다.",
                "뚜렷한 목표 의식과 개척 정신으로 성공을 향한 의지가 강합니다. 운명선이 굵게 솟아 있어 스스로의 힘으로 운명을 바꾸고 계시네요.",
                "안정적인 환경에서 자신의 재능을 꾸준히 발휘하며 성장할 운을 지녔습니다. 지금의 평온함을 소중히 여기하시면 더 큰 행운이 찾아올 것입니다."
            ],
            sec: [
                "성실함과 노력이 겹쳐져 사회적 신뢰와 명망이 두터워지고 있는 시기입니다. 운명선이 뚜렷하여 하시는 일마다 결실을 맺겠습니다.",
                "새로운 도약을 위한 강력한 운의 흐름이 시작되어 미래가 매우 기대됩니다. 운명선의 지선들이 번영을 예고하고 있네요.",
                "목표를 향한 정진이 결실을 맺어가는 과정에 있으며 성취감이 높은 상태입니다. 운명선이 선명하여 탄탄대로를 걷게 될 운명입니다.",
                "자유롭고 창의적인 길을 추구하여 자신만의 독보적인 영역을 개척하고 계시네요. 현재의 독창성을 잃지 않는다면 큰 명성을 얻으실 것입니다.",
                "예기치 못한 귀인의 도움으로 운세가 급격히 상승할 기운이 보입니다. 운명선이 주변과 잘 어우러져 인복이 아주 많으시군요."
            ]
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
                    <p><span class="line-label" style="background: ${line.color}22; color: ${line.color};">${role.pri}</span> ${line.pri[Math.floor(Math.random() * line.pri.length)]}</p>
                    <p><span class="line-label" style="background: ${line.color}22; color: ${line.color};">${role.sec}</span> ${line.sec[Math.floor(Math.random() * line.sec.length)]}</p>
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
