import { colorHex, type PaletteEntry } from '../c64/palette';
import type { C64Color } from '../c64/projectModel';

function readableText(hex: string): string {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 > 150 ? '#111111' : '#ffffff';
}

export function createColorSelect<T extends C64Color>(
  entries: readonly PaletteEntry[],
  value: T,
  onChange: (value: T) => void,
): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = 'colour-select-wrap';

  const swatch = document.createElement('span');
  swatch.className = 'colour-swatch';

  const select = document.createElement('select');
  entries.forEach((entry) => {
    const option = document.createElement('option');
    option.value = String(entry.index);
    option.textContent = `${entry.index} ${entry.name}`;
    option.style.backgroundColor = entry.hex;
    option.style.color = readableText(entry.hex);
    select.append(option);
  });

  const updateSwatch = () => {
    const index = Number(select.value) as C64Color;
    const hex = colorHex(index);
    swatch.style.backgroundColor = hex;
    select.style.backgroundColor = hex;
    select.style.color = readableText(hex);
    swatch.title = select.selectedOptions[0]?.textContent ?? '';
  };

  select.value = String(value);
  updateSwatch();
  select.addEventListener('change', () => {
    updateSwatch();
    onChange(Number(select.value) as T);
  });

  wrap.append(select, swatch);
  return wrap;
}
