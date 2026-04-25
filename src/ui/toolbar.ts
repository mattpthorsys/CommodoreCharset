export function button(label: string, onClick: () => void, title?: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  if (title) element.title = title;
  element.addEventListener('click', onClick);
  return element;
}

export function filePicker(accept: string, onText: (text: string) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    onText(await file.text());
  });
  input.click();
}

export function downloadBlob(filename: string, data: string | Uint8Array, type = 'application/octet-stream'): void {
  const blobPart = typeof data === 'string' ? data : data.slice().buffer;
  const blob = new Blob([blobPart], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
