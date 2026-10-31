import { startFluid } from './fluid.js';

const productPage = 'https://www.sparkopus.com/products';
const environmentPage = 'https://www.sparkopus.com/environments';

const projects = [
  { category: 'client', title: 'Aayush Hospitals', kind: 'Healthcare platform', description: 'A hospital website and patient experience spanning doctors, services, appointments, and CMS-managed content.', tags: ['healthcare', 'web platform', 'CMS'], url: 'https://aayushhospitals.com/', linkLabel: 'visit live site', status: 'LIVE' },
  { category: 'client', title: 'Andhra Pradesh Football Association', kind: 'Sports platform', description: 'The association’s digital home for clubs, players, competitions, fixtures, results, news, and administration.', tags: ['sports', 'registrations', 'operations'], url: 'https://apfa.co.in/', linkLabel: 'visit live site', status: 'LIVE' },
  { category: 'client', title: 'JobYatra India', kind: 'Recruitment platform', description: 'A job marketplace with candidate journeys, employer tools, career events, and operations workflows.', tags: ['recruitment', 'marketplace', 'payments'], url: 'https://jobyatraindia.com/', linkLabel: 'visit live site', status: 'LIVE' },
  { category: 'client', title: 'Vyro Hotels', kind: 'Hospitality ecosystem', description: 'A booking experience for travelers, with hotel partner operations and WhatsApp-first confirmations.', tags: ['hospitality', 'booking', 'mobile'], url: 'https://vyrohotels.com/', linkLabel: 'visit live site', status: 'LIVE' },
  { category: 'client', title: 'Yellow Pages India', kind: 'Business directory', description: 'Searchable local business discovery with rich listings, categories, locations, and admin tooling.', tags: ['directory', 'search', 'local business'], url: 'https://yp.digital/', linkLabel: 'visit live site', status: 'LIVE' },
  { category: 'client', title: 'House of Thorani', kind: 'Fashion commerce', description: 'An omnichannel store bringing online and in-store inventory, variants, payments, and reporting together.', tags: ['e-commerce', 'inventory', 'retail'], url: 'https://houseofthorani.com/', linkLabel: 'view project site', status: 'IN PROGRESS' },
  { category: 'client', title: 'UsedAdda', kind: 'Used-car marketplace', description: 'A marketplace for browsing used cars, connecting with sellers, and supporting dealer workflows.', tags: ['marketplace', 'automotive', 'mobile'], url: 'https://usedadda.com/', linkLabel: 'visit live site', status: 'LIVE' },
  { category: 'product', title: 'SparkObot', kind: 'WhatsApp commerce agent', description: 'An always-on WhatsApp sales and support assistant for catalog sharing, orders, payment links, and updates.', tags: ['WhatsApp', 'commerce', 'AI agent'], url: productPage, linkLabel: 'explore product', secondary: 'https://www.sparkopus.com/demos/sparkobot-demo-package.pdf', secondaryLabel: 'demo package', status: 'AI PRODUCT' },
  { category: 'product', title: 'OpusCaller', kind: 'AI bookings & scheduling', description: 'AI-assisted bookings, slot management, reminders, rescheduling, customer records, and team dashboards.', tags: ['voice AI', 'scheduling', 'automation'], url: productPage, linkLabel: 'explore product', secondary: 'https://opuscaller.sparkopus.com/', secondaryLabel: 'app link', status: 'AI PRODUCT' },
  { category: 'product', title: 'Spark CRM', kind: 'Lead operations', description: 'A pipeline that captures leads, assigns owners, prompts follow-ups, and tracks deals through to close.', tags: ['CRM', 'sales', 'automation'], url: productPage, linkLabel: 'explore product', secondary: 'https://www.sparkopus.com/demos/spark-crm-demo-package.pdf', secondaryLabel: 'demo package', status: 'AI PRODUCT' },
  { category: 'product', title: 'Socialopus', kind: 'Social conversation automation', description: 'Automates replies to DMs and comments, guides inquiries, and turns conversations into qualified leads.', tags: ['social', 'AI agent', 'lead capture'], url: productPage, linkLabel: 'explore product', secondary: 'https://www.sparkopus.com/demos/socialopus-demo-package.pdf', secondaryLabel: 'demo package', status: 'AI PRODUCT' },
  { category: 'product', title: 'Spark Edu-systems', kind: 'Education operations', description: 'A school and coaching-centre operating system for attendance, fees, parent updates, and reporting.', tags: ['education', 'operations', 'automation'], url: productPage, linkLabel: 'explore product', secondary: 'https://www.sparkopus.com/demos/spark-edu-systems-demo-package.pdf', secondaryLabel: 'demo package', status: 'AI PRODUCT' },
  { category: 'product', title: 'SparkPOS', kind: 'Restaurant operating system', description: 'QR and WhatsApp ordering, kitchen workflows, billing, delivery updates, and repeat-order campaigns.', tags: ['restaurant', 'POS', 'commerce'], url: productPage, linkLabel: 'explore product', secondary: 'https://www.sparkopus.com/demos/sparkpos-demo-package.pdf', secondaryLabel: 'demo package', status: 'AI PRODUCT' },
  { category: 'environment', title: 'Opus WebArena', kind: 'Web automation environment', description: 'A browser sandbox for multi-step tasks across commerce, content systems, and dashboards.', tags: ['web agents', 'RL environment', 'evaluation'], url: environmentPage, linkLabel: 'explore environment', status: 'ENVIRONMENT' },
  { category: 'environment', title: 'Terminal World', kind: 'Software engineering environment', description: 'Containerized repositories where agents inspect failures, make repairs, and verify their work.', tags: ['coding agents', 'containers', 'evaluation'], url: environmentPage, linkLabel: 'explore environment', status: 'ENVIRONMENT' },
  { category: 'environment', title: 'OpsSim', kind: 'DevOps & SRE environment', description: 'Incident simulations with logs, metrics, and traces for agent triage and remediation.', tags: ['SRE', 'observability', 'simulation'], url: environmentPage, linkLabel: 'explore environment', status: 'ENVIRONMENT' },
  { category: 'environment', title: 'Negotiation Grid', kind: 'Multi-agent environment', description: 'Cooperative and adversarial scenarios that test strategy, coordination, and tool use.', tags: ['multi-agent', 'strategy', 'benchmark'], url: environmentPage, linkLabel: 'explore environment', status: 'ENVIRONMENT' },
];

const grid = document.querySelector('#project-grid');
const filters = [...document.querySelectorAll('.filter')];
const search = document.querySelector('#project-search');
const count = document.querySelector('#project-count');
const empty = document.querySelector('#no-results');
let currentFilter = 'all';

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const card = (item, index) => {
  const number = String(index + 1).padStart(2, '0');
  const tags = item.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  const secondary = item.secondary ? `<a class="secondary" href="${escapeHtml(item.secondary)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.secondaryLabel)} ↗</a>` : '';
  return `<article class="project-card" data-category="${item.category}"><span class="project-index" aria-hidden="true">${number}</span><div class="project-body"><p class="project-meta">${escapeHtml(item.kind)} / ${escapeHtml(item.category)}</p><h3>${escapeHtml(item.title)}</h3><p class="project-description">${escapeHtml(item.description)}</p><div class="project-tags">${tags}</div><div class="project-links"><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.linkLabel)} ↗</a>${secondary}</div></div><span class="project-status">${escapeHtml(item.status)}</span></article>`;
};

function renderProjects() {
  const term = search.value.trim().toLowerCase();
  const visible = projects.filter((item) => (currentFilter === 'all' || item.category === currentFilter) && [item.title, item.kind, item.description, ...item.tags].join(' ').toLowerCase().includes(term));
  grid.innerHTML = visible.map(card).join('');
  count.textContent = `SHOWING ${visible.length} ${visible.length === 1 ? 'BUILD' : 'BUILDS'}`;
  empty.hidden = visible.length > 0;
}

filters.forEach((button) => button.addEventListener('click', () => {
  currentFilter = button.dataset.filter;
  filters.forEach((item) => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  renderProjects();
}));
search.addEventListener('input', renderProjects);
document.addEventListener('keydown', (event) => {
  const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    search.focus();
    search.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (event.key === 'Escape' && document.activeElement === search) {
    search.value = '';
    search.blur();
    renderProjects();
  }
});

document.querySelector('#year').textContent = String(new Date().getFullYear());
renderProjects();
startFluid(document.querySelector('.hero'), document.querySelector('#fluid-canvas'));
