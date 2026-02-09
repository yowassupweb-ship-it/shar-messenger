export const getWeekDays = (startDate: Date) => {
  const days = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay() + 1);
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
};

export const formatDateKey = (date: Date) => {
  return date.toISOString().split('T')[0];
};

export const getCalendarDays = (currentMonth: Date) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const days: { date: Date; isCurrentMonth: boolean }[] = [];
  
  // Дни предыдущего месяца
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push({ date, isCurrentMonth: false });
  }
  
  // Дни текущего месяца
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  
  // Дни следующего месяца
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }
  
  return days;
};

export const goToPreviousWeek = (currentWeekStart: Date, setCurrentWeekStart: (date: Date) => void) => {
  const newDate = new Date(currentWeekStart);
  newDate.setDate(newDate.getDate() - 7);
  setCurrentWeekStart(newDate);
};

export const goToNextWeek = (currentWeekStart: Date, setCurrentWeekStart: (date: Date) => void) => {
  const newDate = new Date(currentWeekStart);
  newDate.setDate(newDate.getDate() + 7);
  setCurrentWeekStart(newDate);
};

export const goToCurrentWeek = (setCurrentWeekStart: (date: Date) => void) => {
  const now = new Date();
  now.setDate(now.getDate() - now.getDay() + 1);
  now.setHours(0, 0, 0, 0);
  setCurrentWeekStart(now);
};

export const goToPreviousMonth = (currentMonth: Date, setCurrentMonth: (date: Date) => void) => {
  const newDate = new Date(currentMonth);
  newDate.setMonth(newDate.getMonth() - 1);
  setCurrentMonth(newDate);
};

export const goToNextMonth = (currentMonth: Date, setCurrentMonth: (date: Date) => void) => {
  const newDate = new Date(currentMonth);
  newDate.setMonth(newDate.getMonth() + 1);
  setCurrentMonth(newDate);
};

export const goToCurrentMonth = (setCurrentMonth: (date: Date) => void) => {
  setCurrentMonth(new Date());
};
