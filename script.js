document.addEventListener('DOMContentLoaded', () => {
    const calendar = document.getElementById('calendar');
    const workingDaysSpan = document.getElementById('working-days');
    const holidayModeButton = document.getElementById('holiday-mode');
    const clearSelectionButton = document.getElementById('clear-selection');
    const hoursPerDayInput = document.getElementById('hours-per-day');

    let startDate = null;
    let endDate = null;
    let isHolidayMode = false;
    let holidays = new Set();
    let holidaysSet = new Set();
    let workingWeekends = new Set(); // Novo Set para armazenar finais de semana que são dias úteis

    let currentYear = new Date().getFullYear();
    const yearDisplay = document.querySelector('.current-year');
    const prevYearButton = document.querySelector('.prev-year');
    const nextYearButton = document.querySelector('.next-year');

    // Função global para comparar datas
    function isSameDate(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    // Calculate Brazilian national holidays
    function calculateNationalHolidays(year) {
        const holidays = new Set();
        
        // Fixed holidays
        holidays.add(`${year}-01-01`); // Confraternização Universal
        holidays.add(`${year}-04-21`); // Dia de Tiradentes
        holidays.add(`${year}-05-01`); // Dia do Trabalho
        holidays.add(`${year}-09-07`); // Dia da Independência do Brasil
        holidays.add(`${year}-10-12`); // Dia de Nossa Senhora Aparecida
        holidays.add(`${year}-11-02`); // Dia de Finados
        holidays.add(`${year}-11-15`); // Dia da Proclamação da República
        holidays.add(`${year}-12-25`); // Natal

        // Calculate Easter Sunday
        const easter = calculateEaster(year);
        
        // Add Easter-related holidays
        const goodFriday = new Date(easter);
        goodFriday.setDate(easter.getDate() - 2); // Sexta-feira da Paixão
        holidays.add(goodFriday.toISOString().split('T')[0]);

        return holidays;
    }

    function calculateMunicipalHolidays(year) {
        const holidays = new Set();
        holidays.add(`${year}-01-25`); // Aniversário de São Paulo
        holidays.add(`${year}-11-20`); // Dia da Consciência Negra

        // Calculate Easter Sunday
        const easter = calculateEaster(year);
        
        // Add Easter-related holidays
        const corpusChristi = new Date(easter);
        corpusChristi.setDate(easter.getDate() + 60); // Corpus Christi
        holidays.add(corpusChristi.toISOString().split('T')[0]);

        return holidays;
    }

    function calculateStateHolidays(year) {
        const holidays = new Set();
        holidays.add(`${year}-07-09`); // Revolução Constitucionalista
        holidays.add(`${year}-11-20`); // Dia da Consciência Negra
        return holidays;
    }

    // Create 12 calendar instances, one for each month
    let calendarInstances = [];

    class Calendar {
        constructor(container, month, year, onSelect) {
            this.container = container;
            this.currentMonth = month;
            this.currentYear = year;
            this.onSelect = onSelect;
            this.render();
        }

        loadHolidays() {
            const year = this.currentYear;
            const nationalHolidays = new Set([
                ...calculateNationalHolidays(year - 1),
                ...calculateNationalHolidays(year),
                ...calculateNationalHolidays(year + 1)
            ]);
            const municipalHolidays = new Set([
                ...calculateMunicipalHolidays(year - 1),
                ...calculateMunicipalHolidays(year),
                ...calculateMunicipalHolidays(year + 1)
            ]);
            const stateHolidays = new Set([
                ...calculateStateHolidays(year - 1),
                ...calculateStateHolidays(year),
                ...calculateStateHolidays(year + 1)
            ]);

            holidaysSet = new Set([...nationalHolidays, ...municipalHolidays, ...stateHolidays, ...holidays]);
            this.render();
        }

        render() {
            // Limpar o container antes de renderizar
            this.container.innerHTML = '';
            
            const year = this.currentYear;
            const month = this.currentMonth;
            
            // Create calendar header
            const header = document.createElement('div');
            header.className = 'calendar-header';
            
            const monthTitle = document.createElement('span');
            monthTitle.className = 'current-month';
            const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                              'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            monthTitle.textContent = `${monthNames[month]}`;
            
            header.appendChild(monthTitle);
            this.container.appendChild(header);
            
            // Create weekdays header
            const weekdays = document.createElement('div');
            weekdays.className = 'weekdays';
            const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            days.forEach(day => {
                const div = document.createElement('div');
                div.textContent = day;
                weekdays.appendChild(div);
            });
            this.container.appendChild(weekdays);
            
            // Create days container
            const daysContainer = document.createElement('div');
            daysContainer.className = 'days';

            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startingDay = firstDay.getDay();

            // Add empty cells for days before the first day of the month
            for (let i = 0; i < startingDay; i++) {
                const emptyDay = document.createElement('div');
                emptyDay.className = 'day disabled';
                daysContainer.appendChild(emptyDay);
            }

            // Add days of the month
            for (let day = 1; day <= lastDay.getDate(); day++) {
                const dayElement = document.createElement('div');
                dayElement.className = 'day';
                dayElement.textContent = day;

                const currentDate = new Date(year, month, day);
                const dateString = currentDate.toISOString().split('T')[0];
                const isWeekend = this.isWeekend(currentDate);
                const isToday = this.isToday(currentDate);
                const isSelected = (startDate && isSameDate(currentDate, startDate)) ||
                                 (endDate && isSameDate(currentDate, endDate));
                const isInRange = this.isInRange(currentDate);
                const isHoliday = this.isHoliday(currentDate);
                const isPersonalHoliday = holidays.has(dateString);
                const isOvertime = (currentDate.getDay() === 0 || currentDate.getDay() === 6) && workingWeekends.has(dateString);

                if (isWeekend) dayElement.classList.add('weekend');
                if (isToday) dayElement.classList.add('today');
                if (isSelected) dayElement.classList.add('selected');
                if (isInRange) dayElement.classList.add('in-range');
                if (isHoliday) {
                    dayElement.classList.add('holiday');
                    if (isPersonalHoliday) {
                        dayElement.classList.add('personal-holiday');
                    }
                }
                if (isOvertime) {
                    dayElement.classList.remove('weekend');
                }

                dayElement.addEventListener('click', () => {
                    if (isHolidayMode) {
                        this.toggleHoliday(currentDate);
                    } else {
                        this.selectDate(new Date(currentDate));
                    }
                });

                daysContainer.appendChild(dayElement);
            }

            // Add empty cells at the end to complete 6 weeks (42 days)
            const totalDays = startingDay + lastDay.getDate();
            const remainingDays = 42 - totalDays;
            for (let i = 0; i < remainingDays; i++) {
                const emptyDay = document.createElement('div');
                emptyDay.className = 'day disabled';
                daysContainer.appendChild(emptyDay);
            }

            this.container.appendChild(daysContainer);
        }

        isInRange(date) {
            if (!startDate || !endDate) return false;
            const dateToCheck = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            const dateToCheckTimestamp = dateToCheck.getTime();
            const startTimestamp = start.getTime();
            const endTimestamp = end.getTime();
            return dateToCheckTimestamp >= startTimestamp && dateToCheckTimestamp <= endTimestamp;
        }

        isHoliday(date) {
            const dateString = date.toISOString().split('T')[0];
            const year = date.getFullYear();
            const nationalHolidays = calculateNationalHolidays(year);
            const municipalHolidays = calculateMunicipalHolidays(year);
            const stateHolidays = calculateStateHolidays(year);
            
            // Se estiver na lista de feriados personalizados
            if (holidays.has(dateString)) {
                // Se for um feriado normal que foi personalizado, retorna false (dia útil)
                if (nationalHolidays.has(dateString) || municipalHolidays.has(dateString) || stateHolidays.has(dateString)) {
                    return false;
                }
                // Se for uma folga, retorna true
                return true;
            }
            
            // Se não estiver na lista de personalizados, verifica se é um feriado normal
            return nationalHolidays.has(dateString) || municipalHolidays.has(dateString) || stateHolidays.has(dateString);
        }

        isWeekend(date) {
            const day = date.getDay();
            const dateString = date.toISOString().split('T')[0];
            return (day === 0 || day === 6) && !workingWeekends.has(dateString);
        }

        toggleHoliday(date) {
            const dateString = date.toISOString().split('T')[0];
            const nationalHolidays = calculateNationalHolidays(date.getFullYear());
            const municipalHolidays = calculateMunicipalHolidays(date.getFullYear());
            const stateHolidays = calculateStateHolidays(date.getFullYear());
            const day = date.getDay();
            const isWeekend = day === 0 || day === 6;
            
            if (isWeekend) {
                // Se for final de semana
                if (workingWeekends.has(dateString)) {
                    workingWeekends.delete(dateString); // Volta a ser final de semana
                    // Se era um feriado que foi convertido para dia útil, restaura o feriado
                    if (nationalHolidays.has(dateString) || municipalHolidays.has(dateString) || stateHolidays.has(dateString)) {
                        holidays.delete(dateString);
                    }
                } else {
                    workingWeekends.add(dateString); // Vira dia útil
                    // Se for um feriado, marca como convertido para dia útil
                    if (nationalHolidays.has(dateString) || municipalHolidays.has(dateString) || stateHolidays.has(dateString)) {
                        holidays.add(dateString);
                    }
                }
            } else {
                // Se for um feriado (nacional, municipal ou estadual)
                if (nationalHolidays.has(dateString) || municipalHolidays.has(dateString) || stateHolidays.has(dateString)) {
                    if (holidays.has(dateString)) {
                        holidays.delete(dateString);
                    } else {
                        holidays.add(dateString);
                    }
                } else if (holidays.has(dateString)) {
                    holidays.delete(dateString);
                } else {
                    holidays.add(dateString);
                }
            }
            
            this.loadHolidays();
            calculateWorkingDays();
        }

        selectDate(date) {
            const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            
            if (!startDate) {
                // Primeira data selecionada
                startDate = selectedDate;
                endDate = null;
            } else if (!endDate) {
                // Segunda data selecionada
                if (selectedDate.getTime() < startDate.getTime()) {
                    endDate = startDate;
                    startDate = selectedDate;
                } else {
                    endDate = selectedDate;
                }
            } else {
                // Nova seleção
                startDate = selectedDate;
                endDate = null;
            }
            
            this.onSelect(date);
            // Atualizar todos os calendários
            calendarInstances.forEach(calendar => calendar.render());
        }

        isToday(date) {
            const today = new Date();
            return isSameDate(date, today);
        }

        clearSelection() {
            startDate = null;
            endDate = null;
            // Limpar feriados personalizados e finais de semana convertidos
            holidays.clear();
            workingWeekends.clear();
            this.loadHolidays();
            this.render();
            // Limpar o contador de dias úteis e horas úteis
            document.getElementById('working-days').textContent = '0';
            document.getElementById('working-hours').textContent = '0';
            document.getElementById('holidays-table-body').innerHTML = '';
            document.getElementById('holidays-list').classList.remove('has-selection');
        }
    }
    
    function updateYear() {
        yearDisplay.textContent = currentYear;
        calendarInstances.forEach((calendar, month) => {
            const container = document.getElementById(`calendar-${month}`);
            container.innerHTML = '';
            calendar.currentYear = currentYear;
            calendar.render();
        });
    }
    
    prevYearButton.addEventListener('click', () => {
        currentYear--;
        updateYear();
    });
    
    nextYearButton.addEventListener('click', () => {
        currentYear++;
        updateYear();
    });
    
    // Modify the initializeCalendars function
    function initializeCalendars() {
        yearDisplay.textContent = currentYear;
        
        for (let month = 0; month < 12; month++) {
            const container = document.getElementById(`calendar-${month}`);
            const calendar = new Calendar(container, month, currentYear, (date) => {
                calculateWorkingDays();
            });
            calendarInstances.push(calendar);
        }
    }
    
    initializeCalendars();

    // Holiday mode toggle
    holidayModeButton.addEventListener('click', () => {
        isHolidayMode = !isHolidayMode;
        holidayModeButton.classList.toggle('active');
        holidayModeButton.textContent = isHolidayMode ? 
            'Desativar Edição' : 
            'Ativar Edição';
    });

    // Update the clear selection button handler
    clearSelectionButton.addEventListener('click', () => {
        startDate = null;
        endDate = null;
        calendarInstances.forEach(calendar => calendar.clearSelection());
        calculateWorkingDays();
    });

    // Adicionar listener para atualizar as horas quando o valor mudar
    hoursPerDayInput.addEventListener('change', () => {
        if (startDate && endDate) {
            calculateWorkingDays();
        }
    });

    function calculateWorkingDays() {
        if (!startDate || !endDate) {
            workingDaysSpan.textContent = '0';
            document.getElementById('working-hours').textContent = '0';
            document.getElementById('holidays-table-body').innerHTML = '';
            document.getElementById('holidays-list').classList.remove('has-selection');
            return;
        }

        document.getElementById('holidays-list').classList.add('has-selection');

        let currentDate = new Date(startDate);
        let workingDays = 0;
        const holidaysList = document.getElementById('holidays-table-body');
        holidaysList.innerHTML = '';
        let hasHolidays = false;

        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            const isWeekend = calendarInstances[currentDate.getMonth()].isWeekend(currentDate);
            const isHoliday = calendarInstances[currentDate.getMonth()].isHoliday(currentDate);
            const isOvertime = (currentDate.getDay() === 0 || currentDate.getDay() === 6) && workingWeekends.has(dateString);
            
            if (isOvertime || (!isWeekend && !isHoliday)) {
                workingDays++;
            }

            if (isHoliday && !isOvertime) {
                hasHolidays = true;
                const holidayName = getHolidayName(currentDate);
                const tr = document.createElement('tr');
                
                const nationalHolidays = calculateNationalHolidays(currentDate.getFullYear());
                const municipalHolidays = calculateMunicipalHolidays(currentDate.getFullYear());
                const stateHolidays = calculateStateHolidays(currentDate.getFullYear());
                
                const isNational = nationalHolidays.has(dateString) && !holidays.has(dateString);
                const isMunicipal = municipalHolidays.has(dateString) && !holidays.has(dateString);
                const isState = stateHolidays.has(dateString) && !holidays.has(dateString);
                
                let jurisdiction = '';
                if (isNational) jurisdiction += '<span class="holiday-badge national">Nacional</span>';
                if (isMunicipal) jurisdiction += (jurisdiction ? ' ' : '') + '<span class="holiday-badge municipal">Municipal (São Paulo)</span>';
                if (isState) jurisdiction += (jurisdiction ? ' ' : '') + '<span class="holiday-badge state">Estadual (SP)</span>';
                if (!isNational && !isMunicipal && !isState) jurisdiction = '<span class="holiday-badge personal">Folga</span>';
                
                tr.innerHTML = `
                    <td>${formatDate(currentDate)}</td>
                    <td>${jurisdiction}</td>
                    <td>${holidayName}</td>
                `;
                
                holidaysList.appendChild(tr);
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        if (!hasHolidays) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="3" class="no-holidays">Nenhum feriado ou folga no período selecionado.</td>';
            holidaysList.appendChild(tr);
        }

        // Pegar o valor atual de horas por dia
        const hoursPerDay = parseFloat(hoursPerDayInput.value) || 8;
        const workingHours = workingDays * hoursPerDay;

        document.getElementById('working-days').textContent = workingDays;
        document.getElementById('working-hours').textContent = workingHours;
    }

    function formatDate(date) {
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        return date.toLocaleDateString('pt-BR', options);
    }

    function getHolidayName(date) {
        const dateString = date.toISOString().split('T')[0];
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        const nationalHolidays = calculateNationalHolidays(year);
        const municipalHolidays = calculateMunicipalHolidays(year);
        const stateHolidays = calculateStateHolidays(year);

        const holidayNames = {
            '01-01': 'Confraternização Universal',
            '04-21': 'Dia de Tiradentes',
            '05-01': 'Dia do Trabalho',
            '09-07': 'Dia da Independência do Brasil',
            '10-12': 'Dia de Nossa Senhora Aparecida',
            '11-02': 'Dia de Finados',
            '11-15': 'Dia da Proclamação da República',
            '12-25': 'Natal',
            '01-25': 'Aniversário de São Paulo',
            '11-20': 'Dia da Consciência Negra',
            '07-09': 'Revolução Constitucionalista'
        };

        const key = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (holidayNames[key]) {
            return holidayNames[key];
        }

        const easter = calculateEaster(year);
        const goodFriday = new Date(easter);
        goodFriday.setDate(easter.getDate() - 2);
        const corpusChristi = new Date(easter);
        corpusChristi.setDate(easter.getDate() + 60);

        if (isSameDate(date, goodFriday)) {
            return 'Sexta-feira da Paixão';
        }
        if (isSameDate(date, corpusChristi)) {
            return 'Corpus Christi';
        }

        return 'Folga';
    }

    function calculateEaster(year) {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;

        return new Date(year, month - 1, day);
    }
}); 