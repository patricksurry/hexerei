import { render } from '@testing-library/react';
import './tokens.css';

test('CSS custom properties are defined on :root', () => {
  render(<div data-testid="probe" />);
  const root = document.documentElement;
  const style = getComputedStyle(root);

  // Verify key tokens exist (non-empty string means defined)
  expect(style.getPropertyValue('--bg-base').trim()).toBeTruthy();
  expect(style.getPropertyValue('--accent-hex').trim()).toBeTruthy();
  expect(style.getPropertyValue('--text-primary').trim()).toBeTruthy();
});
