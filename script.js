// VisaConsult website JavaScript functionality

// ---------------------------------------------------------------------------
// Firebase, loaded on demand
//
// The SDK is ~400KB across three scripts. It used to be three blocking <script>
// tags in <head>, and only on index.html and contact.html -- so the other 17
// pages carrying a contact form had no Firestore at all and every submission
// from them failed with "Form service unavailable".
//
// Loading it here instead fixes both problems: no page pays for the SDK up
// front, and every page with a form gets it the moment a visitor touches one.
// ---------------------------------------------------------------------------
const FIREBASE_VERSION = '10.12.2';
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDi2KWdwFkQCbuCgj9Qx2KRp7J9ji5iBrY",
    authDomain: "evf-backend.firebaseapp.com",
    projectId: "evf-backend",
    storageBucket: "evf-backend.firebasestorage.app",
    messagingSenderId: "668853277727",
    appId: "1:668853277727:web:b8c47760ba1f11f4fab12a",
    measurementId: "G-KRR863MT1J"
};

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded) return resolve();
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', reject);
            return;
        }
        const el = document.createElement('script');
        el.src = src;
        el.async = true;
        el.addEventListener('load', () => { el.dataset.loaded = '1'; resolve(); });
        el.addEventListener('error', () => reject(new Error('Failed to load ' + src)));
        document.head.appendChild(el);
    });
}

let firebasePromise = null;

// Resolves with a Firestore instance. Safe to call repeatedly -- the SDK is
// fetched at most once per page.
function getDb() {
    if (firebasePromise) return firebasePromise;

    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
    firebasePromise = loadScript(`${base}/firebase-app-compat.js`)
        .then(() => loadScript(`${base}/firebase-firestore-compat.js`))
        .then(() => {
            if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
            window.evfDb = firebase.firestore();
            return window.evfDb;
        })
        .catch((err) => {
            // Let the next attempt retry rather than caching the failure.
            firebasePromise = null;
            throw err;
        });

    return firebasePromise;
}

// ---------------------------------------------------------------------------
// Hero banner slider
//
// Cross-fades the hero banners and their headlines together. The first slide
// is already marked is-active in the markup, so the hero is correct before
// this runs and stays correct if it never does -- the rotation is an
// enhancement, not the thing that makes the hero appear.
//
// Rotation is automatic and has no on-screen controls. Under
// prefers-reduced-motion it does not advance at all, and styles.css drops the
// fade so a swipe swaps outright.
// ---------------------------------------------------------------------------
const HERO_SLIDE_MS = 3500;

function initHeroSlider() {
    const hero = document.querySelector('.hero-slider');
    if (!hero) return;

    const slides = Array.from(hero.querySelectorAll('.hero-slide'));
    const lines = Array.from(hero.querySelectorAll('.hero-line'));
    if (slides.length < 2) return;

    let current = 0;
    let timer = null;

    function show(next) {
        if (next === current) return;
        current = next;

        slides.forEach((el, i) => el.classList.toggle('is-active', i === current));

        lines.forEach((el, i) => {
            const active = i === current;
            el.classList.toggle('is-active', active);
            // The hidden line is still in the layout, so it has to be taken out
            // of the accessibility tree by hand or both headlines are announced.
            if (active) el.removeAttribute('aria-hidden');
            else el.setAttribute('aria-hidden', 'true');
        });
    }

    function advance() {
        show((current + 1) % slides.length);
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    function stop() {
        if (timer === null) return;
        clearInterval(timer);
        timer = null;
    }

    function start() {
        stop();
        if (reduced.matches) return;
        timer = setInterval(advance, HERO_SLIDE_MS);
    }

    // Swipe. Only a mostly-horizontal drag counts, so a vertical scroll that
    // happens to begin on the hero does not turn the slide.
    let touchX = null;
    let touchY = null;

    hero.addEventListener('touchstart', (e) => {
        touchX = e.changedTouches[0].clientX;
        touchY = e.changedTouches[0].clientY;
    }, { passive: true });

    hero.addEventListener('touchend', (e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        const dy = e.changedTouches[0].clientY - touchY;
        touchX = null;
        touchY = null;

        if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
        show(dx < 0
            ? (current + 1) % slides.length
            : (current - 1 + slides.length) % slides.length);
        start();
    }, { passive: true });

    // No point rotating a hero nobody is looking at.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else start();
    });

    // Safari only got addEventListener on MediaQueryList in 14.
    if (typeof reduced.addEventListener === 'function') {
        reduced.addEventListener('change', start);
    }

    start();
}

// ---------------------------------------------------------------------------
// Client reviews -- opening the rest of them
//
// One review leads the section and the remainder ship collapsed underneath it.
// The panel is a grid whose single row track animates between 0fr and 1fr, so
// it opens to whatever the content actually measures without a hard-coded
// height. Nothing here is required to read the lead review.
// ---------------------------------------------------------------------------
function initReviewDisclosure() {
    const button = document.querySelector('.review-expand');
    const panel = document.getElementById('all-reviews');
    if (!button || !panel) return;

    const label = button.querySelector('.review-expand-label');

    // Collapsed content is out of the accessibility tree and out of the tab
    // order until it is opened. inert is ignored by older browsers, which is
    // why the panel is also height-clipped rather than only visually hidden.
    panel.inert = true;

    button.addEventListener('click', () => {
        const open = button.getAttribute('aria-expanded') === 'true';

        button.setAttribute('aria-expanded', String(!open));
        panel.classList.toggle('is-open', !open);
        panel.inert = open;

        if (label) label.textContent = open ? 'Read all reviews' : 'Hide reviews';

        // Opening from a panel that sits above the content it reveals leaves
        // the reader looking at the wrong part of the page.
        if (!open) {
            requestAnimationFrame(() => {
                panel.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                        ? 'auto'
                        : 'smooth',
                    block: 'nearest'
                });
            });
        }
    });
}

// The topic bars draw themselves the first time the chart is scrolled into
// view. They are already at their final width in the markup, so if this never
// runs the chart is still correct -- it just does not animate.
function initReviewChart() {
    const chart = document.querySelector('.review-topics');
    if (!chart) return;
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-charting');
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.4 });

    observer.observe(chart);
}

// ---------------------------------------------------------------------------
// Mobile menu
//
// The panel and each of its three drawers open by animating a grid row track
// from 0fr to 1fr, so nothing carries a hard-coded height. Collapsed content is
// marked inert as well as clipped, so it is out of the tab order rather than
// merely invisible.
//
// Only one drawer stands open at a time: with twenty destinations in one of
// them, two open at once puts the rest of the menu out of reach.
// ---------------------------------------------------------------------------
function initMobileMenu() {
    const button = document.getElementById('mobile-menu-button');
    const menu = document.getElementById('mobile-menu');
    if (!button || !menu) return;

    const icon = button.querySelector('i');
    const toggles = Array.from(menu.querySelectorAll('.mobile-group-toggle'));
    const panels = toggles.map(t => document.getElementById(t.getAttribute('aria-controls')));

    menu.inert = true;
    panels.forEach(p => { if (p) p.inert = true; });

    function closeDrawers(except) {
        toggles.forEach((t, i) => {
            if (t === except) return;
            t.setAttribute('aria-expanded', 'false');
            if (panels[i]) {
                panels[i].classList.remove('is-open');
                panels[i].inert = true;
            }
        });
    }

    function setMenu(open) {
        button.setAttribute('aria-expanded', String(open));
        button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menu.classList.toggle('is-open', open);
        menu.inert = !open;

        if (icon) {
            icon.classList.toggle('fa-bars', !open);
            icon.classList.toggle('fa-xmark', open);
        }
        if (!open) closeDrawers(null);
    }

    button.addEventListener('click', () => {
        setMenu(button.getAttribute('aria-expanded') !== 'true');
    });

    toggles.forEach((toggle, i) => {
        toggle.addEventListener('click', () => {
            const open = toggle.getAttribute('aria-expanded') === 'true';
            closeDrawers(toggle);
            toggle.setAttribute('aria-expanded', String(!open));
            if (panels[i]) {
                panels[i].classList.toggle('is-open', !open);
                panels[i].inert = open;
            }
        });
    });

    // Escape closes, and focus goes back to the control that opened it.
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (button.getAttribute('aria-expanded') !== 'true') return;
        setMenu(false);
        button.focus();
    });

    // The menu is inline rather than an overlay, so leaving it open across the
    // breakpoint would leave a stray open panel behind the desktop bar.
    const desktop = window.matchMedia('(min-width: 768px)');
    const onBreakpoint = (e) => { if (e.matches) setMenu(false); };
    if (typeof desktop.addEventListener === 'function') {
        desktop.addEventListener('change', onBreakpoint);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initHeroSlider();
    initReviewDisclosure();
    initReviewChart();
    initMobileMenu();
    
    // Nav hover colour is handled in styles.css (.nav-link:hover). Doing it with
    // two JS listeners per link meant ~50 listeners per page writing inline
    // styles on every mouse move across the nav.

    // Initialize Swiper only on mobile screens
    if (window.innerWidth < 768) {
        initializeSwiper();
    }

    // Initialize Team Swiper
    initializeTeamSwiper();

    // Initialize Statistics Animation
    initializeStatisticsAnimation();

    // Re-initialize Swiper on resize. Debounced, and only when the mobile
    // breakpoint is actually crossed -- this used to tear down and rebuild both
    // sliders on every resize event, which fires continuously while a mobile
    // browser's address bar collapses during scroll.
    let resizeTimer;
    let wasMobile = window.innerWidth < 768;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            const isMobile = window.innerWidth < 768;
            if (isMobile === wasMobile) return;
            wasMobile = isMobile;

            if (isMobile && !window.swiperInstance) {
                initializeSwiper();
            } else if (!isMobile && window.swiperInstance) {
                window.swiperInstance.destroy(true, true);
                window.swiperInstance = null;
            }

            if (window.teamSwiperInstance) {
                window.teamSwiperInstance.destroy(true, true);
                window.teamSwiperInstance = null;
            }
            initializeTeamSwiper();
        }, 200);
    });
});

// Initialize Swiper slider for mobile
function initializeSwiper() {
    if (typeof Swiper !== 'undefined') {
        window.swiperInstance = new Swiper('.swiper-container', {
            loop: true,
            slidesPerView: 'auto',
            centeredSlides: true,
            spaceBetween: 20,
            touchRatio: 1,
            touchAngle: 45,
            threshold: 5,
            touchStartPreventDefault: false,
            touchStartForcePreventDefault: false,
            touchMoveStopPropagation: false,
            simulateTouch: true,
            allowTouchMove: true,
            resistance: true,
            resistanceRatio: 0.85,
            preventClicks: true,
            preventClicksPropagation: true,
            slideToClickedSlide: false,
            touchReleaseOnEdges: false,
            uniqueNavElements: true,
            
            // Pagination configuration
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
                dynamicBullets: true,
            },
            
            // Prevent vertical scrolling when swiping horizontally
            onTouchStart: function(swiper, event) {
                // Allow horizontal touch movement
                event.stopPropagation();
            },
            onTouchMove: function(swiper, event) {
                // Prevent vertical scroll during horizontal swipe
                if (Math.abs(event.touches[0].clientX - swiper.touches.startX) > Math.abs(event.touches[0].clientY - swiper.touches.startY)) {
                    event.preventDefault();
                }
            }
        });
    }
}

// Initialize Team Swiper slider
function initializeTeamSwiper() {
    if (typeof Swiper !== 'undefined') {
        window.teamSwiperInstance = new Swiper('.team-swiper', {
            // Responsive breakpoints
            breakpoints: {
                320: {
                    slidesPerView: 1,
                    spaceBetween: 20,
                },
                768: {
                    slidesPerView: 2,
                    spaceBetween: 30,
                },
                1024: {
                    slidesPerView: 3,
                    spaceBetween: 30,
                }
            },
            
            // Navigation
            navigation: {
                nextEl: '.team-swiper-button-next',
                prevEl: '.team-swiper-button-prev',
            },
            
            // Pagination
            pagination: {
                el: '.team-swiper-pagination',
                clickable: true,
                dynamicBullets: true,
            },
            
            // Loop
            loop: true,
            loopFillGroupWithBlank: true,
            
            // Autoplay
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
            },
            
            // Touch settings
            touchRatio: 1,
            touchAngle: 45,
            threshold: 5,
            touchStartPreventDefault: false,
            touchStartForcePreventDefault: false,
            touchMoveStopPropagation: false,
            simulateTouch: true,
            allowTouchMove: true,
            resistance: true,
            resistanceRatio: 0.85,
            preventClicks: true,
            preventClicksPropagation: true,
            slideToClickedSlide: false,
            touchReleaseOnEdges: false,
            uniqueNavElements: true,
            
            // Speed
            speed: 600,
            
            // Effects
            effect: 'slide',
            
            // Accessibility
            a11y: {
                enabled: true,
                prevSlideMessage: 'Previous team member',
                nextSlideMessage: 'Next team member',
                firstSlideMessage: 'This is the first team member',
                lastSlideMessage: 'This is the last team member',
            },
            
            // Keyboard control
            keyboard: {
                enabled: true,
                onlyInViewport: true,
            },
            
            // Mouse wheel control
            mousewheel: {
                invert: false,
            },
            
            // Touch events
            onTouchStart: function(swiper, event) {
                event.stopPropagation();
            },
            onTouchMove: function(swiper, event) {
                if (Math.abs(event.touches[0].clientX - swiper.touches.startX) > Math.abs(event.touches[0].clientY - swiper.touches.startY)) {
                    event.preventDefault();
                }
            }
        });
    }
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Fade in Why Choose Us card images as they decode.
// The `complete` check matters: on a warm cache the load event has already
// fired by the time this runs, and without it the image would be left at
// opacity 0 permanently.
document.querySelectorAll('.why-choose-card img').forEach(img => {
    if (img.complete) return;
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s ease';
    const show = () => { img.style.opacity = '1'; };
    img.addEventListener('load', show, { once: true });
    img.addEventListener('error', show, { once: true });
});

// ---------------------------------------------------------------------------
// Scroll reveal
//
// This previously set opacity:0 on EVERY <section> from JS, then faded them in
// via IntersectionObserver. Three problems: with JS blocked or slow the entire
// page stayed invisible; the hero was hidden until an observer callback fired,
// delaying the largest contentful paint; and writing inline styles to every
// section forced a full style recalculation on load.
//
// Now: content is visible by default. JS opts elements in by adding .reveal,
// and never touches anything in the first viewport. Honours reduced-motion.
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-visible');
                obs.unobserve(entry.target);   // one-shot; stop observing after reveal
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.why-choose-card, section').forEach(el => {
        // Anything already on screen at load stays untouched, so the hero and
        // first section paint immediately at full opacity.
        if (el.getBoundingClientRect().top < window.innerHeight) return;
        el.classList.add('reveal');
        observer.observe(el);
    });
});

// Accordion functionality for About page
function toggleAccordion(button) {
    const accordionItem = button.parentElement;
    const isActive = accordionItem.classList.contains('active');
    
    // Close all accordion items
    document.querySelectorAll('.accordion-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Open clicked item if it wasn't active
    if (!isActive) {
        accordionItem.classList.add('active');
    }
}

// Animated Statistics Counter
function animateCounter(element, target, duration, suffix = '') {
    let start = 0;
    const increment = target / (duration / 16); // 60fps
    
    function updateCounter() {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start) + suffix;
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target + suffix;
        }
    }
    
    updateCounter();
}

// Statistics Animation with Intersection Observer
function initializeStatisticsAnimation() {
    const statsSection = document.querySelector('section[style*="background-color: #0F218B"]');
    if (!statsSection) return;
    
    const stat1 = document.getElementById('stat-1');
    const stat2 = document.getElementById('stat-2');
    const stat3 = document.getElementById('stat-3');
    
    if (!stat1 || !stat2 || !stat3) return;
    
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Animate the counters
                animateCounter(stat1, 98, 2000, '%');
                animateCounter(stat2, 5000, 2500, '+');
                animateCounter(stat3, 14, 1500, '+');
                
                // Stop observing after animation starts
                statsObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    statsObserver.observe(statsSection);
}

// Contact Form Handling
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        // Warm the SDK as soon as the visitor engages with the form, so it is
        // usually ready by the time they hit submit. Harmless if it fails --
        // the submit handler awaits getDb() again anyway.
        let warmed = false;
        const warm = () => {
            if (warmed) return;
            warmed = true;
            getDb().catch(() => {});
        };
        contactForm.addEventListener('focusin', warm, { once: true });
        contactForm.addEventListener('pointerdown', warm, { once: true });

        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get form data
            const formData = new FormData(contactForm);
            const formObject = {};
            formData.forEach((value, key) => {
                formObject[key] = value;
            });
            
            // Basic validation
            if (!formObject.firstName || !formObject.lastName || !formObject.email || !formObject.phone || !formObject.service || !formObject.message) {
                alert('Please fill in all required fields.');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formObject.email)) {
                alert('Please enter a valid email address.');
                return;
            }
            
            // Phone validation (basic)
            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
            if (!phoneRegex.test(formObject.phone)) {
                alert('Please enter a valid phone number.');
                return;
            }
            
            // Submit to Firestore
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;
            
            getDb()
                .then((db) => db.collection('submissions').add({
                    ...formObject,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    page: window.location.pathname
                }))
                .then(() => {
                    alert('Thank you for your message! We will get back to you within 24 hours.');
                    contactForm.reset();
                })
                .catch((err) => {
                    console.error('Failed to submit form:', err);
                    alert('Sorry, something went wrong submitting your message. Please try again.');
                })
                .finally(() => {
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                });
        });
        
        // Add real-time validation feedback
        const inputs = contactForm.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                if (this.hasAttribute('required') && !this.value.trim()) {
                    this.style.borderColor = '#ef4444';
                } else {
                    this.style.borderColor = '#d1d5db';
                }
            });
            
            input.addEventListener('input', function() {
                if (this.style.borderColor === 'rgb(239, 68, 68)') {
                    this.style.borderColor = '#d1d5db';
                }
            });
        });
    }
});
