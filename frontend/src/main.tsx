import { render } from 'preact';
import './app/styles/index.css';
import './app/services/container';
import { App } from './app/App.tsx';

console.info('[AnimeSphere] frontend main.tsx start');
console.info('[AnimeSphere] frontend root exists:', !!document.getElementById('app'));

render(
  <App />,
  document.getElementById('app')!
);

console.info('[AnimeSphere] frontend render() returned');
