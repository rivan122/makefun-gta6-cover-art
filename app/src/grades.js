// Colour grades for the cover studio. A grade is three coats over the painted panels: a photo filter
// (saturation and contrast, applied while each photo is drawn), a soft-light blend gradient that bends
// the light toward the grade's colours, and a straight wash gradient at low alpha that sets the mood.
// The swatch pair is only for the editor's buttons: the colours a grade is recognised by.

export const GRADES = [
  {
    id: 'vice',
    name: 'Vice Sunset',
    filter: 'saturate(1.28) contrast(1.07)',
    blend: [
      [0, 'rgb(70, 20, 110)'],
      [0.45, 'rgb(255, 110, 60)'],
      [1, 'rgb(255, 40, 130)'],
    ],
    wash: [
      [0, 'rgba(40, 8, 66, 0.20)'],
      [0.5, 'rgba(255, 120, 60, 0.06)'],
      [1, 'rgba(214, 22, 110, 0.26)'],
    ],
    swatch: ['#ff7a3c', '#d6166e'],
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    filter: 'saturate(1.35) contrast(1.12)',
    blend: [
      [0, 'rgb(0, 60, 90)'],
      [0.55, 'rgb(30, 0, 80)'],
      [1, 'rgb(190, 0, 120)'],
    ],
    wash: [
      [0, 'rgba(0, 38, 66, 0.30)'],
      [0.55, 'rgba(64, 0, 110, 0.10)'],
      [1, 'rgba(255, 0, 128, 0.22)'],
    ],
    swatch: ['#00c2d8', '#ff0080'],
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    filter: 'saturate(1.18) contrast(1.05) brightness(1.04)',
    blend: [
      [0, 'rgb(120, 70, 10)'],
      [0.5, 'rgb(255, 170, 60)'],
      [1, 'rgb(200, 80, 20)'],
    ],
    wash: [
      [0, 'rgba(90, 44, 0, 0.16)'],
      [0.55, 'rgba(255, 176, 66, 0.10)'],
      [1, 'rgba(146, 52, 8, 0.24)'],
    ],
    swatch: ['#ffb042', '#b34a12'],
  },
  {
    id: 'noir',
    name: 'Teal Noir',
    filter: 'saturate(0.82) contrast(1.16)',
    blend: [
      [0, 'rgb(0, 50, 55)'],
      [0.6, 'rgb(10, 30, 40)'],
      [1, 'rgb(0, 10, 16)'],
    ],
    wash: [
      [0, 'rgba(0, 32, 38, 0.26)'],
      [0.6, 'rgba(0, 20, 26, 0.08)'],
      [1, 'rgba(0, 4, 8, 0.38)'],
    ],
    swatch: ['#0e5a63', '#04121a'],
  },
];

/** The grade with this id, or the first grade when the id names none. */
export function gradeById(id) {
  return GRADES.find((grade) => grade.id === id) ?? GRADES[0];
}
