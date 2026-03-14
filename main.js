document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const elements = {
        themeToggle: document.getElementById('themeToggle'),
        analyzeBtn: document.getElementById('analyzeBtn'),
        resultDiv: document.getElementById('result'),
        ageInput: document.getElementById('age'),
        palmLeft: document.getElementById('palmImageLeft'),
        palmRight: document.getElementById('palmImageRight'),
        previewLeft: document.getElementById('previewLeft'),
        previewRight: document.getElementById('previewRight'),
        dropZoneLeft: document.getElementById('dropZoneLeft'),
        dropZoneRight: document.getElementById('dropZoneRight')
    };

    let files = { left: null, right: null };

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

    // --- Image Preview & File Handling ---
    function handleFileSelection(file, side) {
        if (!file || !file.type.startsWith('image/')) return;
        files[side] = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            elements[`preview${side.charAt(0).toUpperCase() + side.slice(1)}`].innerHTML = 
                `<img src="${e.target.result}" alt="${side} Palm">`;
        };
        reader.readAsDataURL(file);
    }

    elements.palmLeft.addEventListener('change', (e) => handleFileSelection(e.target.files[0], 'left'));
    elements.palmRight.addEventListener('change', (e) => handleFileSelection(e.target.files[0], 'right'));

    // --- Drag and Drop ---
    ['Left', 'Right'].forEach(side => {
        const zone = elements[`dropZone${side}`];
        const input = elements[`palmImage${side}`];
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eName => {
            zone.addEventListener(eName, (e) => { e.preventDefault(); e.stopPropagation(); });
        });

        ['dragenter', 'dragover'].forEach(eName => {
            zone.addEventListener(eName, () => zone.classList.add('drag-over'));
        });

        ['dragleave', 'drop'].forEach(eName => {
            zone.addEventListener(eName, () => zone.classList.remove('drag-over'));
        });

        zone.addEventListener('drop', (e) => {
            handleFileSelection(e.dataTransfer.files[0], side.toLowerCase());
        });
    });

    // --- Analysis Logic ---
    const palmData = {
        life: {
            name: "생명선 (Life Line)",
            desc: "건강, 활력, 그리고 삶의 전반적인 에너지를 나타냅니다."
        },
        head: {
            name: "두뇌선 (Head Line)",
            desc: "지성, 사고방식, 그리고 집중력을 상징합니다."
        },
        heart: {
            name: "감정선 (Heart Line)",
            desc: "감수성, 대인관계, 그리고 애정관을 보여줍니다."
        },
        fate: {
            name: "운명선 (Fate Line)",
            desc: "직업적 성취, 책임감, 그리고 삶의 목표의식을 나타냅니다."
        }
    };

    const interpretations = {
        male: { primary: "왼손(선천)", secondary: "오른손(후천)" },
        female: { primary: "오른손(선천)", secondary: "왼손(후천)" }
    };

    elements.analyzeBtn.addEventListener('click', () => {
        if (!files.left || !files.right) {
            elements.resultDiv.innerHTML = '<p style="color: #e74c3c; font-weight: bold; text-align:center;">⚠️ 분석을 위해 양손(왼손, 오른손) 사진을 모두 업로드해주세요!</p>';
            return;
        }

        const gender = document.querySelector('input[name="gender"]:checked').value;
        const age = parseInt(elements.ageInput.value);
        const role = interpretations[gender];

        elements.analyzeBtn.disabled = true;
        elements.resultDiv.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p><strong>${gender === 'male' ? '남성' : '여성'} / 만 ${age}세</strong>의 양손 데이터를 대조 분석 중입니다...</p>
                <div class="loader"></div>
            </div>
        `;

        setTimeout(() => {
            let html = `<h2>✨ 양손 종합 분석 결과</h2>`;
            html += `<p class="summary">사용자님은 <strong>${role.primary}</strong>의 타고난 기질과 <strong>${role.secondary}</strong>의 후천적 노력이 조화롭게 나타나고 있습니다.</p>`;

            // Key comparative analysis
            const agePoint = age >= 30 ? "현재 사용자님은 후천적 노력이 운명에 더 큰 영향을 미치는 시기에 있습니다." : "현재 사용자님은 타고난 재능을 바탕으로 미래를 설계해 나가는 시기에 있습니다.";
            html += `<p class="age-insight">💡 <strong>연령 분석:</strong> 만 ${age}세, ${agePoint}</p>`;

            for (const key in palmData) {
                html += `
                <div class="reading-card" style="margin-bottom: 2rem; border-left: 4px solid var(--accent-color); padding-left: 1.5rem; background: rgba(0,0,0,0.02); padding: 1rem; border-radius: 0 10px 10px 0;">
                    <h3 style="margin-top: 0; color: var(--accent-color);">${palmData[key].name}</h3>
                    <p><strong>${role.primary}:</strong> 당신은 본래 ${getRandomInsight(key, 'congenital')} 성향을 타고났습니다.</p>
                    <p><strong>${role.secondary}:</strong> 현재는 노력을 통해 ${getRandomInsight(key, 'acquired')} 모습으로 발전하고 있습니다.</p>
                    <p style="font-size: 0.9rem; opacity: 0.8; margin-top: 0.5rem;">🔍 <em>분석: ${palmData[key].desc}</em></p>
                </div>`;
            }

            html += `
            <div class="final-advice" style="margin-top: 3rem; padding: 1.5rem; background: var(--accent-color); color: white; border-radius: 12px; text-align:center;">
                <h3 style="margin-top:0;">🌟 종합 조언</h3>
                <p>선천적으로 가진 뛰어난 지적 능력(두뇌선)을 후천적인 실행력(운명선)으로 잘 보완하고 계십니다. 
                특히 감정선의 흐름이 양손 모두 안정적이어서 대인관계에서의 성공이 예상됩니다.</p>
            </div>
            <p style="font-size: 0.8rem; opacity: 0.6; text-align: center; margin-top: 2rem;">* 본 분석은 AI의 가상 분석 결과이며, 참고용으로만 활용하시기 바랍니다. 운명은 당신의 선택으로 바뀝니다.</p>
            `;

            elements.resultDiv.innerHTML = html;
            elements.analyzeBtn.disabled = false;
            elements.resultDiv.scrollIntoView({ behavior: 'smooth' });
        }, 3000);
    });

    function getRandomInsight(key, type) {
        const insights = {
            life: {
                congenital: ["강인한 생명력과 활기", "안정적이고 차분한 에너지", "감수성이 풍부하고 섬세한 건강"],
                acquired: ["꾸준한 관리로 다져진 활력", "현재 매우 의욕적인 상태", "휴식이 필요한 집중된 에너지"]
            },
            head: {
                congenital: ["논리적이고 명확한 판단력", "창의적이고 직관적인 사고", "신중하고 분석적인 기질"],
                acquired: ["실용적이고 현실적인 해결 능력", "학습을 통한 전문성 확보", "복합적인 문제를 푸는 유연함"]
            },
            heart: {
                congenital: ["정열적이고 솔직한 감정", "배려심 깊고 온화한 성품", "독립적이고 주관이 뚜렷한 애정관"],
                acquired: ["안정적인 관계 유지 능력", "포용력 있는 성숙한 감정", "자신을 사랑할 줄 아는 건강한 마음"]
            },
            fate: {
                congenital: ["뚜렷한 목표 의식과 책임감", "자유롭고 구애받지 않는 성취욕", "안정적인 환경에서의 성공운"],
                acquired: ["개척 정신을 통한 새로운 기회", "성실함으로 쌓아 올린 신뢰", "전환기를 맞이한 강력한 변화의 에너지"]
            }
        };
        const list = insights[key][type];
        return list[Math.floor(Math.random() * list.length)];
    }
});