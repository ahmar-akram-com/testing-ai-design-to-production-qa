import './styles.css';

const asset = (name) => `/figma-assets/${name}`;

document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <nav class="nav-shell" aria-label="Primary navigation">
      <a class="brand" href="#" aria-label="Rival home">
        <img src="${asset('20-f7c88b5c.jpg')}" alt="" />
      </a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-menu">
        Menu
      </button>
      <div class="primary-menu" id="primary-menu">
        <a href="#platform">Platform</a>
        <a href="#solutions">Solutions</a>
        <a href="#resources">Resources</a>
        <a href="#article">Blog</a>
      </div>
      <a class="nav-cta" href="#demo">Get a demo</a>
    </nav>
  </header>

  <main>
    <section class="article-hero">
      <div class="hero-copy">
        <p class="eyebrow">Customer Insights</p>
        <h1>How to evaluate insight community solutions before you buy</h1>
        <p class="dek">
          A practical guide for research, brand, and product teams comparing modern community platforms.
        </p>
        <div class="article-meta" aria-label="Article metadata">
          <span>Rival Team</span>
          <span>April 10, 2026</span>
          <span>9 min read</span>
        </div>
      </div>
      <figure class="hero-media">
        <img src="${asset('01-e6725682.jpg')}" alt="Team members reviewing research materials around a table" />
      </figure>
    </section>

    <section class="article-layout" id="article">
      <aside class="share-rail" aria-label="Share this article">
        <button type="button" data-share="copy" aria-label="Copy article link">Link</button>
        <button type="button" data-share="linkedin" aria-label="Share on LinkedIn">in</button>
        <button type="button" data-share="x" aria-label="Share on X">X</button>
      </aside>

      <article class="article-body">
        <p class="lead">
          Choosing an insight community platform is less about checking a feature grid and more about knowing
          how fast your team can recruit, ask, learn, and act. The right platform should make research feel
          continuous without creating another operational burden.
        </p>

        <h2>Start with the decisions your team needs to make</h2>
        <p>
          Before comparing tools, define the weekly decisions that need customer evidence. Teams usually need a
          mix of concept feedback, message testing, journey discovery, and rapid pulse checks. A strong platform
          supports those rhythms without requiring a full research operations cycle for every question.
        </p>
        <p>
          If the evaluation starts with a feature checklist alone, it is easy to overbuy. Tie each feature to a
          decision, a user role, and a measurable workflow improvement.
        </p>

        <blockquote>
          The best insight communities reduce the distance between a customer question and a confident business
          decision.
        </blockquote>

        <h2>Compare panel quality, not just panel size</h2>
        <p>
          A large community is useful only when participants are relevant, reachable, and representative of the
          segments you care about. Ask how profiles are maintained, how fatigue is managed, and how teams can
          target niche audiences without manual cleanup.
        </p>

        <figure class="inline-image">
          <img src="${asset('03-72405ee4.jpg')}" alt="Mobile research survey shown on a phone" />
          <figcaption>Mobile-first studies help teams collect context while the customer moment is fresh.</figcaption>
        </figure>

        <h2>Review the end-to-end workflow</h2>
        <p>
          A good demo should show more than survey creation. Follow the entire path from audience setup through
          analysis, reporting, sharing, and reuse. Pay attention to moments where teams need to leave the product,
          copy data by hand, or wait for technical help.
        </p>

        <div class="checklist-card">
          <h3>Evaluation checklist</h3>
          <ul>
            <li>Can non-research users launch approved studies safely?</li>
            <li>Can brand and legal guardrails be enforced in templates?</li>
            <li>Are segments reusable across projects?</li>
            <li>Can findings be shared with executives without manual slide work?</li>
          </ul>
        </div>

        <h2>Look for evidence of speed and governance together</h2>
        <p>
          Speed without governance creates inconsistent research. Governance without speed creates unused tools.
          The strongest platforms combine templates, role permissions, quality checks, and clear reporting so
          teams can move quickly without lowering the standard of evidence.
        </p>

        <h2>Ask what success looks like after onboarding</h2>
        <p>
          Implementation should include more than account setup. Ask what your first 30, 60, and 90 days look
          like, which teams are expected to adopt the platform first, and what metrics the vendor uses to confirm
          that the program is working.
        </p>
      </article>

      <aside class="article-sidebar" aria-label="Article supporting content">
        <div class="toc-card">
          <p class="sidebar-title">In this article</p>
          <a href="#article">Evaluation goals</a>
          <a href="#platform">Panel quality</a>
          <a href="#solutions">Workflow review</a>
          <a href="#demo">Success metrics</a>
        </div>
        <a class="guide-card" id="demo" href="#">
          <img src="${asset('05-dd597768.jpg')}" alt="" />
          <span>Get the buyer checklist</span>
        </a>
      </aside>
    </section>

    <section class="related-section" id="resources" aria-labelledby="related-title">
      <div class="section-heading">
        <p class="eyebrow">More from Rival</p>
        <h2 id="related-title">Keep building customer closeness</h2>
      </div>
      <div class="related-grid">
        <a class="post-card" href="#">
          <img src="${asset('13-a9db680c.jpg')}" alt="" />
          <span>Research Ops</span>
          <h3>Five ways to shorten your insight cycle</h3>
        </a>
        <a class="post-card" href="#">
          <img src="${asset('10-0fde8e18.jpg')}" alt="" />
          <span>Community</span>
          <h3>What great respondent experiences have in common</h3>
        </a>
        <a class="post-card" href="#">
          <img src="${asset('67-0490de6f.jpg')}" alt="" />
          <span>AI Research</span>
          <h3>How insight teams can use AI with confidence</h3>
        </a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <img class="footer-logo" src="${asset('20-f7c88b5c.jpg')}" alt="Rival" />
        <p>Customer insight communities for teams that need faster, better decisions.</p>
      </div>
      <div class="footer-links" aria-label="Footer links">
        <a href="#platform">Platform</a>
        <a href="#solutions">Solutions</a>
        <a href="#resources">Resources</a>
        <a href="#demo">Contact</a>
      </div>
      <div class="store-badges" aria-label="Download apps">
        <img src="${asset('31-32cca8c2.jpg')}" alt="Get it on Google Play" />
        <img src="${asset('32-48a5440d.jpg')}" alt="Download on the App Store" />
      </div>
    </div>
  </footer>
`;

const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#primary-menu');

menuToggle.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!expanded));
  menu.classList.toggle('is-open', !expanded);
});

document.querySelectorAll('[data-share]').forEach((button) => {
  button.addEventListener('click', async () => {
    const url = window.location.href;
    const label = document.title;

    if (button.dataset.share === 'copy') {
      await navigator.clipboard?.writeText(url);
      button.textContent = 'Copied';
      setTimeout(() => {
        button.textContent = 'Link';
      }, 1600);
      return;
    }

    if (navigator.share) {
      await navigator.share({ title: label, url }).catch(() => {});
    }
  });
});

