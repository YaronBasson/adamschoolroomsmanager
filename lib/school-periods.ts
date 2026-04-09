export type SchoolType = 'יסודי' | 'תיכון'

export interface Period {
  number: number
  label: string  // e.g. 'שעה 1'
  start: string  // 'HH:MM'
  end: string    // 'HH:MM'
}

export const PERIODS: Record<SchoolType, Period[]> = {
  יסודי: [
    { number: 1,  label: 'שעה 1',  start: '08:00', end: '08:50' },
    { number: 2,  label: 'שעה 2',  start: '08:50', end: '09:40' },
    { number: 3,  label: 'שעה 3',  start: '10:20', end: '11:05' },
    { number: 4,  label: 'שעה 4',  start: '11:10', end: '11:55' },
    { number: 5,  label: 'שעה 5',  start: '12:15', end: '13:00' },
    { number: 6,  label: 'שעה 6',  start: '13:15', end: '14:00' },
  ],
  תיכון: [
    { number: 1,  label: 'שעה 1',  start: '08:00', end: '09:00' },
    { number: 2,  label: 'שעה 2',  start: '09:00', end: '09:45' },
    { number: 3,  label: 'שעה 3',  start: '10:15', end: '11:00' },
    { number: 4,  label: 'שעה 4',  start: '11:00', end: '11:45' },
    { number: 5,  label: 'שעה 5',  start: '12:05', end: '12:50' },
    { number: 6,  label: 'שעה 6',  start: '12:50', end: '13:35' },
    { number: 7,  label: 'שעה 7',  start: '14:00', end: '14:45' },
    { number: 8,  label: 'שעה 8',  start: '14:45', end: '15:30' },
    { number: 9,  label: 'שעה 9',  start: '15:45', end: '16:30' },
    { number: 10, label: 'שעה 10', start: '16:30', end: '17:15' },
  ],
}
