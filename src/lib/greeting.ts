// 시간대 구간별 환영 문구 — 나중에 카피만 바꾸기 쉽게 상수로 분리 ({familyName} 치환)
const GREETING_TEMPLATES = [
  { startHour: 5,  endHour: 10, text: '좋은 아침이에요, {familyName}' },
  { startHour: 11, endHour: 16, text: '{familyName}, 오늘 하루도 평안하시길' },
  { startHour: 17, endHour: 21, text: '하루 마무리 잘 하고 계신가요, {familyName}' },
  { startHour: 22, endHour: 4,  text: '이 시간까지 깨어 계셨네요, {familyName}. 오늘 하루도 고생 많으셨어요' },
] as const

// 현재 시각 기준 시간대 문구에 가족 이름을 넣어 반환 (하나의 함수 = 하나의 역할)
export function getTimeBasedGreeting(familyName: string): string {
  const hour = new Date().getHours()
  // 시작<=끝이면 일반 구간, 아니면 자정을 넘는 구간(22~04시)으로 판정
  const template = GREETING_TEMPLATES.find(t =>
    t.startHour <= t.endHour
      ? hour >= t.startHour && hour <= t.endHour
      : hour >= t.startHour || hour <= t.endHour,
  ) ?? GREETING_TEMPLATES[1]
  return template.text.replace('{familyName}', familyName)
}
