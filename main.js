document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const palmImage = document.getElementById('palmImage');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const resultDiv = document.getElementById('result');
    const themeToggle = document.getElementById('themeToggle');

    // Theme Management
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    });

    // Image Preview logic
    palmImage.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreviewContainer.innerHTML = `<img src="${e.target.result}" alt="Palm Preview">`;
            }
            reader.readAsDataURL(file);
        }
    });

    const palmReadings = {
        destiny: "<b>운명선 (Line of Destiny):</b> 당신은 강한 자아와 독립심을 가지고 있습니다. 사회적인 성공에 대한 열망이 크며, 어떠한 난관도 스스로 극복하려는 의지가 돋보입니다. 30대 중반 이후에 큰 전환점이 올 것으로 보입니다.",
        fortune: "<b>행운선 (Line of Success):</b> 당신의 인생에는 귀인의 도움이 따릅니다. 타인과의 소통 능력이 뛰어나며, 이를 통해 예상치 못한 기회를 잡게 될 것입니다. 특히 예술적인 감각이나 창의적인 분야에서 두각을 나타낼 가능성이 높습니다.",
        wealth: "<b>재물선 (Line of Wealth):</b> 초년에는 노력이 필요하지만, 중년 이후부터는 재물이 모이는 운세입니다. 꼼꼼한 관리 능력을 바탕으로 자산을 안정적으로 구축할 수 있습니다. 무리한 투자보다는 내실을 다지는 것이 좋습니다.",
        health: "<b>건강선 (Line of Health):</b> 기본적으로 생명력이 넘치는 타입입니다. 하지만 두뇌 회전이 빨라 정신적인 피로도가 높을 수 있으니 충분한 휴식과 명상이 필요합니다. 소화기 계통의 건강을 평소에 잘 챙기는 것이 중요합니다.",
        heart: "<b>감정선 (Heart Line):</b> 당신은 매우 섬세하고 따뜻한 마음의 소유자입니다. 사랑과 관계를 중요하게 여기며, 주변 사람들에게 헌신적인 태도를 보입니다. 때로는 자신의 감정을 너무 억제하지 말고 솔직하게 표현하는 것이 좋습니다."
    };

    analyzeBtn.addEventListener('click', () => {
        if (palmImage.files.length > 0) {
            analyzeBtn.disabled = true;
            resultDiv.innerHTML = `
                <div style="text-align: center;">
                    <p>AI가 손금의 각도를 계산하고 있습니다...</p>
                    <div class="loader"></div>
                </div>
            `;
            
            setTimeout(() => {
                let readingHTML = '<h2>✨ 손금 분석 결과</h2>';
                readingHTML += '<p>전반적으로 매우 균형 잡힌 손금을 가지고 계시군요. 당신의 잠재력은 무궁무진합니다.</p>';
                for (const line in palmReadings) {
                    readingHTML += `<p style="margin-bottom: 1rem; border-left: 3px solid var(--accent-color); padding-left: 1rem;">${palmReadings[line]}</p>`;
                }
                readingHTML += '<p style="font-style: italic; opacity: 0.8; margin-top: 2rem;">* 이 결과는 재미로 보는 AI 손금 분석입니다. 당신의 운명은 당신의 손안에 있으며, 스스로 개척해 나갈 수 있습니다!</p>';
                resultDiv.innerHTML = readingHTML;
                analyzeBtn.disabled = false;
                
                // Scroll to result
                resultDiv.scrollIntoView({ behavior: 'smooth' });
            }, 2500);
        } else {
            resultDiv.innerHTML = '<p style="color: #e74c3c; font-weight: bold;">⚠️ 손금 사진을 먼저 업로드해주세요!</p>';
        }
    });
});