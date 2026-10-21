const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const navigation = document.querySelector("[data-nav]");

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 18);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

function closeMenu() {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "打开导航");
  navigation.classList.remove("is-open");
}

menuButton?.addEventListener("click", () => {
  const willOpen = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(willOpen));
  menuButton.setAttribute("aria-label", willOpen ? "关闭导航" : "打开导航");
  navigation?.classList.toggle("is-open", willOpen);
});

navigation?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

const revealItems = document.querySelectorAll("[data-reveal]");

if ("IntersectionObserver" in window && !reduceMotion) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -9%", threshold: 0.13 },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const cursorGlow = document.querySelector(".cursor-glow");

if (cursorGlow && finePointer && !reduceMotion) {
  window.addEventListener(
    "pointermove",
    (event) => {
      cursorGlow.style.opacity = "1";
      cursorGlow.style.left = `${event.clientX}px`;
      cursorGlow.style.top = `${event.clientY}px`;
    },
    { passive: true },
  );

  window.addEventListener("pointerleave", () => {
    cursorGlow.style.opacity = "0";
  });
}

const tiltTarget = document.querySelector("[data-tilt]");
const tiltDevice = tiltTarget?.querySelector(".voice-device");

if (tiltTarget && tiltDevice && finePointer && !reduceMotion) {
  tiltTarget.addEventListener("pointermove", (event) => {
    const bounds = tiltTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    tiltDevice.style.transform = `rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateY(-4px)`;
  });

  tiltTarget.addEventListener("pointerleave", () => {
    tiltDevice.style.transform = "";
  });
}

const tabs = Array.from(document.querySelectorAll(".feature-tab"));
const screenImage = document.querySelector("[data-screen-image]");
const featurePanel = document.querySelector(".feature-panel");
const featureKicker = document.querySelector("[data-feature-kicker]");
const featureTitle = document.querySelector("[data-feature-title]");
const featureDescription = document.querySelector("[data-feature-description]");
const featureStatValue = document.querySelector("[data-feature-stat-value]");
const featureStatLabel = document.querySelector("[data-feature-stat-label]");

const screenLabels = {
  "voice-result": "声账语音记账结果页面",
  stats: "声账月度统计页面",
  "manual-entry": "声账手动记账页面",
};

function preloadScreens() {
  Object.keys(screenLabels).forEach((screen) => {
    const image = new Image();
    image.src = `./assets/screens/${screen}.png`;
  });
}

function selectTab(nextTab) {
  if (!nextTab || nextTab.classList.contains("is-active")) return;

  tabs.forEach((tab) => {
    const isActive = tab === nextTab;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });

  const screen = nextTab.dataset.screen;
  if (screenImage && screen && screenLabels[screen]) {
    screenImage.classList.add("is-switching");
    window.setTimeout(() => {
      screenImage.src = `./assets/screens/${screen}.png`;
      screenImage.alt = screenLabels[screen];
      screenImage.classList.remove("is-switching");
    }, reduceMotion ? 0 : 160);
  }

  featureKicker.textContent = nextTab.dataset.kicker;
  featureTitle.textContent = nextTab.dataset.title;
  featureDescription.textContent = nextTab.dataset.description;
  featureStatValue.textContent = nextTab.dataset.statValue;
  featureStatLabel.textContent = nextTab.dataset.statLabel;

  featurePanel.classList.remove("is-changing");
  void featurePanel.offsetWidth;
  featurePanel.classList.add("is-changing");
}

tabs.forEach((tab, index) => {
  tab.tabIndex = tab.classList.contains("is-active") ? 0 : -1;
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    tabs[nextIndex].focus();
    selectTab(tabs[nextIndex]);
  });
});

preloadScreens();

const transcript = document.querySelector("[data-transcript]");
const demoEntries = Array.from(document.querySelectorAll("[data-demo-entry]"));

function wait(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

async function runVoiceDemo() {
  if (!transcript || reduceMotion) return;

  const phrase = "午饭 25，咖啡 18";

  while (true) {
    demoEntries.forEach((entry) => entry.classList.add("is-hidden"));
    await wait(950);

    transcript.textContent = "";
    for (const character of phrase) {
      transcript.textContent += character;
      await wait(character === "，" ? 240 : 95);
    }

    await wait(550);
    demoEntries.forEach((entry, index) => {
      window.setTimeout(() => entry.classList.remove("is-hidden"), index * 180);
    });
    await wait(3400);

    transcript.textContent = "已记好 2 笔";
    await wait(1000);
  }
}

window.setTimeout(runVoiceDemo, 1800);

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());
