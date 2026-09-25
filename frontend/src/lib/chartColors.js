const CATEGORICAL = {
  light: ['#B5573A', '#106E96', '#A98026', '#7A3F84', '#5C7A1E'],
  dark: ['#C86A45', '#2E93BE', '#C0891F', '#A468A8', '#719C47'],
}

const OTHER = {
  light: '#C9C2B2',
  dark: '#55503F',
}

const LINE = {
  light: '#B5573A',
  dark: '#E08A63',
}

const GRID = {
  light: '#E5E0D6',
  dark: '#3A3226',
}

export function getCategoricalColors(resolvedTheme) {
  return CATEGORICAL[resolvedTheme] || CATEGORICAL.light
}

export function getOtherColor(resolvedTheme) {
  return OTHER[resolvedTheme] || OTHER.light
}

export function getLineColor(resolvedTheme) {
  return LINE[resolvedTheme] || LINE.light
}

export function getGridColor(resolvedTheme) {
  return GRID[resolvedTheme] || GRID.light
}
