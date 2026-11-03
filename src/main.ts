import './ui/styles.css';

const ui = document.querySelector<HTMLDivElement>('#ui');
if (ui) {
  ui.innerHTML = `
    <div class="boot">
      <div class="boot__title">ПАНЕЛЬ</div>
      <div class="boot__sub">день первый</div>
    </div>`;
}
