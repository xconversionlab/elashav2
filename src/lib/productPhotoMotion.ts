import type { MouseEvent } from 'react';

type ProductPhotoMouseEvent = MouseEvent<HTMLElement>;

export function handleProductPhotoMove(event: ProductPhotoMouseEvent) {
  const bounds = event.currentTarget.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;

  const horizontal = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1));
  const vertical = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1));

  event.currentTarget.style.setProperty('--photo-tilt-x', `${-vertical * 11}deg`);
  event.currentTarget.style.setProperty('--photo-tilt-y', `${horizontal * 15}deg`);
  event.currentTarget.style.setProperty('--photo-pointer-x', `${(horizontal + 1) * 50}%`);
  event.currentTarget.style.setProperty('--photo-pointer-y', `${(vertical + 1) * 50}%`);
  event.currentTarget.style.setProperty('--photo-tilt-duration', '90ms');
}

export function resetProductPhotoTilt(event: ProductPhotoMouseEvent) {
  event.currentTarget.style.setProperty('--photo-tilt-x', '0deg');
  event.currentTarget.style.setProperty('--photo-tilt-y', '0deg');
  event.currentTarget.style.setProperty('--photo-pointer-x', '50%');
  event.currentTarget.style.setProperty('--photo-pointer-y', '50%');
  event.currentTarget.style.setProperty('--photo-tilt-duration', '620ms');
}
