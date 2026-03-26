document.addEventListener('DOMContentLoaded', () => {
  initLanding();
});

function initLanding() {
  handleSplashScreen();
  setupScrollAnimations();
  checkAuthForLanding();
}

function handleSplashScreen() {
  const splash = document.getElementById('splashScreen');
  if (splash) {
    // Hide splash screen after 4 seconds
    setTimeout(() => {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
        // Trigger initial fade sections that are in view
        document.body.classList.add('splash-cleared');
      }, 500); // Wait for transition
    }, 4000);
  } else {
    document.body.classList.add('splash-cleared');
  }
}

function setupScrollAnimations() {
  const faders = document.querySelectorAll('.fade-section');
  
  const appearOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
  };

  const appearOnScroll = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, appearOptions);

  faders.forEach(fader => {
    appearOnScroll.observe(fader);
  });
}

async function checkAuthForLanding() {
  try {
    const res = await fetch('/api/auth/user');
    if (res.ok) {
      const data = await res.json();
      const loginBtn = document.getElementById('loginBtnLanding');
      const userProfile = document.getElementById('userProfileLanding');
      
      if (loginBtn) loginBtn.style.display = 'none';
      if (userProfile) userProfile.style.display = 'flex';
      
      const nameDisplay = document.getElementById('userNameLanding');
      if (nameDisplay) nameDisplay.textContent = data.user.name || data.user.email.split('@')[0];
    }
  } catch (err) {
    console.error('Auth check error on landing', err);
  }
}
