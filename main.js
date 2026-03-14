
document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const palmImage = document.getElementById('palmImage');
    const resultDiv = document.getElementById('result');

    const palmReadings = {
        destiny: "<b>운명선:</b> 당신은 스스로의 길을 개척해나가는 강한 의지를 가지고 있습니다. 중요한 결정을 내릴 때 신중하되, 한번 결정했다면 끝까지 밀고 나가는 힘이 있습니다.",
        fortune: "<b>행운선:</b> 예상치 못한 곳에서 좋은 기회가 찾아올 것입니다. 새로운 사람들과의 만남을 소중히 여기고, 긍정적인 태도를 유지하는 것이 좋습니다.",
        wealth: "<b>재물선:</b> 재물운은 안정적이지만, 큰 부를 얻기 위해서는 꾸준한 노력이 필요합니다. 지출을 계획적으로 관리하고, 장기적인 안목으로 투자하는 것이 중요합니다.",
        health: "<b>건강선:</b> 전반적으로 건강하지만, 스트레스 관리에 유의해야 합니다. 규칙적인 운동과 균형 잡힌 식단으로 건강을 유지하세요."
    };

    analyzeBtn.addEventListener('click', () => {
        if (palmImage.files.length > 0) {
            resultDiv.innerHTML = '<p>손금을 분석하는 중입니다...</p>';
            setTimeout(() => {
                let readingHTML = '<h2>손금 분석 결과</h2>';
                for (const line in palmReadings) {
                    readingHTML += `<p>${palmReadings[line]}</p>`;
                }
                resultDiv.innerHTML = readingHTML;
            }, 2000);
        } else {
            resultDiv.innerHTML = '<p>손금 사진을 업로드해주세요.</p>';
        }
    });
});
